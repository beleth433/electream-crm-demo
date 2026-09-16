import { Request, Response } from "express";
import { FinanceService } from "../services/finance.service.js";
import { PaymentCreateDto } from "../dtos/schemas.dto.js";

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

  static create(req: Request, res: Response) {
    try {
      const parsed = PaymentCreateDto.parse(req.body);
      const payment = FinanceService.createPayment(parsed as any);
      return res.status(201).json(payment);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }
}
