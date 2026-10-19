import { getDb, saveDb, AuditLogRecord } from "./db.js";
import { getCurrentUser } from "../context/userContext.js";

export interface UnifiedHistoryItem {
  id: string;
  category: "RENTAL" | "PAYMENT" | "REPAIR" | "FLEET" | "CLIENT" | "INFO" | "SYSTEM";
  action: string;
  title: string;
  details: string;
  timestamp: string;
  actor: string;
  amount?: number;
  badgeText: string;
  badgeColor: string;
  entityId?: string;
}

export class HistoryRepository {
  static logAction(entry: {
    category: "RENTAL" | "PAYMENT" | "REPAIR" | "FLEET" | "CLIENT" | "INFO" | "SYSTEM";
    action: string;
    title: string;
    details?: string;
    actorName?: string;
    amount?: number;
    badgeText?: string;
    badgeColor?: string;
    entityId?: string;
  }) {
    const db = getDb();
    if (!db.auditLogs) {
      db.auditLogs = [];
    }

    const current = getCurrentUser();
    const defaultActor = current?.displayName || "Администратор";

    const log: AuditLogRecord = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: entry.category,
      action: entry.action,
      title: entry.title,
      details: entry.details,
      actorName: entry.actorName || defaultActor,
      amount: entry.amount,
      badgeText: entry.badgeText,
      badgeColor: entry.badgeColor,
      entityId: entry.entityId,
      createdAt: new Date().toISOString(),
    };

    db.auditLogs.unshift(log);
    // Keep last 1000 explicit logs
    if (db.auditLogs.length > 1000) {
      db.auditLogs = db.auditLogs.slice(0, 1000);
    }
    saveDb(true);
    return log;
  }

  static getAll(filters?: {
    category?: string;
    search?: string;
    limit?: number;
    days?: number;
  }): { items: UnifiedHistoryItem[]; totalCount: number } {
    const db = getDb();
    const items: UnifiedHistoryItem[] = [];

    // 1. Explicit audit logs
    (db.auditLogs || []).forEach((log) => {
      let actor = log.actorName || "Администратор";
      if (actor.includes("Ковалев") || actor.includes("Смирнов")) {
        actor = "BXLETH (Руководитель парка)";
      }
      items.push({
        id: log.id,
        category: log.category,
        action: log.action,
        title: log.title,
        details: log.details || "",
        timestamp: log.createdAt,
        actor,
        amount: log.amount,
        badgeText: log.badgeText || log.category,
        badgeColor: log.badgeColor || "emerald",
        entityId: log.entityId,
      });
    });

    // 2. Synthesize from Rentals
    (db.rentals || []).forEach((r) => {
      const client = db.clients.find((c) => c.id === r.clientId);
      const bike = db.bikes.find((b) => b.id === r.bikeId);
      const clientName = client?.fullName || "Курьер";
      const bikeNum = bike?.inventoryNumber || "Байк";

      const manager = db.users.find((u) => u.id === r.managerId);
      const actor = manager
        ? `${manager.fullName} (${manager.roleTitle || (manager.role === "ADMIN" ? "Руководитель" : "Менеджер")})`
        : "Менеджер Проката";

      // Rental creation
      items.push({
        id: `hist-rent-create-${r.id}`,
        category: "RENTAL",
        action: "RENTAL_CREATE",
        title: `Оформлен договор аренды ${r.rentalNumber}`,
        details: `Курьер: ${clientName} (${client?.phone || ""}), Байк: ${bikeNum}, Залог: ${(r.depositAmount || 0).toLocaleString("ru-RU")} ₽`,
        timestamp: r.startedAt || r.createdAt || new Date().toISOString(),
        actor,
        amount: r.totalBuyoutPrice || r.depositAmount,
        badgeText: r.type === "RENT_TO_OWN" ? "Выкуп" : "Аренда",
        badgeColor: r.type === "RENT_TO_OWN" ? "purple" : "sky",
        entityId: r.id,
      });

      // Rental closure if finished
      if (r.status === "CLOSED" || r.status === "BOUGHT_OUT") {
        items.push({
          id: `hist-rent-close-${r.id}`,
          category: "RENTAL",
          action: "RENTAL_CLOSE",
          title: `${r.status === "BOUGHT_OUT" ? "🎉 Договор выкуплен" : "Возврат техники по договору"} ${r.rentalNumber}`,
          details: `Курьер: ${clientName}, Байк: ${bikeNum}. Договор закрыт.`,
          timestamp: r.updatedAt || r.expiresAt || new Date().toISOString(),
          actor,
          badgeText: r.status === "BOUGHT_OUT" ? "Выкуплен" : "Возврат",
          badgeColor: r.status === "BOUGHT_OUT" ? "purple" : "emerald",
          entityId: r.id,
        });
      }
    });

    // 3. Synthesize from Payments & Cash
    (db.payments || []).forEach((p) => {
      let title = "Кассовая операция";
      let badge = "Платеж";
      let color = "emerald";

      if (p.type === "RENTAL") {
        title = `Оплата аренды: +${p.amount.toLocaleString("ru-RU")} ₽`;
        badge = "Аренда";
        color = "sky";
      } else if (p.type === "BUYOUT") {
        title = `Взнос по выкупу: +${p.amount.toLocaleString("ru-RU")} ₽`;
        badge = "Выкуп";
        color = "purple";
      } else if (p.type === "DEPOSIT") {
        title = `Принят залог: +${p.amount.toLocaleString("ru-RU")} ₽`;
        badge = "Залог";
        color = "emerald";
      } else if (p.type === "DEPOSIT_REFUND") {
        title = `Возврат залога клиенту: -${p.amount.toLocaleString("ru-RU")} ₽`;
        badge = "Возврат залога";
        color = "amber";
      } else if (p.type === "REPAIR") {
        title = `Оплата услуг СТО: +${p.amount.toLocaleString("ru-RU")} ₽`;
        badge = "Ремонт";
        color = "indigo";
      } else if (p.type === "SALARY_PAYMENT") {
        title = `Выплата заработной платы: -${p.amount.toLocaleString("ru-RU")} ₽`;
        badge = "Зарплата";
        color = "rose";
      }

      const cashier = (p as any).cashierId ? db.users.find((u) => u.id === (p as any).cashierId) : undefined;
      const actor = cashier
        ? `${cashier.fullName} (${cashier.roleTitle || "Кассир"})`
        : "Кассир / Менеджер";

      items.push({
        id: `hist-pay-${p.id}`,
        category: "PAYMENT",
        action: p.type,
        title,
        details: `${p.description || "Оплата"} (Метод: ${p.method})`,
        timestamp: p.createdAt,
        actor,
        amount: p.amount,
        badgeText: badge,
        badgeColor: color,
        entityId: p.rentalId || p.id,
      });
    });

    // 4. Synthesize from Repairs & Workshop
    (db.repairs || []).forEach((rep) => {
      const mechanic = rep.mechanicId ? db.users.find((u) => u.id === rep.mechanicId) : undefined;
      const actor = (rep as any).mechanicName
        ? `${(rep as any).mechanicName} (Мастер)`
        : mechanic
        ? `${mechanic.fullName} (${mechanic.roleTitle || "Мастер СТО"})`
        : "Мастер СТО";

      items.push({
        id: `hist-rep-create-${rep.id}`,
        category: "REPAIR",
        action: "REPAIR_CREATE",
        title: `Создан заказ-наряд СТО ${rep.orderNumber}`,
        details: `Неисправность: ${rep.description}. Ответственность: ${rep.faultType === "CLIENT_FAULT" ? "По вине клиента" : "Сервис компании"}`,
        timestamp: rep.createdAt,
        actor,
        amount: rep.totalCost,
        badgeText: "СТО Наряд",
        badgeColor: "amber",
        entityId: rep.id,
      });

      if (rep.status === "COMPLETED" && rep.completedAt) {
        items.push({
          id: `hist-rep-complete-${rep.id}`,
          category: "REPAIR",
          action: "REPAIR_COMPLETE",
          title: `Завершен заказ-наряд ${rep.orderNumber}`,
          details: `Работы выполнены. Детали списаны. Итоговая стоимость: ${(rep.totalCost || 0).toLocaleString("ru-RU")} ₽`,
          timestamp: rep.completedAt,
          actor,
          amount: rep.totalCost,
          badgeText: "СТО Завершен",
          badgeColor: "emerald",
          entityId: rep.id,
        });
      }
    });

    // 5. Synthesize from Clients
    (db.clients || []).forEach((c) => {
      const creator = (c as any).createdById ? db.users.find((u) => u.id === (c as any).createdById) : undefined;
      const actor = creator
        ? `${creator.fullName} (${creator.roleTitle || "Менеджер"})`
        : "Менеджер Проката";

      items.push({
        id: `hist-client-${c.id}`,
        category: "CLIENT",
        action: "CLIENT_REGISTER",
        title: `Зарегистрирован клиент/курьер ${c.fullName}`,
        details: `Телефон: ${c.phone}, служба: ${c.courierService || "Не указана"}, гражданство: ${c.citizenship || "РФ"}`,
        timestamp: c.createdAt || new Date().toISOString(),
        actor,
        badgeText: "Курьер",
        badgeColor: "blue",
        entityId: c.id,
      });
    });

    // 6. Synthesize from Fleet (Bikes & Batteries)
    (db.bikes || []).forEach((b) => {
      const model = db.models.find((m) => m.id === b.modelId);
      items.push({
        id: `hist-bike-${b.id}`,
        category: "FLEET",
        action: "BIKE_ADD",
        title: `Добавлен электровелосипед ${b.inventoryNumber}`,
        details: `Модель: ${model?.name || "Байк"}, локация: ${b.currentLocation || "Центральная база"}`,
        timestamp: b.createdAt || new Date().toISOString(),
        actor: "Администратор парка",
        badgeText: "Байк",
        badgeColor: "teal",
        entityId: b.id,
      });
    });

    // 7. Synthesize from Articles / Knowledge Base
    (db.articles || []).forEach((art) => {
      const author = art.authorId ? db.users.find((u) => u.id === art.authorId) : undefined;
      const actor = author
        ? `${author.fullName} (${author.roleTitle || "Менеджер"})`
        : "Администратор";

      items.push({
        id: `hist-art-${art.id}`,
        category: "INFO",
        action: "ARTICLE_CREATE",
        title: `Карточка базы знаний: «${art.title}»`,
        details: `Категория: ${art.category || "Общая"}. ${art.pinned ? "Закреплена вверху списка." : ""}`,
        timestamp: art.createdAt || new Date().toISOString(),
        actor,
        badgeText: "База знаний",
        badgeColor: "purple",
        entityId: art.id,
      });
      if (art.updatedAt && art.updatedAt !== art.createdAt) {
        items.push({
          id: `hist-art-upd-${art.id}-${art.updatedAt}`,
          category: "INFO",
          action: "ARTICLE_UPDATE",
          title: `Обновлена карточка: «${art.title}»`,
          details: `Категория: ${art.category || "Общая"}. Изменения сохранены.`,
          timestamp: art.updatedAt,
          actor,
          badgeText: "База знаний",
          badgeColor: "purple",
          entityId: art.id,
        });
      }
    });

    // 8. Synthesize from Batteries
    (db.batteries || []).forEach((bat) => {
      items.push({
        id: `hist-bat-${bat.id}`,
        category: "FLEET",
        action: "BATTERY_ADD",
        title: `Поступил аккумулятор ${bat.serialNumber}`,
        details: `Напряжение: ${bat.voltage}V, емкость: ${bat.capacityAh}Ah, статус: ${bat.status}`,
        timestamp: bat.createdAt || new Date().toISOString(),
        actor: "Администратор парка",
        badgeText: "АКБ",
        badgeColor: "teal",
        entityId: bat.id,
      });
    });

    // Deduplicate by ID
    const map = new Map<string, UnifiedHistoryItem>();
    items.forEach((item) => {
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });

    let result = Array.from(map.values());

    // Filter by days
    if (filters?.days && filters.days > 0) {
      const cutoff = new Date(Date.now() - filters.days * 86400000).getTime();
      result = result.filter((item) => new Date(item.timestamp).getTime() >= cutoff);
    }

    // Filter by category
    if (filters?.category && filters.category !== "ALL") {
      result = result.filter((item) => item.category === filters.category);
    }

    // Filter by search query
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.details.toLowerCase().includes(q) ||
          item.actor.toLowerCase().includes(q) ||
          item.badgeText.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const totalCount = result.length;
    const limit = filters?.limit || 200;

    return {
      items: result.slice(0, limit),
      totalCount,
    };
  }

  static clearAuditLogs() {
    const db = getDb();
    db.auditLogs = [];
    saveDb(true);
    return { success: true, message: "Журнал аудита очищен" };
  }
}
