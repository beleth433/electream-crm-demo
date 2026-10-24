// Optional real-model check. It uses synthetic records and never modifies CRM.
import assert from 'node:assert/strict';
import { generatePlan } from './model.mjs';
const context = {
  modules: ['clients', 'bikes', 'batteries'],
  clients: [{ id: 'existing-client', fullName: 'Иван Иванов', phone: '79991112233', clientType: 'COURIER' }],
  bikeModels: [{ id: 'bike-model', name: 'Minako Monster' }],
  batteryModels: [{ id: 'battery-model', name: 'АКБ 60V 30Ah', voltage: 60, capacityAh: 30 }],
};
const examples = [
  { text: 'Добавь три велосипеда Minako Monster, закупочная цена 45000 рублей за каждый, и четыре АКБ 60 вольт 30 ампер-часов, цену батарей внесу потом.', check: p => {
    assert.equal(p.questions.length, 0); assert.equal(p.actions.length, 2);
    assert.ok(p.actions.some(a => a.kind === 'add_bikes' && a.modelId === 'bike-model' && a.quantity === 3 && a.purchasePrice === 45000));
    assert.ok(p.actions.some(a => a.kind === 'add_batteries' && a.modelId === 'battery-model' && a.quantity === 4 && a.purchasePrice == null));
  } },
  { text: 'Добавь нового курьера Алексей Смирнов, телефон 79992223344, работает в Яндекс Еде. Паспорт и прописку внесу потом.', check: p => {
    assert.equal(p.questions.length, 0); assert.equal(p.actions.length, 1);
    assert.equal(p.actions[0].kind, 'create_client'); assert.equal(p.actions[0].phone, '79992223344'); assert.equal(p.actions[0].clientType, 'COURIER');
    assert.match(p.actions[0].courierService || '', /Яндекс/);
    assert.ok(!p.actions[0].passportNumber && !p.actions[0].registrationAddress);
  } },
  { text: 'Обнови прописку клиента Иван Иванов с телефоном 79991112233: Самара, улица Ленина, дом 10.', check: p => {
    assert.equal(p.questions.length, 0); assert.equal(p.actions.length, 1);
    assert.equal(p.actions[0].kind, 'update_client'); assert.equal(p.actions[0].clientId, 'existing-client'); assert.match(p.actions[0].registrationAddress, /Самара/);
  } },
  { text: 'Добавь нового клиента Дмитрий Кузнецов, телефон пока не знаю.', check: p => { assert.ok(p.questions.length > 0); assert.ok(!p.actions.some(a => a.kind === 'create_client')); } },
];
for (const example of examples) {
  const started = Date.now();
  const plan = await generatePlan({ text: example.text, context, model: process.env.CRM_ASSISTANT_MODEL || 'qwen2.5:3b' });
  console.log(JSON.stringify({ text: example.text, seconds: (Date.now() - started) / 1000, plan }, null, 2));
  example.check(plan);
}
console.log('PASS: 4 real-model scenarios; no CRM writes.');
