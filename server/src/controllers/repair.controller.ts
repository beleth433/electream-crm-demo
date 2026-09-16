import { Request, Response } from "express";
import { RepairService } from "../services/repair.service.js";
import { RepairCreateDto, RepairCompleteDto } from "../dtos/schemas.dto.js";

export class RepairController {
  static getAll(req: Request, res: Response) {
    try {
      const { status, faultType, bikeId } = req.query;
      const repairs = RepairService.getAllRepairs({
        status: status as any,
        faultType: faultType as any,
        bikeId: bikeId as string,
      });
      return res.json(repairs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getById(req: Request, res: Response) {
    try {
      const repair = RepairService.getRepairById(req.params.id);
      return res.json(repair);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const parsed = RepairCreateDto.parse(req.body);
      const repair = RepairService.createRepair(parsed as any);
      return res.status(201).json(repair);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static updateStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Статус обязателен" });
      const repair = RepairService.updateStatus(req.params.id, status);
      return res.json(repair);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static complete(req: Request, res: Response) {
    try {
      const parsed = RepairCompleteDto.parse(req.body);
      const repair = RepairService.completeRepair(req.params.id, parsed as any);
      return res.json(repair);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }
}
