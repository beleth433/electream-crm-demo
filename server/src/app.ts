import express from "express";
import { publicDemoMiddleware } from './controllers/auth.controller.js';
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import apiRouter from "./routes/api.routes.js";
import { authenticateApi } from "./middleware/auth.js";
import { UploadController } from "./controllers/upload.controller.js";
import { initCloudDb, flushDb, checkAndSyncCloudDb, getDb, getStorageStatus, isPublicDemo } from "./repositories/db.js";


dotenv.config();

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Enable CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user-id",
      "x-user-name",
      "x-user-role",
      "X-User-Id",
      "X-User-Name",
      "X-User-Role",
    ],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Immediate Health & Diagnostics endpoints (never block on DB initialization)
app.get(["/health", "/api/health"], (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get(["/diagnostics", "/api/diagnostics"], (_req, res) => {
  res.status(404).json({ error: 'Диагностика недоступна через публичный API' });
});
/* Internal diagnostics intentionally not exposed publicly.
app.get(["/diagnostics", "/api/diagnostics"], async (req, res) => {
  try {
    await initCloudDb();
  } catch (err: any) {
    console.error("[Diagnostics] initCloudDb error:", err);
  }

  const rawUrl = (
    process.env.DATABASE_URL ||
    process.env.database_url ||
    process.env.DATEBASE_URL ||
    process.env.datebase_url ||
    ""
  ).trim();
  const maskedUrl = rawUrl ? rawUrl.replace(/:([^:@]+)@/, ":****@") : null;
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    node: process.version,
    isVercel: Boolean(process.env.VERCEL),
    hasDatabaseUrl: Boolean(rawUrl),
    databaseUrlMasked: maskedUrl,
    storage: getStorageStatus(),
  });
});

*/

// Prevent client and proxy caching of dynamic API data
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

app.use(publicDemoMiddleware);

// Serialize requests within a worker through persistence. Optimistic cloud
// versions protect the shared snapshot from writes by other workers.
let requestQueue = Promise.resolve();
app.use(async (req, res, next) => {
  const previous = requestQueue;
  let release!: () => void;
  requestQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  if (res.destroyed) { release(); return; }
  let finished = false;
  const finish = () => { if (!finished) { finished = true; release(); } };
  res.once("finish", finish);
  res.once("close", finish);
  next();
});

// Storage middleware: ensure DB ready & fresh from Supabase before reading, and flush write requests before response concludes
app.use(async (req, res, next) => {
  // Isolated demo persistence owns the response; legacy flushing must not bypass it.
  if (isPublicDemo()) return next();
  if (req.path.includes("health") || req.path.includes("diagnostics")) {
    return next();
  }

  try {
    await initCloudDb();
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (!req.path.startsWith('/uploads/')) await checkAndSyncCloudDb(isMutation);
  } catch (err: any) {
    console.error("[Storage Middleware] Sync error:", err.message);
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    let flushed = false;
    const doFlush = async (cb: () => void) => {
      if (flushed) {
        cb();
        return;
      }
      flushed = true;
      try {
        await flushDb(true);
      } catch (err: any) {
        console.error("[Storage Middleware] Flush error:", err.message);
        res.status(err.code === "CRM_STORE_CONFLICT" ? 409 : 503);
        originalSend(JSON.stringify({ error: err.code === "CRM_STORE_CONFLICT" ? err.message : "Не удалось подтвердить сохранение в облако. Изменение осталось в локальном состоянии; обновите данные после восстановления подключения." }));
        return;
      }
      cb();
    };

    const originalSend = res.send.bind(res);
    res.send = function (body?: any) {
      doFlush(() => originalSend(body));
      return res;
    };

    const originalEnd = res.end.bind(res);
    // @ts-ignore
    res.end = function (...args: any[]) {
      doFlush(() => originalEnd.apply(res, args as any));
    };
  }

  next();
});

// Safe static files for uploads (read-only filesystem safe for serverless)
const uploadsDir = process.env.CRM_UPLOADS_DIR ? path.resolve(process.env.CRM_UPLOADS_DIR) : process.env.VERCEL
  ? path.resolve("/tmp", "uploads")
  : path.resolve(process.cwd(), "uploads");

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e: any) {
  // Graceful fallback for read-only environments
}
app.get("/uploads/cloud/:filename", authenticateApi, UploadController.downloadCloud);
app.use("/uploads", authenticateApi, (req, res, next) => {
  if (/^\/bike_[a-f0-9-]+(_thumb)?\.webp$/i.test(req.path)) res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
  next();
}, express.static(uploadsDir));


// API Routes (mount on both /api and root to support Vercel rewrites)
app.use("/api", apiRouter);
app.use("/", apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Эндпоинт ${req.method} ${req.originalUrl} не найден` });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Internal server error:", err);
  const status = err.type === 'entity.too.large' ? 413 : err instanceof SyntaxError && 'body' in err ? 400 : 500;
  res.status(status).json({ error: status === 413 ? 'Слишком большой запрос' : status === 400 ? 'Некорректный JSON' : 'Внутренняя ошибка сервера' });
});

export default app;
export { app };

