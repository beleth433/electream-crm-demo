import app from "./app.js";
import { initCloudDb } from "./repositories/db.js";

const PORT = process.env.PORT || 4000;

// Initialize cloud DB on startup
initCloudDb().catch((err) => {
  console.error("[CRM Server] Ошибка при старте облачной базы:", err);
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Courier EBike CRM Server running on http://localhost:${PORT}`);
    console.log(`📁 Uploads available at http://localhost:${PORT}/uploads`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = app;
  (module.exports as any).default = app;
}

export default app;
