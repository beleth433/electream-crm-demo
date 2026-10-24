const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.CRM_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ebike-assistant-tests-'));
process.env.CRM_UPLOADS_DIR = path.join(process.env.CRM_DATA_DIR, 'uploads');
process.env.CRM_STORAGE_MODE = 'LOCAL_FILE';
const store = require('../dist/repositories/db.js');
const { AssistantService: assistant } = require('../dist/services/assistant.service.js');
const { issueSession } = require('../dist/services/session.service.js');
const { ClientRepository } = require('../dist/repositories/client.repository.js');
const { BikeRepository } = require('../dist/repositories/bike.repository.js');
let db, owner, server, url;
before(async () => {
  server = require('../dist/app.js').default.listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  url = `http://127.0.0.1:${server.address().port}/api`;
});
beforeEach(() => {
  db = store.getDb(); Object.assign(db, store.createDefaultEmptyDb());
  owner = db.users.find(u => u.role === 'ADMIN');
  db.models.push({ id: 'model', name: 'Minako Monster', powerWatts: 500, purchasePrice: 45000 });
  db.batteryModels.push({ id: 'bat-model', name: 'АКБ 60V 30Ah', voltage: 60, capacityAh: 30 });
});
const connect = (userId = owner.id) => assistant.connect({ code: assistant.createPairing(userId).code, name: 'Тестовый компьютер' });
const submit = (text = 'Добавь три велосипеда Minako Monster') => assistant.submit(owner.id, { id: randomUUID(), text }).id;
const plan = actions => ({ summary: 'Предлагаемые изменения', questions: [], actions });
function ready(actions) {
  const source = 'Добавить клиентов и велосипеды: ' + actions.map(a => [a.phone, db.models.find(m => m.id === a.modelId)?.name, db.batteryModels.find(m => m.id === a.modelId)?.name, a.purchasePrice != null ? `закупочная цена ${a.purchasePrice} рублей за каждый` : ''].filter(Boolean).join('; ')).join('; ');
  const worker = connect(); const id = submit(source); const work = assistant.poll(worker.token);
  assistant.result(worker.token, { id, lease: work.job.lease, plan: plan(actions) });
  return { id, worker, work };
}
const bikeAction = { kind: 'add_bikes', modelId: 'model', quantity: 3, purchasePrice: 45000 };
test('pairing is single-use, expiring, owner-bound and never exposes credentials in status', () => {
  const pairing = assistant.createPairing(owner.id);
  assert.equal(pairing.code.length, 32);
  const worker = assistant.connect({ code: pairing.code, name: 'Компьютер' });
  assert.throws(() => assistant.connect({ code: pairing.code, name: 'Другой' }), /Код подключения/);
  assert.ok(assistant.authenticateWorker(worker.token));
  const status = JSON.stringify(assistant.status(owner.id));
  assert.ok(!status.includes(worker.token) && !status.includes('tokenHash') && !status.includes('fingerprint'));
  const expired = assistant.createPairing(owner.id); db.assistant.pairings[0].expiresAt = Date.now() - 1;
  assert.throws(() => assistant.connect({ code: expired.code, name: 'Компьютер' }), /Код подключения/);
});
test('worker credentials cannot log into normal CRM routes or approve operations', async () => {
  const { token } = connect();
  for (const route of ['clients', 'assistant/status']) assert.equal((await fetch(`${url}/${route}`, { headers: { Authorization: `Bearer ${token}` } })).status, 401);
  const r = await fetch(`${url}/assistant/jobs/${randomUUID()}/apply`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 401);
});
test('device revocation, password change and account deactivation invalidate helper access', () => {
  const first = connect(); assistant.revoke(owner.id, first.deviceId);
  assert.throws(() => assistant.poll(first.token), /отключён/);
  const second = connect(); owner.passwordHash += 'changed';
  assert.throws(() => assistant.poll(second.token), /Пароль изменён/);
  const third = connect(); owner.isActive = false;
  assert.throws(() => assistant.poll(third.token), /отозван/);
});
test('no changes happen before approval; batch IDs are unique and apply is idempotent', () => {
  const { id } = ready([bikeAction, { kind: 'add_batteries', modelId: 'bat-model', quantity: 4 }]);
  assert.equal(db.bikes.length, 0); assert.equal(db.batteries.length, 0);
  const first = assistant.apply(owner.id, id); const second = assistant.apply(owner.id, id);
  assert.deepEqual(first, second);
  assert.equal(db.bikes.length, 3); assert.equal(db.batteries.length, 4);
  assert.equal(new Set([...db.bikes, ...db.batteries].map(e => e.id)).size, 7);
  assert.ok(db.batteries.every(b => b.serialNumber.startsWith('ВРЕМ-АКБ-')));
  assert.ok(assistant.tasks(owner.id).some(t => t.field === 'serialNumber'));
  assert.ok(db.auditLogs.some(l => l.action === 'ASSISTANT_APPLY'));
});
test('task completion follows actual fields and retail clients need no passport', () => {
  const { id } = ready([{ kind: 'create_client', fullName: 'Алексей Смирнов', phone: '+7 (999) 123-45-67', clientType: 'COURIER' }]);
  assistant.apply(owner.id, id); const client = db.clients[0];
  assert.equal(assistant.tasks(owner.id).length, 2);
  ClientRepository.update(client.id, { registrationAddress: 'Самара, улица Ленина, дом 1', passportNumber: '123456' });
  assert.equal(assistant.tasks(owner.id).length, 1, 'RF passport needs its series too');
  ClientRepository.update(client.id, { passportSerial: '1234' });
  assert.equal(assistant.tasks(owner.id).length, 0);
  const next = submit('Добавить покупателя Дмитрий Кузнецов, телефон 79991112233'); const w = connect(); const work = assistant.poll(w.token);
  assistant.result(w.token, { id: next, lease: work.job.lease, plan: plan([{ kind: 'create_client', fullName: 'Дмитрий Кузнецов', phone: '79991112233', clientType: 'RETAIL' }]) });
  assistant.apply(owner.id, next); assert.equal(assistant.tasks(owner.id).length, 0);
});
test('missing required information stays in a proposal and cannot create a fake client', () => {
  const worker = connect(); const id = submit('Добавь нового клиента Ивана'); const work = assistant.poll(worker.token);
  assistant.result(worker.token, { id, lease: work.job.lease, plan: { summary: 'Нужно уточнить клиента', questions: ['Какой телефон и тип клиента?'], actions: [] } });
  assert.equal(assistant.status(owner.id).jobs[0].status, 'READY');
  assert.throws(() => assistant.apply(owner.id, id), /Сначала ответьте/);
  assert.equal(db.clients.length, 0);
});
test('unknown models, duplicate phones and duplicate numbers are rejected before mutation', () => {
  for (const actions of [
    [{ ...bikeAction, modelId: 'invented' }],
    [{ ...bikeAction, inventoryNumbers: ['ЭВ-001', 'ЭВ-001', 'ЭВ-003'] }],
    [{ kind: 'create_client', fullName: 'Иван Иванов', phone: '79991112233', clientType: 'COURIER' }, { kind: 'create_client', fullName: 'Сергей Морозов', phone: '89991112233', clientType: 'RETAIL' }],
  ]) {
    const { id } = ready(actions);
    assert.equal(db.assistant.jobs.find(j => j.id === id).status, 'ERROR');
  }
  assert.equal(db.bikes.length + db.clients.length, 0);
});
test('permission changes are checked again at approval and context respects module access', () => {
  const { id } = ready([bikeAction]);
  const level = db.accessLevels.find(l => l.id === owner.accessLevelId);
  level.permissions.bikes.canEdit = false;
  assert.throws(() => assistant.apply(owner.id, id), /Нет прав/);
  assert.equal(db.bikes.length, 0);
  const w = connect(); submit(); const work = assistant.poll(w.token);
  assert.deepEqual(work.context.bikeModels, []);
});
test('changed source data makes a proposal stale rather than silently changing its result', () => {
  const { id } = ready([bikeAction]); db.models[0].purchasePrice = 47000;
  assert.throws(() => assistant.apply(owner.id, id), /данные изменились/);
  assert.equal(db.bikes.length, 0);
});
test('a failure midway through a confirmed batch rolls back all records and tasks', () => {
  const { id } = ready([bikeAction]); const before = JSON.stringify(db);
  const original = BikeRepository.create;
  let calls = 0;
  BikeRepository.create = function (...args) { if (++calls === 2) throw Error('Проверка отказа'); return original.apply(this, args); };
  try { assert.throws(() => assistant.apply(owner.id, id), /Проверка отказа/); }
  finally { BikeRepository.create = original; }
  assert.equal(JSON.stringify(db), before);
});
test('cancelled and expired jobs reject late results; another user cannot read or apply a job', () => {
  const worker = connect(); const id = submit(); const work = assistant.poll(worker.token);
  assistant.cancel(owner.id, id);
  assert.throws(() => assistant.result(worker.token, { id, lease: work.job.lease, plan: plan([bikeAction]) }), /отменён/);
  assert.throws(() => assistant.apply('other', id), /не найден/);
  const next = submit(); const lease = assistant.poll(worker.token).job.lease;
  db.assistant.jobs.find(j => j.id === next).leaseUntil = Date.now() - 1;
  assert.throws(() => assistant.result(worker.token, { id: next, lease, plan: plan([bikeAction]) }), /истёк/);
  const retry = assistant.poll(worker.token);
  assert.equal(retry.job.id, next); assert.notEqual(retry.job.lease, lease);
});
test('request IDs prevent duplicate queue submissions, including after an ambiguous response', () => {
  const id = randomUUID();
  assistant.submit(owner.id, { id, text: 'Добавь велосипеды' }); assistant.submit(owner.id, { id, text: 'Добавь велосипеды' });
  assert.equal(db.assistant.jobs.length, 1);
  assert.throws(() => assistant.submit(owner.id, { id, text: 'Другая команда' }), /уже использован/);
});
test('invented phones and incomplete foreign-courier documents cannot bypass onboarding rules', () => {
  const worker = connect(); const id = submit('Добавь нового курьера Алексей Смирнов, телефон пока не знаю');
  const work = assistant.poll(worker.token);
  assistant.result(worker.token, { id, lease: work.job.lease, plan: plan([{ kind: 'create_client', fullName: 'Алексей Смирнов', phone: '79992223344', clientType: 'COURIER' }]) });
  assert.equal(db.assistant.jobs.find(j => j.id === id).status, 'ERROR');
  assert.match(db.assistant.jobs.find(j => j.id === id).error, /отсутствует в команде/);
  const foreign = ready([{ kind: 'create_client', fullName: 'Дмитрий Кузнецов', phone: '79995556677', clientType: 'COURIER', citizenship: 'СНГ' }]);
  assert.equal(db.assistant.jobs.find(j => j.id === foreign.id).status, 'ERROR');
  assert.equal(db.clients.length, 0);
});
test('persisted assistant state survives loading an old or a new snapshot', () => {
  assert.deepEqual(store.sanitizeLoadedDb({}).assistant, { devices: [], pairings: [], jobs: [], tasks: [] });
  const { id } = ready([bikeAction]); assistant.apply(owner.id, id);
  const restored = store.sanitizeLoadedDb(JSON.parse(JSON.stringify(db)));
  assert.equal(restored.assistant.jobs[0].status, 'APPLIED');
  assert.equal(restored.assistant.tasks.length, 6);
});
test('HTTP approval records the verified employee, not a caller-supplied header', async () => {
  const { id } = ready([bikeAction]);
  const r = await fetch(`${url}/assistant/jobs/${id}/apply`, { method: 'POST', headers: { Authorization: `Bearer ${issueSession(owner)}`, 'Content-Type': 'application/json', 'x-user-name': encodeURIComponent('Подставное имя') }, body: '{}' });
  assert.equal(r.status, 200);
  assert.ok(db.auditLogs.at(0).actorName.includes(owner.fullName));
  assert.ok(!db.auditLogs.at(0).actorName.includes('Подставное'));
});
test('a real but unrelated catalog model cannot replace the named model, including legacy proposals', () => {
  const worker = connect(); const id = submit('Добавь три велосипеда Amiko U2 Premium'); const work = assistant.poll(worker.token);
  assistant.result(worker.token, { id, lease: work.job.lease, plan: plan([{ kind: 'add_bikes', modelId: 'model', quantity: 3 }]) });
  const job = db.assistant.jobs.find(j => j.id === id);
  assert.equal(job.status, 'ERROR'); assert.match(job.error, /не названа/);
  job.status = 'READY'; job.plan = plan([{ kind: 'add_bikes', modelId: 'model', quantity: 3 }]);
  assert.equal(assistant.status(owner.id).jobs[0].canApply, false);
  assert.throws(() => assistant.apply(owner.id, id), /не названа/);
  assert.equal(db.bikes.length, 0);
});
test('stated prices cannot disappear or become a silent catalog fallback', () => {
  for (const text of ['Добавь три велосипеда Minako Monster, закупочная цена 60 тысяч за каждый', 'Добавь три велосипеда Minako Monster, стоимость 60 тысяч каждого']) {
    const worker = connect(); const id = submit(text); const work = assistant.poll(worker.token);
    assistant.result(worker.token, { id, lease: work.job.lease, plan: plan([{ kind: 'add_bikes', modelId: 'model', quantity: 3 }]) });
    assert.equal(db.assistant.jobs.find(j => j.id === id).status, 'ERROR');
  }
  assert.equal(db.bikes.length, 0);
});
test('client-only requests cannot contain invented equipment or silently lose one person', () => {
  const worker = connect(); const id = submit('Добавь трёх клиентов: Иван Иванов, Дмитрий Кузнецов, Сергей Морозов'); const work = assistant.poll(worker.token);
  assistant.result(worker.token, { id, lease: work.job.lease, plan: plan([{ kind: 'add_bikes', modelId: 'model', quantity: 3 }]) });
  assert.equal(db.assistant.jobs.find(j => j.id === id).status, 'ERROR');
  const next = submit('Добавь трёх клиентов-курьеров: Иван Иванов +7 999 123 4567; Дмитрий Кузнецов +7 999 111 2233; Сергей Морозов +7 999 333 4455');
  const second = assistant.poll(worker.token);
  assistant.result(worker.token, { id: next, lease: second.job.lease, plan: plan([{ kind: 'create_client', fullName: 'Иван Иванов', phone: '79991234567', clientType: 'COURIER' }]) });
  assert.equal(db.assistant.jobs.find(j => j.id === next).status, 'ERROR');
  assert.equal(db.clients.length + db.bikes.length, 0);
});
test('offline and expired jobs are displayed explicitly and can be retried without duplicating the command', () => {
  const worker = connect(); const id = submit();
  let status = assistant.status(owner.id);
  assert.equal(status.workerOnline, false); assert.match(status.jobs[0].waitingReason, /Нет связи/);
  const work = assistant.poll(worker.token); status = assistant.status(owner.id);
  assert.equal(status.workerOnline, true);
  assert.throws(() => assistant.retry(owner.id, id), /нельзя повторно/);
  db.assistant.jobs.find(j => j.id === id).leaseUntil = Date.now() - 1;
  assert.equal(assistant.status(owner.id).jobs[0].stalled, true);
  assistant.retry(owner.id, id);
  assert.equal(db.assistant.jobs.length, 1);
  assert.equal(db.assistant.jobs[0].status, 'QUEUED');
  assert.throws(() => assistant.result(worker.token, { id, lease: work.job.lease, plan: plan([bikeAction]) }), /отменён/);
});
test('malformed model output ends in a visible error instead of leaving the job processing', () => {
  const worker = connect(); const id = submit(); const work = assistant.poll(worker.token);
  assistant.result(worker.token, { id, lease: work.job.lease, plan: { summary: 'Неполный ответ', actions: 'not-an-array' } });
  assert.equal(db.assistant.jobs.find(j => j.id === id).status, 'ERROR');
  assert.equal(db.bikes.length, 0);
  const next = submit('Добавь клиентов'); const second = assistant.poll(worker.token);
  assistant.result(worker.token, { id: next, lease: second.job.lease, plan: { summary: 'Нужно дополнить клиентов', questions: Array.from({length:20}, (_,i) => `Клиент ${i+1}: укажите телефон`), actions: [] } });
  assert.equal(db.assistant.jobs.find(j => j.id === next).status, 'READY');
});
after(async () => { await store.flushDb(true); await new Promise(r => server.close(r)); });
