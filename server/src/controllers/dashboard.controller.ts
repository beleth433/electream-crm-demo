import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service.js";

export class DashboardController {
  static getStats(req: Request, res: Response) {
    try {
      const stats = DashboardService.getStats();
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
