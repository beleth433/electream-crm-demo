import { Request, Response } from "express";
import { FinanceService } from "../services/finance.service.js";
import { PaymentCreateDto, PaymentUpdateDto, FinanceSettingsUpdateDto } from "../dtos/schemas.dto.js";

export class FinanceController {
  static getAll(req: Request, res: Response) {
    try {
      const { type, method, rentalId } = req.query;
      const payments = FinanceService.getAll({
        type: type as any,
        method: method as any,
        rentalId: rentalId as string,
      });
      return res.json(payments);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getSummary(req: Request, res: Response) {
    try {
      const summary = FinanceService.getSummary();
      return res.json(summary);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getSettings(req: Request, res: Response) {
    try {
      const settings = FinanceService.getSettings();
      return res.json(settings);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static updateSettings(req: Request, res: Response) {
    try {
      const parsed = FinanceSettingsUpdateDto.parse(req.body);
      const updated = FinanceService.updateSettings(parsed);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const parsed = PaymentCreateDto.parse(req.body);
      const payment = FinanceService.createPayment(parsed as any);
      return res.status(201).json(payment);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static update(req: Request, res: Response) {
    try {
      const parsed = PaymentUpdateDto.parse(req.body);
      const updated = FinanceService.updatePayment(req.params.id, parsed as any);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static delete(req: Request, res: Response) {
    try {
      const removed = FinanceService.deletePayment(req.params.id);
      return res.json({ success: true, removed });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
