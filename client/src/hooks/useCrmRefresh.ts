import { useEffect, useRef } from 'react';
import { CRM_CHANGED_EVENT, subscribeCrmRefresh } from './crmRefresh';

export { CRM_CHANGED_EVENT } from './crmRefresh';

export function useCrmRefresh(refresh: (background?: boolean) => unknown) {
  const current = useRef(refresh);
  current.current = refresh;
  useEffect(() => subscribeCrmRefresh(() => current.current(true)), []);
}

export function notifyCrmChanged() {
  window.dispatchEvent(new Event(CRM_CHANGED_EVENT));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('crm-data');
    channel.postMessage('changed');
    channel.close();
  }
}
