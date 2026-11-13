import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { LoginDto } from "../dtos/schemas.dto.js";
import { getCurrentUser } from "../context/userContext.js";
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import pg from 'pg';
import { createDefaultEmptyDb, demoContext, isPublicDemo, type DBStore } from '../repositories/db.js';

let demoPool: pg.Pool | undefined;
const localSessions = new Map<string, { data: DBStore; expiresAt: string; version: number }>();
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
function pool() {
  const connectionString = process.env.DEMO_DATABASE_URL;
  if (!connectionString) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) throw new Error('DEMO_DATABASE_URL is required');
    return undefined;
  }
  // Keep certificate verification enabled for Supabase's private root CA.
  const ca = process.env.DEMO_DATABASE_CA;
  const url = new URL(connectionString);
  if (ca) {
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  }
  return demoPool ||= new pg.Pool({ connectionString: url.toString(), ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}), max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 10000 });
}
export function createDemoDb(): DBStore {
  const data = createDefaultEmptyDb();
  const date = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
  data.users = data.users.filter(u => u.id === 'usr-demo');
  data.users[0].fullName = 'Демо-руководитель';
  data.users[0].email = 'demo@example.invalid';
  data.users[0].phone = '+7 (000) 000-00-00';
  data.employees = [{ id: 'demo-manager', fullName: 'Анна Учебная', phone: '+7 (000) 000-00-01', role: 'Менеджер', salaryType: 'MONTHLY', salaryAmount: 45000, status: 'ACTIVE', hiredAt: date(-60) }, { id: 'demo-mechanic', fullName: 'Михаил Учебный', phone: '+7 (000) 000-00-02', role: 'Мастер', salaryType: 'PIECEWORK', salaryAmount: 1500, status: 'ACTIVE', hiredAt: date(-45) }];
  data.clients = ['Алексей Демонстрационный', 'Мария Учебная', 'Денис Примеров', 'Ольга Тестовая'].map((fullName, i) => ({ id: `demo-client-${i+1}`, fullName, phone: `+7 (000) 000-10-0${i+1}`, citizenship: 'РФ', passportSerial: '0000', passportNumber: `00000${i+1}`, registrationAddress: 'Учебный город, Примерная улица, 1', documentPhotoUrls: [], status: i === 1 ? 'VIP' : 'NORMAL', clientType: i === 3 ? 'RETAIL' : 'COURIER', createdAt: date(-35-i) }));
  data.tariffs = [{ id: 'demo-week', name: 'Неделя — стандарт', type: 'STANDARD', durationDays: 7, price: 3850, depositRequired: 3000, isActive: true }, { id: 'demo-buyout', name: 'Выкуп за 90 дней', type: 'RENT_TO_OWN', durationDays: 90, price: 6300, depositRequired: 5000, totalBuyoutPrice: 81000, installmentPayment: 6300, paymentIntervalDays: 7, isActive: true }];
  data.bikes.forEach((bike, i) => { bike.status = i < 2 ? 'RENTED' : i === 2 ? 'IN_MAINTENANCE' : 'AVAILABLE'; bike.currentLocation = i < 2 ? 'У клиента' : 'База'; bike.batteryId = data.batteries[i].id; data.batteries[i].installedBikeId = bike.id; data.batteries[i].status = 'INSTALLED'; });
  data.rentals = [0,1].map(i => ({ id: `demo-rental-${i+1}`, rentalNumber: `ДЕМО-00${i+1}`, clientId: data.clients[i].id, bikeId: data.bikes[i].id, tariffId: data.tariffs[0].id, managerId: 'usr-demo', status: i === 1 ? 'OVERDUE' : 'ACTIVE', type: 'STANDARD', startedAt: date(i === 1 ? -9 : -3), expiresAt: date(i === 1 ? -2 : 4), nextPaymentDue: date(i === 1 ? -2 : 4), depositAmount: 3000, depositRefunded: false, outfitIds: i === 0 ? [data.outfits[0].id] : [], batteryIds: [data.batteries[i].id], notes: 'Вымышленная аренда для знакомства с CRM', createdAt: date(i === 1 ? -9 : -3) }));
  data.outfits[0].status = 'ISSUED';
  data.repairs = [{ id: 'demo-repair-1', orderNumber: 'СТО-ДЕМО-001', itemType: 'BIKE', bikeId: data.bikes[2].id, mechanicId: 'demo-mechanic', status: 'IN_PROGRESS', faultType: 'COMPANY_EXPENSE', description: 'Плановая замена тормозных колодок', laborCost: 800, partsCost: 0, totalCost: 800, parts: [], createdAt: date(-1) }, { id: 'demo-repair-2', orderNumber: 'СТО-ДЕМО-002', itemType: 'EXTERNAL_DEVICE', customItemName: 'Учебный электровелосипед', clientId: data.clients[3].id, clientName: data.clients[3].fullName, clientPhone: data.clients[3].phone, mechanicId: 'demo-mechanic', status: 'COMPLETED', faultType: 'CLIENT_FAULT', description: 'Регулировка тормозов', laborCost: 1200, partsCost: 0, totalCost: 1200, parts: [], createdAt: date(-4), completedAt: date(-2) }];
  const part = data.parts[0]; part.quantity = Math.max(part.quantity - 1, 0);
  data.retailOrders = [{ id: 'demo-sale-1', orderNumber: 'ЧЕК-ДЕМО-001', customerType: 'CLIENT', customerName: data.clients[3].fullName, customerPhone: data.clients[3].phone, clientId: data.clients[3].id, items: [{ itemType: 'PART', itemId: part.id, name: part.name, quantity: 1, price: part.clientPrice, costPrice: part.purchasePrice }], totalAmount: part.clientPrice, totalCost: part.purchasePrice, profit: part.clientPrice-part.purchasePrice, paymentMethod: 'CARD', createdAt: date(-1) }];
  data.payments = data.rentals.flatMap((r,i) => [{ id: `demo-rent-pay-${i}`, rentalId: r.id, clientId: r.clientId, cashierId: 'usr-demo', type: 'RENTAL' as const, amount: 3850, method: 'SBP' as const, createdAt: r.startedAt }, { id: `demo-deposit-${i}`, rentalId: r.id, clientId: r.clientId, cashierId: 'usr-demo', type: 'DEPOSIT' as const, amount: 3000, method: 'SBP' as const, createdAt: r.startedAt }]);
  data.payments.push({ id: 'demo-repair-pay', clientId: data.clients[3].id, repairOrderId: 'demo-repair-2', type: 'REPAIR', amount: 1200, method: 'CARD', createdAt: date(-2) }, { id: 'demo-sale-pay', orderId: 'demo-sale-1', clientId: data.clients[3].id, type: 'RETAIL_SALE', amount: part.clientPrice, method: 'CARD', createdAt: date(-1) });
  data.partOrders = [{ id: 'demo-procurement', partName: part.name, partId: part.id, quantity: 10, priority: 'NORMAL', status: 'REQUESTED', estimatedPrice: part.purchasePrice * 10, requestedAt: date(-1), requestedBy: 'usr-demo', note: 'Учебная заявка на пополнение склада' }];
  data.articles = [{ id: 'demo-guide', title: 'Как попробовать полный цикл аренды', category: 'Обучение', content: 'Все сведения вымышлены. Создайте клиента, выберите свободный велосипед и тариф. Оформите выдачу, проверьте оплату и документы, затем верните технику. При дефектах создайте ремонт. Кнопка «Сбросить демо» восстановит только вашу учебную базу.', pinned: true, createdAt: date(0) }];
  data.reviews = [{ id: 'demo-review', clientId: data.clients[0].id, bikeId: data.bikes[0].id, rating: 5, comment: 'Учебный отзыв: техника подготовлена к смене.', createdAt: date(-1) }];
  data.auditLogs = [{ id: 'demo-history', category: 'SYSTEM', action: 'DEMO_CREATED', title: 'Создано личное учебное пространство', actorId: 'usr-demo', actorName: 'Демо-руководитель', createdAt: date(0) }];
  data.chatMessages = [];
  data.settings = { monthlyFixedExpenses: 25000, fixedExpenseItems: [{ id: 'demo-rent', name: 'Учебная аренда мастерской', amount: 25000 }], articlesInitialized: true };
  return data;
}

function demoUser(data: DBStore) {
  const { passwordHash, ...user } = data.users.find(u => u.id === 'usr-demo')!;
  return { ...user, accessLevel: data.accessLevels.find(l => l.id === user.accessLevelId) };
}

// Opaque bearer credentials identify an independent snapshot, never the shared CRM.
export async function publicDemoMiddleware(req: Request, res: Response, next: import('express').NextFunction) {
  if (!isPublicDemo()) return next();
  const route = req.path.replace(/^\/api(?=\/|$)/, '');
  if (!route.startsWith('/') || route === '/health') return next();
  try {
    const storage = pool();
    if (req.method === 'POST' && route === '/auth/demo') {
      const data = createDemoDb();
      const token = `demo_${randomBytes(32).toString('hex')}`;
      const hash = tokenHash(token);
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      if (storage) {
        const client = await storage.connect();
        try {
          await client.query('BEGIN');
          await client.query("SELECT pg_advisory_xact_lock(19861113, 1)");
          await client.query('DELETE FROM electream_demo.sessions WHERE expires_at <= now()');
          const count = await client.query('SELECT count(*)::int AS count FROM electream_demo.sessions');
          if (count.rows[0].count >= 250) { await client.query('ROLLBACK'); return res.status(429).json({ error: 'Демо занято. Попробуйте позже.' }); }
          await client.query('INSERT INTO electream_demo.sessions (id, token_hash, data, expires_at) VALUES ($1,$2,$3,$4)', [randomUUID(), hash, JSON.stringify(data), expiresAt]);
          await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
      } else {
        for (const [key, entry] of localSessions) if (Date.parse(entry.expiresAt) <= Date.now()) localSessions.delete(key);
        if (localSessions.size >= 250) return res.status(429).json({ error: 'Демо занято. Попробуйте позже.' });
        localSessions.set(hash, { data, expiresAt, version: 1 });
      }
      res.cookie('crm_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 86400000 });
      return res.json({ token, user: demoUser(data), expiresAt });
    }
    const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('crm_session='))?.slice(12);
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || cookie || '';
    if (!/^demo_[a-f0-9]{64}$/.test(token)) return res.status(401).json({ error: 'Откройте новую учебную сессию.' });
    const hash = tokenHash(token);
    const row = storage ? (await storage.query('SELECT data, expires_at AS "expiresAt", version FROM electream_demo.sessions WHERE token_hash=$1 AND expires_at > now()', [hash])).rows[0] : localSessions.get(hash);
    if (!row || new Date(row.expiresAt).getTime() <= Date.now()) return res.status(401).json({ error: 'Учебная сессия истекла. Откройте демо заново.' });
    const data: DBStore = JSON.parse(JSON.stringify(row.data));
    const expiresAt = new Date(row.expiresAt).toISOString();
    if (route === '/auth/logout' && req.method === 'POST') {
      if (storage) await storage.query('DELETE FROM electream_demo.sessions WHERE token_hash=$1', [hash]); else localSessions.delete(hash);
      res.clearCookie('crm_session'); return res.json({ success: true });
    }
    // Read-only requests must not bump versions or conflict with parallel dashboard loads.
    const originalSnapshot = JSON.stringify(data);
    if (['/auth/login', '/auth/trusted-login'].includes(route) || route.startsWith('/assistant/')) {
      return res.status(403).json({ error: 'В публичном демо доступен только учебный вход.' });
    }
    const originalSend = res.send.bind(res);
    // Vercel supplies its own res.json helper which can bypass Express res.send.
    // Route JSON through the persistence barrier on both runtimes.
    res.json = function(body: any) {
      res.type('json');
      return res.send(JSON.stringify(body));
    };
    let saving = false;
    res.send = function(body?: any) {
      if (saving) return originalSend(body);
      saving = true;
      (async () => {
        const json = JSON.stringify(data);
        if (Buffer.byteLength(json) > 2097152) return res.status(413).json({ error: 'Учебная база достигла лимита. Сбросьте демо.' });
        if (res.statusCode < 400 && json !== originalSnapshot) {
          if (storage) {
            const result = await storage.query('UPDATE electream_demo.sessions SET data=$1, version=version+1 WHERE token_hash=$2 AND version=$3 AND expires_at > now()', [json, hash, row.version]);
            if (!result.rowCount) return res.status(409).json({ error: 'Учебные данные изменились в другой вкладке. Обновите раздел.' });
          } else {
            if (localSessions.get(hash)?.version !== row.version) return res.status(409).json({ error: 'Обновите учебные данные.' });
            localSessions.set(hash, { data, expiresAt, version: Number(row.version) + 1 });
          }
        }
        originalSend(body);
      })().catch(error => { console.error('[Demo storage]', error.message); res.status(503).json({ error: 'Не удалось сохранить учебные данные. Повторите позже.' }); });
      return res;
    };
    demoContext.run({ db: data, expiresAt }, () => {
      if (route === '/demo/reset' && req.method === 'POST') {
        const fresh = createDemoDb();
        Object.assign(data, fresh); return res.json({ success: true, expiresAt });
      }
      if (route === '/auth/me' && req.method === 'GET') return res.json(demoUser(data));
      next();
    });
  } catch (error: any) {
    console.error('[Demo]', error.message);
    return res.status(503).json({ error: 'Учебное хранилище недоступно. Попробуйте позже.' });
  }
}

export class AuthController {
  static login(req: Request, res: Response) {
    try {
      const parsed = LoginDto.parse(req.body);
      const result = AuthService.login(parsed.email, parsed.password, parsed.rememberDevice);
      res.cookie("crm_session", result.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 30 * 86400000 });
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Ошибка авторизации" });
    }
  }

  static trustedLogin(req: Request, res: Response) {
    try {
      const result = AuthService.trustedLogin(String(req.body.token || ""));
      res.cookie("crm_session", result.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 30 * 86400000 });
      return res.json(result);
    } catch (error: any) {
      return res.status(401).json({ error: error.message });
    }
  }

  static logout(req: Request, res: Response) {
    res.clearCookie("crm_session");
    return res.json({ success: true });
  }

  static getMe(req: Request, res: Response) {
    try {
      const userId = getCurrentUser()?.id;
      if (!userId) return res.status(401).json({ error: "Войдите в систему" });
      const user = AuthService.getMe(userId);
      return res.json(user);
    } catch (err: any) {
      return res.status(404).json({ error: err.message || "Пользователь не найден" });
    }
  }
}
