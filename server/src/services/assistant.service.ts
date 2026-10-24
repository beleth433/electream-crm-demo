import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb, saveDb, withDbTransaction } from '../repositories/db.js';
import { AssistantAction, AssistantJob, AssistantPlan, AssistantPlanDto } from '../dtos/assistant.dto.js';
import { ClientCreateDto, ClientUpdateDto } from '../dtos/schemas.dto.js';
import { ClientService } from './client.service.js';
import { BikeRepository } from '../repositories/bike.repository.js';
import { BatteryRepository } from '../repositories/battery.repository.js';
import { HistoryRepository } from '../repositories/history.repository.js';
import { normalizePhone } from '../repositories/relations.js';
import { intent, isUpdate, label, phoneInText, modelInText, requestedCount, money } from '../../../local-assistant/facts.cjs';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
function fail(message: string, status = 400): never { throw Object.assign(new Error(message), { status }); }
const state = () => getDb().assistant;
function userById(id: string) {
  const user = getDb().users.find(u => u.id === id && u.isActive !== false);
  if (!user) fail('Доступ сотрудника отозван', 403);
  return user;
}
function allowed(userId: string, module: string, edit = false) {
  const user = userById(userId);
  const level = getDb().accessLevels.find(l => l.id === (user.accessLevelId || (user.role === 'ADMIN' ? 'lvl-owner' : user.role === 'MECHANIC' ? 'lvl-master' : 'lvl-manager')));
  const permission = level?.permissions[module];
  return permission?.visible === true && (!edit || permission.canEdit === true);
}
function requireEdit(userId: string, module: string) {
  if (!allowed(userId, module, true)) fail(`Нет прав на изменение раздела «${module}»`, 403);
}
function ownedJob(userId: string, id: string) {
  const job = state().jobs.find(j => j.id === id && j.userId === userId);
  if (!job) fail('Запрос не найден', 404);
  return job;
}
function clientData(a: AssistantAction) {
  return Object.fromEntries(['fullName', 'phone', 'clientType', 'courierService', 'registrationAddress', 'passportSerial', 'passportNumber', 'citizenship', 'migrationCard', 'patentNumber']
    .filter(k => a[k as keyof AssistantAction] != null).map(k => [k, a[k as keyof AssistantAction]]));
}
function validatePlan(userId: string, plan: AssistantPlan, sourceText: string) {
  const db = getDb();
  const preview: string[] = [], warnings: string[] = [], baseline: unknown[] = [];
  const phones = new Set<string>(), inventory = new Set<string>(), serials = new Set<string>(), edited = new Set<string>();
  const source = intent(sourceText);
  let total = 0;
  for (const a of plan.actions) {
    if (a.kind === 'create_client' || a.kind === 'update_client') {
      requireEdit(userId, 'clients');
      const data = clientData(a);
      const existing = a.kind === 'update_client' ? db.clients.find(c => c.id === a.clientId) : undefined;
      if (a.kind === 'update_client' && !existing) fail('Клиент для редактирования не найден. Уточните имя или телефон.');
      if (existing && (!isUpdate(sourceText) || (!label(sourceText).includes(label(existing.fullName)) && !phoneInText(existing.phone, sourceText)))) fail('Изменение этого клиента не запрошено. Уточните действие и клиента по телефону.');
      if (existing && edited.has(existing.id)) fail('Объедините изменения одного клиента в одно действие');
      if (existing) edited.add(existing.id);
      if (existing) {
        ClientUpdateDto.parse(data);
        if (!Object.keys(data).length) fail('Не указаны изменения клиента');
      } else {
        if (!a.clientType) fail('Уточните: новый клиент — курьер или покупатель / клиент СТО?');
        ClientCreateDto.parse(data);
        if (a.clientType === 'COURIER' && a.citizenship === 'СНГ' && (!a.migrationCard || !a.patentNumber)) fail('Для нового курьера СНГ нужны миграционная карта и патент / статус ЕАЭС. Дополните запрос; вымышленные документы не сохраняются.');
      }
      const phone = normalizePhone(String(data.phone || existing?.phone || ''));
      if (phone.length < 10) fail('Для сохранения клиента нужен настоящий телефон. Дополните запрос.');
      if (data.phone) {
        if (!phoneInText(String(data.phone), sourceText)) fail('Предложенный телефон отсутствует в команде или неполный. Для +7/8 нужно 11 цифр; недостающие цифры не дописываются.');
      }
      if (phones.has(phone) || db.clients.some(c => c.id !== existing?.id && normalizePhone(c.phone) === phone)) fail('Клиент с таким телефоном уже есть. Попросите обновить существующую запись.');
      phones.add(phone);
      const name = String(data.fullName || existing?.fullName);
      preview.push(`${existing ? 'Обновить' : 'Добавить'} клиента: ${name}, ${data.phone || existing?.phone}${data.courierService ? ', ' + data.courierService : ''}${data.clientType ? ', ' + (data.clientType === 'RETAIL' ? 'покупатель / СТО' : 'курьер') : ''}`);
      for (const [field, title] of [['registrationAddress', 'Прописка'], ['passportSerial', 'Серия паспорта'], ['passportNumber', 'Номер паспорта'], ['citizenship', 'Гражданство'], ['migrationCard', 'Миграционная карта'], ['patentNumber', 'Патент / статус ЕАЭС']] as const) {
        if (data[field]) preview.push(`  ${title}: ${data[field]}`);
      }
      if ((data.clientType || existing?.clientType || 'COURIER') === 'COURIER' && (!(data.passportNumber || existing?.passportNumber) || ((existing?.citizenship || 'РФ') === 'РФ' && !(data.passportSerial || existing?.passportSerial)))) warnings.push(`${name}: нужно заполнить паспорт для оформления аренды`);
      if ((data.clientType || existing?.clientType || 'COURIER') === 'COURIER' && !(data.registrationAddress || existing?.registrationAddress)) warnings.push(`${name}: нужно заполнить прописку для оформления аренды`);
      baseline.push(existing || null);
    } else {
      const bike = a.kind === 'add_bikes';
      requireEdit(userId, bike ? 'bikes' : 'batteries');
      const model = (bike ? db.models : db.batteryModels).find(m => m.id === a.modelId);
      if (!model) fail('Модель техники не найдена. Создайте её в каталоге или уточните название.');
      if (source.clients && !source.bikes && !source.batteries) fail('Запрос содержит только клиентов: действие с техникой не соответствует команде.');
      if (!modelInText(model, sourceText, !bike)) fail(`Модель «${model.name}» не названа в команде. Подстановка другой модели запрещена; уточните каталог.`);
      if (a.purchasePrice != null && !money(sourceText).includes(a.purchasePrice)) fail('Предложенная закупочная цена не содержится в команде. Уточните цену за единицу.');
      if (a.quantity == null) fail('Укажите количество техники в запросе');
      const quantity = a.quantity || 1;
      total += quantity;
      if (total > 50) fail('За один запрос можно добавить не более 50 единиц техники');
      for (const field of bike ? ['inventoryNumbers', 'frameNumbers', 'motorNumbers'] as const : ['serialNumbers'] as const) {
        const values = a[field];
        if (values?.length && values.length !== quantity) fail(`Количество значений «${field}» должно совпадать с количеством техники`);
      }
      const identifiers = (bike ? a.inventoryNumbers : a.serialNumbers) || [];
      for (const id of identifiers) {
        const normalized = id.toLowerCase();
        const seen = bike ? inventory : serials;
        if (seen.has(normalized) || (bike ? db.bikes.some(b => b.inventoryNumber.toLowerCase() === normalized) : db.batteries.some(b => b.serialNumber.toLowerCase() === normalized))) fail(`Номер «${id}» уже используется`);
        seen.add(normalized);
      }
      preview.push(`Добавить ${quantity} ${bike ? 'велосипед(ов)' : 'АКБ'}: ${model.name}${a.purchasePrice != null ? `, закупочная цена за единицу: ${a.purchasePrice} ₽` : ''}`);
      if (identifiers.length) preview.push(`  ${bike ? 'Инвентарные' : 'Серийные'} номера: ${identifiers.join(', ')}`);
      if (a.frameNumbers?.length && bike) preview.push(`  Рамы: ${a.frameNumbers.join(', ')}`);
      if (a.motorNumbers?.length && bike) preview.push(`  Моторы: ${a.motorNumbers.join(', ')}`);
      if (bike && !a.inventoryNumbers?.length) warnings.push('Инвентарные номера велосипедов будут назначены автоматически');
      if (bike && !a.frameNumbers?.length) warnings.push(`${model.name}: нужно внести номера рам`);
      if (bike && !a.motorNumbers?.length) warnings.push(`${model.name}: нужно внести номера моторов`);
      if (!bike && !a.serialNumbers?.length) warnings.push(`${model.name}: АКБ получат явно временные номера «ВРЕМ-АКБ-…»; нужно заменить их серийными номерами`);
      if (a.purchasePrice == null) warnings.push(`${model.name}: цена поступления не названа; сохранится цена из модели (${model.purchasePrice ?? 0} ₽), с задачей проверить фактическую стоимость`);
      baseline.push(model);
    }
  }
  if (!plan.questions.length) {
    const expected = requestedCount(sourceText, 'clients');
    if (expected && source.clients && plan.actions.filter(a => a.kind === 'create_client').length !== expected) fail(`В команде ${expected} клиентов: предложение должно содержать каждого из них или вопросы по недостающим данным.`);
    const amounts = money(sourceText);
    for (const [category, kind] of [['bikes', 'add_bikes'], ['batteries', 'add_batteries']]) {
      const count = requestedCount(sourceText, category);
      if (count && plan.actions.filter(a => a.kind === kind).reduce((n, a) => n + (a.quantity || 0), 0) !== count) fail('Количество техники не соответствует команде. Подготовьте предложение заново.');
    }
    if ((source.bikes || source.batteries) && amounts.length && !/закуп|покупн|приобрет|купили|поставщик/iu.test(sourceText)) fail('Уточните назначение суммы: закупочная цена за единицу или цена продажи. Неоднозначная стоимость не подставляется автоматически.');
    if ((source.bikes || source.batteries) && amounts.some(value => !plan.actions.some(a => a.purchasePrice === value))) fail('Указанная в команде сумма потеряна. Уточните закупочную цену за единицу; она не заменяется ценой каталога.');
  }
  return { preview, warnings: [...new Set(warnings)], baseline: hash(JSON.stringify(baseline)) };
}

function addTask(userId: string, module: 'clients' | 'bikes' | 'batteries', entityId: string, label: string, field: string, title: string) {
  if (state().tasks.some(t => t.entityId === entityId && t.field === field && !t.resolvedAt)) return;
  state().tasks.push({ id: randomUUID(), userId, module, entityId, label, field, title, createdAt: now() });
}
function taskComplete(task: import('../dtos/assistant.dto.js').AssistantTask) {
  const entity = getDb()[task.module].find((e: { id: string }) => e.id === task.entityId) as any;
  // Price needs an explicit check: zero can be a legitimate value.
  return !entity || (task.module === 'clients' && entity.clientType === 'RETAIL' && ['passportNumber', 'registrationAddress'].includes(task.field)) || (task.field === 'purchasePrice' ? false : task.field === 'serialNumber' ? entity.serialNumber && !entity.serialNumber.startsWith('ВРЕМ-АКБ-') : task.field === 'passportNumber' ? entity.passportNumber && (entity.citizenship !== 'РФ' || entity.passportSerial) : Boolean(entity[task.field]));
}

export class AssistantService {
  static createPairing(userId: string) {
    userById(userId);
    if (!['clients', 'bikes', 'batteries'].some(m => allowed(userId, m, true))) fail('Нет прав на поддерживаемые операции', 403);
    const code = randomBytes(16).toString('hex');
    state().pairings = state().pairings.filter(p => p.userId !== userId && p.expiresAt > Date.now());
    const expiresAt = Date.now() + 10 * 60000;
    state().pairings.push({ userId, codeHash: hash(code), expiresAt });
    saveDb();
    return { code, expiresAt };
  }
  static connect(input: unknown) {
    const { code, name } = z.object({ code: z.string().regex(/^[a-f0-9]{32}$/i), name: z.string().trim().min(1).max(80) }).strict().parse(input);
    const pairing = state().pairings.find(p => p.codeHash === hash(code.toLowerCase()) && p.expiresAt > Date.now());
    if (!pairing) fail('Код подключения недействителен или истёк', 401);
    const user = userById(pairing.userId);
    if (state().devices.filter(d => d.userId === user.id && !d.revokedAt).length >= 5) fail('Отключите лишний компьютер перед новым подключением');
    const token = randomBytes(32).toString('hex');
    const device = { id: randomUUID(), userId: user.id, name, tokenHash: hash(token), fingerprint: hash(user.passwordHash), createdAt: now() };
    state().devices.push(device);
    state().pairings = state().pairings.filter(p => p !== pairing);
    saveDb();
    return { token, deviceId: device.id };
  }
  static authenticateWorker(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) fail('Подключите помощник заново', 401);
    const device = state().devices.find(d => !d.revokedAt && d.tokenHash === hash(token));
    if (!device) fail('Компьютер отключён от CRM', 401);
    const user = userById(device.userId);
    if (device.fingerprint !== hash(user.passwordHash)) fail('Пароль изменён. Подключите помощник заново', 401);
    return device;
  }
  static status(userId: string) {
    const devices = state().devices.filter(d => d.userId === userId && !d.revokedAt);
    const workerOnline = devices.some(d => !!d.lastSeenAt && Date.now() - Date.parse(d.lastSeenAt) < 90000);
    const active = state().jobs.some(j => j.userId === userId && j.status === 'PROCESSING' && (j.leaseUntil || 0) > Date.now());
    return {
      workerOnline,
      devices: devices.map(({ id, name, createdAt, lastSeenAt }) => ({ id, name, createdAt, lastSeenAt })),
      jobs: state().jobs.filter(j => j.userId === userId).slice(-30).reverse().map(({ lease, deviceId, baseline, plan, ...j }) => {
        let validationError: string | undefined;
        if (j.status === 'READY' && plan && !plan.questions.length) {
          try { if (validatePlan(userId, plan, j.text).baseline !== baseline) validationError = 'Связанные данные изменились. Подготовьте предложение заново.'; }
          catch (e: any) { validationError = e.errors?.[0]?.message || e.message; }
        }
        return { ...j,
        stalled: j.status === 'PROCESSING' && (j.leaseUntil || 0) < Date.now(),
        waitingReason: j.status === 'QUEUED' ? active ? 'Ожидает завершения предыдущей команды' : !workerOnline ? 'Нет связи с локальной программой. Откройте её настройки и проверьте интернет, прокси и сообщение об ошибке.' : undefined : undefined,
        summary: validationError ? 'Предложение нужно подготовить заново' : plan?.questions.length ? 'Нужно уточнить данные перед сохранением' : j.preview?.length ? j.preview.filter(line => !line.startsWith('  ')).join('; ') : plan?.summary,
        error: validationError || j.error,
        questions: plan?.questions || [], canApply: !validationError && j.status === 'READY' && !!plan?.actions.length && !plan.questions.length }; }),
      tasks: state().tasks.filter(t => t.userId === userId && !t.resolvedAt && allowed(userId, t.module) && !taskComplete(t)).map(t => {
        const entity = getDb()[t.module].find(e => e.id === t.entityId) as any;
        return { ...t, label: entity?.fullName || entity?.inventoryNumber || entity?.serialNumber || t.label };
      }),
    };
  }
  static tasks(userId: string) { return this.status(userId).tasks; }
  static submit(userId: string, input: unknown) {
    const { id, text } = z.object({ id: z.string().uuid(), text: z.string().trim().min(3).max(8000) }).strict().parse(input);
    const existing = state().jobs.find(j => j.id === id);
    if (existing) {
      if (existing.userId !== userId || existing.text !== text) fail('Идентификатор запроса уже использован', 409);
      return { id: existing.id };
    }
    if (!['clients', 'bikes', 'batteries'].some(m => allowed(userId, m, true))) fail('Нет прав на поддерживаемые операции', 403);
    if (state().jobs.filter(j => j.userId === userId && ['QUEUED', 'PROCESSING', 'READY'].includes(j.status)).length >= 20) fail('Завершите или отмените предыдущие запросы');
    // Retain active requests and a bounded history; applied operations remain in audit.
    const cutoff = Date.now() - 30 * 86400000;
    state().jobs = state().jobs.filter(j => !['APPLIED', 'CANCELLED', 'ERROR'].includes(j.status) || Date.parse(j.createdAt) > cutoff);
    while (state().jobs.length >= 1000) {
      const index = state().jobs.findIndex(j => ['APPLIED', 'CANCELLED', 'ERROR'].includes(j.status));
      if (index < 0) fail('Очередь помощника заполнена. Завершите или отмените предыдущие запросы.');
      state().jobs.splice(index, 1);
    }
    state().jobs.push({ id, userId, text, createdAt: now(), status: 'QUEUED', attempts: 0 });
    saveDb();
    return { id };
  }
  static poll(token: string) {
    const device = this.authenticateWorker(token);
    const db = getDb();
    if (!device.lastSeenAt || Date.now() - Date.parse(device.lastSeenAt) > 60000) { device.lastSeenAt = now(); saveDb(); }
    for (const job of state().jobs.filter(j => j.userId === device.userId && j.status === 'PROCESSING' && (j.leaseUntil || 0) < Date.now())) {
      job.status = job.attempts >= 3 ? 'ERROR' : 'QUEUED';
      job.error = job.status === 'ERROR' ? 'Локальная модель не завершила запрос. Проверьте помощник и отправьте команду заново.' : undefined;
      saveDb();
    }
    if (state().jobs.some(j => j.userId === device.userId && j.status === 'PROCESSING')) return { job: null };
    const job = state().jobs.find(j => j.userId === device.userId && j.status === 'QUEUED');
    if (!job) return { job: null };
    job.status = 'PROCESSING'; job.deviceId = device.id; job.lease = randomUUID(); job.leaseUntil = Date.now() + 5 * 60000; job.attempts++;
    const modules = ['clients', 'bikes', 'batteries'].filter(m => allowed(device.userId, m, true));
    const words = job.text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 3);
    const digits = job.text.replace(/\D/g, '');
    const clients = modules.includes('clients') ? db.clients.filter(c => (digits.length >= 10 && digits.includes(normalizePhone(c.phone))) || words.some(w => c.fullName.toLowerCase().includes(w))).slice(0, 30).map(c => ({ id: c.id, fullName: c.fullName, phone: c.phone, clientType: c.clientType })) : [];
    saveDb();
    return { job: { id: job.id, text: job.text, lease: job.lease }, context: {
      modules, clients,
      bikeModels: modules.includes('bikes') ? db.models.slice(0, 150).map(({ id, name }) => ({ id, name })) : [],
      batteryModels: modules.includes('batteries') ? db.batteryModels.slice(0, 150).map(({ id, name, voltage, capacityAh }) => ({ id, name, voltage, capacityAh })) : [],
    } };
  }
  static result(token: string, input: unknown) {
    const device = this.authenticateWorker(token);
    const data = z.object({ id: z.string().uuid(), lease: z.string().uuid(), plan: z.unknown().optional(), error: z.string().max(1500).optional() }).strict().parse(input);
    const job = ownedJob(device.userId, data.id);
    if (job.status !== 'PROCESSING' || job.deviceId !== device.id || job.lease !== data.lease || (job.leaseUntil || 0) < Date.now()) fail('Запрос отменён или срок обработки истёк', 409);
    if (data.error) { job.status = 'ERROR'; job.error = data.error; }
    else {
      try {
        const plan = AssistantPlanDto.parse(data.plan);
        const validated = validatePlan(device.userId, plan, job.text);
        job.plan = plan; Object.assign(job, validated); job.status = 'READY'; job.error = undefined;
      } catch (error: any) { job.status = 'ERROR'; job.error = error.errors?.[0]?.message || error.message; }
    }
    saveDb(); return { ok: true };
  }
  static cancel(userId: string, id: string) {
    const job = ownedJob(userId, id);
    if (job.status === 'APPLIED') fail('Выполненный запрос нельзя отменить', 409);
    job.status = 'CANCELLED'; saveDb(); return { ok: true };
  }
  static retry(userId: string, id: string) {
    const job = ownedJob(userId, id);
    if (job.status === 'APPLIED' || job.status === 'READY' || (job.status === 'PROCESSING' && (job.leaseUntil || 0) > Date.now())) fail('Эту команду нельзя повторно поставить в очередь в текущем состоянии', 409);
    job.status = 'QUEUED'; job.attempts = 0; job.error = undefined; job.lease = undefined; job.leaseUntil = undefined;
    saveDb(); return { ok: true };
  }
  static revoke(userId: string, id: string) {
    const device = state().devices.find(d => d.id === id && d.userId === userId);
    if (!device) fail('Компьютер не найден', 404);
    device.revokedAt = now(); saveDb(); return { ok: true };
  }
  static resolveTask(userId: string, id: string) {
    const task = state().tasks.find(t => t.id === id && t.userId === userId && !t.resolvedAt);
    if (!task) fail('Задача не найдена', 404);
    requireEdit(userId, task.module);
    if (!taskComplete(task) && task.field !== 'purchasePrice') fail('Сначала заполните поле в карточке');
    task.resolvedAt = now(); saveDb(); return { ok: true };
  }
  static apply(userId: string, id: string) {
    return withDbTransaction(() => {
      const job = ownedJob(userId, id);
      if (job.status === 'APPLIED') return { results: job.results };
      if (job.status !== 'READY' || !job.plan) fail('План ещё не готов', 409);
      if (job.plan.questions.length || !job.plan.actions.length) fail('Сначала ответьте на уточняющие вопросы');
      const checked = validatePlan(userId, job.plan, job.text);
      if (checked.baseline !== job.baseline) fail('Связанные данные изменились после подготовки плана. Отправьте запрос заново.', 409);
      const results: NonNullable<AssistantJob['results']> = [];
      for (const a of job.plan.actions) {
        if (a.kind === 'create_client' || a.kind === 'update_client') {
          const data = clientData(a);
          const c = a.kind === 'create_client' ? ClientService.createClient(ClientCreateDto.parse(data)) : ClientService.updateClient(a.clientId!, ClientUpdateDto.parse(data));
          if (!c) fail('Клиент не найден');
          results.push({ module: 'clients', id: c.id, label: c.fullName });
          if (c.clientType !== 'RETAIL') {
            if (!c.passportNumber || (c.citizenship === 'РФ' && !c.passportSerial)) addTask(userId, 'clients', c.id, c.fullName, 'passportNumber', 'Заполнить паспортные данные');
            if (!c.registrationAddress) addTask(userId, 'clients', c.id, c.fullName, 'registrationAddress', 'Заполнить прописку');
          }
        } else {
          const bike = a.kind === 'add_bikes';
          for (let i = 0; i < (a.quantity || 1); i++) {
            const tag = randomUUID().slice(0, 8).toUpperCase();
            const entity = bike ? BikeRepository.create({ modelId: a.modelId!, inventoryNumber: a.inventoryNumbers?.[i] || `ЭВ-${tag}`, frameNumber: a.frameNumbers?.[i], motorNumber: a.motorNumbers?.[i], currentLocation: 'База', purchasePrice: a.purchasePrice ?? undefined }) : BatteryRepository.create({ modelId: a.modelId!, serialNumber: a.serialNumbers?.[i] || `ВРЕМ-АКБ-${tag}`, notes: !a.serialNumbers?.length ? 'Временный учётный номер. Внесите фактический серийный номер.' : undefined, purchasePrice: a.purchasePrice ?? undefined });
            if (!entity) fail('Не удалось создать технику');
            const module = bike ? 'bikes' : 'batteries';
            const label = bike ? (entity as any).inventoryNumber : (entity as any).serialNumber;
            results.push({ module, id: entity.id, label });
            if (bike && !a.frameNumbers?.length) addTask(userId, module, entity.id, label, 'frameNumber', 'Внести номер рамы');
            if (bike && !a.motorNumbers?.length) addTask(userId, module, entity.id, label, 'motorNumber', 'Внести номер мотора');
            if (!bike && !a.serialNumbers?.length) addTask(userId, module, entity.id, label, 'serialNumber', 'Заменить временный номер на фактический серийный');
            if (a.purchasePrice == null) addTask(userId, module, entity.id, label, 'purchasePrice', 'Проверить фактическую закупочную цену');
          }
        }
      }
      job.status = 'APPLIED'; job.appliedAt = now(); job.results = results;
      HistoryRepository.logAction({ category: 'SYSTEM', action: 'ASSISTANT_APPLY', title: 'Подтверждены изменения локального помощника', details: job.preview?.join('\n'), badgeText: 'ИИ-помощник' });
      saveDb(); return { results };
    });
  }
}
