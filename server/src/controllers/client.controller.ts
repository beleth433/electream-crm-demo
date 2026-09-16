import { Request, Response } from "express";
import { ClientService } from "../services/client.service.js";
import { ClientCreateDto, ClientUpdateDto } from "../dtos/schemas.dto.js";

export class ClientController {
  static getAll(req: Request, res: Response) {
    try {
      const { status, search, courierService } = req.query;
      const clients = ClientService.getAllClients({
        status: status as any,
        search: search as string,
        courierService: courierService as string,
      });
      return res.json(clients);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getById(req: Request, res: Response) {
    try {
      const client = ClientService.getClientById(req.params.id);
      return res.json(client);
    } catch (err: any) {
      return res.status(404).json({ error: err.message });
    }
  }

  static searchByPhone(req: Request, res: Response) {
    try {
      const phone = req.query.phone as string;
      if (!phone) return res.status(400).json({ error: "Параметр phone обязателен" });
      const client = ClientService.searchByPhone(phone);
      return res.json(client);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const parsed = ClientCreateDto.parse(req.body);
      const newClient = ClientService.createClient(parsed);
      return res.status(201).json(newClient);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static update(req: Request, res: Response) {
    try {
      const parsed = ClientUpdateDto.parse(req.body);
      const updated = ClientService.updateClient(req.params.id, parsed);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }

  static updateStatus(req: Request, res: Response) {
    try {
      const { status, reason } = req.body;
      if (!status) return res.status(400).json({ error: "Статус обязателен" });
      const updated = ClientService.updateStatus(req.params.id, status, reason);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static delete(req: Request, res: Response) {
    try {
      const removed = ClientService.deleteClient(req.params.id);
      return res.json({ success: true, message: `Курьер ${removed.fullName} успешно удален`, data: removed });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}

