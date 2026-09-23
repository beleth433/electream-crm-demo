import { getDb, OutfitStatus } from "./db.js";

export class OutfitRepository {
  static getCategories() {
    const db = getDb();
    return db.outfitCategories.map((cat) => {
      const itemCount = db.outfits.filter(
        (o) => o.category === cat.id || o.category === cat.name
      ).length;
      return {
        ...cat,
        itemCount,
      };
    });
  }

  static createCategory(data: { name: string }) {
    const db = getDb();
    if (!data.name || !data.name.trim()) {
      throw new Error("Название категории обязательно");
    }
    const name = data.name.trim();
    if (db.outfitCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Категория "${name}" уже существует`);
    }
    const newCategory = {
      id: `cat-${Date.now()}`,
      name,
      isSystem: false,
    };
    db.outfitCategories.push(newCategory);
    return {
      ...newCategory,
      itemCount: 0,
    };
  }

  static deleteCategory(id: string) {
    const db = getDb();
    const index = db.outfitCategories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Категория не найдена");
    }
    const cat = db.outfitCategories[index];
    const outfitsWithCategory = db.outfits.filter(
      (o) => o.category === cat.id || o.category === cat.name
    );
    if (outfitsWithCategory.length > 0) {
      throw new Error(
        `Невозможно удалить категорию "${cat.name}": к ней привязано ${outfitsWithCategory.length} предметов экипировки`
      );
    }
    return db.outfitCategories.splice(index, 1)[0];
  }

  static getTemplates() {
    const db = getDb();
    return db.outfitTemplates.map((t) => {
      const category = db.outfitCategories.find((c) => c.id === t.categoryId || c.name === t.categoryId);
      return {
        ...t,
        categoryName: category?.name || t.categoryId,
      };
    });
  }

  static createTemplate(data: {
    name: string;
    categoryId: string;
    defaultDeposit: number;
    description?: string;
    purchasePrice?: number;
    salePrice?: number;
  }) {
    const db = getDb();
    if (!data.name || !data.name.trim()) {
      throw new Error("Название шаблона обязательно");
    }
    const newTemplate = {
      id: `tmpl-${Date.now()}`,
      name: data.name.trim(),
      categoryId: data.categoryId,
      defaultDeposit: Number(data.defaultDeposit) || 0,
      description: data.description || null,
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
      salePrice: data.salePrice !== undefined ? Number(data.salePrice) : undefined,
    };
    db.outfitTemplates.push(newTemplate);
    const category = db.outfitCategories.find((c) => c.id === newTemplate.categoryId || c.name === newTemplate.categoryId);
    return {
      ...newTemplate,
      categoryName: category?.name || newTemplate.categoryId,
    };
  }

  static deleteTemplate(id: string) {
    const db = getDb();
    const index = db.outfitTemplates.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error("Шаблон экипировки не найден");
    }
    return db.outfitTemplates.splice(index, 1)[0];
  }

  static getAll(filters?: { category?: string; status?: OutfitStatus; search?: string }) {
    const db = getDb();
    let list = db.outfits.map((o) => {
      // Find which rental currently has this outfit
      const activeRental = db.rentals.find(
        (r) =>
          r.outfitIds.includes(o.id) &&
          (r.status === "ACTIVE" || r.status === "OVERDUE")
      );
      const client = activeRental ? db.clients.find((c) => c.id === activeRental.clientId) : null;
      const categoryObj = db.outfitCategories.find((c) => c.id === o.category || c.name === o.category);

      return {
        ...o,
        categoryName: categoryObj?.name || o.category,
        currentRental: activeRental
          ? {
              id: activeRental.id,
              rentalNumber: activeRental.rentalNumber,
              clientName: client?.fullName,
            }
          : null,
      };
    });

    if (filters?.category) {
      list = list.filter((o) => o.category === filters.category || o.categoryName === filters.category);
    }
    if (filters?.status) {
      list = list.filter((o) => o.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.inventoryNumber?.toLowerCase().includes(q) ||
          o.categoryName?.toLowerCase().includes(q)
      );
    }

    return list;
  }

  static getById(id: string) {
    const db = getDb();
    const outfit = db.outfits.find((o) => o.id === id);
    if (!outfit) return null;
    const categoryObj = db.outfitCategories.find((c) => c.id === outfit.category || c.name === outfit.category);
    return {
      ...outfit,
      categoryName: categoryObj?.name || outfit.category,
    };
  }

  static getAvailable() {
    const db = getDb();
    return db.outfits
      .filter((o) => o.status === "IN_STOCK")
      .map((o) => {
        const categoryObj = db.outfitCategories.find((c) => c.id === o.category || c.name === o.category);
        return {
          ...o,
          categoryName: categoryObj?.name || o.category,
        };
      });
  }

  static create(data: {
    name: string;
    category: string;
    inventoryNumber?: string;
    depositValue: number;
    purchasePrice?: number;
    salePrice?: number;
    status?: OutfitStatus;
  }) {
    const db = getDb();
    if (data.inventoryNumber && db.outfits.some((o) => o.inventoryNumber === data.inventoryNumber)) {
      throw new Error(`Экипировка с инвентарным номером ${data.inventoryNumber} уже существует`);
    }

    const tmpl = db.outfitTemplates.find(
      (t) =>
        (t.categoryId === data.category || t.name.toLowerCase() === data.name.toLowerCase()) &&
        t.name.toLowerCase() === data.name.toLowerCase()
    );
    const purchasePrice =
      data.purchasePrice !== undefined
        ? Number(data.purchasePrice)
        : (tmpl?.purchasePrice ?? 0);
    const salePrice =
      data.salePrice !== undefined
        ? Number(data.salePrice)
        : (tmpl?.salePrice ?? 0);

    const newOutfit = {
      id: `outfit-${Date.now()}`,
      name: data.name,
      category: data.category,
      inventoryNumber: data.inventoryNumber || `EQ-${Date.now().toString().slice(-4)}`,
      depositValue: data.depositValue,
      purchasePrice,
      salePrice,
      status: data.status || ("IN_STOCK" as OutfitStatus),
    };

    db.outfits.push(newOutfit);
    return newOutfit;
  }

  static updateStatus(id: string, status: OutfitStatus) {
    const db = getDb();
    const outfit = db.outfits.find((o) => o.id === id);
    if (!outfit) return null;

    outfit.status = status;
    return outfit;
  }

  static delete(id: string) {
    const db = getDb();
    const index = db.outfits.findIndex((o) => o.id === id);
    if (index === -1) {
      throw new Error("Экипировка не найдена");
    }

    const activeRental = db.rentals.find(
      (r) => r.outfitIds.includes(id) && (r.status === "ACTIVE" || r.status === "OVERDUE")
    );
    if (activeRental) {
      throw new Error(`Невозможно удалить экипировку, выданную по активному договору (${activeRental.rentalNumber})`);
    }

    const removed = db.outfits.splice(index, 1)[0];
    return removed;
  }
}

