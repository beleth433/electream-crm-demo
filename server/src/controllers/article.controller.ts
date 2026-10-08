import { Request, Response } from "express";
import { ArticleService } from "../services/article.service.js";
import { ArticleCreateDto, ArticleUpdateDto } from "../dtos/schemas.dto.js";

export class ArticleController {
  static getAll(req: Request, res: Response) {
    try {
      const { category, search } = req.query;
      const articles = ArticleService.getAll({
        category: category as string,
        search: search as string,
      });
      return res.json(articles);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getCategories(req: Request, res: Response) {
    try {
      const categories = ArticleService.getCategories();
      return res.json(categories);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getById(req: Request, res: Response) {
    try {
      const article = ArticleService.getById(req.params.id);
      return res.json(article);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const parsed = ArticleCreateDto.parse(req.body);
      const article = ArticleService.create(parsed);
      return res.status(201).json(article);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static update(req: Request, res: Response) {
    try {
      const parsed = ArticleUpdateDto.parse(req.body);
      const article = ArticleService.update(req.params.id, parsed);
      return res.json(article);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static delete(req: Request, res: Response) {
    try {
      const removed = ArticleService.delete(req.params.id);
      return res.json({
        success: true,
        message: `Карточка "${removed.title}" успешно удалена`,
        data: removed,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static clearAll(req: Request, res: Response) {
    try {
      const result = ArticleService.clearAll();
      return res.json({
        success: true,
        message: "Все карточки успешно удалены",
        ...result,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static resetDefaults(req: Request, res: Response) {
    try {
      const articles = ArticleService.resetDefaults();
      return res.json({
        success: true,
        message: "Стандартные шаблоны шпаргалок восстановлены",
        articles,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
