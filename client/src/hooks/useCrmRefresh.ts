import { useEffect, useRef } from 'react';

export const CRM_CHANGED_EVENT = 'crm:data-changed';

export function useCrmRefresh(refresh: () => void) {
  const current = useRef(refresh);
  current.current = refresh;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => current.current(), 100);
    };
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('crm-data') : null;
    if (channel) channel.onmessage = schedule;
    window.addEventListener(CRM_CHANGED_EVENT, schedule);
    window.addEventListener('focus', schedule);
    const interval = setInterval(() => { if (!document.hidden) schedule(); }, 15000);
    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener(CRM_CHANGED_EVENT, schedule);
      window.removeEventListener('focus', schedule);
      channel?.close();
    };
  }, []);
}

export function notifyCrmChanged() {
  window.dispatchEvent(new Event(CRM_CHANGED_EVENT));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('crm-data');
    channel.postMessage('changed');
    channel.close();
  }
}
