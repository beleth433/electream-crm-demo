import http from 'node:http';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { generatePlan, localOllamaUrl } from './model.mjs';
import { jsonRequest, networkError } from './transport.mjs';

export function crmBase(value) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) throw new Error('Укажите адрес CRM: https://ваш-сайт или http://localhost:3000 для локальной проверки');
  return url.origin;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function startAssistant(options = {}) {
  const configDir = options.configDir || process.env.CRM_ASSISTANT_DIR || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'share'), 'ElectreamCRM', 'assistant');
  const configFile = path.join(configDir, 'connection.json');
  const ollamaUrl = localOllamaUrl(options.ollamaUrl || process.env.OLLAMA_URL);
  const port = options.port ?? Number(process.env.CRM_ASSISTANT_PORT || 47831);
  const localSession = randomBytes(32).toString('hex');
  let config = { model: 'qwen2.5:3b' }, error = '', busy = false, running = true, controller;
  let lastContactAt = null, activeJobId = null, pendingResult = null;
  let polling;
  try { config = { ...config, ...JSON.parse(await fs.readFile(configFile, 'utf8')) }; if (config.crmUrl) config.crmUrl = crmBase(config.crmUrl); } catch (e) { if (e.code !== 'ENOENT') error = 'Настройки не прочитаны. Подключите компьютер заново.'; }
  const save = async next => {
    await fs.mkdir(configDir, { recursive: true, mode: 0o700 });
    const temp = `${configFile}.tmp`;
    await fs.writeFile(temp, JSON.stringify(next, null, 2), { mode: 0o600 });
    await fs.rename(temp, configFile);
    config = next;
  };
  const html = await fs.readFile(new URL('./setup.html', import.meta.url));
  const server = http.createServer(async (req, res) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'");
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
    if (req.headers.host !== `127.0.0.1:${server.address().port}`) return send(403, { error: 'Недопустимый адрес локального помощника' });
    if (req.method === 'GET' && req.url === '/') {
      res.setHeader('Set-Cookie', `assistant_local=${localSession}; HttpOnly; SameSite=Strict; Path=/`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html);
    }
    const session = req.headers.cookie?.split(';').some(c => c.trim() === `assistant_local=${localSession}`);
    if (!session || (req.method === 'POST' && (req.headers.origin !== origin || !req.headers['content-type']?.startsWith('application/json')))) return send(403, { error: 'Откройте страницу локального помощника заново' });
    try {
      if (req.method === 'GET' && req.url === '/status') {
        let models = [], ollamaError = '';
        try {
          const r = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
          if (!r.ok) throw new Error();
          models = (await r.json()).models.map(m => m.name);
        } catch { ollamaError = 'Ollama недоступен. Запустите Ollama на этом компьютере.'; }
        return send(200, { crmUrl: config.crmUrl || '', model: config.model, connected: !!config.token, online: !!lastContactAt && Date.now() - Date.parse(lastContactAt) < 60000 && !error, lastContactAt, activeJobId, models, error: error || ollamaError, busy });
      }
      if (req.method !== 'POST' || !['/connect', '/disconnect'].includes(req.url)) return send(404, { error: 'Не найдено' });
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > 8192) return send(413, { error: 'Слишком большой запрос' }); }
      const data = JSON.parse(raw);
      if (req.url === '/disconnect') {
        controller?.abort();
        pendingResult = null; lastContactAt = null; activeJobId = null;
        await save({ model: config.model }); error = '';
        return send(200, { ok: true });
      }
      const base = crmBase(data.crmUrl);
      if (typeof data.model !== 'string' || !/^[\w./:-]{1,100}$/.test(data.model)) throw new Error('Выберите установленную модель');
      const tags = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) }).then(r => r.json());
      if (!tags.models?.some(m => m.name === data.model)) throw new Error('Модель не установлена в Ollama');
      const connected = await jsonRequest(`${base}/api/assistant/connect`, { code: String(data.code || '').trim(), name: os.hostname().slice(0, 80) });
      controller?.abort();
      pendingResult = null; lastContactAt = null; activeJobId = null;
      await save({ crmUrl: base, model: data.model, token: connected.token, deviceId: connected.deviceId });
      error = '';
      return send(200, { ok: true });
    } catch (e) { return send(400, { error: e.message || 'Ошибка подключения' }); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  polling = (async () => {
    while (running) {
      const connection = { ...config };
      if (connection.token && connection.crmUrl) {
        try {
          if (pendingResult && pendingResult.token === connection.token) {
            try { await jsonRequest(`${connection.crmUrl}/api/assistant/worker/result`, pendingResult.body, connection.token); pendingResult = null; activeJobId = null; }
            catch (e) { if ([400, 401, 403, 409].includes(e.status)) { pendingResult = null; activeJobId = null; } else throw e; }
          }
          const response = await jsonRequest(`${connection.crmUrl}/api/assistant/worker/poll`, {}, connection.token);
          error = ''; lastContactAt = new Date().toISOString();
          if (response.job) {
            busy = true; activeJobId = response.job.id;
            controller = new AbortController();
            const timeout = setTimeout(() => controller?.abort(), 240000);
            let payload;
            try {
              const plan = await generatePlan({ text: response.job.text, context: response.context, model: connection.model, ollamaUrl, signal: controller.signal });
              payload = { plan };
            } catch (e) { payload = { error: e.name === 'AbortError' ? 'Обработка прервана или заняла больше 4 минут. Упростите команду.' : e.message }; }
            finally { clearTimeout(timeout); busy = false; controller = undefined; }
            if (connection.token === config.token) {
              pendingResult = { token: connection.token, body: { id: response.job.id, lease: response.job.lease, ...payload } };
              try { await jsonRequest(`${connection.crmUrl}/api/assistant/worker/result`, pendingResult.body, connection.token); pendingResult = null; }
              catch (e) { if ([400, 401, 403, 409].includes(e.status)) pendingResult = null; throw e; }
            }
            activeJobId = null;
          }
        } catch (e) { error = networkError(e); }
      }
      await sleep(options.pollMs || 5000);
    }
  })();
  return { server, url: `http://127.0.0.1:${server.address().port}`, close: async () => { running = false; controller?.abort(); server.closeAllConnections(); await new Promise(r => server.close(r)); await polling; } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startAssistant().then(app => console.log(`Локальный помощник запущен: ${app.url}\nОткройте адрес в браузере и подключите CRM одноразовым кодом.\nДля остановки: Ctrl+C.`)).catch(e => { console.error(e.code === 'EADDRINUSE' ? 'Помощник уже запущен. Откройте http://127.0.0.1:47831' : e.message); process.exitCode = 1; });
}
