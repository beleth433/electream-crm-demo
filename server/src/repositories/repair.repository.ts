import { HistoryRepository } from './history.repository.js';
import { getDb, getSystemTime, withDbTransaction, RepairStatus, RepairFaultType, PaymentMethod, RepairOrderRecord, saveDb } from "./db.js";
import { getCurrentUser } from "../context/userContext.js";
import { activeRentalForBike, activeRentalForBattery, normalizePhone, nextNumber } from "./relations.js";
import { ClientRepository } from "./client.repository.js";

export class RepairRepository {
  static getAll(filters?: { status?: RepairStatus; faultType?: RepairFaultType; bikeId?: string; batteryId?: string; itemType?: "BIKE" | "BATTERY" | "EXTERNAL_DEVICE" }) {
    const db = getDb();
    let list = db.repairs.map((r) => {
      const bike = r.bikeId ? db.bikes.find((b) => b.id === r.bikeId) : null;
      const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;
      const battery = r.batteryId ? db.batteries.find((bt) => bt.id === r.batteryId) : null;
      const batteryModel = battery?.modelId ? db.batteryModels.find((m) => m.id === battery.modelId) : null;
      const mechanic = db.users.find((u) => u.id === r.mechanicId);
      const client = r.clientId ? db.clients.find((c) => c.id === r.clientId) : null;
      const partsDetailed = r.parts.map((p) => {
        const partInfo = db.parts.find((part) => part.id === p.partId);
        return {
          ...p,
          part: partInfo,
        };
      });

      return {
        ...r,
        itemType: r.itemType || (r.batteryId ? "BATTERY" : r.bikeId ? "BIKE" : "EXTERNAL_DEVICE"),
        bike: bike ? { ...bike, model: bikeModel } : null,
        battery: battery ? { ...battery, model: batteryModel } : null,
        client: client || (r.clientName ? { id: r.clientId || 'ext', fullName: r.clientName, phone: r.clientPhone } : null),
        mechanic,
        parts: partsDetailed,
      };
    });

    if (filters?.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters?.faultType) {
      list = list.filter((r) => r.faultType === filters.faultType);
    }
    if (filters?.bikeId) {
      list = list.filter((r) => r.bikeId === filters.bikeId);
    }
    if (filters?.batteryId) {
      list = list.filter((r) => r.batteryId === filters.batteryId);
    }
    if (filters?.itemType) {
      list = list.filter((r) => (r.itemType || (r.batteryId ? "BATTERY" : r.bikeId ? "BIKE" : "EXTERNAL_DEVICE")) === filters.itemType);
    }

    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  static getById(id: string) {
    const db = getDb();
    const r = db.repairs.find((rep) => rep.id === id);
    if (!r) return null;

    const bike = r.bikeId ? db.bikes.find((b) => b.id === r.bikeId) : null;
    const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;
    const battery = r.batteryId ? db.batteries.find((bt) => bt.id === r.batteryId) : null;
    const batteryModel = battery?.modelId ? db.batteryModels.find((m) => m.id === battery.modelId) : null;
    const mechanic = db.users.find((u) => u.id === r.mechanicId);
    const client = r.clientId ? db.clients.find((c) => c.id === r.clientId) : null;
    const partsDetailed = r.parts.map((p) => {
      const partInfo = db.parts.find((part) => part.id === p.partId);
      return {
        ...p,
        part: partInfo,
      };
    });

    return {
      ...r,
      itemType: r.itemType || (r.batteryId ? "BATTERY" : r.bikeId ? "BIKE" : "EXTERNAL_DEVICE"),
      bike: bike ? { ...bike, model: bikeModel } : null,
      battery: battery ? { ...battery, model: batteryModel } : null,
      client: client || (r.clientName ? { id: r.clientId || 'ext', fullName: r.clientName, phone: r.clientPhone } : null),
      mechanic,
      parts: partsDetailed,
    };
  }

  static create(data: Parameters<typeof RepairRepository.createInternal>[0]) {
    return withDbTransaction(() => this.createInternal(data));
  }

  private static createInternal(data: {
    itemType?: "BIKE" | "BATTERY" | "EXTERNAL_DEVICE";
    bikeId?: string | null;
    batteryId?: string | null;
    customItemName?: string | null;
    clientName?: string | null;
    clientPhone?: string | null;
    clientId?: string | null;
    mechanicId?: string;
    orderNumber?: string;
    faultType: RepairFaultType;
    description: string;
    laborCost?: number;
    parts?: Array<{ partId: string; quantity: number }>;
  }) {
    const db = getDb();
    const now = getSystemTime();
    const orderNumber = data.orderNumber && data.orderNumber.trim()
      ? data.orderNumber.trim()
      : nextNumber(`ЗН-${now.getFullYear()}`, db.repairs.map((r) => r.orderNumber));
    if (db.repairs.some((r) => r.orderNumber.toLowerCase() === orderNumber.toLowerCase())) throw new Error("Номер заказ-наряда уже существует");
    const itemId = data.batteryId || data.bikeId;
    if (itemId && db.repairs.some((r) => (r.bikeId === itemId || r.batteryId === itemId) && r.status !== "COMPLETED" && r.status !== "CANCELLED")) {
      throw new Error("Для этой техники уже открыт заказ-наряд");
    }

    const isExternal = data.itemType === "EXTERNAL_DEVICE" || (!data.bikeId && !data.batteryId);
    const isBattery = !isExternal && (data.itemType === "BATTERY" || Boolean(data.batteryId));
    let resolvedBikeId: string | null = null;
    let resolvedBatteryId: string | null = null;

    if (isExternal) {
      // External client equipment: does not touch fleet bikes/batteries
      resolvedBikeId = null;
      resolvedBatteryId = null;
    } else if (isBattery) {
      if (!data.batteryId) {
        throw new Error("Не указан аккумулятор для отправки на ТО");
      }
      const battery = db.batteries.find((b) => b.id === data.batteryId);
      if (!battery) throw new Error("Аккумулятор не найден");
      if (battery.status === "SOLD" || battery.status === "DECOMMISSIONED") throw new Error("АКБ выбыл из парка");

      // Detach from bike if mounted
      if (battery.installedBikeId) {
        const parentBike = db.bikes.find((bk) => bk.id === battery.installedBikeId);
        if (parentBike) {
          parentBike.batteryId = null;
          parentBike.updatedAt = now.toISOString();
        }
        battery.installedBikeId = null;
      }

      battery.status = "IN_MAINTENANCE";
      battery.updatedAt = now.toISOString();
      resolvedBatteryId = battery.id;
    } else {
      if (!data.bikeId) {
        throw new Error("Не указан электровелосипед для отправки на ТО");
      }
      const bike = db.bikes.find((b) => b.id === data.bikeId);
      if (!bike) throw new Error("Байк не найден");
      if (bike.status === "SOLD" || bike.status === "BOUGHT_OUT" || bike.status === "DECOMMISSIONED") throw new Error("Байк выбыл из парка; оформите ремонт сторонней техники");

      bike.status = "IN_MAINTENANCE";
      bike.currentLocation = "Мастерская СТО";
      bike.updatedAt = now.toISOString();
      resolvedBikeId = bike.id;
    }

    // Calculate initial parts cost
    let partsCost = 0;
    const partsList: Array<{ partId: string; quantity: number; priceCharged: number }> = [];

    if (data.parts && data.parts.length > 0) {
      for (const p of data.parts) {
        const part = db.parts.find((item) => item.id === p.partId);
        if (part) {
          const price = data.faultType === "CLIENT_FAULT" ? part.clientPrice : part.purchasePrice;
          partsCost += price * p.quantity;
          partsList.push({
            partId: p.partId,
            quantity: p.quantity,
            priceCharged: price,
          });
        }
      }
    }

    const laborCost = data.laborCost || 0;
    const totalCost = laborCost + partsCost;

    let resolvedClientId = data.clientId || null;
    let resolvedClientName = data.clientName?.trim() || null;
    let resolvedClientPhone = data.clientPhone?.trim() || null;

    if (!resolvedClientId && resolvedClientPhone) {
      const clean = normalizePhone(resolvedClientPhone);
      const found = db.clients.find((c) => normalizePhone(c.phone) === clean);
      if (found) {
        resolvedClientId = found.id;
        if (!resolvedClientName) resolvedClientName = found.fullName;
      }
    }

    if (!resolvedClientId && (resolvedBikeId || resolvedBatteryId)) {
      const activeRental = resolvedBikeId ? activeRentalForBike(resolvedBikeId) : activeRentalForBattery(resolvedBatteryId!);
      if (activeRental) {
        resolvedClientId = activeRental.clientId;
        const found = db.clients.find((c) => c.id === activeRental.clientId);
        if (found) {
          if (!resolvedClientName) resolvedClientName = found.fullName;
          if (!resolvedClientPhone) resolvedClientPhone = found.phone;
        }
      }
    }
    if (resolvedClientId) {
      const found = db.clients.find((c) => c.id === resolvedClientId);
      if (!found) throw new Error("Клиент не найден");
      resolvedClientName = found.fullName;
      resolvedClientPhone = found.phone;
    } else if (isExternal && resolvedClientPhone) {
      const created = ClientRepository.create({ fullName: resolvedClientName || `Клиент СТО ${resolvedClientPhone}`, phone: resolvedClientPhone, clientType: "RETAIL" });
      resolvedClientId = created!.id;
      resolvedClientName = created!.fullName;
    }

    const newRepair: RepairOrderRecord = {
      id: `rep-${Date.now()}`,
      orderNumber,
      itemType: isExternal ? "EXTERNAL_DEVICE" : isBattery ? "BATTERY" : "BIKE",
      bikeId: resolvedBikeId,
      batteryId: resolvedBatteryId,
      customItemName: isExternal ? (data.customItemName?.trim() || "Сторонняя техника клиента") : null,
      clientName: resolvedClientName,
      clientPhone: resolvedClientPhone,
      clientId: resolvedClientId,
      mechanicId:
        data.mechanicId ||
        getCurrentUser()?.id ||
        db.users.find((u) => u.role === "MECHANIC")?.id ||
        db.users[0]?.id ||
        "usr-bxleth",
      status: "DIAGNOSTICS" as RepairStatus,
      faultType: data.faultType,
      description: data.description,
      laborCost,
      partsCost,
      totalCost,
      createdAt: now.toISOString(),
      completedAt: null as string | null,
      parts: partsList,
    };

    db.repairs.push(newRepair);
    saveDb();

    return this.getById(newRepair.id);
  }

  static updateStatus(id: string, status: RepairStatus) {
    const db = getDb();
    const repair = db.repairs.find((r) => r.id === id);
    if (!repair) return null;
    if (status === repair.status) return this.getById(id);
    if (repair.status === "COMPLETED" || repair.status === "CANCELLED") throw new Error("Завершённый или отменённый заказ-наряд нельзя открыть повторно");
    if (status === "COMPLETED") return this.complete(id, {});

    repair.status = status;
    if (status === "CANCELLED") this.restoreItem(repair);
    saveDb();
    return this.getById(id);
  }

  private static restoreItem(repair: RepairOrderRecord) {
    const db = getDb();
    const now = getSystemTime().toISOString();
    const bike = db.bikes.find((b) => b.id === repair.bikeId);
    if (bike && !["SOLD", "BOUGHT_OUT", "DECOMMISSIONED"].includes(bike.status)) {
      const rental = activeRentalForBike(bike.id);
      const client = db.clients.find((c) => c.id === rental?.clientId);
      bike.status = rental ? "RENTED" : "AVAILABLE";
      bike.currentLocation = rental ? `В аренде у ${client?.fullName || "клиента"}` : "Центральная база (м. Дмитровская)";
      bike.updatedAt = now;
    }
    const battery = db.batteries.find((b) => b.id === repair.batteryId);
    if (battery && !["SOLD", "DECOMMISSIONED"].includes(battery.status)) {
      const rental = activeRentalForBattery(battery.id);
      battery.status = rental ? "ISSUED_SPARE" : "AVAILABLE";
      battery.issuedBikeId = rental?.bikeId || null;
      battery.updatedAt = now;
    }
  }

  static complete(id: string, data: Parameters<typeof RepairRepository.completeInternal>[1]) {
    return withDbTransaction(() => this.completeInternal(id, data));
  }

  private static completeInternal(
    id: string,
    data: {
      laborCost?: number;
      partsUsed?: Array<{ partId: string; quantity: number }>;
      paymentMethod?: PaymentMethod;
      mechanicNotes?: string;
    }
  ) {
    const db = getDb();
    const repair = db.repairs.find((r) => r.id === id);
    if (!repair) throw new Error("Заказ-наряд не найден");
    if (repair.status === "COMPLETED" || repair.status === "CANCELLED") throw new Error("Заказ-наряд уже завершён или отменён");

    const bike = repair.bikeId ? db.bikes.find((b) => b.id === repair.bikeId) : null;
    const battery = repair.batteryId ? db.batteries.find((b) => b.id === repair.batteryId) : null;
    const now = getSystemTime();

    // 1. Transactionally verify and deduct parts inventory
    const finalPartsToDeduct = data.partsUsed || repair.parts;
    let computedPartsCost = 0;
    const finalPartsList: RepairOrderRecord["parts"] = [];

    for (const p of finalPartsToDeduct) {
      if (!Number.isFinite(p.quantity) || p.quantity <= 0) throw new Error("Количество детали должно быть положительным");
      const part = db.parts.find((item) => item.id === p.partId);
      if (!part) {
        throw new Error(`Деталь с ID ${p.partId} не найдена на складе`);
      }
      if (part.quantity < p.quantity) {
        throw new Error(`Недостаточно детали "${part.name}" на складе. Доступно: ${part.quantity}, запрошено: ${p.quantity}`);
      }

      // Deduct stock
      part.quantity -= p.quantity;

      const price = repair.faultType === "CLIENT_FAULT" || repair.itemType === "EXTERNAL_DEVICE" ? part.clientPrice : part.purchasePrice;
      computedPartsCost += price * p.quantity;
      finalPartsList.push({
        partId: p.partId,
        quantity: p.quantity,
        priceCharged: price,
        purchasePrice: part.purchasePrice,
      });
    }

    const laborCost = data.laborCost !== undefined ? data.laborCost : repair.laborCost;
    const totalCost = laborCost + computedPartsCost;

    // 2. Update Repair Record
    repair.parts = finalPartsList;
    repair.laborCost = laborCost;
    repair.partsCost = computedPartsCost;
    repair.totalCost = totalCost;
    repair.status = "COMPLETED";
    repair.completedAt = now.toISOString();
    if (data.mechanicNotes) {
      repair.description += `\n[Мастер ${now.toLocaleDateString("ru-RU")}]: ${data.mechanicNotes}`;
    }

    // 3. Restore the assignment to an ongoing rental, if any.
    this.restoreItem(repair);
    if (bike) {
      bike.note = `Отремонтирован по заказ-наряду ${repair.orderNumber}`;
      bike.updatedAt = now.toISOString();
    }

    if (battery) {
      battery.notes = battery.notes
        ? `${battery.notes} | Обслужен по ЗН ${repair.orderNumber}`
        : `Обслужен по ЗН ${repair.orderNumber}`;
      battery.updatedAt = now.toISOString();
    }

    // 4. If CLIENT_FAULT and payment method provided, record payment
    if ((repair.faultType === "CLIENT_FAULT" || repair.itemType === "EXTERNAL_DEVICE") && totalCost > 0 && data.paymentMethod) {
      const paymentDesc = repair.itemType === "EXTERNAL_DEVICE"
        ? `Оплата ремонта сторонней техники "${repair.customItemName || 'клиента'}" (Заказ-наряд ${repair.orderNumber})`
        : `Оплата ремонта по вине курьера (Заказ-наряд ${repair.orderNumber})`;

      db.payments.push({
        id: `pay-${Date.now()}`,
        rentalId: null,
        clientId: repair.clientId,
        repairOrderId: repair.id,
        cashierId: getCurrentUser()?.id || repair.mechanicId,
        type: "REPAIR",
        amount: totalCost,
        method: data.paymentMethod,
        description: paymentDesc,
        createdAt: now.toISOString(),
      });
    }

    HistoryRepository.logAction({
      category: "REPAIR",
      action: "REPAIR_COMPLETE",
      title: `Завершен заказ-наряд СТО ${repair.orderNumber}`,
      details: `Работы выполнены. Стоимость: ${totalCost.toLocaleString("ru-RU")} ₽. Ответственность: ${repair.faultType === "CLIENT_FAULT" ? "Клиент" : "Сервис"}`,
      amount: totalCost,
      badgeText: "СТО",
      badgeColor: "emerald",
      entityId: repair.id,
    });

    saveDb();
    return this.getById(repair.id);
  }
}
