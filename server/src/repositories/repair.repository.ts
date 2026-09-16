import { getDb, RepairStatus, RepairFaultType, PaymentMethod } from "./db.js";

export class RepairRepository {
  static getAll(filters?: { status?: RepairStatus; faultType?: RepairFaultType; bikeId?: string }) {
    const db = getDb();
    let list = db.repairs.map((r) => {
      const bike = db.bikes.find((b) => b.id === r.bikeId);
      const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;
      const mechanic = db.users.find((u) => u.id === r.mechanicId);
      const partsDetailed = r.parts.map((p) => {
        const partInfo = db.parts.find((part) => part.id === p.partId);
        return {
          ...p,
          part: partInfo,
        };
      });

      return {
        ...r,
        bike: bike ? { ...bike, model: bikeModel } : null,
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

    return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  static getById(id: string) {
    const db = getDb();
    const r = db.repairs.find((rep) => rep.id === id);
    if (!r) return null;

    const bike = db.bikes.find((b) => b.id === r.bikeId);
    const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;
    const mechanic = db.users.find((u) => u.id === r.mechanicId);
    const partsDetailed = r.parts.map((p) => {
      const partInfo = db.parts.find((part) => part.id === p.partId);
      return {
        ...p,
        part: partInfo,
      };
    });

    return {
      ...r,
      bike: bike ? { ...bike, model: bikeModel } : null,
      mechanic,
      parts: partsDetailed,
    };
  }

  static create(data: {
    bikeId: string;
    mechanicId?: string;
    faultType: RepairFaultType;
    description: string;
    laborCost?: number;
    parts?: Array<{ partId: string; quantity: number }>;
  }) {
    const db = getDb();
    const bike = db.bikes.find((b) => b.id === data.bikeId);
    if (!bike) throw new Error("Байк не найден");

    const now = new Date();
    const orderNumber = `REP-${now.getFullYear()}-${(db.repairs.length + 1).toString().padStart(3, "0")}`;

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

    const newRepair = {
      id: `rep-${Date.now()}`,
      orderNumber,
      bikeId: data.bikeId,
      mechanicId: data.mechanicId || db.users[2].id,
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

    // Transition bike status -> IN_MAINTENANCE
    bike.status = "IN_MAINTENANCE";
    bike.currentLocation = "Мастерская СТО";
    bike.updatedAt = now.toISOString();

    return this.getById(newRepair.id);
  }

  static updateStatus(id: string, status: RepairStatus) {
    const db = getDb();
    const repair = db.repairs.find((r) => r.id === id);
    if (!repair) return null;

    repair.status = status;
    return this.getById(id);
  }

  static complete(
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
    if (repair.status === "COMPLETED") throw new Error("Заказ-наряд уже завершен");

    const bike = db.bikes.find((b) => b.id === repair.bikeId);
    const now = new Date();

    // 1. Transactionally verify and deduct parts inventory
    const finalPartsToDeduct = data.partsUsed || repair.parts;
    let computedPartsCost = 0;
    const finalPartsList: Array<{ partId: string; quantity: number; priceCharged: number }> = [];

    for (const p of finalPartsToDeduct) {
      const part = db.parts.find((item) => item.id === p.partId);
      if (!part) {
        throw new Error(`Деталь с ID ${p.partId} не найдена на складе`);
      }
      if (part.quantity < p.quantity) {
        throw new Error(`Недостаточно детали "${part.name}" на складе. Доступно: ${part.quantity}, запрошено: ${p.quantity}`);
      }

      // Deduct stock
      part.quantity -= p.quantity;

      const price = repair.faultType === "CLIENT_FAULT" ? part.clientPrice : part.purchasePrice;
      computedPartsCost += price * p.quantity;
      finalPartsList.push({
        partId: p.partId,
        quantity: p.quantity,
        priceCharged: price,
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

    // 3. Transition Bike status back to AVAILABLE
    if (bike) {
      bike.status = "AVAILABLE";
      bike.currentLocation = "Центральная база (м. Дмитровская)";
      bike.note = `Отремонтирован по заказ-наряду ${repair.orderNumber}`;
      bike.updatedAt = now.toISOString();
    }

    // 4. If CLIENT_FAULT and payment method provided, record payment
    if (repair.faultType === "CLIENT_FAULT" && totalCost > 0 && data.paymentMethod) {
      db.payments.push({
        id: `pay-${Date.now()}`,
        rentalId: null,
        type: "REPAIR",
        amount: totalCost,
        method: data.paymentMethod,
        description: `Оплата ремонта по вине курьера (Заказ-наряд ${repair.orderNumber})`,
        createdAt: now.toISOString(),
      });
    }

    return this.getById(repair.id);
  }
}
