import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRM_CHANGED_EVENT, subscribeCrmRefresh } from '../../client/src/hooks/crmRefresh.ts';

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
function setup(t: any, refresh: () => unknown) {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 0 });
  const previous = globalThis.BroadcastChannel;
  const channels: any[] = [];
  class Channel {
    onmessage?: () => void;
    closed = false;
    constructor(public name: string) { channels.push(this); }
    close() { this.closed = true; }
  }
  (globalThis as any).BroadcastChannel = Channel;
  const target = new EventTarget();
  let modal = false;
  const page: any = Object.assign(new EventTarget(), { hidden: false, activeElement: null, querySelector: () => modal ? {} : null });
  const stop = subscribeCrmRefresh(refresh, target as any, page);
  t.after(() => { stop(); globalThis.BroadcastChannel = previous; });
  return { target, page, stop, channels, modal: (value: boolean) => { modal = value; } };
}
test('lists do not reload at 15 seconds; idle fallback refresh runs at one minute', async t => {
  let calls = 0;
  setup(t, () => { calls++; });
  t.mock.timers.tick(15000); await flush(); assert.equal(calls, 0);
  t.mock.timers.tick(45000); t.mock.timers.tick(100); await flush(); assert.equal(calls, 1);
});
test('saved changes and cross-tab events coalesce, while repeated focus changes are throttled', async t => {
  let calls = 0;
  const env = setup(t, () => { calls++; });
  for (let i = 0; i < 5; i++) env.target.dispatchEvent(new Event('focus'));
  t.mock.timers.tick(100); await flush(); assert.equal(calls, 0);
  env.target.dispatchEvent(new Event(CRM_CHANGED_EVENT)); env.channels[0].onmessage();
  t.mock.timers.tick(100); await flush(); assert.equal(calls, 1);
  env.target.dispatchEvent(new Event('focus')); t.mock.timers.tick(100); await flush(); assert.equal(calls, 1);
  t.mock.timers.tick(30000); env.target.dispatchEvent(new Event('focus'));
  t.mock.timers.tick(100); await flush(); assert.equal(calls, 2);
});
test('typing and open dialogs postpone polling, but an explicit save still refreshes related data', async t => {
  let calls = 0;
  const env = setup(t, () => { calls++; });
  env.page.activeElement = { matches: () => true };
  t.mock.timers.tick(60000); t.mock.timers.tick(100); await flush(); assert.equal(calls, 0);
  env.page.activeElement = null; env.modal(true);
  t.mock.timers.tick(60000); t.mock.timers.tick(100); await flush(); assert.equal(calls, 0);
  env.target.dispatchEvent(new Event(CRM_CHANGED_EVENT));
  t.mock.timers.tick(100); await flush(); assert.equal(calls, 1);
  env.modal(false); t.mock.timers.tick(30000); env.target.dispatchEvent(new Event('focus'));
  t.mock.timers.tick(100); await flush(); assert.equal(calls, 2);
});
test('hidden tabs defer changes until visible and unmount removes timers and subscriptions', async t => {
  let calls = 0;
  const env = setup(t, () => { calls++; });
  env.page.hidden = true; env.target.dispatchEvent(new Event(CRM_CHANGED_EVENT));
  t.mock.timers.tick(60000); t.mock.timers.tick(100); await flush(); assert.equal(calls, 0);
  env.page.hidden = false; env.page.dispatchEvent(new Event('visibilitychange'));
  t.mock.timers.tick(100); await flush(); assert.equal(calls, 1);
  env.target.dispatchEvent(new Event(CRM_CHANGED_EVENT)); env.stop();
  t.mock.timers.tick(120000); await flush(); assert.equal(calls, 1); assert.equal(env.channels[0].closed, true);
});
test('an in-flight refresh is not duplicated and a later saved change is never lost', async t => {
  let calls = 0, finish!: () => void;
  const first = new Promise<void>(resolve => { finish = resolve; });
  const env = setup(t, () => { calls++; return calls === 1 ? first : Promise.resolve(); });
  env.target.dispatchEvent(new Event(CRM_CHANGED_EVENT)); t.mock.timers.tick(100); await flush();
  env.target.dispatchEvent(new Event(CRM_CHANGED_EVENT)); env.channels[0].onmessage();
  t.mock.timers.tick(1000); await flush(); assert.equal(calls, 1);
  finish(); await flush(); t.mock.timers.tick(100); await flush(); assert.equal(calls, 2);
});
