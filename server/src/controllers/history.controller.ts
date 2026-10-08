import { Request, Response } from "express";
import { HistoryService } from "../services/history.service.js";

export class HistoryController {
  static getAll(req: Request, res: Response) {
    try {
      const { category, search, limit, days } = req.query;
      const history = HistoryService.getHistory({
        category: category as string,
        search: search as string,
        limit: limit ? Number(limit) : undefined,
        days: days ? Number(days) : undefined,
      });
      return res.json(history);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static log(req: Request, res: Response) {
    try {
      const log = HistoryService.logAction(req.body);
      return res.status(201).json(log);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static clear(req: Request, res: Response) {
    try {
      const result = HistoryService.clearAuditLogs();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
