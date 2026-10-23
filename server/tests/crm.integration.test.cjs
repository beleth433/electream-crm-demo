const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ebike-crm-integration-'));
process.env.CRM_DATA_DIR = testDir;
process.env.CRM_UPLOADS_DIR = path.join(testDir, 'uploads');
process.env.CRM_STORAGE_MODE = 'LOCAL_FILE';
const store = require('../dist/repositories/db.js');
const { supabaseAdapter } = require('../dist/repositories/supabase.adapter.js');
// No connection is initialized; persistence never reaches the real cloud.
supabaseAdapter.saveToCloud = async () => {};
supabaseAdapter.flush = async () => {};
supabaseAdapter.init = async () => null;
supabaseAdapter.syncIfOutdated = async () => null;
const { RentalRepository: rentals } = require('../dist/repositories/rental.repository.js');
const { RepairRepository: repairs } = require('../dist/repositories/repair.repository.js');
const { BatteryRepository: batteries } = require('../dist/repositories/battery.repository.js');
const { BikeRepository: bikes } = require('../dist/repositories/bike.repository.js');
const { shopRepository: shop } = require('../dist/repositories/shop.repository.js');
const { FinanceRepository: finance } = require('../dist/repositories/finance.repository.js');
const { ClientRepository: clients } = require('../dist/repositories/client.repository.js');
const { PartRepository: parts } = require('../dist/repositories/part.repository.js');
const { StatsRepository: stats } = require('../dist/repositories/stats.repository.js');
const { AuthService } = require('../dist/services/auth.service.js');
const { authenticateSession, issueSession } = require('../dist/services/session.service.js');
let db;
let httpServer;
let apiUrl;

before(async () => {
  const app = require('../dist/app.js').default;
  await new Promise((resolve) => { httpServer = app.listen(0, '127.0.0.1', resolve); });
  apiUrl = `http://127.0.0.1:${httpServer.address().port}/api`;
});

beforeEach(async () => {
  supabaseAdapter.saveToCloud = async () => {};
  supabaseAdapter.syncIfOutdated = async () => null;
  db = store.getDb();
  Object.assign(db, store.createDefaultEmptyDb());
  store.setSystemTime('2026-10-22T12:00:00Z');
  db.clients.push({ id: 'client', fullName: 'Иван Иванов', phone: '+7 (999) 123-45-67', clientType: 'COURIER', status: 'NORMAL', createdAt: '2026-10-01T12:00:00Z' });
  db.models.push({ id: 'model', name: 'Minako', powerWatts: 500, purchasePrice: 40000, salePrice: 60000 });
  db.bikes.push({ id: 'bike', inventoryNumber: 'EV-001', modelId: 'model', status: 'AVAILABLE', currentLocation: 'База', mileageKm: 0, batteryId: 'bat1' });
  db.batteries.push({ id: 'bat1', serialNumber: 'BAT-001', voltage: 60, capacityAh: 20, status: 'INSTALLED', installedBikeId: 'bike' }, { id: 'bat2', serialNumber: 'BAT-002', voltage: 60, capacityAh: 20, status: 'AVAILABLE' }, { id: 'bat3', serialNumber: 'BAT-003', voltage: 60, capacityAh: 20, status: 'AVAILABLE' });
  db.outfits.push({ id: 'outfit', name: 'Замок', category: 'LOCK', inventoryNumber: 'OUTF-001', depositValue: 1000, status: 'IN_STOCK' });
  db.tariffs.push({ id: 'standard', name: 'Неделя', type: 'STANDARD', durationDays: 7, price: 700, depositRequired: 1000, isActive: true }, { id: 'buyout', name: 'Выкуп', type: 'RENT_TO_OWN', durationDays: 28, price: 1000, totalBuyoutPrice: 4000, installmentPayment: 1000, paymentIntervalDays: 7, depositRequired: 1000, isActive: true });
  db.parts.push({ id: 'part1', name: 'Колодки', sku: 'PRT-001', quantity: 5, minQuantity: 1, purchasePrice: 100, clientPrice: 200 }, { id: 'part2', name: 'Камера', sku: 'PRT-002', quantity: 0, minQuantity: 1, purchasePrice: 50, clientPrice: 100 });
  await store.flushDb(true);
});

const issue = (extra = {}) => rentals.create({ clientId: 'client', bikeId: 'bike', tariffId: 'standard', managerId: 'usr-bxleth', outfitIds: ['outfit'], batteryIds: ['bat2'], paymentMethod: 'CASH', ...extra });
const completeReturn = (id, extra = {}) => rentals.close(id, { bikeCondition: 'OK', outfitReturns: [], refundMethod: 'CASH', ...extra });

test('issuing includes the installed battery and propagates customer, equipment and money', () => {
  const rental = issue({ durationDays: 10 });
  assert.deepEqual(new Set(rental.batteryIds), new Set(['bat1', 'bat2']));
  assert.equal(rental.expiresAt, '2026-11-01T12:00:00.000Z');
  assert.equal(rental.nextPaymentDue, rental.expiresAt);
  assert.equal(bikes.getAll()[0].activeRental.id, rental.id);
  assert.equal(batteries.getById('bat2').status, 'ISSUED_SPARE');
  assert.equal(finance.getAll()[0].clientName, 'Иван Иванов');
});

test('returning rent-to-own equipment cancels the contract without granting ownership', () => {
  const rental = issue({ tariffId: 'buyout' });
  const result = completeReturn(rental.id);
  assert.equal(result.rental.status, 'CLOSED');
  assert.equal(db.bikes[0].status, 'AVAILABLE');
  assert.equal(db.outfits[0].status, 'IN_STOCK');
  assert.equal(db.batteries.find((b) => b.id === 'bat2').status, 'AVAILABLE');
  assert.equal(result.rental.closedAt, '2026-10-22T12:00:00.000Z');
});

test('full buyout retires all supplied batteries; equipment and deposit settle separately', () => {
  const rental = issue({ tariffId: 'buyout' });
  rentals.renew(rental.id, { amount: 3000, method: 'CASH', isBuyoutFinal: true });
  assert.equal(db.bikes[0].status, 'BOUGHT_OUT');
  assert.equal(db.batteries.find((b) => b.id === 'bat1').status, 'SOLD');
  assert.equal(db.batteries.find((b) => b.id === 'bat2').status, 'SOLD');
  assert.equal(db.outfits[0].status, 'ISSUED');
  const result = completeReturn(rental.id);
  assert.equal(result.rental.status, 'BOUGHT_OUT');
  assert.equal(db.bikes[0].status, 'BOUGHT_OUT');
  assert.equal(db.outfits[0].status, 'IN_STOCK');
  assert.equal(result.depositReturned, 1000);
  assert.throws(() => completeReturn(rental.id), /уже завершён/);
  assert.throws(() => batteries.returnToWarehouse('bat2'), /выбыл/);
});

test('an insufficient final payment cannot close a buyout or appear in the cash register', () => {
  const rental = issue({ tariffId: 'buyout' });
  const before = JSON.stringify(db);
  assert.throws(() => rentals.renew(rental.id, { amount: 500, method: 'CASH', isBuyoutFinal: true }), /остаток/);
  assert.equal(JSON.stringify(db), before);
});

test('battery attachment replaces battery IDs in the active rental', () => {
  const rental = issue();
  batteries.attachToBike('bat3', 'bike');
  assert.deepEqual(new Set(rentals.getById(rental.id).batteryIds), new Set(['bat2', 'bat3']));
  assert.equal(db.batteries.find((b) => b.id === 'bat1').status, 'AVAILABLE');
});

test('repair completion restores an active rental rather than making the bike available', () => {
  const rental = issue();
  const repair = repairs.create({ bikeId: 'bike', faultType: 'CLIENT_FAULT', description: 'Замена колодок', laborCost: 300 });
  assert.equal(repair.clientId, 'client');
  repairs.complete(repair.id, { partsUsed: [{ partId: 'part1', quantity: 1 }], paymentMethod: 'CASH' });
  assert.equal(db.bikes[0].status, 'RENTED');
  assert.equal(bikes.getAll()[0].activeRental.id, rental.id);
  assert.equal(db.parts[0].quantity, 4);
  const payment = finance.getAll().find((p) => p.type === 'REPAIR');
  assert.equal(payment.repair.id, repair.id);
  assert.equal(payment.clientName, 'Иван Иванов');
});

test('a rejected repair cannot partially consume stock in memory or on disk', () => {
  const repair = repairs.create({ bikeId: 'bike', faultType: 'COMPANY_EXPENSE', description: 'Ремонт' });
  const before = JSON.stringify(db);
  const diskBefore = fs.readFileSync(store.DB_FILE, 'utf8');
  assert.throws(() => repairs.complete(repair.id, { partsUsed: [{ partId: 'part1', quantity: 1 }, { partId: 'part2', quantity: 1 }] }), /Недостаточно/);
  assert.equal(JSON.stringify(db), before);
  assert.equal(fs.readFileSync(store.DB_FILE, 'utf8'), diskBefore);
});

test('a rejected sale cannot partially consume stock or sell the bike', async () => {
  const before = JSON.stringify(db);
  const diskBefore = fs.readFileSync(store.DB_FILE, 'utf8');
  await assert.rejects(shop.createOrder({ customerType: 'GUEST', customerName: 'Покупатель', paymentMethod: 'CASH', items: [{ itemType: 'BIKE', itemId: 'bike', quantity: 1 }, { itemType: 'PART', itemId: 'part2', quantity: 1 }] }), /Недостаточно/);
  assert.equal(JSON.stringify(db), before);
  assert.equal(fs.readFileSync(store.DB_FILE, 'utf8'), diskBefore);
});

test('duplicate parts in a repair cannot bypass the stock limit', () => {
  const repair = repairs.create({ bikeId: 'bike', faultType: 'COMPANY_EXPENSE', description: 'Ремонт' });
  assert.throws(() => repairs.complete(repair.id, { partsUsed: [{ partId: 'part1', quantity: 3 }, { partId: 'part1', quantity: 3 }] }), /Недостаточно/);
  assert.equal(db.parts[0].quantity, 5);
});

test('return with defects creates a repair linked to the original customer', () => {
  const rental = issue();
  const result = completeReturn(rental.id, { bikeCondition: 'NEEDS_REPAIR', defectDescription: 'Не работает тормоз', faultType: 'CLIENT_FAULT' });
  assert.equal(result.repairOrder.clientId, 'client');
  assert.equal(db.bikes[0].status, 'IN_MAINTENANCE');
  assert.equal(db.outfits[0].status, 'IN_STOCK');
});

test('loyalty uses actual income once, excludes deposits and does not count future days', () => {
  const rental = issue();
  repairs.create({ itemType: 'EXTERNAL_DEVICE', clientId: 'client', faultType: 'CLIENT_FAULT', description: 'Расчёт ремонта', laborCost: 5000 });
  finance.create({ clientId: 'client', type: 'REPAIR', amount: 100, method: 'CASH' });
  const client = clients.getById('client');
  assert.equal(client.totalSpent, 800);
  assert.equal(client.totalRentalDays, 0);
  store.setSystemTime('2026-10-25T12:00:00Z');
  assert.equal(clients.getById('client').totalRentalDays, 3);
  completeReturn(rental.id);
  store.setSystemTime('2026-11-01T12:00:00Z');
  assert.equal(clients.getById('client').totalRentalDays, 3);
});

test('shop and workshop use the same normalized customer phone', async () => {
  const order = await shop.createOrder({ customerType: 'EXTERNAL', customerName: 'Иван Иванов', customerPhone: '8 999 123 45 67', paymentMethod: 'CASH', items: [{ itemType: 'PART', itemId: 'part1', quantity: 1 }] });
  const repair = repairs.create({ itemType: 'EXTERNAL_DEVICE', clientName: 'Иван Иванов', clientPhone: '8 999 123 45 67', faultType: 'CLIENT_FAULT', description: 'Ремонт', laborCost: 300 });
  repairs.complete(repair.id, { paymentMethod: 'CASH' });
  assert.equal(order.clientId, 'client');
  assert.equal(repair.clientId, 'client');
  assert.equal(db.clients.length, 1);
  assert.equal(clients.getById('client').totalSpent, 500);
});

test('finance and dashboard agree on profit, retail COGS and procurement expenses', async () => {
  finance.create({ type: 'FINE', amount: 50, method: 'CASH' });
  await shop.createOrder({ customerType: 'GUEST', customerName: 'Покупатель', paymentMethod: 'CASH', items: [{ itemType: 'PART', itemId: 'part1', quantity: 1 }] });
  const order = parts.createOrder({ partName: 'Колодки', partId: 'part1', quantity: 1, estimatedPrice: 100 });
  parts.updateOrderStatus(order.id, 'ORDERED');
  const summary = finance.getSummary();
  assert.equal(summary.netMargin, 150);
  assert.equal(summary.totalRevenue, 250);
  assert.equal(summary.retailSales, 200);
  assert.equal(summary.retailCogs, 100);
  assert.equal(summary.partPurchaseExpenses, 100);
  assert.equal(stats.getDashboardStats().financials.netMargin, summary.netMargin);
  assert.equal(stats.getDashboardStats().financials.totalRevenue, summary.totalRevenue);
});

test('historical repair COGS stays fixed when a later procurement changes the part price', () => {
  const repair = repairs.create({ bikeId: 'bike', faultType: 'COMPANY_EXPENSE', description: 'Ремонт' });
  assert.equal(finance.getSummary().totalPartsCost, 0);
  repairs.complete(repair.id, { partsUsed: [{ partId: 'part1', quantity: 1 }] });
  db.parts[0].purchasePrice = 1000;
  assert.equal(finance.getSummary().totalPartsCost, 100);
});

test('procurement receipt is idempotent and status edits synchronize its cash operation', () => {
  const order = parts.createOrder({ partName: 'Колодки', partId: 'part1', quantity: 2, estimatedPrice: 100 });
  parts.updateOrder(order.id, { status: 'ORDERED', actualCost: 300 });
  assert.equal(db.payments.find((p) => p.orderId === order.id).amount, 300);
  parts.updateOrderStatus(order.id, 'RECEIVED');
  assert.equal(db.parts[0].quantity, 7);
  parts.updateOrderStatus(order.id, 'RECEIVED');
  assert.equal(db.parts[0].quantity, 7);
  assert.throws(() => parts.updateOrder(order.id, { quantity: 5 }), /уже оприходована/);
  assert.throws(() => parts.updateOrderStatus(order.id, 'ORDERED'), /Недопустимый/);
});

test('editing a procurement payment updates the original order', () => {
  const order = parts.createOrder({ partName: 'Колодки', partId: 'part1', quantity: 2, estimatedPrice: 100 });
  parts.updateOrderStatus(order.id, 'ORDERED');
  const payment = db.payments.find((p) => p.orderId === order.id);
  finance.update(payment.id, { amount: 300, method: 'CASH' });
  assert.equal(db.partOrders[0].actualCost, 300);
  assert.equal(db.partOrders[0].paymentMethod, 'CASH');
  finance.delete(payment.id);
  assert.equal(db.partOrders[0].paymentId, null);
  assert.equal(db.partOrders[0].actualCost, 0);
});

test('monthly analytics assigns income to its payment month and includes all directions', () => {
  finance.create({ type: 'RENTAL', amount: 500, method: 'CASH', createdAt: '2026-09-15T12:00:00Z' });
  finance.create({ type: 'RETAIL_SALE', amount: 300, method: 'CASH', createdAt: '2026-10-15T12:00:00Z' });
  const result = stats.getDashboardStats();
  assert.equal(result.revenueByMonth.find((m) => m.key === '2026-09').total, 500);
  assert.equal(result.revenueByMonth.find((m) => m.key === '2026-10').retail, 300);
});

test('manual rental payment updates its schedule and appears once in the cash register', () => {
  const rental = issue();
  const payment = finance.create({ rentalId: rental.id, type: 'RENTAL', amount: 700, method: 'CASH' });
  assert.equal(payment.clientId, 'client');
  assert.equal(rentals.getById(rental.id).nextPaymentDue, '2026-11-05T12:00:00.000Z');
  assert.equal(db.payments.filter((p) => p.type === 'RENTAL').length, 2);
});

test('bank import preserves the payment date and repeated import does not add money or days', () => {
  const rental = issue();
  const request = { amount: 700, method: 'BANK_TRANSFER', createdAt: '2026-10-21T12:00:00Z', externalReference: 'bank:sample:0' };
  rentals.renew(rental.id, request);
  const due = rentals.getById(rental.id).nextPaymentDue;
  rentals.renew(rental.id, request);
  assert.equal(db.payments.filter((p) => p.externalReference === request.externalReference).length, 1);
  assert.equal(db.payments.find((p) => p.externalReference === request.externalReference).createdAt, '2026-10-21T12:00:00.000Z');
  assert.equal(rentals.getById(rental.id).nextPaymentDue, due);
});

test('the API rejects forged user headers and accepts a verified session', async () => {
  const forged = await fetch(`${apiUrl}/clients`, { headers: { 'x-user-id': 'usr-bxleth', 'x-user-role': 'ADMIN' } });
  assert.equal(forged.status, 401);
  const { token } = AuthService.login('bxleth', 'admin');
  const result = await fetch(`${apiUrl}/clients`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(result.status, 200);
  assert.equal((await result.json())[0].fullName, 'Иван Иванов');
});

test('trusted-device login works and password changes revoke both session types', () => {
  const result = AuthService.login('bxleth', 'admin', true);
  assert.ok(result.trustedDeviceToken);
  assert.equal(AuthService.trustedLogin(result.trustedDeviceToken).user.id, 'usr-bxleth');
  assert.ok(db.users[0].passwordHash.startsWith('scrypt:'));
  db.users[0].passwordHash = 'changed-password';
  assert.throws(() => authenticateSession(result.token), /отозван/);
  assert.throws(() => AuthService.trustedLogin(result.trustedDeviceToken), /отозван/);
});

test('editing employee identity keeps payroll linked through its permanent ID', async () => {
  const { token } = AuthService.login('bxleth', 'admin');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const createdResponse = await fetch(`${apiUrl}/users`, { method: 'POST', headers, body: JSON.stringify({ login: 'manager', fullName: 'Алексей Смирнов', phone: '+79995553322', password: 'test-password', role: 'MANAGER', salaryAmount: 0 }) });
  assert.equal(createdResponse.status, 201);
  const user = await createdResponse.json();
  assert.equal(user.salaryAmount, 0);
  assert.ok(user.employeeId);
  const updateResponse = await fetch(`${apiUrl}/users/${user.id}`, { method: 'PATCH', headers, body: JSON.stringify({ fullName: 'Сергей Морозов', phone: '+79992221133', salaryAmount: 20000 }) });
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json();
  assert.equal(updated.employeeId, user.employeeId);
  assert.equal(db.employees.find((e) => e.id === user.employeeId).fullName, 'Сергей Морозов');
  assert.equal(db.employees.find((e) => e.id === user.employeeId).salaryAmount, 20000);
  assert.equal(updated.password, undefined);
});

test('master can load repair reference data but cannot read cash or manage employees', async () => {
  db.users.push({ id: 'master', fullName: 'Дмитрий Кузнецов', email: 'master@test.invalid', passwordHash: 'test', role: 'MECHANIC', accessLevelId: 'lvl-master', isActive: true });
  const token = issueSession(db.users.find((u) => u.id === 'master'));
  const headers = { Authorization: `Bearer ${token}` };
  assert.equal((await fetch(`${apiUrl}/clients`, { headers })).status, 200);
  assert.equal((await fetch(`${apiUrl}/repairs`, { headers })).status, 200);
  assert.equal((await fetch(`${apiUrl}/payments`, { headers })).status, 403);
  assert.equal((await fetch(`${apiUrl}/users`, { headers })).status, 403);
  const dashboard = await (await fetch(`${apiUrl}/dashboard/stats`, { headers })).json();
  assert.equal(dashboard.financials.netMargin, undefined);
});

test('failed cloud persistence retains dirty local data and blocks stale synchronization', async () => {
  db.clients[0].fullName = 'Сергей Морозов';
  supabaseAdapter.saveToCloud = async () => { throw new Error('cloud unavailable'); };
  await assert.rejects(store.flushDb(true), /cloud unavailable/);
  let called = false;
  supabaseAdapter.syncIfOutdated = async () => { called = true; return store.createDefaultEmptyDb(); };
  assert.equal(await store.checkAndSyncCloudDb(true), false);
  assert.equal(called, false);
  assert.equal(db.clients[0].fullName, 'Сергей Морозов');
  supabaseAdapter.saveToCloud = async () => {};
  await store.flushDb(true);
});

test('a mutation during cloud save remains dirty until its own save finishes', async () => {
  let release;
  supabaseAdapter.saveToCloud = () => new Promise((resolve) => { release = resolve; });
  const flushing = store.flushDb(true);
  db.clients[0].fullName = 'Сергей Морозов';
  release();
  await flushing;
  let synchronized = false;
  supabaseAdapter.syncIfOutdated = async () => { synchronized = true; return null; };
  await store.checkAndSyncCloudDb(true);
  assert.equal(synchronized, false);
  supabaseAdapter.saveToCloud = async () => {};
  await store.flushDb(true);
});

test('manual receipt number passes through the HTTP controller and cannot be duplicated', async () => {
  const { token } = AuthService.login('bxleth', 'admin');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const payload = { customerType: 'CLIENT', clientId: 'client', customerName: 'Иван Иванов', paymentMethod: 'CASH', orderNumber: 'ЧЕК-001', items: [{ itemType: 'PART', itemId: 'part1', quantity: 1 }] };
  const result = await fetch(`${apiUrl}/shop/orders`, { method: 'POST', headers, body: JSON.stringify(payload) });
  assert.equal(result.status, 201);
  assert.equal((await result.json()).order.orderNumber, 'ЧЕК-001');
  const duplicate = await fetch(`${apiUrl}/shop/orders`, { method: 'POST', headers, body: JSON.stringify(payload) });
  assert.equal(duplicate.status, 400);
  assert.equal(db.parts[0].quantity, 4);
});

test('stored documents are readable with a session cookie and reject unauthenticated access', async () => {
  const { token } = AuthService.login('bxleth', 'admin');
  const body = new FormData();
  body.set('file', new Blob(['%PDF-1.4\n'], { type: 'application/pdf' }), 'passport.pdf');
  const uploaded = await fetch(`${apiUrl}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
  assert.equal(uploaded.status, 201);
  const document = await uploaded.json();
  const url = apiUrl.replace(/\/api$/, '') + document.url;
  assert.equal((await fetch(url)).status, 401);
  const download = await fetch(url, { headers: { Cookie: `crm_session=${token}` } });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), '%PDF-1.4\n');
});

test('linked historical cards cannot be deleted and sold assets cannot reenter the fleet', () => {
  const rental = issue({ tariffId: 'buyout' });
  rentals.renew(rental.id, { amount: 3000, method: 'CASH' });
  assert.throws(() => clients.delete('client'), /связанные документы/);
  assert.throws(() => bikes.delete('bike'), /истории/);
  assert.throws(() => batteries.delete('bat2'), /истории/);
  assert.throws(() => bikes.update('bike', { status: 'AVAILABLE' }), /выбыла/);
});

test('audit history preserves real employee names and uses system dates', () => {
  const { HistoryRepository } = require('../dist/repositories/history.repository.js');
  db.users.push({ id: 'manager', fullName: 'Алексей Смирнов', email: 'manager@test.invalid', passwordHash: 'test', role: 'MANAGER', isActive: true });
  HistoryRepository.logAction({ category: 'SYSTEM', action: 'TEST', title: 'Проверка автора', actorName: 'Алексей Смирнов (Менеджер)' });
  const result = HistoryRepository.getAll({ search: 'Проверка автора' });
  assert.equal(result.items[0].actor, 'Алексей Смирнов (Менеджер)');
  assert.equal(result.items[0].timestamp, '2026-10-22T12:00:00.000Z');
  const loaded = store.sanitizeLoadedDb(JSON.parse(JSON.stringify(db)));
  assert.equal(loaded.auditLogs[0].actorName, 'Алексей Смирнов (Менеджер)');
});

test('returning a bike with an open repair does not free it or create a duplicate repair', () => {
  const rental = issue();
  const repair = repairs.create({ bikeId: 'bike', faultType: 'COMPANY_EXPENSE', description: 'Ремонт' });
  const result = completeReturn(rental.id);
  assert.equal(result.repairOrder.id, repair.id);
  assert.equal(db.repairs.length, 1);
  assert.equal(db.bikes[0].status, 'IN_MAINTENANCE');
});

test('a missing buyout total falls back to the complete equipment price rather than one installment', () => {
  db.tariffs.find((tariff) => tariff.id === 'buyout').totalBuyoutPrice = undefined;
  const rental = issue({ tariffId: 'buyout' });
  assert.equal(rental.totalBuyoutPrice, 110000);
  assert.equal(rental.status, 'ACTIVE');
});

test('PostgreSQL writes preserve exact version precision and reject stale snapshots', async () => {
  const adapter = new supabaseAdapter.constructor();
  adapter.mode = 'SUPABASE_POSTGRES';
  adapter.isConnected = true;
  adapter.lastSyncedAt = '2026-10-22 12:00:00.123456+00';
  let conditionalWrite;
  const remote = store.createDefaultEmptyDb();
  adapter.pgPool = { query: async (sql, values) => {
    if (sql.startsWith('UPDATE')) { conditionalWrite = { sql, values }; return { rows: [] }; }
    return { rows: [{ data: remote, updated_at: '2026-10-22 12:00:00.987654+00' }] };
  } };
  await assert.rejects(adapter.saveToCloud(JSON.parse(JSON.stringify(db))), (error) => error.code === 'CRM_STORE_CONFLICT' && error.cloudData.clients.length === 0);
  assert.ok(conditionalWrite.sql.includes('updated_at = $2::timestamptz'));
  assert.equal(conditionalWrite.values[1], '2026-10-22 12:00:00.123456+00');
});

test('an HTTP storage conflict rolls back the unconfirmed operation and returns current cloud data', async () => {
  const { token } = AuthService.login('bxleth', 'admin');
  await store.flushDb(true);
  const remote = JSON.parse(JSON.stringify(db));
  supabaseAdapter.saveToCloud = async () => {
    const error = new Error('Данные изменены другим сотрудником');
    error.code = 'CRM_STORE_CONFLICT';
    error.cloudData = remote;
    throw error;
  };
  const response = await fetch(`${apiUrl}/clients`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: 'Сергей Морозов', phone: '+79995551133' }) });
  assert.equal(response.status, 409);
  assert.equal(db.clients.length, 1);
  supabaseAdapter.saveToCloud = async () => {};
});

test('registration address survives client creation, updates and rental views', async () => {
  const { token } = AuthService.login('bxleth', 'admin');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const response = await fetch(`${apiUrl}/clients`, { method: 'POST', headers, body: JSON.stringify({ fullName: 'Сергей Морозов', phone: '+79992223344', registrationAddress: '  г. Москва, ул. Лесная, д. 10, кв. 5  ' }) });
  assert.equal(response.status, 201);
  const customer = await response.json();
  assert.equal(customer.registrationAddress, 'г. Москва, ул. Лесная, д. 10, кв. 5');
  const rental = issue({ clientId: customer.id, registrationAddress: 'г. Москва, ул. Лесная, д. 12' });
  assert.equal(rentals.getById(rental.id).client.registrationAddress, 'г. Москва, ул. Лесная, д. 12');
  const updated = await fetch(`${apiUrl}/clients/${customer.id}`, { method: 'PATCH', headers, body: JSON.stringify({ registrationAddress: '' }) });
  assert.equal(updated.status, 200);
  assert.equal(clients.getById(customer.id).registrationAddress, null);
  assert.equal(rentals.getById(rental.id).client.registrationAddress, null);
});

test('optimized bike photos persist as small metadata and unused files can be removed', async () => {
  const { token } = AuthService.login('bxleth', 'admin');
  const headers = { Authorization: `Bearer ${token}` };
  const image = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');
  const body = new FormData();
  body.set('image', new Blob([image], { type: 'image/webp' }), 'bike.webp');
  body.set('thumbnail', new Blob([image], { type: 'image/webp' }), 'thumb.webp');
  const upload = await fetch(`${apiUrl}/bikes/photos`, { method: 'POST', headers, body });
  assert.equal(upload.status, 201);
  const { photo } = await upload.json();
  assert.equal(photo.width, 1);
  assert.equal(photo.height, 1);
  const imageResponse = await fetch(apiUrl.replace(/\/api$/, '') + photo.thumbnailUrl, { headers });
  assert.equal(imageResponse.status, 200);
  assert.ok(imageResponse.headers.get('cache-control').includes('private'));
  assert.equal(imageResponse.headers.get('content-type'), 'image/webp');
  const changed = await fetch(`${apiUrl}/bikes/bike`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ photos: [photo] }) });
  assert.equal(changed.status, 200);
  assert.equal(bikes.getAll()[0].photos[0].id, photo.id);
  const stored = JSON.parse(fs.readFileSync(store.DB_FILE, 'utf8'));
  assert.ok(JSON.stringify(stored.bikes[0].photos).length < 500);
  assert.equal(JSON.stringify(stored.bikes[0].photos).includes('base64'), false);
  assert.equal((await fetch(`${apiUrl}/bikes/photos/${photo.id}`, { method: 'DELETE', headers })).status, 409);
  await fetch(`${apiUrl}/bikes/bike`, { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ photos: [] }) });
  assert.equal((await fetch(`${apiUrl}/bikes/photos/${photo.id}`, { method: 'DELETE', headers })).status, 200);
  assert.equal(fs.existsSync(path.join(process.env.CRM_UPLOADS_DIR, `bike_${photo.id}.webp`)), false);
  assert.equal(fs.existsSync(path.join(process.env.CRM_UPLOADS_DIR, `bike_${photo.id}_thumb.webp`)), false);
});

test('photo limits reject large images and binary data in the CRM record', () => {
  const { validateBikePhoto } = require('../dist/services/bikePhoto.service.js');
  assert.throws(() => validateBikePhoto(Buffer.alloc(401 * 1024)), /слишком большая/);
  const { BikePhotosDto } = require('../dist/dtos/schemas.dto.js');
  const id = '11111111-1111-4111-8111-111111111111';
  const photo = { id, url: `/uploads/bike_${id}.webp`, thumbnailUrl: `/uploads/bike_${id}_thumb.webp`, width: 1600, height: 1200, sizeBytes: 300000 };
  assert.equal(BikePhotosDto.safeParse([photo]).success, true);
  assert.equal(BikePhotosDto.safeParse(Array(9).fill(photo)).success, false);
  assert.equal(BikePhotosDto.safeParse([{ ...photo, url: 'data:image/webp;base64,AAAA' }]).success, false);
});

test('document snapshots preserve issuance data and survive changes to related cards', () => {
  db.clients[0].registrationAddress = 'г. Москва, ул. Лесная, д. 10';
  db.settings.paymentDetails = { recipientName: 'ИП Иванов', inn: '123456789012' };
  const rental = issue({ firstPaymentAmount: 650, durationDays: 10 });
  const handover = db.documents.find((d) => d.type === 'HANDOVER_ACT');
  assert.equal(db.documents.length, 2);
  assert.equal(handover.reconstructed, false);
  assert.equal(handover.amount, 650);
  assert.equal(handover.snapshot.rentalData.bike.battery.serialNumber, 'BAT-001');
  assert.equal(handover.snapshot.rentalData.totalPaidForBuyout, 650);
  const original = JSON.stringify(handover);
  db.clients[0].fullName = 'Сергей Морозов';
  db.clients[0].registrationAddress = 'г. Самара';
  db.settings.paymentDetails.recipientName = 'Новые реквизиты';
  db.models[0].name = 'Другая модель';
  db.tariffs[0].price = 1500;
  db.outfits[0].name = 'Другой замок';
  rentals.renew(rental.id, { amount: 650, durationDays: 7, method: 'CASH' });
  assert.equal(JSON.stringify(handover), original);
  assert.equal(db.documents.length, 2);
  assert.equal(handover.snapshot.rentalData.client.registrationAddress, 'г. Москва, ул. Лесная, д. 10');
});

test('return acts record equipment condition, defects, deductions and linked workshop order', () => {
  const rental = issue();
  completeReturn(rental.id, { bikeCondition: 'NEEDS_REPAIR', defectDescription: 'Повреждено колесо', outfitReturns: [{ outfitId: 'outfit', condition: 'DAMAGED', deductionAmount: 300 }] });
  const act = db.documents.find((d) => d.type === 'RETURN_ACT');
  assert.equal(act.amount, 700);
  assert.ok(act.snapshot.notes.includes('Повреждено колесо'));
  assert.ok(act.snapshot.equipment.some((e) => e.number.includes('Повреждено')));
  assert.ok(act.snapshot.details.some((d) => d.label === 'Удержано' && d.value === '300 ₽'));
  assert.ok(db.documents.some((d) => d.type === 'REPAIR_ORDER' && d.sourceId === db.repairs[0].id));
});

test('buyout and later deposit settlement have separate dates and asset lists', () => {
  const rental = issue({ tariffId: 'buyout' });
  rentals.renew(rental.id, { amount: 3000, method: 'CASH', isBuyoutFinal: true });
  const buyout = db.documents.find((d) => d.type === 'BUYOUT_ACT');
  assert.equal(buyout.amount, 4000);
  assert.equal(buyout.snapshot.equipment.length, 3);
  assert.equal(buyout.snapshot.equipment.some((e) => e.name === 'Замок'), false);
  store.setSystemTime('2026-10-25T12:00:00Z');
  completeReturn(rental.id);
  assert.equal(buyout.issuedAt, '2026-10-22T12:00:00.000Z');
  assert.equal(db.documents.find((d) => d.type === 'RETURN_ACT').issuedAt, '2026-10-25T12:00:00.000Z');
});

test('sale receipts and completed repair acts freeze prices, names and original intake', async () => {
  const sale = await shop.createOrder({ customerType: 'COURIER', clientId: 'client', paymentMethod: 'CASH', items: [{ itemType: 'PART', itemId: 'part1', quantity: 1 }] });
  const receipt = db.documents.find((d) => d.type === 'SALE_RECEIPT');
  const original = JSON.stringify(receipt);
  sale.items[0].name = 'Изменено';
  sale.totalAmount = 1;
  db.parts[0].clientPrice = 350;
  assert.equal(JSON.stringify(receipt), original);
  const repair = repairs.create({ bikeId: 'bike', faultType: 'CLIENT_FAULT', description: 'Замена колодок', laborCost: 300 });
  const intake = JSON.stringify(db.documents.find((d) => d.type === 'REPAIR_ORDER'));
  repairs.complete(repair.id, { partsUsed: [{ partId: 'part1', quantity: 1 }], paymentMethod: 'CASH' });
  const act = db.documents.find((d) => d.type === 'REPAIR_ACT');
  assert.equal(act.amount, 650);
  assert.equal(act.snapshot.items[0].name, 'Колодки');
  assert.equal(JSON.stringify(db.documents.find((d) => d.type === 'REPAIR_ORDER')), intake);
  db.parts[0].name = 'Новая деталь';
  assert.equal(act.snapshot.items[0].name, 'Колодки');
});

test('legacy documents backfill once, persist and remain readable after source removal', async () => {
  const { DocumentRepository: documents } = require('../dist/repositories/document.repository.js');
  const rental = issue();
  completeReturn(rental.id);
  db.documents = [];
  const token = issueSession(db.users[0]);
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch(`${apiUrl}/documents`, { headers });
  assert.equal(response.status, 200);
  const list = await response.json();
  assert.equal(list.total, 3);
  assert.equal(list.items.every((d) => d.reconstructed && !('snapshot' in d)), true);
  const saved = JSON.parse(fs.readFileSync(store.DB_FILE, 'utf8')).documents;
  assert.equal(saved.length, 3);
  assert.equal(documents.backfill(), false);
  db.rentals = [];
  const archived = await fetch(`${apiUrl}/documents/${list.items[0].id}`, { headers });
  assert.equal(archived.status, 200);
  assert.equal((await archived.json()).snapshot.client.fullName, 'Иван Иванов');
});

test('document API inherits source permissions and hides passport data from restricted roles', async () => {
  issue();
  const repair = repairs.create({ itemType: 'EXTERNAL_DEVICE', customItemName: 'Велосипед клиента', clientId: 'client', faultType: 'CLIENT_FAULT', description: 'Диагностика' });
  db.users.push({ id: 'documents-master', fullName: 'Дмитрий Кузнецов', email: 'master@test.invalid', passwordHash: 'test', role: 'MECHANIC', accessLevelId: 'lvl-master', isActive: true });
  const master = db.users.find((u) => u.role === 'MECHANIC');
  const level = db.accessLevels.find((l) => l.id === master.accessLevelId);
  level.permissions.rentals = { visible: false, canEdit: false, canDelete: false };
  level.permissions.shop = { visible: false, canEdit: false, canDelete: false };
  level.permissions.repairs = { visible: true, canEdit: true, canDelete: false };
  const headers = { Authorization: `Bearer ${issueSession(master)}` };
  const list = await (await fetch(`${apiUrl}/documents`, { headers })).json();
  assert.equal(list.total, 1);
  assert.equal(list.items[0].sourceId, repair.id);
  assert.equal((await fetch(`${apiUrl}/documents/${db.documents.find((d) => d.type === 'HANDOVER_ACT').id}`, { headers })).status, 404);
  assert.equal((await fetch(`${apiUrl}/documents`)).status, 401);
  level.permissions.rentals.visible = true;
  level.permissions.clients = { visible: false };
  db.clients[0].passportNumber = '123456';
  db.documents.find((d) => d.type === 'HANDOVER_ACT').snapshot.client.passportNumber = '123456';
  const handover = await (await fetch(`${apiUrl}/documents/${db.documents.find((d) => d.type === 'HANDOVER_ACT').id}`, { headers })).json();
  assert.equal('passportNumber' in handover.snapshot.client, false);
  level.permissions.documents = { visible: false };
  assert.equal((await fetch(`${apiUrl}/documents`, { headers })).status, 403);
});

test('document filters support normalized phone, dates, types and pagination', async () => {
  const { DocumentRepository: documents } = require('../dist/repositories/document.repository.js');
  issue();
  const owner = db.users[0];
  assert.equal(documents.getAll(owner, { search: '9991234567' }).total, 2);
  assert.equal(documents.getAll(owner, { search: 'EV-001', type: 'HANDOVER_ACT' }).total, 1);
  assert.equal(documents.getAll(owner, { from: '2026-10-23' }).total, 0);
  const source = JSON.parse(JSON.stringify(db.documents[0]));
  for (let i = 0; i < 35; i++) db.documents.push({ ...source, id: `archive-${i}`, number: `ДОГ-${i}` });
  const page = documents.getAll(owner, { page: 2 });
  assert.equal(page.total, 37);
  assert.equal(page.items.length, 7);
  const headers = { Authorization: `Bearer ${issueSession(owner)}` };
  for (const query of ['from=2026-11-01&to=2026-10-01', 'page=0', 'type=UNKNOWN', 'from=invalid']) {
    assert.equal((await fetch(`${apiUrl}/documents?${query}`, { headers })).status, 400);
  }
});

test('restoring a receipt preserves its recorded customer and cashier rather than the reader', async () => {
  const sale = await shop.createOrder({ customerType: 'CLIENT', clientId: 'client', paymentMethod: 'CASH', items: [{ itemType: 'PART', itemId: 'part1', quantity: 1 }] });
  db.payments.find((p) => p.orderId === sale.id).cashierId = db.users[0].id;
  db.clients[0].fullName = 'Сергей Морозов';
  db.documents = [];
  db.users.push({ id: 'reader', fullName: 'Алексей Смирнов', email: 'reader@test.invalid', passwordHash: 'test', role: 'MANAGER', accessLevelId: 'lvl-manager', isActive: true });
  const headers = { Authorization: `Bearer ${issueSession(db.users.find((u) => u.id === 'reader'))}` };
  const response = await fetch(`${apiUrl}/documents/doc-sale_receipt-${sale.id}`, { headers });
  assert.equal(response.status, 200);
  const doc = await response.json();
  assert.equal(doc.clientName, 'Иван Иванов');
  assert.equal(doc.snapshot.client.fullName, 'Иван Иванов');
  assert.equal(doc.snapshot.actor, db.users[0].fullName);
  assert.equal(doc.reconstructed, true);
});

test('failed issuance rolls back document captures together with the source operation', () => {
  const { DocumentRepository: documents } = require('../dist/repositories/document.repository.js');
  const originalCapture = documents.capture;
  const before = JSON.stringify(db);
  documents.capture = function (type, ...args) {
    if (type === 'HANDOVER_ACT') throw new Error('Проверка отката документа');
    return originalCapture.call(this, type, ...args);
  };
  try { assert.throws(() => issue(), /Проверка отката/); }
  finally { documents.capture = originalCapture; }
  assert.equal(JSON.stringify(db), before);
});

after(async () => {
  await store.flushDb(true);
  await new Promise((resolve) => httpServer.close(resolve));
  assert.ok(testDir.startsWith(path.join(os.tmpdir(), 'ebike-crm-integration-')));
});
process.once('exit', () => fs.rmSync(testDir, { recursive: true, force: true }));
