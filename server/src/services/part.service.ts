import { PartRepository } from "../repositories/part.repository.js";

export class PartService {
  static getCategories() {
    return PartRepository.getCategories();
  }

  static createCategory(data: { name: string }) {
    return PartRepository.createCategory(data);
  }

  static updateCategory(id: string, name: string) {
    return PartRepository.updateCategory(id, name);
  }

  static deleteCategory(id: string) {
    return PartRepository.deleteCategory(id);
  }

  static getAll(filters?: { search?: string; lowStockOnly?: boolean; categoryId?: string }) {
    return PartRepository.getAll(filters);
  }

  static getById(id: string) {
    const part = PartRepository.getById(id);
    if (!part) {
      throw new Error(`Запчасть ${id} не найдена`);
    }
    return part;
  }

  static create(data: {
    name: string;
    sku: string;
    categoryId?: string;
    quantity: number;
    minQuantity?: number;
    purchasePrice: number;
    clientPrice: number;
  }) {
    return PartRepository.create(data);
  }

  static update(id: string, data: any) {
    const part = PartRepository.update(id, data);
    if (!part) {
      throw new Error(`Запчасть ${id} не найдена`);
    }
    return part;
  }

  static restock(id: string, quantityToAdd: number) {
    return PartRepository.restock(id, quantityToAdd);
  }

  static deletePart(id: string) {
    return PartRepository.delete(id);
  }

  // --- Procurement Orders ---
  static getOrderCategories() {
    return PartRepository.getOrderCategories();
  }

  static createOrderCategory(data: { name: string }) {
    return PartRepository.createOrderCategory(data);
  }

  static updateOrderCategory(id: string, name: string) {
    return PartRepository.updateOrderCategory(id, name);
  }

  static deleteOrderCategory(id: string) {
    return PartRepository.deleteOrderCategory(id);
  }

  static getOrders(filters?: { status?: string; search?: string; categoryId?: string }) {
    return PartRepository.getOrders(filters);
  }

  static createOrder(data: any) {
    return PartRepository.createOrder(data);
  }

  static updateOrder(id: string, data: any) {
    return PartRepository.updateOrder(id, data);
  }

  static updateOrderStatus(
    id: string,
    status: any,
    options?: {
      actualCost?: number;
      paymentMethod?: any;
      addToStock?: boolean;
      createPartData?: any;
    }
  ) {
    return PartRepository.updateOrderStatus(id, status, options);
  }

  static deleteOrder(id: string, options?: { deletePayment?: boolean }) {
    return PartRepository.deleteOrder(id, options);
  }
}

