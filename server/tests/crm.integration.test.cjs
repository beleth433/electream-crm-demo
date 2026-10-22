const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ebike-crm-integration-'));
process.env.CRM_DATA_DIR = testDir;
const store = require('../dist/repositories/db.js');
const { supabaseAdapter } = require('../dist/repositories/supabase.adapter.js');
// No connection is initialized; persistence never reaches the real cloud.
supabaseAdapter.saveToCloud = async () => {};
supabaseAdapter.flush = async () => {};
const { RentalRepository: rentals } = require('../dist/repositories/rental.repository.js');
const { RepairRepository: repairs } = require('../dist/repositories/repair.repository.js');
const { BatteryRepository: batteries } = require('../dist/repositories/battery.repository.js');
const { BikeRepository: bikes } = require('../dist/repositories/bike.repository.js');
const { shopRepository: shop } = require('../dist/repositories/shop.repository.js');
const { FinanceRepository: finance } = require('../dist/repositories/finance.repository.js');
const { ClientRepository: clients } = require('../dist/repositories/client.repository.js');
const { PartRepository: parts } = require('../dist/repositories/part.repository.js');
const { StatsRepository: stats } = require('../dist/repositories/stats.repository.js');
let db;

beforeEach(async () => {
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

after(async () => {
  await store.flushDb(true);
  assert.ok(testDir.startsWith(path.join(os.tmpdir(), 'ebike-crm-integration-')));
});
process.once('exit', () => fs.rmSync(testDir, { recursive: true, force: true }));
