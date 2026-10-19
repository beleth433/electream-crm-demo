import { getDb, getSystemTime, saveDb, RentalStatus, RentalType, PaymentMethod, OutfitStatus, BikeStatus, TariffBuyoutBatteryItem } from "./db.js";
import { getCurrentUser } from "../context/userContext.js";

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
      const tariffBikeModel = tariff?.bikeModelId ? db.models.find((m) => m.id === tariff.bikeModelId) : null;
      const fullTariff = tariff ? { ...tariff, bikeModel: tariffBikeModel } : null;
      const outfits = db.outfits.filter((o) => r.outfitIds.includes(o.id));
      const payments = db.payments.filter((p) => p.rentalId === r.id);
      const batteries = db.batteries.filter((bt) => (r.batteryIds || []).includes(bt.id));

      const buyoutPayments = payments.filter((p) => p.type === 'RENTAL' || p.type === 'BUYOUT');
      const totalPaidForBuyout = buyoutPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalBuyoutPrice = r.totalBuyoutPrice || (r.type === 'RENT_TO_OWN' ? (tariff?.totalBuyoutPrice || tariff?.price || 0) : undefined);
      const remainingBuyoutAmount = totalBuyoutPrice !== undefined ? Math.max(0, totalBuyoutPrice - totalPaidForBuyout) : undefined;

      return {
        ...r,
        client,
        bike: bike ? { ...bike, model: bikeModel, battery } : null,
        batteries,
        tariff: fullTariff,
        outfits,
        payments,
        totalPaidForBuyout,
        totalBuyoutPrice,
        remainingBuyoutAmount,
      };
    });

    if (filters?.status) {
      if (filters.status === "ACTIVE") {
        list = list.filter((r) => r.status === "ACTIVE" || r.status === "OVERDUE");
      } else {
        list = list.filter((r) => r.status === filters.status);
      }
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
    const r = db.rentals.find(
      (rent) => rent.id === id || rent.rentalNumber?.toLowerCase() === id.toLowerCase()
    );
    if (!r) return null;

    const client = db.clients.find((c) => c.id === r.clientId);
    const bike = db.bikes.find((b) => b.id === r.bikeId);
    const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;
    const battery = bike?.batteryId ? db.batteries.find((bt) => bt.id === bike.batteryId) : null;
    const tariff = db.tariffs.find((t) => t.id === r.tariffId);
    const tariffBikeModel = tariff?.bikeModelId ? db.models.find((m) => m.id === tariff.bikeModelId) : null;
    const fullTariff = tariff ? { ...tariff, bikeModel: tariffBikeModel } : null;
    const outfits = db.outfits.filter((o) => r.outfitIds.includes(o.id));
    const payments = db.payments.filter((p) => p.rentalId === r.id);
    const batteries = db.batteries.filter((bt) => (r.batteryIds || []).includes(bt.id));
    const manager = db.users.find((u) => u.id === r.managerId);

    const buyoutPayments = payments.filter((p) => p.type === 'RENTAL' || p.type === 'BUYOUT');
    const totalPaidForBuyout = buyoutPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalBuyoutPrice = r.totalBuyoutPrice || (r.type === 'RENT_TO_OWN' ? (tariff?.totalBuyoutPrice || tariff?.price || 0) : undefined);
    const remainingBuyoutAmount = totalBuyoutPrice !== undefined ? Math.max(0, totalBuyoutPrice - totalPaidForBuyout) : undefined;

    return {
      ...r,
      client,
      bike: bike ? { ...bike, model: bikeModel, battery } : null,
      batteries,
      tariff: fullTariff,
      outfits,
      payments,
      manager,
      totalPaidForBuyout,
      totalBuyoutPrice,
      remainingBuyoutAmount,
    };
  }

  static getTariffs() {
    const db = getDb();
    return db.tariffs.map((t) => {
      const bikeModel = t.bikeModelId ? db.models.find((m) => m.id === t.bikeModelId) : null;
      return {
        ...t,
        bikeModel,
      };
    });
  }

  static createTariff(data: {
    name: string;
    type?: RentalType;
    durationDays: number;
    price: number;
    depositRequired?: number;
    isActive?: boolean;
    totalBuyoutPrice?: number;
    paymentIntervalDays?: number;
    installmentPayment?: number;
    bikeModelId?: string | null;
    includedBatteries?: TariffBuyoutBatteryItem[];
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
      totalBuyoutPrice: data.totalBuyoutPrice !== undefined ? Number(data.totalBuyoutPrice) : undefined,
      paymentIntervalDays: data.paymentIntervalDays !== undefined ? Number(data.paymentIntervalDays) : undefined,
      installmentPayment: data.installmentPayment !== undefined ? Number(data.installmentPayment) : undefined,
      bikeModelId: data.bikeModelId || null,
      includedBatteries: data.includedBatteries || [],
    };
    db.tariffs.push(newTariff);
    const bikeModel = newTariff.bikeModelId ? db.models.find((m) => m.id === newTariff.bikeModelId) : null;
    return { ...newTariff, bikeModel };
  }

  static updateTariff(id: string, data: Partial<{
    name: string;
    type: RentalType;
    durationDays: number;
    price: number;
    depositRequired: number;
    isActive: boolean;
    totalBuyoutPrice: number;
    paymentIntervalDays: number;
    installmentPayment: number;
    bikeModelId: string | null;
    includedBatteries: TariffBuyoutBatteryItem[];
  }>) {
    const db = getDb();
    const tariff = db.tariffs.find((t) => t.id === id);
    if (!tariff) throw new Error("Тариф не найден");
    Object.assign(tariff, data);
    const bikeModel = tariff.bikeModelId ? db.models.find((m) => m.id === tariff.bikeModelId) : null;
    return { ...tariff, bikeModel };
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
    rentalNumber?: string;
    customDeposit?: number;
    durationDays?: number;
    startDate?: string;
    totalBuyoutPrice?: number;
    paymentIntervalDays?: number;
    installmentPayment?: number;
    firstPaymentAmount?: number;
    notes?: string;
    courierService?: string;
    passportSerial?: string;
    passportNumber?: string;
    citizenship?: string;
    patentNumber?: string;
    telegram?: string;
  }) {
    const db = getDb();

    // 1. Verify Client
    const client = db.clients.find((c) => c.id === data.clientId);
    if (!client) throw new Error("Клиент не найден");
    if (client.status === "BLACKLIST") {
      throw new Error(`Клиент в Черном Списке! Причина: ${client.blackListReason || "запрет аренды"}`);
    }

    // Seamlessly transition or complement courier and passport details
    if (data.courierService) client.courierService = data.courierService;
    if (data.passportSerial) client.passportSerial = data.passportSerial;
    if (data.passportNumber) client.passportNumber = data.passportNumber;
    if (data.citizenship) client.citizenship = data.citizenship;
    if (data.patentNumber) client.patentNumber = data.patentNumber;
    if (data.telegram && !client.telegram) client.telegram = data.telegram;
    client.clientType = "COURIER";

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

    const isRentToOwn = tariff.type === "RENT_TO_OWN";
    const paymentIntervalDays = data.paymentIntervalDays ?? tariff.paymentIntervalDays ?? (isRentToOwn ? 7 : tariff.durationDays);
    const totalBuyoutPrice = data.totalBuyoutPrice ?? tariff.totalBuyoutPrice ?? (isRentToOwn ? tariff.price : undefined);
    const installmentPayment = data.installmentPayment ?? tariff.installmentPayment ?? (isRentToOwn ? tariff.price : undefined);
    const firstPaymentAmount = data.firstPaymentAmount ?? (isRentToOwn ? (installmentPayment ?? tariff.price) : tariff.price);

    const now = getSystemTime();
    let startDate = now;
    if (data.startDate) {
      const parsedStart = new Date(data.startDate);
      if (!isNaN(parsedStart.getTime())) {
        startDate = parsedStart;
      }
    }

    const nextPaymentDue = isRentToOwn
      ? new Date(startDate.getTime() + paymentIntervalDays * 86400000)
      : new Date(startDate.getTime() + tariff.durationDays * 86400000);
    const effectiveDurationDays = data.durationDays && data.durationDays > 0 ? data.durationDays : tariff.durationDays;
    const expiresAt = new Date(startDate.getTime() + effectiveDurationDays * 86400000);
    const rentalNumber = data.rentalNumber && data.rentalNumber.trim()
      ? data.rentalNumber.trim()
      : `RNT-${startDate.getFullYear()}-${(db.rentals.length + 1).toString().padStart(3, "0")}`;
    const depositAmount = data.customDeposit !== undefined ? data.customDeposit : tariff.depositRequired;

    // 6. Create Rental record
    const rental = {
      id: `rnt-${Date.now()}`,
      rentalNumber,
      clientId: data.clientId,
      bikeId: data.bikeId,
      tariffId: data.tariffId,
      managerId:
        data.managerId ||
        getCurrentUser()?.id ||
        db.users.find((u) => u.role === "MANAGER" || u.role === "ADMIN")?.id ||
        db.users[0]?.id ||
        "usr-admin",
      status: (nextPaymentDue < now ? "OVERDUE" : "ACTIVE") as RentalStatus,
      type: tariff.type,
      startedAt: startDate.toISOString(),
      expiresAt: expiresAt.toISOString(),
      nextPaymentDue: nextPaymentDue.toISOString(),
      depositAmount,
      depositRefunded: false,
      notes: data.notes || null,
      outfitIds: data.outfitIds,
      batteryIds: requestedBatteryIds,
      totalBuyoutPrice: totalBuyoutPrice !== undefined ? Number(totalBuyoutPrice) : undefined,
      paymentIntervalDays: paymentIntervalDays !== undefined ? Number(paymentIntervalDays) : undefined,
      installmentPayment: installmentPayment !== undefined ? Number(installmentPayment) : undefined,
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
        b.issuedBikeId = bike.id;
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

    // 10. Record Payments
    // Payment 1: Rental fee or initial buyout installment (if > 0)
    if (firstPaymentAmount > 0) {
      db.payments.push({
        id: `pay-${Date.now()}-1`,
        rentalId: rental.id,
        type: isRentToOwn ? "BUYOUT" : "RENTAL",
        amount: firstPaymentAmount,
        method: data.paymentMethod,
        description: isRentToOwn
          ? `Первоначальный взнос по выкупу тарифа "${tariff.name}" по договору ${rental.rentalNumber}`
          : `Оплата тарифа "${tariff.name}" по договору ${rental.rentalNumber}`,
        createdAt: startDate.toISOString(),
      });
    }

    // Payment 2: Deposit (if > 0)
    if (depositAmount > 0) {
      db.payments.push({
        id: `pay-${Date.now()}-2`,
        rentalId: rental.id,
        type: "DEPOSIT",
        amount: depositAmount,
        method: data.paymentMethod,
        description: `Обеспечительный залог по договору ${rental.rentalNumber}`,
        createdAt: startDate.toISOString(),
      });
    }

    return this.getById(rental.id);
  }

  static renew(id: string, data: { durationDays?: number; amount?: number; method: PaymentMethod; notes?: string; isBuyoutFinal?: boolean }) {
    const db = getDb();
    const rental = db.rentals.find((r) => r.id === id);
    if (!rental) throw new Error("Аренда не найдена");
    if (rental.status === "CLOSED" || rental.status === "BOUGHT_OUT") {
      throw new Error("Нельзя продлить завершенный или выкупленный договор");
    }

    const tariff = db.tariffs.find((t) => t.id === rental.tariffId);
    const isRentToOwn = rental.type === "RENT_TO_OWN";
    const durationDays = data.durationDays || rental.paymentIntervalDays || tariff?.paymentIntervalDays || tariff?.durationDays || 7;
    const amount = data.amount ?? (isRentToOwn ? (rental.installmentPayment ?? tariff?.installmentPayment ?? tariff?.price ?? 6000) : (tariff?.price ?? 6000));

    const now = getSystemTime();
    const currentDue = new Date(rental.nextPaymentDue || rental.expiresAt);
    const baseDate = currentDue > now ? currentDue : now;
    const newNextDue = new Date(baseDate.getTime() + durationDays * 86400000);

    // Record renewal / buyout payment
    const paymentType = isRentToOwn ? "BUYOUT" : "RENTAL";
    db.payments.push({
      id: `pay-${Date.now()}`,
      rentalId: rental.id,
      type: paymentType as any,
      amount,
      method: data.method,
      description: isRentToOwn
        ? (data.isBuyoutFinal ? `Финальный выкупной платёж по договору ${rental.rentalNumber}` : `Очередной платёж по выкупу (${durationDays} дн.) по договору ${rental.rentalNumber}`)
        : `Продление аренды на ${durationDays} дн. по договору ${rental.rentalNumber}`,
      createdAt: now.toISOString(),
    });

    // Check if fully bought out
    const allBuyoutPayments = db.payments.filter((p) => p.rentalId === rental.id && (p.type === "RENTAL" || p.type === "BUYOUT"));
    const totalPaid = allBuyoutPayments.reduce((sum, p) => sum + p.amount, 0);
    const targetPrice = rental.totalBuyoutPrice || tariff?.totalBuyoutPrice || tariff?.price || 0;
    const isFullyPaid = isRentToOwn && targetPrice > 0 && totalPaid >= targetPrice;

    if (data.isBuyoutFinal || isFullyPaid) {
      rental.status = "BOUGHT_OUT";
      rental.updatedAt = now.toISOString();
      if (data.notes) {
        rental.notes = (rental.notes ? rental.notes + "\n" : "") + `[Выкуп ${now.toLocaleDateString("ru-RU")}]: ${data.notes}`;
      } else {
        rental.notes = (rental.notes ? rental.notes + "\n" : "") + `[Выкуп завершён ${now.toLocaleDateString("ru-RU")}]: Оплачено ${totalPaid} из ${targetPrice} ₽`;
      }

      // Transition bike to SOLD
      const bike = db.bikes.find((b) => b.id === rental.bikeId);
      const client = db.clients.find((c) => c.id === rental.clientId);
      if (bike) {
        bike.status = "SOLD";
        bike.currentLocation = `Выкуплен клиентом ${client?.fullName || ""} (договор ${rental.rentalNumber})`;
        bike.updatedAt = now.toISOString();
      }
      return this.getById(rental.id);
    }

    rental.nextPaymentDue = newNextDue.toISOString();
    if (!isRentToOwn) {
      rental.expiresAt = newNextDue.toISOString();
    }
    rental.status = "ACTIVE";
    rental.updatedAt = now.toISOString();
    if (data.notes) {
      rental.notes = (rental.notes ? rental.notes + "\n" : "") + `[Продление ${now.toLocaleDateString("ru-RU")}]: ${data.notes}`;
    }

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
          mechanicId:
            getCurrentUser()?.id ||
            db.users.find((u) => u.role === "MECHANIC")?.id ||
            db.users[0]?.id ||
            "usr-bxleth",
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
          bat.issuedBikeId = null;
          bat.updatedAt = now.toISOString();
        }
      });
    }

    saveDb(true);

    return {
      rental: this.getById(rental.id),
      repairOrder: repairOrderCreated,
      depositReturned: netRefund,
      totalDeduction,
    };
  }

  static delete(id: string) {
    const db = getDb();
    const index = db.rentals.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error("Договор аренды не найден");
    }

    const rental = db.rentals[index];

    // Safety guard: only allow deleting non-active rentals (e.g. completed, bought out, draft, reserved)
    if (rental.status === "ACTIVE" || rental.status === "OVERDUE") {
      throw new Error(
        `Нельзя удалить активный или просроченный договор (${rental.rentalNumber}). Сначала завершите аренду и оформите возврат техники.`
      );
    }

    const [removed] = db.rentals.splice(index, 1);

    // Also remove associated rental payments to keep database consistent
    db.payments = db.payments.filter((p) => p.rentalId !== id);

    saveDb(true);
    return removed;
  }
}
