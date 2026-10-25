import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startAssistant, crmBase } from './server.mjs';
import { generatePlan, checkRequiredFacts, localOllamaUrl } from './model.mjs';
import { jsonRequest, networkError } from './transport.mjs';
import facts from './facts.cjs';
const listen = server => new Promise(r => server.listen(0, '127.0.0.1', r));
const close = server => new Promise(r => { server.closeAllConnections(); server.close(r); });
test('configuration keeps inference local and requires HTTPS for remote CRM', () => {
  assert.equal(crmBase('https://crm.example/'), 'https://crm.example');
  assert.equal(crmBase('http://127.0.0.1:3000'), 'http://127.0.0.1:3000');
  for (const url of ['http://crm.example', 'https://user:password@crm.example', 'file:///tmp/crm', 'https://crm.example/api']) assert.throws(() => crmBase(url));
  assert.equal(localOllamaUrl(), 'http://127.0.0.1:11434');
  assert.throws(() => localOllamaUrl('https://external-model.example'));
});
test('inference sends context only to loopback and enforces independently supplied facts', async () => {
  let requested;
  const context = { clients: [], bikeModels: [], batteryModels: [] };
  const result = await generatePlan({ text: 'Добавь клиента Иван Иванов, телефон не знаю', context, fetchImpl: async (url, init) => {
    requested = { url, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ message: { content: JSON.stringify({ summary: 'Клиент', questions: [], actions: [{ kind: 'create_client', fullName: 'Иван Иванов', phone: '79995556677', clientType: 'COURIER' }] }) } }) };
  } });
  assert.equal(requested.url, 'http://127.0.0.1:11434/api/chat');
  assert.equal(requested.body.stream, false);
  assert.equal(result.actions.length, 0); assert.ok(result.questions.length);
  assert.ok(!JSON.stringify(requested).includes('Authorization'));
});
test('unknown models and invented client IDs become clarifications instead of operations', () => {
  const p = checkRequiredFacts({ summary: 'План', questions: [], actions: [
    { kind: 'add_bikes', modelId: 'fake', quantity: 3 },
    { kind: 'update_client', clientId: 'fake' },
  ] }, 'Добавь велосипеды', { clients: [], bikeModels: [] });
  assert.equal(p.actions.length, 0); assert.equal(p.questions.length, 2);
});
test('local setup rejects cross-origin writes and exposes neither pairing nor worker credentials', async () => {
  const configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ebike-assistant-local-'));
  const workerToken = 'b'.repeat(64);
  const model = http.createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ models: [{ name: 'qwen2.5:3b' }, { name: 'qwen2.5:7b-instruct-q4_K_M' }] })); });
  let polls = 0, connections = 0;
  const crm = http.createServer(async (req, res) => {
    for await (const chunk of req) {} // Drain the request, without logging secrets.
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/assistant/connect') { connections++; res.end(JSON.stringify({ token: workerToken, deviceId: 'device' })); }
    else {
      assert.equal(req.headers.authorization, `Bearer ${workerToken}`); polls++;
      res.end(JSON.stringify({ job: null }));
    }
  });
  await listen(model); await listen(crm);
  const app = await startAssistant({ port: 0, configDir, pollMs: 20, ollamaUrl: `http://127.0.0.1:${model.address().port}` });
  try {
    assert.equal((await fetch(app.url + '/status')).status, 403);
    const page = await fetch(app.url);
    const cookie = page.headers.get('set-cookie').split(';')[0];
    const body = JSON.stringify({ crmUrl: `http://127.0.0.1:${crm.address().port}`, model: 'qwen2.5:3b', code: 'a'.repeat(32) });
    const post = origin => fetch(app.url + '/connect', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body });
    assert.equal((await post('https://unrelated.example')).status, 403);
    assert.equal((await post(app.url)).status, 200);
    const status = await fetch(app.url + '/status', { headers: { Cookie: cookie } }).then(r => r.json());
    assert.equal(status.connected, true);
    assert.ok(!JSON.stringify(status).includes(workerToken));
    assert.ok(!JSON.stringify(status).includes('a'.repeat(32)));
    for (let i = 0; i < 50 && polls === 0; i++) await new Promise(r => setTimeout(r, 20));
    assert.ok(polls > 0);
    const stored = JSON.parse(await fs.readFile(path.join(configDir, 'connection.json'), 'utf8'));
    assert.equal(stored.token, workerToken);
    const changeModel = (model, origin = app.url) => fetch(app.url + '/model', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ model }) });
    assert.equal((await changeModel('qwen2.5:7b-instruct-q4_K_M', 'https://unrelated.example')).status, 403);
    assert.equal((await changeModel('not-installed')).status, 400);
    assert.equal((await changeModel('qwen2.5:7b-instruct-q4_K_M')).status, 200);
    const updated = JSON.parse(await fs.readFile(path.join(configDir, 'connection.json'), 'utf8'));
    assert.equal(updated.model, 'qwen2.5:7b-instruct-q4_K_M');
    assert.equal(updated.token, stored.token);
    assert.equal(updated.crmUrl, stored.crmUrl);
    assert.equal(updated.deviceId, stored.deviceId);
    assert.equal(connections, 1, 'Changing model must not pair the computer again');
    assert.equal((await changeModel('qwen2.5:3b')).status, 200);
  } finally { await app.close(); await close(crm); await close(model); }
});
test('a catalog model must match the request and client-only commands cannot add equipment', () => {
  const context = { clients: [], bikeModels: [{ id: 'test', name: 'test' }], batteryModels: [] };
  for (const text of ['Добавь три велосипеда Amiko U2 Premium', 'Добавь трёх клиентов']) {
    const p = checkRequiredFacts({ summary: 'План', questions: [], actions: [{ kind: 'add_bikes', modelId: 'test', quantity: 3 }] }, text, context);
    assert.equal(p.actions.length, 0); assert.ok(p.questions.length);
  }
});
test('dictated phone boundaries, Russian thousands and unspecified prices are validated independently', () => {
  assert.equal(facts.phone('+7 98926 1193').valid, false);
  assert.equal(facts.phone('+7 989 261 1933').valid, true);
  assert.equal(facts.phoneInText('79991234567', 'Первый +7 999 123 45 67; второй +7 900 111 22 33'), true);
  assert.equal(facts.phoneInText('56779001112', 'Первый +7 999 123 45 67; второй +7 900 111 22 33'), false);
  assert.deepEqual(facts.money('Стоимость 60 тысяч за каждый'), [60000]);
  assert.deepEqual(facts.money('Добавь 2 клиентов и 3 велосипеда'), []);
  assert.equal(facts.unitPurchasePrice('Закупочная цена 60 тысяч за каждый'), 60000);
  assert.equal(facts.unitPurchasePrice('Общая закупочная цена за все 60 тысяч'), null);
  const p = checkRequiredFacts({ summary: 'План', questions: [], actions: [{ kind: 'add_bikes', modelId: 'a', quantity: 3 }] }, 'Добавь три велосипеда Amiko. Стоимость 60 тысяч каждого.', { bikeModels: [{ id: 'a', name: 'Amiko' }] });
  assert.ok(p.questions.some(q => /60000/.test(q)));
});
test('CONNECT proxy carries CRM auth only inside the tunnel and timeouts have an actionable message', async () => {
  const sockets = new Set();
  const target = http.createServer(async (req, res) => {
    for await (const chunk of req) {}
    assert.equal(req.headers.authorization, 'Bearer test-worker');
    assert.equal(req.headers['proxy-authorization'], undefined);
    res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}');
  });
  const proxy = http.createServer();
  let connected = false;
  proxy.on('connect', (req, client, head) => {
    assert.equal(req.headers['proxy-authorization'], 'Basic ' + Buffer.from('user:secret').toString('base64'));
    connected = true; sockets.add(client);
    const upstream = net.connect(target.address().port, '127.0.0.1', () => {
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      client.pipe(upstream); upstream.pipe(client);
    }); sockets.add(upstream);
  });
  await listen(target); await listen(proxy);
  try {
    const result = await jsonRequest(`http://127.0.0.1:${target.address().port}/api/work`, {}, 'test-worker', { proxyUrl: `http://user:secret@127.0.0.1:${proxy.address().port}` });
    assert.deepEqual(result, { ok: true }); assert.equal(connected, true);
    assert.match(networkError({ code: 'ETIMEDOUT' }), /прокси/);
  } finally { for (const socket of sockets) socket.destroy(); await close(proxy); await close(target); }
});
test('a lost result upload retries the proposal without another inference or CRM edits', async () => {
  const configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ebike-assistant-retry-'));
  let inference = 0, uploads = 0, claimed = false;
  let releaseInference;
  const inferenceGate = new Promise(resolve => { releaseInference = resolve; });
  const model = http.createServer(async (req, res) => {
    for await (const chunk of req) {}
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/tags') return res.end('{"models":[{"name":"qwen2.5:3b"}]}');
    inference++; await inferenceGate;
    res.end(JSON.stringify({ message: { content: JSON.stringify({ summary: 'Предложение', questions: ['Уточните телефон'], actions: [] }) } }));
  });
  const crm = http.createServer(async (req, res) => {
    for await (const chunk of req) {}
    res.setHeader('Content-Type', 'application/json');
    if (req.url.endsWith('/connect')) return res.end(JSON.stringify({ token: 'b'.repeat(64) }));
    if (req.url.endsWith('/result')) { if (++uploads === 1) return req.socket.destroy(); return res.end('{"ok":true}'); }
    if (!claimed) { claimed = true; return res.end(JSON.stringify({ job: { id: 'job', lease: 'lease', text: 'Добавь клиента Иван Иванов' }, context: { clients: [], bikeModels: [], batteryModels: [] } })); }
    res.end('{"job":null}');
  });
  await listen(model); await listen(crm);
  const app = await startAssistant({ port: 0, configDir, pollMs: 20, ollamaUrl: `http://127.0.0.1:${model.address().port}` });
  try {
    const initial = await fetch(app.url); const cookie = initial.headers.get('set-cookie').split(';')[0];
    const r = await fetch(app.url + '/connect', { method: 'POST', headers: { Cookie: cookie, Origin: app.url, 'Content-Type': 'application/json' }, body: JSON.stringify({ crmUrl: `http://127.0.0.1:${crm.address().port}`, model: 'qwen2.5:3b', code: 'a'.repeat(32) }) });
    assert.equal(r.status, 200);
    for (let i = 0; i < 100 && inference === 0; i++) await new Promise(r => setTimeout(r, 20));
    const busyStatus = await fetch(app.url + '/status', { headers: { Cookie: cookie } }).then(r => r.json());
    assert.equal(busyStatus.busy, true);
    assert.equal(busyStatus.canChangeModel, false);
    const changeWhileBusy = await fetch(app.url + '/model', { method: 'POST', headers: { Cookie: cookie, Origin: app.url, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'qwen2.5:3b' }) });
    assert.equal(changeWhileBusy.status, 409, 'Model must not change during inference');
    releaseInference();
    for (let i = 0; i < 100 && uploads < 2; i++) await new Promise(r => setTimeout(r, 20));
    assert.equal(uploads, 2); assert.equal(inference, 1);
  } finally { releaseInference(); await app.close(); await close(crm); await close(model); }
});
