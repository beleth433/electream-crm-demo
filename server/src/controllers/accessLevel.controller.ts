import { Request, Response } from "express";
import { AccessLevelRepository } from "../repositories/accessLevel.repository.js";

const repo = new AccessLevelRepository();

export class AccessLevelController {
  async getAll(req: Request, res: Response) {
    try {
      const levels = await repo.findAll();
      res.json(levels);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const level = await repo.findById(req.params.id);
      if (!level) {
        return res.status(404).json({ error: "Уровень доступа не найден" });
      }
      res.json(level);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const { name, description, canManageEmployees, canSeeProfits, permissions } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ error: "Укажите название уровня доступа" });
      }
      const created = await repo.create({
        name,
        description,
        canManageEmployees,
        canSeeProfits,
        permissions: permissions || {},
      });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const updated = await repo.update(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Уровень доступа не найден" });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const deleted = await repo.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Уровень доступа не найден" });
      }
      res.json({ success: true, message: "Уровень доступа удален" });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
