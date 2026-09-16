import { Request, Response } from "express";
import { RentalService } from "../services/rental.service.js";
import { RentalCreateDto, RentalRenewDto, RentalCloseDto } from "../dtos/schemas.dto.js";

export class RentalController {
  static getAll(req: Request, res: Response) {
    try {
      const { status, search, clientId } = req.query;
      const rentals = RentalService.getAllRentals({
        status: status as any,
        search: search as string,
        clientId: clientId as string,
      });
      return res.json(rentals);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getById(req: Request, res: Response) {
    try {
      const rental = RentalService.getRentalById(req.params.id);
      return res.json(rental);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  static getTariffs(req: Request, res: Response) {
    try {
      const tariffs = RentalService.getTariffs();
      return res.json(tariffs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const parsed = RentalCreateDto.parse(req.body);
      const rental = RentalService.createRental(parsed as any);
      return res.status(201).json(rental);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static renew(req: Request, res: Response) {
    try {
      const parsed = RentalRenewDto.parse(req.body);
      const rental = RentalService.renewRental(req.params.id, parsed);
      return res.json(rental);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static close(req: Request, res: Response) {
    try {
      const parsed = RentalCloseDto.parse(req.body);
      const result = RentalService.closeRental(req.params.id, parsed as any);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }
}
