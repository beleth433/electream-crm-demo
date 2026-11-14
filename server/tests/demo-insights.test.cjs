const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const store = require('../dist/repositories/db.js');
const auth = require('../dist/controllers/auth.controller.js');
const originalMode = store.isPublicDemo;
const originalPool = auth.pool;
const originalKey = process.env.DEMO_REPORT_KEY;
store.isPublicDemo = () => true;
const { demoInsights } = require('../dist/controllers/demo-insights.controller.js');
const key = 'test-report-key-not-a-real-secret-123456';
process.env.DEMO_REPORT_KEY = key;
const id = '11111111-1111-4111-8111-111111111111';
async function request(path, body, authorization, method = 'POST') {
  const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; }, sendStatus(code) { this.code = code; return this; } };
  await demoInsights({ path, body, method, headers: { authorization } }, res, () => {});
  return { code: res.code, body: res.body };
}
after(() => {
  store.isPublicDemo = originalMode;
  auth.pool = originalPool;
  if (originalKey === undefined) delete process.env.DEMO_REPORT_KEY;
  else process.env.DEMO_REPORT_KEY = originalKey;
});
test('report rejects missing, incorrect and oversized credentials before database access', async () => {
  auth.pool = () => { throw new Error('must not access database'); };
  for (const authorization of [undefined, 'Bearer wrong', `Bearer ${'x'.repeat(257)}`]) {
    assert.equal((await request('/api/demo/report', undefined, authorization, 'GET')).code, 401);
  }
});
test('authorized report returns aggregated data and rejects mutations', async () => {
  auth.pool = () => ({ query: async () => ({ rows: [] }) });
  const result = await request('/api/demo/report', undefined, `Bearer ${key}`, 'GET');
  assert.equal(result.code, 200);
  assert.deepEqual(result.body, { totals: [], steps: [], sections: [], feedback: [] });
  assert.equal((await request('/api/demo/report', {}, `Bearer ${key}`)).code, 405);
});
test('public collection validates IDs, events and consent', async () => {
  auth.pool = () => ({ connect() { throw new Error('invalid payload must not connect'); } });
  assert.equal((await request('/api/demo/events', { id: 'bad', visitorId: id })).code, 400);
  assert.equal((await request('/api/demo/events', { id, visitorId: id, event: 'unknown' })).code, 400);
  assert.equal((await request('/api/demo/events', { id, visitorId: id, event: 'tour_step_viewed', step: 13 })).code, 400);
  assert.equal((await request('/api/demo/feedback', { id, visitorId: id, fit: 'yes', contact: 'test', consent: false })).code, 400);
  assert.equal((await request('/api/demo/feedback', { id, visitorId: id, fit: 'yes', comment: 'x'.repeat(2001) })).code, 400);
});
test('duplicate feedback is acknowledged without inserting again and releases connection', async () => {
  const queries = [];
  let released = false;
  auth.pool = () => ({ connect: async () => ({ query: async (sql) => { queries.push(sql); return { rowCount: sql.startsWith('SELECT id') ? 1 : 0 }; }, release() { released = true; } }) });
  assert.equal((await request('/api/demo/feedback', { id, visitorId: id, fit: 'yes' })).code, 200);
  assert.equal(queries.some(sql => sql.startsWith('INSERT')), false);
  assert.equal(queries.at(-1), 'COMMIT');
  assert.equal(released, true);
});
test('database failures return a safe service error', async () => {
  auth.pool = () => { throw new Error('private connection details'); };
  const result = await request('/api/demo/events', { id, visitorId: id, event: 'page_opened' });
  assert.equal(result.code, 503);
  assert.equal(JSON.stringify(result.body).includes('private'), false);
});
