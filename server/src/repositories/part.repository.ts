import { getDb, PartRecord } from "./db.js";

export class PartRepository {
  static getAll(filters?: { search?: string; lowStockOnly?: boolean }) {
    const db = getDb();
    let list = db.parts.map((p) => ({
      ...p,
      isLowStock: p.quantity <= p.minQuantity,
    }));

    if (filters?.lowStockOnly) {
      list = list.filter((p) => p.isLowStock);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
      );
    }

    return list;
  }

  static getById(id: string) {
    const db = getDb();
    const part = db.parts.find((p) => p.id === id);
    if (!part) return null;
    return {
      ...part,
      isLowStock: part.quantity <= part.minQuantity,
    };
  }

  static create(data: {
    name: string;
    sku: string;
    quantity: number;
    minQuantity?: number;
    purchasePrice: number;
    clientPrice: number;
  }) {
    const db = getDb();
    if (db.parts.some((p) => p.sku.toLowerCase() === data.sku.toLowerCase())) {
      throw new Error(`Запчасть с артикулом ${data.sku} уже существует`);
    }

    const newPart = {
      id: `prt-${Date.now()}`,
      name: data.name,
      sku: data.sku,
      quantity: data.quantity,
      minQuantity: data.minQuantity || 3,
      purchasePrice: data.purchasePrice,
      clientPrice: data.clientPrice,
    };

    db.parts.push(newPart);
    return {
      ...newPart,
      isLowStock: newPart.quantity <= newPart.minQuantity,
    };
  }

  static update(id: string, data: Partial<PartRecord>) {
    const db = getDb();
    const index = db.parts.findIndex((p) => p.id === id);
    if (index === -1) return null;

    db.parts[index] = {
      ...db.parts[index],
      ...data,
    };

    return {
      ...db.parts[index],
      isLowStock: db.parts[index].quantity <= db.parts[index].minQuantity,
    };
  }

  static restock(id: string, quantityToAdd: number) {
    const db = getDb();
    const part = db.parts.find((p) => p.id === id);
    if (!part) throw new Error("Запчасть не найдена");
    if (quantityToAdd <= 0) throw new Error("Количество для пополнения должно быть больше 0");

    part.quantity += quantityToAdd;

    return {
      ...part,
      isLowStock: part.quantity <= part.minQuantity,
    };
  }

  static delete(id: string) {
    const db = getDb();
    const index = db.parts.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error("Запчасть не найдена");
    }

    const removed = db.parts.splice(index, 1)[0];
    return removed;
  }
}

