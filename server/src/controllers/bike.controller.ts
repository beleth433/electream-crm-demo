import { Request, Response } from "express";
import { BikeService } from "../services/bike.service.js";
import { BikeCreateDto, BikeUpdateDto } from "../dtos/schemas.dto.js";

export class BikeController {
  static getAll(req: Request, res: Response) {
    try {
      const { status, modelId, search } = req.query;
      const bikes = BikeService.getAllBikes({
        status: status as any,
        modelId: modelId as string,
        search: search as string,
      });
      return res.json(bikes);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getModels(req: Request, res: Response) {
    try {
      const models = BikeService.getModels();
      return res.json(models);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static createModel(req: Request, res: Response) {
    try {
      const newModel = BikeService.createModel(req.body);
      return res.status(201).json(newModel);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static updateModel(req: Request, res: Response) {
    try {
      const updated = BikeService.updateModel(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static deleteModel(req: Request, res: Response) {
    try {
      const removed = BikeService.deleteModel(req.params.id);
      return res.json({
        success: true,
        message: `Шаблон модели "${removed.name}" успешно удален`,
        data: removed,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static getById(req: Request, res: Response) {
    try {
      const bike = BikeService.getBikeById(req.params.id);
      return res.json(bike);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const parsed = BikeCreateDto.parse(req.body);
      const newBike = BikeService.createBike(parsed);
      return res.status(201).json(newBike);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static update(req: Request, res: Response) {
    try {
      const parsed = BikeUpdateDto.parse(req.body);
      const updated = BikeService.updateBike(req.params.id, parsed);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static delete(req: Request, res: Response) {
    try {
      const removed = BikeService.deleteBike(req.params.id);
      return res.json({ success: true, message: `Байк ${removed.inventoryNumber} успешно удален из парка`, data: removed });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

