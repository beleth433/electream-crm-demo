import { Request, Response } from "express";
import { PartService } from "../services/part.service.js";
import { PartCreateDto, PartCategoryCreateDto, PartRestockDto } from "../dtos/schemas.dto.js";

export class PartController {
  static getCategories(req: Request, res: Response) {
    try {
      const categories = PartService.getCategories();
      return res.json(categories);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static createCategory(req: Request, res: Response) {
    try {
      const parsed = PartCategoryCreateDto.parse(req.body);
      const category = PartService.createCategory(parsed);
      return res.status(201).json(category);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static updateCategory(req: Request, res: Response) {
    try {
      const parsed = PartCategoryCreateDto.parse(req.body);
      const updated = PartService.updateCategory(req.params.id, parsed.name);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static deleteCategory(req: Request, res: Response) {
    try {
      const removed = PartService.deleteCategory(req.params.id);
      return res.json({ success: true, message: `Категория "${removed.name}" удалена`, data: removed });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static getAll(req: Request, res: Response) {
    try {
      const { search, lowStockOnly, categoryId } = req.query;
      const parts = PartService.getAll({
        search: search as string,
        lowStockOnly: lowStockOnly === "true",
        categoryId: categoryId as string,
      });
      return res.json(parts);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getById(req: Request, res: Response) {
    try {
      const part = PartService.getById(req.params.id);
      return res.json(part);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const parsed = PartCreateDto.parse(req.body);
      const part = PartService.create(parsed);
      return res.status(201).json(part);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static update(req: Request, res: Response) {
    try {
      const updated = PartService.update(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static restock(req: Request, res: Response) {
    try {
      const parsed = PartRestockDto.parse(req.body);
      const updated = PartService.restock(req.params.id, parsed.quantity);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static delete(req: Request, res: Response) {
    try {
      const removed = PartService.deletePart(req.params.id);
      return res.json({ success: true, message: `Запчасть ${removed.name} (${removed.sku}) удалена со склада`, data: removed });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

