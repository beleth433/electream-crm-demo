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
    await api.getAssistantStatus();
    await api.submitAssistant('00000000-0000-4000-8000-000000000001', 'Добавить клиента');
    await api.cancelAssistant('00000000-0000-4000-8000-000000000001');
    assert.equal(notifications, 1, 'Preparing and polling assistant proposals must not reload CRM lists');
    await api.applyAssistant('00000000-0000-4000-8000-000000000001');
    assert.equal(notifications, 2, 'Only applying a confirmed proposal refreshes related lists');
  } finally {
    globalThis.fetch = previousFetch;
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  }
});

test('bike photo drafts upload only on save and clean up new files if the record is rejected', async () => {
  const { api } = await import('../../client/src/services/api.ts');
  const { saveBikePhotoDrafts } = await import('../../client/src/components/BikePhotoGallery.tsx');
  const originalUpload = api.uploadBikePhoto;
  const originalDelete = api.deleteBikePhoto;
  const existing = { id: 'existing', url: '/uploads/existing.webp', thumbnailUrl: '/uploads/existing_thumb.webp', width: 10, height: 10, sizeBytes: 100 };
  const uploaded = { ...existing, id: 'new', url: '/uploads/new.webp' };
  const draft = { ...existing, id: 'draft', imageFile: new File(['photo'], 'bike.webp', { type: 'image/webp' }), thumbnailFile: new File(['thumb'], 'thumb.webp', { type: 'image/webp' }) };
  const deleted: string[] = [];
  api.uploadBikePhoto = async () => uploaded;
  api.deleteBikePhoto = async (id) => { deleted.push(id); return { success: true }; };
  try {
    await assert.rejects(saveBikePhotoDrafts([existing, draft], async () => { throw new Error('invalid bike'); }, [existing]), /invalid bike/);
    assert.deepEqual(deleted, ['new']);
    deleted.length = 0;
    await saveBikePhotoDrafts([draft], async (photos) => {
      assert.equal(photos[0].id, 'new');
      assert.equal(JSON.stringify(photos).includes('imageFile'), false);
    }, [existing]);
    assert.deepEqual(deleted, ['existing']);
  } finally { api.uploadBikePhoto = originalUpload; api.deleteBikePhoto = originalDelete; }
});
