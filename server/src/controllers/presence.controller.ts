import { Request, Response } from 'express';
import { PresenceRepository } from '../repositories/presence.repository.js';

export class PresenceController {
  public static getOnline(req: Request, res: Response): void {
    try {
      const onlineUsers = PresenceRepository.getOnline();
      res.json(onlineUsers);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка получения онлайн пользователей' });
    }
  }

  public static heartbeat(req: Request, res: Response): void {
    try {
      const { userId, userName, userRole, roleTitle, deviceInfo } = req.body;
      if (!userId || !userName) {
        res.status(400).json({ error: 'userId и userName обязательны' });
        return;
      }
      const onlineUsers = PresenceRepository.heartbeat({
        userId,
        userName,
        userRole,
        roleTitle,
        deviceInfo,
      });
      res.json(onlineUsers);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка обновления активности пользователя' });
    }
  }

  public static logout(req: Request, res: Response): void {
    try {
      const { userId } = req.body;
      if (userId) {
        PresenceRepository.logout(userId);
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка выхода пользователя' });
    }
  }
}
