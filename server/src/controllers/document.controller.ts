import { Request, Response } from 'express';
import { z } from 'zod';
import { DocumentRepository } from '../repositories/document.repository.js';
import { flushDb, getDb } from '../repositories/db.js';

const querySchema = z.object({
  search: z.string().max(200).optional(), type: z.enum(['RENTAL_CONTRACT', 'HANDOVER_ACT', 'RETURN_ACT', 'BUYOUT_ACT', 'SALE_RECEIPT', 'REPAIR_ORDER', 'REPAIR_ACT']).optional(),
  from: z.string().date().optional(), to: z.string().date().optional(), sourceId: z.string().max(200).optional(),
  sourceModule: z.enum(['rentals', 'shop', 'repairs']).optional(), page: z.coerce.number().int().min(1).max(100000).optional(),
}).refine((value) => !value.from || !value.to || value.from <= value.to, 'Дата начала позже даты окончания');

export class DocumentController {
  static async list(req: Request, res: Response) {
    try {
      const filters = querySchema.parse(req.query);
      const user = getDb().users.find((item) => item.id === (req as any).currentUser.id)!;
      if (DocumentRepository.backfill()) await flushDb(true);
      return res.json(DocumentRepository.getAll(user, filters));
    } catch (error: any) {
      return res.status(error instanceof z.ZodError ? 400 : 500).json({ error: error instanceof z.ZodError ? error.issues[0].message : error.message });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const user = getDb().users.find((item) => item.id === (req as any).currentUser.id)!;
      if (DocumentRepository.backfill()) await flushDb(true);
      const document = DocumentRepository.getById(req.params.id, user);
      if (!document) return res.status(404).json({ error: 'Документ не найден или недоступен' });
      return res.json(document);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
