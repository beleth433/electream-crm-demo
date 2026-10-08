import { Request, Response } from "express";
import { BatteryRepository } from "../repositories/battery.repository.js";

export class BatteryController {
  static getAll(req: Request, res: Response) {
    try {
      const { status, voltage, search, bikeId } = req.query;
      const list = BatteryRepository.getAll({
        status: status as any,
        voltage: voltage ? Number(voltage) : undefined,
        search: search as string,
        bikeId: bikeId as string,
      });
      return res.json(list);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getStats(req: Request, res: Response) {
    try {
      const stats = BatteryRepository.getStats();
      return res.json(stats);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getById(req: Request, res: Response) {
    try {
      const battery = BatteryRepository.getById(req.params.id);
      if (!battery) {
        return res.status(404).json({ error: "Аккумулятор не найден" });
      }
      return res.json(battery);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const created = BatteryRepository.create(req.body);
      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static update(req: Request, res: Response) {
    try {
      const updated = BatteryRepository.update(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static delete(req: Request, res: Response) {
    try {
      const removed = BatteryRepository.delete(req.params.id);
      return res.json({
        success: true,
        message: `Аккумулятор ${removed.serialNumber} успешно списан / удален`,
        data: removed,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static attach(req: Request, res: Response) {
    try {
      const { batteryId, bikeId } = req.body;
      if (!batteryId || !bikeId) {
        return res.status(400).json({ error: "Укажите batteryId и bikeId" });
      }
      const result = BatteryRepository.attachToBike(batteryId, bikeId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static detach(req: Request, res: Response) {
    try {
      const { bikeId, batteryId } = req.body;
      if (batteryId) {
        const result = BatteryRepository.returnToWarehouse(batteryId);
        return res.json(result);
      }
      if (!bikeId) {
        return res.status(400).json({ error: "Укажите bikeId или batteryId" });
      }
      const result = BatteryRepository.detachFromBike(bikeId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static swap(req: Request, res: Response) {
    try {
      const { oldBatteryId, newBatteryId, bikeId, sendOldToCharging } = req.body;
      if (oldBatteryId && newBatteryId) {
        const result = BatteryRepository.swapBatteryGeneral({
          oldBatteryId,
          newBatteryId,
          sendOldToCharging: Boolean(sendOldToCharging),
        });
        return res.json(result);
      }
      if (bikeId && newBatteryId) {
        const result = BatteryRepository.swapBattery(bikeId, newBatteryId);
        return res.json(result);
      }
      return res.status(400).json({ error: "Укажите oldBatteryId и newBatteryId (или bikeId и newBatteryId)" });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  // Battery Models (Templates)
  static getModels(req: Request, res: Response) {
    try {
      const models = BatteryRepository.getBatteryModels();
      return res.json(models);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static createModel(req: Request, res: Response) {
    try {
      const created = BatteryRepository.createBatteryModel(req.body);
      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static updateModel(req: Request, res: Response) {
    try {
      const updated = BatteryRepository.updateBatteryModel(req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static deleteModel(req: Request, res: Response) {
    try {
      const removed = BatteryRepository.deleteBatteryModel(req.params.id);
      return res.json({
        success: true,
        message: `Шаблон модели АКБ "${removed.name}" успешно удален`,
        data: removed,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }
}
