import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import apiRouter from "./routes/api.routes.js";
import { initCloudDb, flushDb, checkAndSyncCloudDb, getDb, getStorageStatus } from "./repositories/db.js";
import { userStorage, CurrentUserContext } from "./context/userContext.js";

dotenv.config();

const app = express();

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

// User context extraction middleware (stores current authenticated user in AsyncLocalStorage)
app.use((req, res, next) => {
  const userId = req.headers["x-user-id"] as string | undefined;
  const userNameHeader = req.headers["x-user-name"] as string | undefined;
  const userRole = req.headers["x-user-role"] as string | undefined;

  let userName: string | undefined;
  if (userNameHeader) {
    try {
      userName = decodeURIComponent(userNameHeader);
    } catch {
      userName = userNameHeader;
    }
  }

  let userCtx: CurrentUserContext | undefined;
  if (userId || userName) {
    try {
      const db = getDb();
      const userFromDb = userId ? db.users?.find((u) => u.id === userId) : undefined;
      const resolvedName = userName || userFromDb?.fullName || "Сотрудник";
      const roleTitle =
        userFromDb?.roleTitle ||
        (userRole === "ADMIN" ? "Руководитель" : userRole === "MECHANIC" ? "Мастер" : "Менеджер");
      userCtx = {
        id: userId || userFromDb?.id || "usr-current",
        fullName: resolvedName,
        role: userRole || userFromDb?.role || "ADMIN",
        roleTitle,
        displayName: `${resolvedName} (${roleTitle})`,
      };
      (req as any).currentUser = userCtx;
    } catch {
      // In case DB is not yet loaded at early ping
    }
  }

  if (userCtx) {
    userStorage.run(userCtx, () => next());
  } else {
    next();
  }
});

// Immediate Health & Diagnostics endpoints (never block on DB initialization)
app.get(["/health", "/api/health"], (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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

// Prevent client and proxy caching of dynamic API data
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Storage middleware: ensure DB ready & fresh from Supabase before reading, and flush write requests before response concludes
app.use(async (req, res, next) => {
  if (req.path.includes("health") || req.path.includes("diagnostics")) {
    return next();
  }

  try {
    await initCloudDb();
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    await checkAndSyncCloudDb(isMutation);
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
        console.error("[Storage Middleware] Flush error:", err);
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
const uploadsDir = process.env.VERCEL
  ? path.resolve("/tmp", "uploads")
  : path.resolve(process.cwd(), "uploads");

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e: any) {
  // Graceful fallback for read-only environments
}
app.use("/uploads", express.static(uploadsDir));


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
  res.status(500).json({ error: err.message || "Внутренняя ошибка сервера" });
});

export default app;
export { app };

