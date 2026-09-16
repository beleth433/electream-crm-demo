import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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
