import { getDb, PaymentType, PaymentMethod } from "./db.js";

export class FinanceRepository {
  static getAll(filters?: { type?: PaymentType; method?: PaymentMethod; rentalId?: string }) {
    const db = getDb();
    let list = db.payments.map((p) => {
      const rental = p.rentalId ? db.rentals.find((r) => r.id === p.rentalId) : null;
      const client = rental ? db.clients.find((c) => c.id === rental.clientId) : null;
      const bike = rental ? db.bikes.find((b) => b.id === rental.bikeId) : null;

      return {
        ...p,
        rental: rental
          ? {
              id: rental.id,
              rentalNumber: rental.rentalNumber,
              clientName: client?.fullName,
              bikeInventoryNumber: bike?.inventoryNumber,
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
    type: PaymentType;
    amount: number;
    method: PaymentMethod;
    description?: string;
  }) {
    const db = getDb();
    const newPayment = {
      id: `pay-${Date.now()}`,
      rentalId: data.rentalId || null,
      type: data.type,
      amount: data.amount,
      method: data.method,
      description: data.description || null,
      createdAt: new Date().toISOString(),
    };

    db.payments.push(newPayment);
    return newPayment;
  }

  static getSummary() {
    const db = getDb();
    const rentalPayments = db.payments
      .filter((p) => p.type === "RENTAL")
      .reduce((sum, p) => sum + p.amount, 0);

    const repairPayments = db.payments
      .filter((p) => p.type === "REPAIR")
      .reduce((sum, p) => sum + p.amount, 0);

    const outfitSales = db.payments
      .filter((p) => p.type === "OUTFIT_SALE")
      .reduce((sum, p) => sum + p.amount, 0);

    const fines = db.payments
      .filter((p) => p.type === "FINE")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRevenue = rentalPayments + repairPayments + outfitSales + fines;

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
      repairPayments,
      outfitSales,
      fines,
      depositsCollected,
      depositsRefunded,
      activeDepositsHeld,
    };
  }
}
