import { Request, Response } from "express";
import { ArticleService } from "../services/article.service.js";
import { ArticleCreateDto } from "../dtos/schemas.dto.js";

export class ArticleController {
  static getAll(req: Request, res: Response) {
    try {
      const { category } = req.query;
      const articles = ArticleService.getAll(category as string);
      return res.json(articles);
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
      const article = ArticleService.update(req.params.id, req.body);
      return res.json(article);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
