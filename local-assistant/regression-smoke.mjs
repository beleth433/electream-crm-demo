import assert from 'node:assert/strict';
import { generatePlan } from './model.mjs';
const context = { modules: ['clients', 'bikes', 'batteries'], clients: [], bikeModels: [{ id: 'test-model', name: 'test' }, { id: 'amiko', name: 'Amiko U2 Premium' }], batteryModels: [] };
const names = ['Александр Александрович Пушкин', 'Иван Петров Сергеевич', 'Станислав Дворовский Олегович'];
const original = `Внеси в базу трёх клиентов. ${names.join(', ')}.`;
const examples = [
  { text: original, check(p) {
    assert.ok(p.questions.length); assert.ok(!p.actions.some(a => a.kind.startsWith('add_')));
    for (const name of names) assert.ok(p.questions.some(q => q.includes(name)), 'Missing clarification for ' + name);
  } },
  { text: original + '\nУточнение: Все трое — курьеры. Телефон первого +7 988 961 29 03. Второй номер +7 989 261 19 33. Третий номер +7 912 178 24 70.', check(p) {
    assert.equal(p.questions.length, 0); assert.equal(p.actions.length, 3);
    const expected = ['79889612903', '79892611933', '79121782470'];
    names.forEach((name, i) => { const a = p.actions.find(a => a.fullName === name); assert.ok(a, name); assert.equal(a.phone.replace(/\D/g, ''), expected[i]); assert.equal(a.clientType, 'COURIER'); });
  } },
  { text: original + '\nУточнение: Все трое — курьеры. Первый номер +7 988 961 2903. Второй номер +7 98926 1193. Третий номер +7 912 178 2470.', check(p) {
    assert.ok(p.questions.some(q => q.includes(names[1]) && q.includes('11 цифр'))); assert.ok(!p.actions.some(a => a.fullName === names[1]));
  } },
  { text: 'Добавь три велосипеда Amiko U2 Premium. Уточнение: стоимость без АКБ 60 тысяч у каждого.', check(p) {
    assert.ok(p.questions.some(q => /60000/.test(q))); assert.ok(!p.actions.some(a => a.modelId === 'test-model'));
  } },
  { text: 'Добавь три велосипеда Amiko U2 Premium. Уточнение: закупочная цена без АКБ 60 тысяч за каждый.', check(p) {
    assert.equal(p.questions.length, 0); assert.equal(p.actions.length, 1); assert.equal(p.actions[0].modelId, 'amiko'); assert.equal(p.actions[0].purchasePrice, 60000); assert.equal(p.actions[0].quantity, 3);
  } },
  { text: 'Добавь три велосипеда Amiko U2 Premium, закупочная цена 60000 рублей за каждый.', context: { ...context, bikeModels: [{ id: 'test-model', name: 'test' }] }, check(p) {
    assert.ok(p.questions.length); assert.equal(p.actions.length, 0);
  } },
];
for (const scenario of examples) {
  const start = Date.now();
  const plan = await generatePlan({ text: scenario.text, context: scenario.context || context, model: process.env.CRM_ASSISTANT_MODEL || 'qwen2.5:3b' });
  console.log(JSON.stringify({ seconds: (Date.now() - start) / 1000, text: scenario.text, plan }, null, 2));
  scenario.check(plan);
}
console.log('PASS: 6 real-model regression scenarios; no CRM writes.');
