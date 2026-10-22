import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { supabaseAdapter } from "../repositories/supabase.adapter.js";

const isVercel = Boolean(process.env.VERCEL);
const uploadsDir = process.env.CRM_UPLOADS_DIR ? path.resolve(process.env.CRM_UPLOADS_DIR) : isVercel
  ? path.resolve("/tmp", "uploads")
  : path.resolve(process.cwd(), "uploads");

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err: any) {
  // Gracefully ignore directory creation failure in read-only serverless environments
}

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, callback) => {
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.mimetype)) return callback(new Error("Допустимы изображения JPEG, PNG, WebP и документы PDF"));
    callback(null, true);
  },
});

export class UploadController {
  static async handleUpload(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Файл не был передан" });
      }

      const extensions: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
      const filename = `doc_${randomUUID()}${extensions[req.file.mimetype]}`;
      const cloud = isVercel || supabaseAdapter.getStatus().mode !== "LOCAL_FILE";
      if (cloud) await supabaseAdapter.uploadDocument(filename, req.file.buffer, req.file.mimetype);
      else await fs.promises.writeFile(path.join(uploadsDir, filename), req.file.buffer);
      const fileUrl = cloud ? `/uploads/cloud/${filename}` : `/uploads/${filename}`;
      return res.status(201).json({
        url: fileUrl,
        filename,
        originalName: req.file.originalname,
        size: req.file.size,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async downloadCloud(req: Request, res: Response) {
    try {
      const filename = req.params.filename;
      if (!/^(doc_[a-f0-9-]+\.(jpg|png|webp|pdf)|bike_[a-f0-9-]+(_thumb)?\.webp)$/i.test(filename)) return res.status(400).json({ error: "Некорректное имя документа" });
      if (filename.startsWith('bike_')) res.setHeader('Cache-Control', 'private, max-age=30');
      return res.redirect(await supabaseAdapter.documentDownloadUrl(filename));
    } catch (error: any) {
      return res.status(404).json({ error: error.message });
    }
  }
}
