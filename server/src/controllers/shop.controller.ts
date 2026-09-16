import { Request, Response } from 'express';
import { shopRepository } from '../repositories/shop.repository.js';

export class ShopController {
  static async getCatalog(req: Request, res: Response) {
    try {
      const catalog = await shopRepository.getCatalog();
      res.json(catalog);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка загрузки витрины товаров' });
    }
  }

  static async createOrder(req: Request, res: Response) {
    try {
      const { customerType, customerName, customerPhone, clientId, items, paymentMethod, notes } =
        req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Корзина пуста' });
      }

      const order = await shopRepository.createOrder({
        customerType,
        customerName: customerName || 'Розничный покупатель',
        customerPhone,
        clientId,
        items,
        paymentMethod: paymentMethod || 'CASH',
        notes,
      });

      res.status(201).json({
        success: true,
        message: `Чек продажи ${order.orderNumber} успешно пробит на сумму ${order.totalAmount} ₽`,
        order,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Ошибка оформления заказа' });
    }
  }

  static async getOrders(req: Request, res: Response) {
    try {
      const orders = await shopRepository.getOrders();
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка загрузки журнала продаж' });
    }
  }

  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await shopRepository.getOrderById(id);
      if (!order) {
        return res.status(404).json({ error: 'Чек продажи не найден' });
      }
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Ошибка загрузки чека' });
    }
  }
}
