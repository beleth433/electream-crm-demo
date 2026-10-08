import app from "./app.js";

// Prevent unhandled rejections from terminating Vercel serverless worker
process.on("unhandledRejection", (reason) => {
  console.error("[Vercel Runtime unhandledRejection]:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Vercel Runtime uncaughtException]:", err);
});

// Standard Node/Vercel request handler wrapper
const handler = (req: any, res: any) => {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("[Vercel Handler Crash]:", err);
    if (res && !res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          error: "Vercel Handler Execution Error",
          message: err.message,
        })
      );
    }
  }
};

module.exports = handler;
(module.exports as any).default = handler;
(module.exports as any).app = app;
