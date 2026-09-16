import { Request, Response } from "express";
import { OutfitService } from "../services/outfit.service.js";
import { OutfitCreateDto } from "../dtos/schemas.dto.js";

export class OutfitController {
  static getAll(req: Request, res: Response) {
    try {
      const { category, status, search } = req.query;
      const outfits = OutfitService.getAll({
        category: category as any,
        status: status as any,
        search: search as string,
      });
      return res.json(outfits);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getAvailable(req: Request, res: Response) {
    try {
      const available = OutfitService.getAvailable();
      return res.json(available);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getById(req: Request, res: Response) {
    try {
      const outfit = OutfitService.getById(req.params.id);
      return res.json(outfit);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const parsed = OutfitCreateDto.parse(req.body);
      const outfit = OutfitService.create(parsed as any);
      return res.status(201).json(outfit);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Статус обязателен" });
      const outfit = OutfitService.updateStatus(req.params.id, status);
      return res.json(outfit);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static getCategories(req: Request, res: Response) {
    try {
      const categories = OutfitService.getCategories();
      return res.json(categories);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static createCategory(req: Request, res: Response) {
    try {
      const category = OutfitService.createCategory(req.body);
      return res.status(201).json(category);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static deleteCategory(req: Request, res: Response) {
    try {
      const removed = OutfitService.deleteCategory(req.params.id);
      return res.json({
        success: true,
        message: `Категория "${removed.name}" успешно удалена`,
        data: removed,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static getTemplates(req: Request, res: Response) {
    try {
      const templates = OutfitService.getTemplates();
      return res.json(templates);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static createTemplate(req: Request, res: Response) {
    try {
      const template = OutfitService.createTemplate(req.body);
      return res.status(201).json(template);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static deleteTemplate(req: Request, res: Response) {
    try {
      const removed = OutfitService.deleteTemplate(req.params.id);
      return res.json({
        success: true,
        message: `Шаблон экипировки "${removed.name}" успешно удален`,
        data: removed,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static delete(req: Request, res: Response) {
    try {
      const removed = OutfitService.deleteOutfit(req.params.id);
      return res.json({ success: true, message: `Экипировка ${removed.name} успешно удалена со склада`, data: removed });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

