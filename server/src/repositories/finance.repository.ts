import { getDb, getSettings, updateSettings, PaymentType, PaymentMethod, saveDb } from "./db.js";

export class FinanceRepository {
  static getAll(filters?: { type?: PaymentType; method?: PaymentMethod; rentalId?: string }) {
    const db = getDb();
    let list = db.payments.map((p) => {
      const rental = p.rentalId ? db.rentals.find((r) => r.id === p.rentalId) : null;
      const order = p.orderId ? db.retailOrders.find((ro) => ro.id === p.orderId) : null;
      const repair = (p as any).repairOrderId ? db.repairs.find((rep) => rep.id === (p as any).repairOrderId) : null;
      const client = (p as any).clientId
        ? db.clients.find((c) => c.id === (p as any).clientId)
        : rental
        ? db.clients.find((c) => c.id === rental.clientId)
        : order?.clientId
        ? db.clients.find((c) => c.id === order.clientId)
        : repair?.clientId
        ? db.clients.find((c) => c.id === repair.clientId)
        : null;
      const bike = rental ? db.bikes.find((b) => b.id === rental.bikeId) : null;

      const customerName = client?.fullName || order?.customerName || repair?.clientName || null;

      return {
        ...p,
        clientId: client?.id || (p as any).clientId || null,
        clientName: customerName,
        rental: rental
          ? {
              id: rental.id,
              rentalNumber: rental.rentalNumber,
              clientName: client?.fullName,
              bikeInventoryNumber: bike?.inventoryNumber,
            }
          : null,
        order: order
          ? {
              id: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
            }
          : null,
        repair: repair
          ? {
              id: repair.id,
              orderNumber: repair.orderNumber,
              clientName: repair.clientName,
            }
          : null,
      };
    });

    if (filters?.type) {
      list = list.filter((p) => p.type === filters.type);
    }
    if (filters?.method) {
      list = list.filter((p) => p.method === filters.method);
    }
    if (filters?.rentalId) {
      list = list.filter((p) => p.rentalId === filters.rentalId);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static create(data: {
    rentalId?: string;
    clientId?: string;
    orderId?: string;
    repairOrderId?: string;
    type: PaymentType;
    amount: number;
    method: PaymentMethod;
    description?: string;
    createdAt?: string;
  }) {
    const db = getDb();
    const rental = data.rentalId ? db.rentals.find((r) => r.id === data.rentalId) : null;
    const resolvedClientId = data.clientId || rental?.clientId || null;

    const newPayment = {
      id: `pay-${Date.now()}`,
      rentalId: data.rentalId || null,
      clientId: resolvedClientId,
      orderId: data.orderId || null,
      repairOrderId: data.repairOrderId || null,
      type: data.type,
      amount: data.amount,
      method: data.method,
      description: data.description || null,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    db.payments.push(newPayment);
    saveDb(true);
    return newPayment;
  }

  static update(
    id: string,
    data: {
      rentalId?: string | null;
      type?: PaymentType;
      amount?: number;
      method?: PaymentMethod;
      description?: string | null;
      createdAt?: string;
    }
  ) {
    const db = getDb();
    const payment = db.payments.find((p) => p.id === id);
    if (!payment) throw new Error("Платеж не найден");

    if (data.amount !== undefined) payment.amount = data.amount;
    if (data.type !== undefined) payment.type = data.type;
    if (data.method !== undefined) payment.method = data.method;
    if (data.description !== undefined) payment.description = data.description || null;
    if (data.rentalId !== undefined) payment.rentalId = data.rentalId || null;
    if (data.createdAt !== undefined) payment.createdAt = data.createdAt;

    saveDb();
    return payment;
  }

  static delete(id: string) {
    const db = getDb();
    const idx = db.payments.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Платеж не найден");

    const [deletedPayment] = db.payments.splice(idx, 1);
    saveDb();
    return deletedPayment;
  }

  static getSettings() {
    return getSettings();
  }

  static updateSettings(data: {
    monthlyFixedExpenses?: number;
    fixedExpensesDescription?: string;
    fixedExpenseItems?: Array<{ id?: string; name: string; amount: number }>;
    paymentDetails?: any;
  }) {
    return updateSettings(data);
  }


  static getSummary() {
    const db = getDb();
    const settings = getSettings();
    const monthlyFixedExpenses = settings.monthlyFixedExpenses ?? 0;

    const rentalPayments = db.payments
      .filter((p) => p.type === "RENTAL")
      .reduce((sum, p) => sum + p.amount, 0);

    const buyoutPayments = db.payments
      .filter((p) => p.type === "BUYOUT")
      .reduce((sum, p) => sum + p.amount, 0);

    const repairPayments = db.payments
      .filter((p) => p.type === "REPAIR")
      .reduce((sum, p) => sum + p.amount, 0);

    const outfitSales = db.payments
      .filter((p) => p.type === "OUTFIT_SALE")
      .reduce((sum, p) => sum + p.amount, 0);

    const retailSales = db.payments
      .filter((p) => p.type === "RETAIL_SALE")
      .reduce((sum, p) => sum + p.amount, 0);

    const fines = db.payments
      .filter((p) => p.type === "FINE")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRevenue = rentalPayments + buyoutPayments + repairPayments + outfitSales + retailSales + fines;

    const salaryExpenses = db.payments
      .filter((p) => p.type === "SALARY_PAYMENT")
      .reduce((sum, p) => sum + p.amount, 0);

    const partPurchaseExpenses = db.payments
      .filter((p) => p.type === "PART_PURCHASE")
      .reduce((sum, p) => sum + p.amount, 0);

    let totalPartsCost = 0;
    db.repairs.forEach((rp) => {
      rp.parts.forEach((pu) => {
        const part = db.parts.find((p) => p.id === pu.partId);
        const unitCost = part ? part.purchasePrice : 0;
        totalPartsCost += pu.quantity * unitCost;
      });
    });

    const fixedExpenses = monthlyFixedExpenses + salaryExpenses;
    const netMargin = totalRevenue - totalPartsCost - fixedExpenses - partPurchaseExpenses;

    const depositsCollected = db.payments
      .filter((p) => p.type === "DEPOSIT")
      .reduce((sum, p) => sum + p.amount, 0);

    const depositsRefunded = db.payments
      .filter((p) => p.type === "DEPOSIT_REFUND")
      .reduce((sum, p) => sum + p.amount, 0);

    const activeDepositsHeld = depositsCollected - depositsRefunded;

    return {
      totalRevenue,
      rentalPayments,
      buyoutPayments,
      repairPayments,
      outfitSales,
      fines,
      salaryExpenses,
      partPurchaseExpenses,
      totalPartsCost,
      monthlyFixedExpenses,
      fixedExpensesDescription: settings.fixedExpensesDescription || "Аренда сервисного хаба и накладные расходы",
      fixedExpenseItems: settings.fixedExpenseItems || [],
      fixedExpenses,
      netMargin,
      depositsCollected,
      depositsRefunded,
      activeDepositsHeld,
    };
  }
}


