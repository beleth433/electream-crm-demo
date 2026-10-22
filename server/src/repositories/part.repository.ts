import { getDb, getSystemTime, saveDb, withDbTransaction, PartRecord, PartOrderRecord, PartOrderStatus, PartOrderPriority, PaymentType, PaymentMethod } from "./db.js";
import { HistoryRepository } from "./history.repository.js";

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

  // --- Procurement Orders Categories (Отделы заявок на закупку) ---
  static getOrderCategories() {
    const db = getDb();
    if (!db.partOrderCategories) {
      db.partOrderCategories = [];
    }
    return db.partOrderCategories.map((c) => ({
      ...c,
      orderCount: (db.partOrders || []).filter((o) => o.categoryId === c.id).length,
    }));
  }

  static createOrderCategory(data: { name: string }) {
    const db = getDb();
    if (!db.partOrderCategories) {
      db.partOrderCategories = [];
    }
    const trimmed = data.name.trim();
    if (db.partOrderCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new Error(`Отдел/категория заявок "${trimmed}" уже существует`);
    }

    const newCategory = {
      id: `cat-ord-${Date.now()}`,
      name: trimmed,
      isSystem: false,
    };

    db.partOrderCategories.push(newCategory);
    saveDb(true);
    return {
      ...newCategory,
      orderCount: 0,
    };
  }

  static updateOrderCategory(id: string, name: string) {
    const db = getDb();
    if (!db.partOrderCategories) {
      db.partOrderCategories = [];
    }
    const index = db.partOrderCategories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Отдел/категория заявок не найдена");
    }

    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Название категории не может быть пустым");
    }

    db.partOrderCategories[index].name = trimmed;

    // Synchronize categoryName in all orders assigned to this category
    if (db.partOrders) {
      for (const order of db.partOrders) {
        if (order.categoryId === id) {
          order.categoryName = trimmed;
        }
      }
    }

    saveDb(true);
    return {
      ...db.partOrderCategories[index],
      orderCount: (db.partOrders || []).filter((o) => o.categoryId === id).length,
    };
  }

  static deleteOrderCategory(id: string) {
    const db = getDb();
    if (!db.partOrderCategories) {
      db.partOrderCategories = [];
    }
    const index = db.partOrderCategories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Отдел/категория заявок не найдена");
    }

    const usedCount = (db.partOrders || []).filter((o) => o.categoryId === id).length;
    if (usedCount > 0) {
      throw new Error(`Нельзя удалить отдел: к нему привязано ${usedCount} заявок`);
    }

    const removed = db.partOrderCategories.splice(index, 1)[0];
    saveDb(true);
    return removed;
  }

  // --- Procurement Orders (Заявки на закупку деталей) ---
  static getOrders(filters?: { status?: string; search?: string; categoryId?: string }) {
    const db = getDb();
    if (!db.partOrders) {
      db.partOrders = [];
    }
    let orders = [...db.partOrders];

    if (filters?.status && filters.status !== 'ALL') {
      orders = orders.filter((o) => o.status === filters.status);
    }

    if (filters?.categoryId && filters.categoryId !== 'ALL') {
      orders = orders.filter((o) => o.categoryId === filters.categoryId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      orders = orders.filter(
        (o) =>
          o.partName.toLowerCase().includes(q) ||
          (o.note && o.note.toLowerCase().includes(q)) ||
          (o.orderUrl && o.orderUrl.toLowerCase().includes(q)) ||
          (o.categoryName && o.categoryName.toLowerCase().includes(q)) ||
          (o.requestedBy && o.requestedBy.toLowerCase().includes(q))
      );
    }

    const priorityWeight: Record<string, number> = {
      URGENT: 1,
      NORMAL: 2,
      LOW: 3,
    };

    const statusWeight: Record<string, number> = {
      REQUESTED: 1,
      ORDERED: 2,
      RECEIVED: 3,
      ARCHIVED: 4,
      CANCELLED: 5,
    };

    orders.sort((a, b) => {
      // 1. Статус заявки: Требуется (1) -> В пути (2) -> Получено (3) -> Отменено (4)
      const wA = statusWeight[a.status] || 5;
      const wB = statusWeight[b.status] || 5;
      if (wA !== wB) return wA - wB;

      // 2. Внутри каждого статуса: Срочно (URGENT) всегда наверху
      const pA = priorityWeight[a.priority || 'NORMAL'] || 2;
      const pB = priorityWeight[b.priority || 'NORMAL'] || 2;
      if (pA !== pB) return pA - pB;

      // 3. Дата: новые сначала
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });

    return orders.map((o) => {
      const cat = db.partOrderCategories?.find((c) => c.id === o.categoryId);
      return {
        ...o,
        categoryName: cat?.name || o.categoryName || undefined,
      };
    });
  }

  static createOrder(data: {
    partName: string;
    partId?: string | null;
    categoryId?: string | null;
    categoryName?: string | null;
    quantity: number;
    orderUrl?: string | null;
    priority?: PartOrderPriority;
    estimatedPrice?: number;
    note?: string | null;
    requestedBy?: string | null;
  }) {
    const db = getDb();
    if (!db.partOrders) {
      db.partOrders = [];
    }

    let categoryName = data.categoryName;
    if (data.categoryId) {
      const cat = db.partOrderCategories?.find((c) => c.id === data.categoryId);
      if (cat) categoryName = cat.name;
    }

    const newOrder: PartOrderRecord = {
      id: `ord-part-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      partName: data.partName.trim(),
      partId: data.partId || null,
      categoryId: data.categoryId || null,
      categoryName: categoryName || null,
      quantity: Number(data.quantity) || 1,
      orderUrl: data.orderUrl ? data.orderUrl.trim() : null,
      priority: data.priority || "NORMAL",
      status: "REQUESTED",
      estimatedPrice: data.estimatedPrice ? Number(data.estimatedPrice) : undefined,
      note: data.note ? data.note.trim() : null,
      requestedBy: data.requestedBy || "Мастер СТО",
      requestedAt: new Date().toISOString(),
    };

    db.partOrders.unshift(newOrder);
    saveDb(true);

    try {
      HistoryRepository.logAction({
        category: "FLEET",
        action: "Создана заявка на закупку",
        title: `Заявка: ${newOrder.partName} (${newOrder.quantity} шт.)`,
        details: newOrder.orderUrl ? `Ссылка: ${newOrder.orderUrl}` : newOrder.note || undefined,
        actorName: newOrder.requestedBy,
        badgeText: newOrder.priority === "URGENT" ? "Срочно" : "Закупка",
        badgeColor: newOrder.priority === "URGENT" ? "rose" : "amber",
        entityId: newOrder.id,
      });
    } catch {}

    return newOrder;
  }

  static updateOrder(id: string, data: Partial<PartOrderRecord>) {
    return withDbTransaction(() => this.updateOrderInternal(id, data));
  }

  private static updateOrderInternal(id: string, data: Partial<PartOrderRecord>) {
    const db = getDb();
    if (!db.partOrders) db.partOrders = [];
    const index = db.partOrders.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Заявка на закупку не найдена");
    const currentOrder = db.partOrders[index];
    if (currentOrder.receivedAt && ((data.quantity !== undefined && data.quantity !== currentOrder.quantity) || (data.partId !== undefined && data.partId !== currentOrder.partId))) {
      throw new Error("Полученная партия уже оприходована; количество и номенклатуру нельзя менять в заявке");
    }
    const targetStatus = data.status;
    const requestedData = { ...data };
    delete requestedData.status;

    let categoryName = db.partOrders[index].categoryName;
    if (data.categoryId) {
      const cat = db.partOrderCategories?.find((c) => c.id === data.categoryId);
      if (cat) categoryName = cat.name;
    } else if (data.categoryId === null) {
      categoryName = null;
    }

    db.partOrders[index] = {
      ...db.partOrders[index],
      ...requestedData,
      categoryName: data.categoryName !== undefined ? data.categoryName : categoryName,
    };
    if (targetStatus && targetStatus !== currentOrder.status) this.updateOrderStatus(id, targetStatus, { actualCost: data.actualCost, paymentMethod: data.paymentMethod || undefined });
    else if (currentOrder.status === "ORDERED" && (data.actualCost !== undefined || data.quantity !== undefined || data.estimatedPrice !== undefined)) {
      this.updateOrderStatus(id, "ORDERED", { actualCost: data.actualCost, paymentMethod: data.paymentMethod || undefined });
    }
    saveDb(true);
    return db.partOrders[index];
  }

  static updateOrderStatus(id: string, status: PartOrderStatus, options?: Parameters<typeof PartRepository.updateOrderStatusInternal>[2]) {
    return withDbTransaction(() => this.updateOrderStatusInternal(id, status, options));
  }

  private static updateOrderStatusInternal(
    id: string,
    status: PartOrderStatus,
    options?: {
      actualCost?: number;
      paymentMethod?: PaymentMethod;
      addToStock?: boolean;
      createPartData?: {
        name?: string;
        sku?: string;
        categoryId?: string;
        quantity?: number;
        minQuantity?: number;
        purchasePrice?: number;
        clientPrice?: number;
      };
    }
  ) {
    const db = getDb();
    if (!db.partOrders) db.partOrders = [];
    const order = db.partOrders.find((o) => o.id === id);
    if (!order) throw new Error("Заявка на закупку не найдена");

    const previousStatus = order.status;
    if (status === previousStatus && status !== "ORDERED") return order;
    const transitions: Record<PartOrderStatus, PartOrderStatus[]> = {
      REQUESTED: ["ORDERED", "CANCELLED"], ORDERED: ["REQUESTED", "RECEIVED", "CANCELLED"],
      RECEIVED: ["ARCHIVED"], ARCHIVED: [], CANCELLED: ["REQUESTED"],
    };
    if (status !== previousStatus && !transitions[previousStatus].includes(status)) throw new Error("Недопустимый переход статуса закупки");
    if (status === "RECEIVED" && options?.addToStock !== false && !options?.createPartData) {
      const part = db.parts.find((p) => order.partId ? p.id === order.partId : p.name.toLowerCase() === order.partName.toLowerCase());
      if (!part) throw new Error("Для приёмки выберите существующую деталь или создайте новую номенклатуру");
    }
    if (status === "RECEIVED" && options?.createPartData?.sku && db.parts.some((p) => p.sku.toLowerCase() === options.createPartData!.sku!.trim().toLowerCase())) {
      throw new Error("Запчасть с этим артикулом уже существует");
    }
    order.status = status;

    if (options?.actualCost !== undefined) {
      order.actualCost = options.actualCost;
    }
    if (options?.paymentMethod) {
      order.paymentMethod = options.paymentMethod;
    }

    if (status === "ORDERED") {
      if (!order.orderedAt) {
        order.orderedAt = new Date().toISOString();
      }

      // 1. Calculate expense amount
      const expenseAmount =
        order.actualCost !== undefined
          ? order.actualCost
          : (Number(order.estimatedPrice) || 0) * (Number(order.quantity) || 1);

      if (expenseAmount === 0) {
        db.payments = db.payments.filter((p) => p.orderId !== order.id && p.id !== order.paymentId);
        order.paymentId = null;
      } else if (expenseAmount > 0) {
        if (!db.payments) db.payments = [];
        const method: PaymentMethod = options?.paymentMethod || order.paymentMethod || "CARD";
        const existingPayment = db.payments.find(
          (p) => p.orderId === order.id || (order.paymentId && p.id === order.paymentId)
        );

        if (existingPayment) {
          existingPayment.amount = expenseAmount;
          existingPayment.method = method;
          existingPayment.type = "PART_PURCHASE";
          order.paymentId = existingPayment.id;
        } else {
          const newPaymentId = `pay-part-${Date.now()}`;
          const newPayment = {
            id: newPaymentId,
            rentalId: null,
            orderId: order.id,
            type: "PART_PURCHASE" as PaymentType,
            amount: expenseAmount,
            method: method,
            description: `Закупка расходников: ${order.partName} (${order.quantity} шт.) • Отдел: ${order.categoryName || 'Общий'}${order.requestedBy ? ` • Заявитель: ${order.requestedBy}` : ''}`,
            createdAt: new Date().toISOString(),
          };
          db.payments.push(newPayment);
          order.paymentId = newPaymentId;

          try {
            HistoryRepository.logAction({
              category: "PAYMENT",
              action: "Оплата закупки",
              title: `Расход на закупку: ${order.partName} (${order.quantity} шт.)`,
              details: `Сумма расхода: ${expenseAmount.toLocaleString('ru-RU')} ₽ (${method}), отдел: ${order.categoryName || 'Общий'}`,
              amount: -expenseAmount,
              badgeText: "Расход кассы",
              badgeColor: "rose",
              entityId: order.id,
            });
          } catch {}
        }
      }
    } else if (status === "REQUESTED" || status === "CANCELLED") {
      // If reverted from ORDERED, remove payment from cash register
      if (previousStatus === "ORDERED" && (order.paymentId || db.payments?.some((p) => p.orderId === order.id))) {
        if (db.payments) {
          const pIdx = db.payments.findIndex(
            (p) => p.orderId === order.id || (order.paymentId && p.id === order.paymentId)
          );
          if (pIdx !== -1) {
            const [removedPay] = db.payments.splice(pIdx, 1);
            order.paymentId = null;
            try {
              HistoryRepository.logAction({
                category: "PAYMENT",
                action: "Аннулирование расхода закупки",
                title: `Отмена расхода закупки: ${order.partName}`,
                details: `Статус изменен на "${status === 'REQUESTED' ? 'Требуется' : 'Отменено'}", платеж ${removedPay.amount.toLocaleString('ru-RU')} ₽ удален из кассы`,
                amount: removedPay.amount,
                badgeText: "Возврат кассы",
                badgeColor: "emerald",
                entityId: order.id,
              });
            } catch {}
          }
        }
      }
      order.orderedAt = null;
      order.actualCost = undefined;
    } else if (status === "RECEIVED") {
      order.receivedAt = new Date().toISOString();

      if (options?.createPartData) {
        if (!db.parts) db.parts = [];
        let cat = options.createPartData.categoryId
          ? db.partCategories?.find((c) => c.id === options.createPartData?.categoryId)
          : undefined;
        if (!cat && db.partCategories && db.partCategories.length > 0) {
          cat = db.partCategories[0];
        }

        const calculatedPurchase = options.createPartData.purchasePrice !== undefined
          ? Number(options.createPartData.purchasePrice)
          : order.actualCost && order.quantity
          ? Math.round(order.actualCost / order.quantity)
          : (order.estimatedPrice || 0);

        const calculatedClient = options.createPartData.clientPrice !== undefined
          ? Number(options.createPartData.clientPrice)
          : Math.round(calculatedPurchase * 1.5);

        const newPart = {
          id: `prt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: (options.createPartData.name || order.partName).trim(),
          sku: (options.createPartData.sku || `PRT-${Date.now()}`).trim(),
          categoryId: cat?.id || (db.partCategories && db.partCategories[0]?.id) || undefined,
          categoryName: cat?.name || (db.partCategories && db.partCategories[0]?.name) || undefined,
          quantity: options.createPartData.quantity !== undefined ? Number(options.createPartData.quantity) : (Number(order.quantity) || 1),
          minQuantity: options.createPartData.minQuantity !== undefined ? Number(options.createPartData.minQuantity) : 3,
          purchasePrice: calculatedPurchase,
          clientPrice: calculatedClient,
        };

        db.parts.push(newPart);
        order.partId = newPart.id;

        try {
          HistoryRepository.logAction({
            category: "FLEET",
            action: "Создание номенклатуры при приемке",
            title: `Новая деталь на складе: ${newPart.name} (${newPart.sku})`,
            details: `Оприходовано ${newPart.quantity} шт. по закупке ${newPart.purchasePrice} ₽/шт., категория: ${newPart.categoryName || 'Общая'}`,
            badgeText: "Новая деталь",
            badgeColor: "emerald",
            entityId: newPart.id,
          });
        } catch {}
      } else if (options?.addToStock !== false) {
        if (order.partId) {
          const part = db.parts.find((p) => p.id === order.partId);
          if (part) {
            part.quantity += order.quantity;
            if (order.actualCost && order.actualCost > 0) {
              part.purchasePrice = order.actualCost / order.quantity;
            }
          }
        } else {
          const existingPart = db.parts.find(
            (p) => p.name.toLowerCase() === order.partName.toLowerCase()
          );
          if (existingPart) {
            existingPart.quantity += order.quantity;
            order.partId = existingPart.id;
          }
        }
      }

      try {
        HistoryRepository.logAction({
          category: "FLEET",
          action: "Поступление запчастей",
          title: `Получено по заявке: ${order.partName} (${order.quantity} шт.)`,
          details: `Статус заявки обновлен на "Получено"${options?.addToStock === false ? ' (без добавления в каталог запчастей)' : ', остаток оприходован'}`,
          badgeText: "Получено",
          badgeColor: "emerald",
          entityId: order.id,
        });
      } catch {}
    } else if (status === "ARCHIVED") {
      try {
        HistoryRepository.logAction({
          category: "FLEET",
          action: "Архивация закупки",
          title: `Заявка перенесена в архив: ${order.partName}`,
          details: `Закупка завершена и сохранена в архиве (кассовый расход сохранён)`,
          badgeText: "Архив",
          badgeColor: "slate",
          entityId: order.id,
        });
      } catch {}
    }

    saveDb(true);
    return order;
  }

  static deleteOrder(id: string, options?: { deletePayment?: boolean }) {
    const db = getDb();
    if (!db.partOrders) db.partOrders = [];
    const index = db.partOrders.findIndex((o) => o.id === id);
    if (index === -1) throw new Error("Заявка на закупку не найдена");
    const removed = db.partOrders.splice(index, 1)[0];

    const shouldDeletePayment = options?.deletePayment !== false;

    // Clean up associated payment if requested
    if (shouldDeletePayment && db.payments) {
      const pIdx = db.payments.findIndex(
        (p) => p.orderId === id || (removed.paymentId && p.id === removed.paymentId)
      );
      if (pIdx !== -1) {
        const [removedPay] = db.payments.splice(pIdx, 1);
        try {
          HistoryRepository.logAction({
            category: "PAYMENT",
            action: "Аннулирование расхода закупки",
            title: `Аннулирован расход при удалении заявки: ${removed.partName}`,
            details: `Удалена заявка, платеж ${removedPay.amount.toLocaleString('ru-RU')} ₽ удален из кассы`,
            amount: removedPay.amount,
            badgeText: "Возврат кассы",
            badgeColor: "emerald",
            entityId: id,
          });
        } catch {}
      }
    }

    saveDb(true);
    return removed;
  }
}

