import fs from "fs";
import { Request, Response } from "express";
import {
  getSystemTime,
  setSystemTime,
  addSystemDays,
  isTimeSimulated,
  resetDb,
  clearDb,
  flushDb,
  getDb,
  getStorageStatus,
  DB_FILE,
} from "../repositories/db.js";

export class SystemController {
  static getState(req: Request, res: Response) {
    try {
      const now = getSystemTime();
      return res.json({
        currentDate: now.toISOString(),
        isSimulated: isTimeSimulated(),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static setTime(req: Request, res: Response) {
    try {
      const { date, addDays, reset } = req.body;

      let newDate: Date;
      if (reset) {
        newDate = setSystemTime(null);
      } else if (addDays !== undefined) {
        newDate = addSystemDays(Number(addDays));
      } else if (date) {
        newDate = setSystemTime(date);
      } else {
        newDate = getSystemTime();
      }

      return res.json({
        currentDate: newDate.toISOString(),
        isSimulated: isTimeSimulated(),
        message: reset
          ? "Время сброшено на текущее реальное время"
          : `Системное время установлено на ${newDate.toLocaleDateString("ru-RU")}`,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  static resetTemplates(req: Request, res: Response) {
    try {
      resetDb();
      return res.json({
        success: true,
        message: "Все шаблоны и демо-данные успешно восстановлены к начальному состоянию",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static async clearTemplates(req: Request, res: Response) {
    try {
      clearDb();
      await flushDb();
      return res.json({
        success: true,
        message: "Все рабочие шаблоны (аренды, ремонты, платежи) очищены. База полностью пуста.",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static downloadBackup(req: Request, res: Response) {
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      res.setHeader("Content-Disposition", `attachment; filename="crm_db_backup_${timestamp}.json"`);
      res.setHeader("Content-Type", "application/json");

      if (fs.existsSync(DB_FILE)) {
        return res.sendFile(DB_FILE);
      }
      return res.send(JSON.stringify(getDb(), null, 2));
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static getStorageStatus(req: Request, res: Response) {
    try {
      return res.json(getStorageStatus());
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
