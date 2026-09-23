import { Request, Response } from "express";
import { LoyaltyRepository } from "../repositories/loyalty.repository.js";
import { ClientRepository } from "../repositories/client.repository.js";

export class LoyaltyController {
  static getTiers(req: Request, res: Response) {
    try {
      const tiers = LoyaltyRepository.getAll();
      res.json(tiers);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Ошибка загрузки уровней лояльности" });
    }
  }

  static getTierById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tier = LoyaltyRepository.getById(id);
      if (!tier) {
        return res.status(404).json({ error: "Уровень лояльности не найден" });
      }
      res.json(tier);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Ошибка получения уровня лояльности" });
    }
  }

  static createTier(req: Request, res: Response) {
    try {
      const {
        name,
        color,
        minRentalDays,
        minTotalSpent,
        discountRentalPercent,
        discountPartsPercent,
        discountRepairsPercent,
        description,
        isDefault,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Название уровня лояльности обязательно" });
      }

      const created = LoyaltyRepository.create({
        name,
        color,
        minRentalDays,
        minTotalSpent,
        discountRentalPercent,
        discountPartsPercent,
        discountRepairsPercent,
        description,
        isDefault,
      });

      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Ошибка создания уровня лояльности" });
    }
  }

  static updateTier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = LoyaltyRepository.update(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Уровень лояльности не найден" });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Ошибка обновления уровня лояльности" });
    }
  }

  static deleteTier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      LoyaltyRepository.delete(id);
      res.json({ message: "Уровень лояльности успешно удален" });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Ошибка удаления уровня лояльности" });
    }
  }

  static setClientTier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { manualLoyaltyTierId } = req.body;
      const updatedClient = ClientRepository.setLoyaltyTier(id, manualLoyaltyTierId ?? null);
      res.json(updatedClient);
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Ошибка назначения уровня лояльности" });
    }
  }
}
