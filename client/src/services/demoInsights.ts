const BASE = (import.meta as any).env?.VITE_API_URL || '/api';
let fallbackId: string | undefined;
export function visitorId() {
  try {
    let id = localStorage.getItem('electream-visitor');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('electream-visitor', id); }
    return id;
  } catch { return fallbackId ||= crypto.randomUUID(); }
}
export async function insightsRequest(path: string, body?: unknown, key?: string) {
  const response = await fetch(`${BASE}/demo/${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type':'application/json', ...(key ? { Authorization:`Bearer ${key}` } : {}) }, ...(body ? { body:JSON.stringify(body) } : {}) });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.error || 'Не удалось выполнить запрос'); }
  return response.json();
}
export function track(event: string, properties: { section?: string; step?: number } = {}) {
  if (navigator.doNotTrack === '1') return;
  void insightsRequest('events', { id:crypto.randomUUID(), visitorId:visitorId(), event, ...properties }).catch(() => {});
}
export function openFeedback() { window.dispatchEvent(new Event('demo:feedback')); }
