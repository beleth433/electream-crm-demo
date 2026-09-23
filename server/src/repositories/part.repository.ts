import { getDb, PartRecord } from "./db.js";

export class PartRepository {
  static getCategories() {
    const db = getDb();
    if (!db.partCategories) {
      db.partCategories = [];
    }
    return db.partCategories.map((c) => ({
      ...c,
      partCount: db.parts.filter((p) => p.categoryId === c.id).length,
    }));
  }

  static createCategory(data: { name: string }) {
    const db = getDb();
    if (!db.partCategories) {
      db.partCategories = [];
    }
    const trimmed = data.name.trim();
    if (db.partCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Категория запчастей "${trimmed}" уже существует`);
    }

    const newCategory = {
      id: `cat-part-${Date.now()}`,
      name: trimmed,
      isSystem: false,
    };

    db.partCategories.push(newCategory);
    return {
      ...newCategory,
      partCount: 0,
    };
  }

  static updateCategory(id: string, name: string) {
    const db = getDb();
    if (!db.partCategories) {
      db.partCategories = [];
    }
    const index = db.partCategories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Категория запчастей не найдена");
    }

    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Название категории не может быть пустым");
    }

    db.partCategories[index].name = trimmed;

    // Synchronize categoryName on all parts assigned to this category
    for (const part of db.parts) {
      if (part.categoryId === id) {
        part.categoryName = trimmed;
      }
    }

    return {
      ...db.partCategories[index],
      partCount: db.parts.filter((p) => p.categoryId === id).length,
    };
  }

  static deleteCategory(id: string) {
    const db = getDb();
    if (!db.partCategories) {
      db.partCategories = [];
    }
    const index = db.partCategories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Категория запчастей не найдена");
    }

    const usedCount = db.parts.filter((p) => p.categoryId === id).length;
    if (usedCount > 0) {
      throw new Error(`Нельзя удалить категорию: к ней привязано ${usedCount} поз. запчастей`);
    }

    const removed = db.partCategories.splice(index, 1)[0];
    return removed;
  }

  static getAll(filters?: { search?: string; lowStockOnly?: boolean; categoryId?: string }) {
    const db = getDb();
    if (!db.partCategories) {
      db.partCategories = [];
    }

    let list = db.parts.map((p) => {
      let categoryId = p.categoryId;
      if (!categoryId) {
        const lower = p.name.toLowerCase();
        if (lower.includes('колодк') || lower.includes('тормоз')) {
          categoryId = 'cat-part-brakes';
        } else if (lower.includes('рул') || lower.includes('грипс')) {
          categoryId = 'cat-part-steering';
        } else if (lower.includes('диспл') || lower.includes('экран')) {
          categoryId = 'cat-part-displays';
        } else if (lower.includes('контроллер')) {
          categoryId = 'cat-part-controllers';
        } else if (lower.includes('колес') || lower.includes('обод')) {
          categoryId = 'cat-part-wheels';
        } else if (lower.includes('шин') || lower.includes('покрышк') || lower.includes('камер')) {
          categoryId = 'cat-part-tires';
        } else {
          categoryId = db.partCategories[0]?.id;
        }
      }
      const cat = db.partCategories.find((c) => c.id === categoryId);
      return {
        ...p,
        categoryId,
        categoryName: cat?.name || p.categoryName || 'Без категории',
        isLowStock: p.quantity <= p.minQuantity,
      };
    });

    if (filters?.categoryId && filters.categoryId !== 'ALL') {
      list = list.filter((p) => p.categoryId === filters.categoryId);
    }
    if (filters?.lowStockOnly) {
      list = list.filter((p) => p.isLowStock);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }

    return list;
  }

  static getById(id: string) {
    const db = getDb();
    const part = db.parts.find((p) => p.id === id);
    if (!part) return null;
    const cat = db.partCategories?.find((c) => c.id === part.categoryId);
    return {
      ...part,
      categoryName: cat?.name || part.categoryName || 'Без категории',
      isLowStock: part.quantity <= part.minQuantity,
    };
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
    const db = getDb();
    if (db.parts.some((p) => p.sku.toLowerCase() === data.sku.toLowerCase())) {
      throw new Error(`Запчасть с артикулом ${data.sku} уже существует`);
    }

    const cat = data.categoryId ? db.partCategories?.find((c) => c.id === data.categoryId) : null;

    const newPart = {
      id: `prt-${Date.now()}`,
      name: data.name,
      sku: data.sku,
      categoryId: data.categoryId || (db.partCategories && db.partCategories[0]?.id) || undefined,
      categoryName: cat?.name || (db.partCategories && db.partCategories[0]?.name) || undefined,
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

    if (data.sku && db.parts.some((p) => p.id !== id && p.sku.toLowerCase() === data.sku!.toLowerCase())) {
      throw new Error(`Запчасть с артикулом ${data.sku} уже существует`);
    }

    let categoryName = db.parts[index].categoryName;
    if (data.categoryId) {
      const cat = db.partCategories?.find((c) => c.id === data.categoryId);
      if (cat) categoryName = cat.name;
    }

    db.parts[index] = {
      ...db.parts[index],
      ...data,
      categoryName: data.categoryName || categoryName,
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

