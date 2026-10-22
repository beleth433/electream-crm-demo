import { test } from 'node:test';
import assert from 'node:assert/strict';

test('successful mutations preserve auth headers and notify related CRM views', async () => {
  const previousFetch = globalThis.fetch;
  const storage = new Map([['crm_auth_user', JSON.stringify({ id: 'usr-test', role: 'ADMIN', fullName: 'Иван Иванов' })], ['crm_auth_token', 'test-session']]);
  const events = new EventTarget();
  (globalThis as any).window = events;
  (globalThis as any).localStorage = { getItem: (key: string) => storage.get(key) || null };
  let notifications = 0;
  events.addEventListener('crm:data-changed', () => notifications++);
  let sentHeaders: any;
  globalThis.fetch = async (_url, options) => {
    sentHeaders = options?.headers;
    return new Response(JSON.stringify({ id: 'client' }), { status: 201 });
  };
  try {
    const { api } = await import('../../client/src/services/api.ts');
    await api.createClient({ fullName: 'Иван Иванов', phone: '+79991234567' });
    assert.equal(sentHeaders.Authorization, 'Bearer test-session');
    assert.equal(sentHeaders['Content-Type'], 'application/json');
    assert.equal(notifications, 1);
    await api.sendPresenceHeartbeat({ userId: 'usr-test', userName: 'Иван Иванов' });
    assert.equal(notifications, 1);
  } finally {
    globalThis.fetch = previousFetch;
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  }
});
