import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const isVercel = Boolean(process.env.VERCEL);
const uploadsDir = isVercel
  ? path.resolve("/tmp", "uploads")
  : path.resolve(process.cwd(), "uploads");

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err: any) {
  // Gracefully ignore directory creation failure in read-only serverless environments
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `doc_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export class UploadController {
  static handleUpload(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Файл не был передан" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      return res.status(201).json({
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
