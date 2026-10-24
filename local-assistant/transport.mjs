import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execFile);
const routes = new Map();
const agents = new Map();
const loopback = url => ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);

// Read the user's route; do not modify Windows/PAC settings. Only cloud requests
// use this transport. Ollama always stays on loopback and bypasses any proxy.
export async function systemProxyFor(value) {
  const url = new URL(value);
  if (loopback(url)) return null;
  const cached = routes.get(url.origin);
  if (cached && cached.until > Date.now()) return cached.proxy;
  let proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (!proxy && process.platform === 'win32') {
    const script = "$ErrorActionPreference='Stop'; $target=[uri]$env:CRM_PROXY_LOOKUP_URL; $route=[System.Net.WebRequest]::GetSystemWebProxy().GetProxy($target); if($route -and $route.Authority -ne $target.Authority){$route.AbsoluteUri}";
    try {
      const { stdout } = await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        windowsHide: true, timeout: 8000, maxBuffer: 8192,
        env: { ...process.env, CRM_PROXY_LOOKUP_URL: url.origin },
      });
      proxy = stdout.trim() || undefined;
    } catch { throw new Error('Не удалось прочитать системный прокси Windows. Проверьте настройки сети и повторите.'); }
  }
  if (proxy) {
    const parsed = new URL(proxy);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Нужен HTTP(S)-прокси для связи с CRM');
    proxy = parsed.href;
  }
  routes.set(url.origin, { proxy: proxy || null, until: Date.now() + 60000 });
  return proxy || null;
}

function proxyAgent(proxyUrl, secure) {
  const key = `${secure}:${proxyUrl}`;
  if (agents.has(key)) return agents.get(key);
  const proxy = new URL(proxyUrl);
  const agent = secure ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });
  agent.createConnection = (options, callback) => {
    let completed = false;
    const done = (error, socket) => { if (completed) return; completed = true; callback(error, socket); };
    const headers = { Host: `${options.hostname || options.host}:${options.port}` };
    if (proxy.username) headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(`${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`).toString('base64');
    const connect = (proxy.protocol === 'https:' ? https : http).request(proxy, {
      method: 'CONNECT', path: headers.Host, headers, agent: false,
    });
    connect.setTimeout(12000, () => connect.destroy(Object.assign(new Error('Системный прокси не отвечает'), { code: 'ETIMEDOUT' })));
    connect.once('error', error => done(error));
    connect.once('connect', (response, socket, head) => {
      if (response.statusCode !== 200) { socket.destroy(); return done(new Error(`Прокси отклонил соединение: HTTP ${response.statusCode}`)); }
      if (head.length) socket.unshift(head);
      if (!secure) return done(null, socket);
      const connection = tls.connect({ ...options, socket, servername: options.servername || options.hostname || options.host });
      connection.setTimeout(12000, () => connection.destroy(Object.assign(new Error('Истекло время TLS-соединения с CRM'), { code: 'ETIMEDOUT' })));
      connection.once('secureConnect', () => { connection.setTimeout(0); done(null, connection); });
      connection.once('error', error => done(error));
    });
    connect.end();
  };
  agents.set(key, agent);
  return agent;
}

export function networkError(error) {
  if (error.status) return error.message;
  const code = error.cause?.code || error.code;
  if (error.name === 'TimeoutError' || error.name === 'AbortError' || ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)) return 'Нет связи с CRM: истекло время подключения. Проверьте интернет и системный прокси; очередь продолжит работу после восстановления связи.';
  if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) return `Нет связи с CRM (${code}). Проверьте интернет, адрес CRM и системный прокси.`;
  return error.message === 'fetch failed' ? 'Не удалось подключиться к CRM. Проверьте интернет и системный прокси.' : error.message || 'CRM недоступна';
}

export async function jsonRequest(value, body, token, options = {}) {
  const url = new URL(value);
  const proxy = options.proxyUrl === undefined ? await systemProxyFor(value) : options.proxyUrl;
  const payload = options.method === 'GET' ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body));
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).request(url, {
      method: options.method || 'POST', agent: proxy ? proxyAgent(proxy, url.protocol === 'https:') : undefined,
      signal: options.signal || AbortSignal.timeout(options.timeoutMs || 25000),
      headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }, response => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { text += chunk; if (text.length > 2 * 1024 * 1024) request.destroy(new Error('Ответ CRM слишком большой')); });
      response.on('error', reject);
      response.on('end', () => {
        let data;
        try { data = JSON.parse(text); } catch { return reject(new Error('По этому адресу не найден API CRM. Проверьте адрес и версию сайта.')); }
        if (response.statusCode < 200 || response.statusCode >= 300) return reject(Object.assign(new Error(data.error || `CRM: HTTP ${response.statusCode}`), { status: response.statusCode }));
        resolve(data);
      });
    });
    request.once('error', error => reject(Object.assign(new Error(networkError(error)), { code: error.cause?.code || error.code })));
    request.end(payload);
  });
}
