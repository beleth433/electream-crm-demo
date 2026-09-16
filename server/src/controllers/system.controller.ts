import { Request, Response } from "express";
import {
  getSystemTime,
  setSystemTime,
  addSystemDays,
  isTimeSimulated,
  resetDb,
  clearDb,
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

  static clearTemplates(req: Request, res: Response) {
    try {
      clearDb();
      return res.json({
        success: true,
        message: "Все рабочие шаблоны (аренды, ремонты, платежи) очищены. Вся техника и экипировка свободны на складе.",
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}
