import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDb, BikePhoto } from '../repositories/db.js';
import { supabaseAdapter } from '../repositories/supabase.adapter.js';
import { validateBikePhoto } from '../services/bikePhoto.service.js';

const uploadsDir = process.env.CRM_UPLOADS_DIR ? path.resolve(process.env.CRM_UPLOADS_DIR) : process.env.VERCEL ? path.resolve('/tmp', 'uploads') : path.resolve(process.cwd(), 'uploads');
const cloudStorage = () => Boolean(process.env.VERCEL) || supabaseAdapter.getStatus().mode !== 'LOCAL_FILE';
const filenames = (id: string) => [`bike_${id}.webp`, `bike_${id}_thumb.webp`];

const parseBikePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { files: 2, fileSize: 400 * 1024, fields: 0 },
  fileFilter: (_req, file, callback) => file.mimetype === 'image/webp' ? callback(null, true) : callback(new Error('Фотографии должны быть оптимизированы в WebP')),
}).fields([{ name: 'image', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]);
export const bikePhotoUpload = (req: Request, res: Response, next: NextFunction) => parseBikePhoto(req, res, (error) => {
  if (error) return res.status(400).json({ error: error.message || 'Не удалось загрузить фото' });
  next();
});

async function removeFiles(id: string) {
  const names = filenames(id);
  if (cloudStorage()) await supabaseAdapter.deleteDocuments(names);
  else for (const name of names) await fs.unlink(path.join(uploadsDir, name)).catch((error) => { if (error.code !== 'ENOENT') throw error; });
}

export class BikePhotoController {
  static async upload(req: Request, res: Response) {
    let id: string | undefined;
    try {
      const files = req.files as Record<string, Express.Multer.File[]>;
      const image = files?.image?.[0];
      const thumbnail = files?.thumbnail?.[0];
      if (!image || !thumbnail) return res.status(400).json({ error: 'Нужны фотография и миниатюра' });
      const dimensions = validateBikePhoto(image.buffer);
      validateBikePhoto(thumbnail.buffer, true);
      id = randomUUID();
      const names = filenames(id);
      if (cloudStorage()) {
        await supabaseAdapter.uploadDocument(names[0], image.buffer, 'image/webp');
        await supabaseAdapter.uploadDocument(names[1], thumbnail.buffer, 'image/webp');
      } else {
        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.writeFile(path.join(uploadsDir, names[0]), image.buffer);
        await fs.writeFile(path.join(uploadsDir, names[1]), thumbnail.buffer);
      }
      const prefix = cloudStorage() ? '/uploads/cloud/' : '/uploads/';
      const photo: BikePhoto = { id, url: prefix + names[0], thumbnailUrl: prefix + names[1], ...dimensions, sizeBytes: image.size + thumbnail.size };
      return res.status(201).json({ photo });
    } catch (error: any) {
      if (id) await removeFiles(id).catch(() => {});
      return res.status(400).json({ error: error.message || 'Не удалось сохранить фото' });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const id = req.params.id;
      if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) return res.status(400).json({ error: 'Некорректный идентификатор фото' });
      if (getDb().bikes.some((bike) => bike.photos?.some((photo) => photo.id === id))) return res.status(409).json({ error: 'Фотография ещё используется в карточке техники' });
      await removeFiles(id);
      return res.json({ success: true });
    } catch (error: any) { return res.status(400).json({ error: error.message || 'Не удалось удалить фото' }); }
  }
}
