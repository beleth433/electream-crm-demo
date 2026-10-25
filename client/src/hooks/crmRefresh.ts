export const CRM_CHANGED_EVENT = 'crm:data-changed';
export const CRM_REFRESH_INTERVAL_MS = 60_000;
export const CRM_FOCUS_REFRESH_MIN_AGE_MS = 30_000;

// Keep automatic refresh separate from initial/manual loading. A saved change
// is never delayed by typing; idle polling can wait until the user is done.
export function subscribeCrmRefresh(refresh: () => unknown, target: Window = window, page: Document = document) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false, changed = false, active = true;
  let refreshedAt = Date.now();
  const editing = () => !!page.querySelector('[role="dialog"]') || !!page.activeElement?.matches('input, textarea, select, [contenteditable="true"]');
  const schedule = (reason: 'change' | 'focus' | 'poll') => {
    if (reason === 'change') changed = true;
    if (!active || page.hidden || running) return;
    if (!changed && (editing() || Date.now() - refreshedAt < (reason === 'poll' ? CRM_REFRESH_INTERVAL_MS : CRM_FOCUS_REFRESH_MIN_AGE_MS))) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      if (!active || page.hidden || running || (!changed && editing())) return;
      changed = false;
      running = true;
      refreshedAt = Date.now();
      Promise.resolve().then(refresh).catch(() => {
        // Page loaders report their own errors. A failed request must not stop
        // later mutation notifications or leave an unhandled rejection.
      }).finally(() => { running = false; if (active && changed) schedule('change'); });
    }, 100);
  };
  const onChange = () => schedule('change');
  const onFocus = () => schedule('focus');
  const onVisible = () => { if (!page.hidden) schedule('focus'); };
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('crm-data') : null;
  if (channel) channel.onmessage = onChange;
  target.addEventListener(CRM_CHANGED_EVENT, onChange);
  target.addEventListener('focus', onFocus);
  page.addEventListener('visibilitychange', onVisible);
  const interval = setInterval(() => schedule('poll'), CRM_REFRESH_INTERVAL_MS);
  return () => {
    active = false;
    if (timer) clearTimeout(timer);
    clearInterval(interval);
    target.removeEventListener(CRM_CHANGED_EVENT, onChange);
    target.removeEventListener('focus', onFocus);
    page.removeEventListener('visibilitychange', onVisible);
    channel?.close();
  };
}
