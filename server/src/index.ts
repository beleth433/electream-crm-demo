import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import apiRouter from "./routes/api.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Static files for document/damage photo uploads
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Sample static directory for demo documents
const samplesDir = path.resolve(uploadsDir, "samples");
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api", apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Эндпоинт ${req.method} ${req.originalUrl} не найден` });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Internal server error:", err);
  res.status(500).json({ error: err.message || "Внутренняя ошибка сервера" });
});

app.listen(PORT, () => {
  console.log(`🚀 Courier EBike CRM Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads available at http://localhost:${PORT}/uploads`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
