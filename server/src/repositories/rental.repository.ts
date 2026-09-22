import { getDb, getSystemTime, RentalStatus, RentalType, PaymentMethod, OutfitStatus, BikeStatus } from "./db.js";

export class RentalRepository {
  private static refreshOverdueStatuses() {
    const db = getDb();
    const now = getSystemTime();
    db.rentals.forEach((r) => {
      if (r.status === "ACTIVE" && new Date(r.nextPaymentDue) < now) {
        r.status = "OVERDUE";
      }
    });
  }

  static getAll(filters?: { status?: RentalStatus; search?: string; clientId?: string }) {
    this.refreshOverdueStatuses();
    const db = getDb();

    let list = db.rentals.map((r) => {
      const client = db.clients.find((c) => c.id === r.clientId);
      const bike = db.bikes.find((b) => b.id === r.bikeId);
      const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;
      const battery = bike?.batteryId ? db.batteries.find((bt) => bt.id === bike.batteryId) : null;
      const tariff = db.tariffs.find((t) => t.id === r.tariffId);
      const outfits = db.outfits.filter((o) => r.outfitIds.includes(o.id));
      const payments = db.payments.filter((p) => p.rentalId === r.id);
      const batteries = db.batteries.filter((bt) => (r.batteryIds || []).includes(bt.id));

      return {
        ...r,
        client,
        bike: bike ? { ...bike, model: bikeModel, battery } : null,
        batteries,
        tariff,
        outfits,
        payments,
      };
    });

    if (filters?.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters?.clientId) {
      list = list.filter((r) => r.clientId === filters.clientId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.rentalNumber.toLowerCase().includes(q) ||
          r.client?.fullName.toLowerCase().includes(q) ||
          r.client?.phone.toLowerCase().includes(q) ||
          r.bike?.inventoryNumber.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  static getById(id: string) {
    this.refreshOverdueStatuses();
    const db = getDb();
    const r = db.rentals.find((rent) => rent.id === id);
    if (!r) return null;

    const client = db.clients.find((c) => c.id === r.clientId);
    const bike = db.bikes.find((b) => b.id === r.bikeId);
    const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;
    const battery = bike?.batteryId ? db.batteries.find((bt) => bt.id === bike.batteryId) : null;
    const tariff = db.tariffs.find((t) => t.id === r.tariffId);
    const outfits = db.outfits.filter((o) => r.outfitIds.includes(o.id));
    const payments = db.payments.filter((p) => p.rentalId === r.id);
    const batteries = db.batteries.filter((bt) => (r.batteryIds || []).includes(bt.id));
    const manager = db.users.find((u) => u.id === r.managerId);

    return {
      ...r,
      client,
      bike: bike ? { ...bike, model: bikeModel, battery } : null,
      batteries,
      tariff,
      outfits,
      payments,
      manager,
    };
  }

  static getTariffs() {
    return getDb().tariffs;
  }

  static createTariff(data: {
    name: string;
    type?: RentalType;
    durationDays: number;
    price: number;
    depositRequired?: number;
    isActive?: boolean;
  }) {
    const db = getDb();
    const newTariff = {
      id: `trf-${Date.now()}`,
      name: data.name,
      type: data.type || ("STANDARD" as RentalType),
      durationDays: data.durationDays,
      price: data.price,
      depositRequired: data.depositRequired ?? 0,
      isActive: data.isActive ?? true,
    };
    db.tariffs.push(newTariff);
    return newTariff;
  }

  static updateTariff(id: string, data: Partial<{
    name: string;
    type: RentalType;
    durationDays: number;
    price: number;
    depositRequired: number;
    isActive: boolean;
  }>) {
    const db = getDb();
    const tariff = db.tariffs.find((t) => t.id === id);
    if (!tariff) throw new Error("Тариф не найден");
    Object.assign(tariff, data);
    return tariff;
  }

  static deleteTariff(id: string) {
    const db = getDb();
    const inUse = db.rentals.some(
      (r) => r.tariffId === id && (r.status === "ACTIVE" || r.status === "OVERDUE")
    );
    if (inUse) {
      throw new Error(
        "Нельзя удалить шаблон, так как по нему есть активные договоры аренды. Вы можете деактивировать его."
      );
    }
    const idx = db.tariffs.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Тариф не найден");
    db.tariffs.splice(idx, 1);
    return { success: true, message: "Шаблон тарифа удален" };
  }

  static create(data: {
    clientId: string;
    bikeId: string;
    tariffId: string;
    managerId: string;
    outfitIds: string[];
    batteryIds?: string[];
    paymentMethod: PaymentMethod;
    customDeposit?: number;
    notes?: string;
  }) {
    const db = getDb();

    // 1. Verify Client
    const client = db.clients.find((c) => c.id === data.clientId);
    if (!client) throw new Error("Курьер не найден");
    if (client.status === "BLACKLIST") {
      throw new Error(`Курьер в Черном Списке! Причина: ${client.blackListReason || "запрет аренды"}`);
    }

    // 2. Verify Bike
    const bike = db.bikes.find((b) => b.id === data.bikeId);
    if (!bike) throw new Error("Байк не найден");
    if (bike.status !== "AVAILABLE") {
      throw new Error(`Байк ${bike.inventoryNumber} недоступен для выдачи (текущий статус: ${bike.status})`);
    }

    // 3. Verify Tariff
    const tariff = db.tariffs.find((t) => t.id === data.tariffId);
    if (!tariff) throw new Error("Тариф не найден");

    // 4. Verify Outfits
    const outfits = db.outfits.filter((o) => data.outfitIds.includes(o.id));
    const unavailableOutfit = outfits.find((o) => o.status !== "IN_STOCK");
    if (unavailableOutfit) {
      throw new Error(`Экипировка "${unavailableOutfit.name}" недоступна на складе (статус: ${unavailableOutfit.status})`);
    }

    // 5. Verify Batteries
    const requestedBatteryIds = data.batteryIds || [];
    const batteries = db.batteries.filter((b) => requestedBatteryIds.includes(b.id));
    for (const b of batteries) {
      if (b.status !== "AVAILABLE" && b.installedBikeId !== bike.id && b.id !== bike.batteryId) {
        throw new Error(`Аккумулятор ${b.serialNumber} недоступен для выдачи (текущий статус: ${b.status})`);
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + tariff.durationDays * 86400000);
    const rentalNumber = `RNT-${now.getFullYear()}-${(db.rentals.length + 1).toString().padStart(3, "0")}`;
    const depositAmount = data.customDeposit !== undefined ? data.customDeposit : tariff.depositRequired;

    // 6. Create Rental record
    const rental = {
      id: `rnt-${Date.now()}`,
      rentalNumber,
      clientId: data.clientId,
      bikeId: data.bikeId,
      tariffId: data.tariffId,
      managerId: data.managerId || db.users[1].id,
      status: "ACTIVE" as RentalStatus,
      type: tariff.type,
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      nextPaymentDue: expiresAt.toISOString(),
      depositAmount,
      depositRefunded: false,
      notes: data.notes || null,
      outfitIds: data.outfitIds,
      batteryIds: requestedBatteryIds,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    db.rentals.push(rental);

    // 7. Manage batteries assignment
    // If bike currently has no battery and manager selected batteries, install the first one
    if (!bike.batteryId && batteries.length > 0) {
      const primaryBattery = batteries[0];
      bike.batteryId = primaryBattery.id;
      primaryBattery.status = "INSTALLED";
      primaryBattery.installedBikeId = bike.id;
      primaryBattery.updatedAt = now.toISOString();
    }

    // Any other batteries in requestedBatteryIds are marked ISSUED_SPARE
    for (const b of batteries) {
      if (b.id !== bike.batteryId) {
        b.status = "ISSUED_SPARE";
        b.installedBikeId = null;
        b.updatedAt = now.toISOString();
      }
    }

    // 8. Transition Bike status -> RENTED
    bike.status = "RENTED";
    bike.currentLocation = `В аренде у ${client.fullName}`;
    bike.updatedAt = now.toISOString();

    // 9. Transition Outfits status -> ISSUED
    outfits.forEach((o) => {
      o.status = "ISSUED";
    });

    // 8. Record Payments
    // Payment 1: Rental fee
    db.payments.push({
      id: `pay-${Date.now()}-1`,
      rentalId: rental.id,
      type: "RENTAL",
      amount: tariff.price,
      method: data.paymentMethod,
      description: `Оплата тарифа "${tariff.name}" по договору ${rental.rentalNumber}`,
      createdAt: now.toISOString(),
    });

    // Payment 2: Deposit (if > 0)
    if (depositAmount > 0) {
      db.payments.push({
        id: `pay-${Date.now()}-2`,
        rentalId: rental.id,
        type: "DEPOSIT",
        amount: depositAmount,
        method: data.paymentMethod,
        description: `Обеспечительный залог по договору ${rental.rentalNumber}`,
        createdAt: now.toISOString(),
      });
    }

    return this.getById(rental.id);
  }

  static renew(id: string, data: { durationDays?: number; amount?: number; method: PaymentMethod; notes?: string }) {
    const db = getDb();
    const rental = db.rentals.find((r) => r.id === id);
    if (!rental) throw new Error("Аренда не найдена");
    if (rental.status === "CLOSED" || rental.status === "BOUGHT_OUT") {
      throw new Error("Нельзя продлить завершенный договор");
    }

    const tariff = db.tariffs.find((t) => t.id === rental.tariffId);
    const durationDays = data.durationDays || tariff?.durationDays || 7;
    const amount = data.amount || tariff?.price || 6000;

    const currentExpiry = new Date(rental.expiresAt);
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    const newExpiry = new Date(baseDate.getTime() + durationDays * 86400000);

    rental.expiresAt = newExpiry.toISOString();
    rental.nextPaymentDue = newExpiry.toISOString();
    rental.status = "ACTIVE";
    rental.updatedAt = new Date().toISOString();
    if (data.notes) {
      rental.notes = (rental.notes ? rental.notes + "\n" : "") + `[Продление ${new Date().toLocaleDateString("ru-RU")}]: ${data.notes}`;
    }

    // Record renewal payment
    db.payments.push({
      id: `pay-${Date.now()}`,
      rentalId: rental.id,
      type: "RENTAL",
      amount,
      method: data.method,
      description: `Продление аренды на ${durationDays} дн. по договору ${rental.rentalNumber}`,
      createdAt: new Date().toISOString(),
    });

    return this.getById(rental.id);
  }

  static close(
    id: string,
    data: {
      bikeCondition: "OK" | "NEEDS_REPAIR";
      bikeMileageKm?: number;
      defectDescription?: string;
      faultType?: "COMPANY_EXPENSE" | "CLIENT_FAULT";
      outfitReturns: Array<{
        outfitId: string;
        condition: "OK" | "DAMAGED" | "LOST";
        deductionAmount?: number;
      }>;
      refundMethod: PaymentMethod;
      notes?: string;
    }
  ) {
    const db = getDb();
    const rental = db.rentals.find((r) => r.id === id);
    if (!rental) throw new Error("Аренда не найдена");
    if (rental.status === "CLOSED") throw new Error("Договор уже закрыт");

    const bike = db.bikes.find((b) => b.id === rental.bikeId);
    const client = db.clients.find((c) => c.id === rental.clientId);
    const now = new Date();

    // 1. Process Bike Return
    let repairOrderCreated = null;
    if (bike) {
      if (data.bikeMileageKm && data.bikeMileageKm > bike.mileageKm) {
        bike.mileageKm = data.bikeMileageKm;
      }

      if (data.bikeCondition === "NEEDS_REPAIR") {
        bike.status = "IN_MAINTENANCE";
        bike.currentLocation = "Мастерская СТО (возврат с дефектом)";
        bike.note = data.defectDescription || "Обнаружены дефекты при приемке из аренды";

        // Auto-create RepairOrder
        const orderNumber = `REP-${now.getFullYear()}-${(db.repairs.length + 1).toString().padStart(3, "0")}`;
        repairOrderCreated = {
          id: `rep-${Date.now()}`,
          orderNumber,
          bikeId: bike.id,
          mechanicId: db.users[2].id, // Default mechanic
          status: "DIAGNOSTICS" as const,
          faultType: data.faultType || "CLIENT_FAULT",
          description: `Возврат по аренде ${rental.rentalNumber}: ${data.defectDescription || "Дефекты при сдаче"}`,
          laborCost: 0,
          partsCost: 0,
          totalCost: 0,
          createdAt: now.toISOString(),
          completedAt: null,
          parts: [],
        };
        db.repairs.push(repairOrderCreated);
      } else {
        bike.status = "AVAILABLE";
        bike.currentLocation = "Центральная база (м. Дмитровская)";
      }
      bike.updatedAt = now.toISOString();
    }

    // 2. Process Outfits Return & Deductions
    let totalDeduction = 0;
    data.outfitReturns.forEach((item) => {
      const outfit = db.outfits.find((o) => o.id === item.outfitId);
      if (outfit) {
        if (item.condition === "OK") {
          outfit.status = "IN_STOCK";
        } else if (item.condition === "DAMAGED") {
          outfit.status = "DAMAGED";
          totalDeduction += item.deductionAmount || 500;
        } else if (item.condition === "LOST") {
          outfit.status = "LOST";
          totalDeduction += item.deductionAmount || outfit.depositValue;
        }
      }
    });

    // 3. Deposit Refund Settlement
    const initialDeposit = rental.depositAmount || 0;
    const netRefund = Math.max(0, initialDeposit - totalDeduction);

    if (netRefund > 0) {
      db.payments.push({
        id: `pay-${Date.now()}-refund`,
        rentalId: rental.id,
        type: "DEPOSIT_REFUND",
        amount: netRefund,
        method: data.refundMethod || "CASH",
        description: `Возврат залога по договору ${rental.rentalNumber} (удержано ${totalDeduction} руб.)`,
        createdAt: now.toISOString(),
      });
      rental.depositRefunded = true;
    }

    // 4. Update Rental status
    rental.status = rental.type === "RENT_TO_OWN" ? "BOUGHT_OUT" : "CLOSED";
    rental.updatedAt = now.toISOString();
    if (data.notes) {
      rental.notes = (rental.notes ? rental.notes + "\n" : "") + `[Закрытие ${now.toLocaleDateString("ru-RU")}]: ${data.notes}`;
    }

    // 5. Return spare batteries to AVAILABLE
    if (rental.batteryIds && rental.batteryIds.length > 0) {
      rental.batteryIds.forEach((bId) => {
        const bat = db.batteries.find((b) => b.id === bId);
        if (bat && bat.status === "ISSUED_SPARE") {
          bat.status = "AVAILABLE";
          bat.updatedAt = now.toISOString();
        }
      });
    }

    return {
      rental: this.getById(rental.id),
      repairOrder: repairOrderCreated,
      depositReturned: netRefund,
      totalDeduction,
    };
  }
}
