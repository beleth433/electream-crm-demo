import { getDb, getSystemTime, getSettings, updateSettings, PaymentType, PaymentMethod, PaymentRecord, saveDb, withDbTransaction } from "./db.js";
import { getCurrentUser } from "../context/userContext.js";
import { HistoryRepository } from "./history.repository.js";
import { RentalRepository } from "./rental.repository.js";
import { isOpenRental } from "./relations.js";

import { calculateFinancials } from "./financials.js";

export class FinanceRepository {
  static getAll(filters?: { type?: PaymentType; method?: PaymentMethod; rentalId?: string }) {
    const db = getDb();
    let list = db.payments.map((p) => {
      const rental = p.rentalId ? db.rentals.find((r) => r.id === p.rentalId) : null;
      const order = p.orderId ? db.retailOrders.find((ro) => ro.id === p.orderId) || db.partOrders?.find((po) => po.id === p.orderId) : null;
      const repair = (p as any).repairOrderId ? db.repairs.find((rep) => rep.id === (p as any).repairOrderId) : null;
      const retailOrder = p.orderId ? db.retailOrders.find((ro) => ro.id === p.orderId) : null;
      const client = (p as any).clientId
        ? db.clients.find((c) => c.id === (p as any).clientId)
        : rental
        ? db.clients.find((c) => c.id === rental.clientId)
        : retailOrder?.clientId
        ? db.clients.find((c) => c.id === retailOrder.clientId)
        : repair?.clientId
        ? db.clients.find((c) => c.id === repair.clientId)
        : null;
      const bike = rental ? db.bikes.find((b) => b.id === rental.bikeId) : null;

      const customerName = client?.fullName || retailOrder?.customerName || repair?.clientName || null;

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
              orderNumber: "orderNumber" in order ? order.orderNumber : order.partName,
              customerName: retailOrder?.customerName || null,
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

  static create(data: Parameters<typeof FinanceRepository.createInternal>[0]) {
    return withDbTransaction(() => this.createInternal(data));
  }

  private static validateLinks(data: Partial<PaymentRecord>) {
    const db = getDb();
    if (data.rentalId && !db.rentals.some((r) => r.id === data.rentalId)) throw new Error("Договор не найден");
    if (data.clientId && !db.clients.some((c) => c.id === data.clientId)) throw new Error("Клиент не найден");
    if (data.repairOrderId && !db.repairs.some((r) => r.id === data.repairOrderId)) throw new Error("Заказ-наряд не найден");
    if (data.orderId && !db.retailOrders.some((o) => o.id === data.orderId) && !db.partOrders?.some((o) => o.id === data.orderId)) throw new Error("Чек или заявка не найдены");
    if (data.employeeId && !db.employees.some((e) => e.id === data.employeeId)) throw new Error("Сотрудник не найден");
    const linkedClientId = db.rentals.find((r) => r.id === data.rentalId)?.clientId || db.retailOrders.find((o) => o.id === data.orderId)?.clientId || db.repairs.find((r) => r.id === data.repairOrderId)?.clientId;
    if (linkedClientId && data.clientId && linkedClientId !== data.clientId) throw new Error("Клиент не соответствует связанному документу");
    return linkedClientId;
  }

  private static syncLinkedPayment(payment: PaymentRecord) {
    const db = getDb();
    const procurement = db.partOrders?.find((order) => order.id === payment.orderId || order.paymentId === payment.id);
    if (procurement && payment.type === "PART_PURCHASE") {
      procurement.actualCost = payment.amount;
      procurement.paymentMethod = payment.method;
      procurement.paymentId = payment.id;
    }
    const rental = db.rentals.find((r) => r.id === payment.rentalId);
    if (rental && rental.type === "RENT_TO_OWN" && isOpenRental(rental)) {
      const total = db.payments.filter((p) => p.rentalId === rental.id && (p.type === "BUYOUT" || p.type === "RENTAL")).reduce((sum, p) => sum + p.amount, 0);
      if (rental.totalBuyoutPrice && total >= rental.totalBuyoutPrice) RentalRepository.finalizeBuyout(rental.id);
    }
  }

  private static createInternal(data: {
    rentalId?: string;
    clientId?: string;
    orderId?: string;
    repairOrderId?: string;
    employeeId?: string;
    type: PaymentType;
    amount: number;
    method: PaymentMethod;
    description?: string;
    createdAt?: string;
  }) {
    const db = getDb();
    const linkedClientId = this.validateLinks(data);
    const rental = data.rentalId ? db.rentals.find((r) => r.id === data.rentalId) : null;
    const resolvedClientId = data.clientId || linkedClientId || rental?.clientId || null;
    if (rental && (data.type === "RENTAL" || data.type === "BUYOUT")) {
      const result = RentalRepository.renew(rental.id, { amount: data.amount, method: data.method, createdAt: data.createdAt, notes: data.description });
      const payment = db.payments.filter((p) => p.rentalId === result!.id).at(-1)!;
      if (data.description) payment.description = data.description;
      return payment;
    }

    const newPayment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      rentalId: data.rentalId || null,
      clientId: resolvedClientId,
      orderId: data.orderId || null,
      repairOrderId: data.repairOrderId || null,
      employeeId: data.employeeId || null,
      cashierId: getCurrentUser()?.id || null,
      type: data.type,
      amount: data.amount,
      method: data.method,
      description: data.description || null,
      createdAt: data.createdAt || getSystemTime().toISOString(),
    };

    db.payments.push(newPayment);
    this.syncLinkedPayment(newPayment);
    saveDb(true);
    return newPayment;
  }

  static update(id: string, data: Partial<Pick<PaymentRecord, "rentalId" | "clientId" | "orderId" | "repairOrderId" | "employeeId" | "type" | "amount" | "method" | "description" | "createdAt">>) {
    return withDbTransaction(() => this.updateInternal(id, data));
  }

  private static updateInternal(
    id: string,
    data: {
      rentalId?: string | null;
      clientId?: string | null;
      orderId?: string | null;
      repairOrderId?: string | null;
      employeeId?: string | null;
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
    const candidate = { ...payment, ...data };
    if (data.rentalId !== undefined && data.clientId === undefined) candidate.clientId = db.rentals.find((r) => r.id === data.rentalId)?.clientId || null;
    const clientId = this.validateLinks(candidate);

    if (data.amount !== undefined) payment.amount = data.amount;
    if (data.type !== undefined) payment.type = data.type;
    if (data.method !== undefined) payment.method = data.method;
    if (data.description !== undefined) payment.description = data.description || null;
    if (data.rentalId !== undefined) payment.rentalId = data.rentalId || null;
    if (data.createdAt !== undefined) payment.createdAt = data.createdAt;
    if (data.clientId !== undefined || data.rentalId !== undefined) payment.clientId = data.clientId ?? clientId ?? null;
    if (data.orderId !== undefined) payment.orderId = data.orderId;
    if (data.repairOrderId !== undefined) payment.repairOrderId = data.repairOrderId;
    if (data.employeeId !== undefined) payment.employeeId = data.employeeId;
    this.syncLinkedPayment(payment);
    HistoryRepository.logAction({ category: "PAYMENT", action: "PAYMENT_UPDATE", title: "Исправлена кассовая операция", entityId: payment.id, amount: payment.amount });

    saveDb();
    return payment;
  }

  static delete(id: string) {
    const db = getDb();
    const idx = db.payments.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Платеж не найден");

    const [deletedPayment] = db.payments.splice(idx, 1);
    const procurement = db.partOrders?.find((order) => order.paymentId === id || order.id === deletedPayment.orderId);
    if (procurement) {
      procurement.paymentId = null;
      procurement.actualCost = 0;
    }
    HistoryRepository.logAction({ category: "PAYMENT", action: "PAYMENT_DELETE", title: "Удалена кассовая операция", details: deletedPayment.description || undefined, entityId: id, amount: deletedPayment.amount });
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
    return calculateFinancials();
  }
}
