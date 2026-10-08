import { Request, Response } from 'express';
import { ChatRepository } from '../repositories/chat.repository.js';

export class ChatController {
  public static getMessages(req: Request, res: Response): void {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const messages = ChatRepository.getMessages(limit);
      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка получения сообщений' });
    }
  }

  public static createMessage(req: Request, res: Response): void {
    try {
      const { senderId, senderName, senderRole, text } = req.body;
      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Текст сообщения не может быть пустым' });
        return;
      }
      const message = ChatRepository.createMessage({
        senderId: senderId || 'u-guest',
        senderName: senderName || 'Сотрудник',
        senderRole: senderRole || 'USER',
        text,
      });
      res.status(201).json(message);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка отправки сообщения' });
    }
  }

  public static deleteMessage(req: Request, res: Response): void {
    try {
      const { id } = req.params;
      const success = ChatRepository.deleteMessage(id);
      if (!success) {
        res.status(404).json({ error: 'Сообщение не найдено' });
        return;
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка удаления сообщения' });
    }
  }
}
