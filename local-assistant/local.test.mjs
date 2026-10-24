import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { startAssistant, crmBase } from './server.mjs';
import { generatePlan, checkRequiredFacts, localOllamaUrl } from './model.mjs';
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
  const model = http.createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ models: [{ name: 'qwen2.5:3b' }] })); });
  let polls = 0;
  const crm = http.createServer(async (req, res) => {
    for await (const chunk of req) {} // Drain the request, without logging secrets.
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/api/assistant/connect') res.end(JSON.stringify({ token: workerToken, deviceId: 'device' }));
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
  } finally { await app.close(); await close(crm); await close(model); }
});
