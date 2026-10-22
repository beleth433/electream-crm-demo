import { getDb, getSystemTime, ClientStatus, ClientRecord, ClientType, saveDb } from "./db.js";
import { LoyaltyRepository } from "./loyalty.repository.js";
import { normalizePhone } from "./relations.js";
import { isRevenuePayment } from "./financials.js";

export class ClientRepository {
  static computeClientLoyalty(client: ClientRecord) {
    const db = getDb();
    const clientRentals = db.rentals.filter((r) => r.clientId === client.id);

    // Count elapsed rental days, never future days or draft reservations.
    let totalRentalDays = 0;
    for (const r of clientRentals) {
      if (r.status === "DRAFT" || r.status === "RESERVED") continue;
      if (r.startedAt) {
        const start = new Date(r.startedAt).getTime();
        const finished = r.status === "CLOSED" || r.status === "BOUGHT_OUT";
        const end = Math.min(getSystemTime().getTime(), finished ? new Date(r.closedAt || r.updatedAt || r.expiresAt).getTime() : getSystemTime().getTime());
        if (!isNaN(start) && !isNaN(end) && end > start) {
          totalRentalDays += Math.floor((end - start) / 86400000);
        }
      }
    }

    // 2. Calculate total spent across all CRM modules:
    // a) Rentals spent (actual payments or tariff calculations)
    const rentalIds = new Set(clientRentals.map((r) => r.id));
    // b) Retail Store spent: all orders by this client (by clientId or phone match)
    const cleanPhone = normalizePhone(client.phone);
    const clientRetailOrders = (db.retailOrders || []).filter(
      (ro) =>
        ro.clientId === client.id ||
        (cleanPhone.length >= 6 && ro.customerPhone && normalizePhone(ro.customerPhone) === cleanPhone)
    );


    // c) Repairs spent (СТО repairs: CLIENT_FAULT or external device)
    const clientRepairs = (db.repairs || []).filter(
      (rep) =>
        rep.clientId === client.id ||
        (cleanPhone.length >= 6 && rep.clientPhone && normalizePhone(rep.clientPhone) === cleanPhone)
    );
    const repairIds = new Set(clientRepairs.map((rep) => rep.id));
    // A payment contributes once, resolved through any of its CRM links.
    // Quotes, deposits and future installments are not customer spending.
    const retailIds = new Set(clientRetailOrders.map((order) => order.id));
    const totalSpent = db.payments.filter((payment) => isRevenuePayment(payment) && (
      payment.clientId === client.id ||
      (payment.rentalId && rentalIds.has(payment.rentalId)) ||
      (payment.orderId && retailIds.has(payment.orderId)) ||
      (payment.repairOrderId && repairIds.has(payment.repairOrderId))
    )).reduce((sum, payment) => sum + payment.amount, 0);

    // 3. Dynamic Loyalty Tier Determination via LoyaltyRepository
    const { tier, mode } = LoyaltyRepository.determineTier(
      totalRentalDays,
      totalSpent,
      client.manualLoyaltyTierId
    );

    return {
      totalRentalDays,
      totalSpent,
      loyaltyTier: tier,
      loyaltyMode: mode,
    };
  }

  static getAll(filters?: {
    status?: ClientStatus;
    search?: string;
    courierService?: string;
    clientType?: string;
  }) {
    const db = getDb();
    let list = db.clients.map((c) => {
      const cleanPhone = normalizePhone(c.phone);
      const activeRental = db.rentals.find(
        (r) => r.clientId === c.id && (r.status === "ACTIVE" || r.status === "OVERDUE")
      );
      const totalRentals = db.rentals.filter((r) => r.clientId === c.id).length;
      const clientOrders = (db.retailOrders || []).filter(
        (ro) =>
          ro.clientId === c.id ||
          (cleanPhone.length >= 6 && ro.customerPhone && normalizePhone(ro.customerPhone) === cleanPhone)
      );
      const retailOrdersCount = clientOrders.length;
      const retailOrdersSpent = clientOrders.reduce((sum, ro) => sum + (Number(ro.totalAmount) || 0), 0);
      const isCourier = c.clientType === "COURIER" || totalRentals > 0 || Boolean(c.courierService);
      const isRetailBuyer = c.clientType === "RETAIL" || retailOrdersCount > 0;
      const loyalty = this.computeClientLoyalty(c);

      return {
        ...c,
        clientType: c.clientType || (totalRentals > 0 || c.courierService ? "COURIER" : "RETAIL"),
        activeRental: activeRental
          ? {
              id: activeRental.id,
              rentalNumber: activeRental.rentalNumber,
              status: activeRental.status,
              expiresAt: activeRental.expiresAt,
            }
          : null,
        totalRentals,
        retailOrdersCount,
        retailOrdersSpent,
        isCourier,
        isRetailBuyer,
        ...loyalty,
      };
    });

    if (filters?.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.courierService) {
      list = list.filter((c) => c.courierService === filters.courierService);
    }
    if (filters?.clientType && filters.clientType !== "ALL") {
      if (filters.clientType === "COURIER") {
        list = list.filter((c) => c.isCourier || c.clientType === "COURIER");
      } else if (filters.clientType === "RETAIL") {
        list = list.filter((c) => c.isRetailBuyer || c.clientType === "RETAIL");
      } else {
        list = list.filter((c) => c.clientType === filters.clientType);
      }
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.telegram?.toLowerCase().includes(q) ||
          c.patentNumber?.toLowerCase().includes(q) ||
          c.passportNumber?.toLowerCase().includes(q)
      );
    }

    return list;
  }

  static getById(id: string) {
    const db = getDb();
    const client = db.clients.find((c) => c.id === id);
    if (!client) return null;

    const rentals = db.rentals
      .filter((r) => r.clientId === client.id)
      .map((r) => {
        const bike = db.bikes.find((b) => b.id === r.bikeId);
        const tariff = db.tariffs.find((t) => t.id === r.tariffId);
        return { ...r, bike, tariff };
      });

    const reviews = db.reviews
      .filter((rv) => rv.clientId === client.id)
      .map((rv) => {
        const bike = db.bikes.find((b) => b.id === rv.bikeId);
        return { ...rv, bike };
      });

    const cleanPhone = normalizePhone(client.phone);
    const clientOrders = (db.retailOrders || [])
      .filter(
        (ro) =>
          ro.clientId === client.id ||
          (cleanPhone.length >= 6 && ro.customerPhone && normalizePhone(ro.customerPhone) === cleanPhone)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Backfill clientId on matching orders if not set
    clientOrders.forEach((ro) => {
      if (!ro.clientId) ro.clientId = client.id;
    });

    const clientRepairs = (db.repairs || [])
      .filter(
        (rep) =>
          rep.clientId === client.id ||
          (cleanPhone.length >= 6 && rep.clientPhone && normalizePhone(rep.clientPhone) === cleanPhone)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const retailOrdersCount = clientOrders.length;
    const retailOrdersSpent = clientOrders.reduce((sum, ro) => sum + (Number(ro.totalAmount) || 0), 0);
    const totalRentals = rentals.length;
    const isCourier = client.clientType === "COURIER" || totalRentals > 0 || Boolean(client.courierService);
    const isRetailBuyer = client.clientType === "RETAIL" || retailOrdersCount > 0;

    const loyalty = this.computeClientLoyalty(client);

    return {
      ...client,
      clientType: client.clientType || (totalRentals > 0 || client.courierService ? "COURIER" : "RETAIL"),
      rentals,
      reviews,
      retailOrders: clientOrders,
      retailOrdersCount,
      retailOrdersSpent,
      repairs: clientRepairs,
      isCourier,
      isRetailBuyer,
      ...loyalty,
    };
  }

  static getByPhone(phone: string) {
    const db = getDb();
    const cleanPhone = normalizePhone(phone);
    return db.clients.find((c) => normalizePhone(c.phone) === cleanPhone) || null;
  }

  static create(data: {
    fullName: string;
    phone: string;
    telegram?: string;
    passportSerial?: string;
    passportNumber?: string;
    citizenship?: string;
    migrationCard?: string;
    patentNumber?: string;
    courierService?: string;
    documentPhotoUrls?: string[];
    status?: ClientStatus;
    clientType?: ClientType;
    manualLoyaltyTierId?: string | null;
  }) {
    const db = getDb();

    // Check unique phone
    const cleanPhone = normalizePhone(data.phone);
    if (db.clients.some((c) => normalizePhone(c.phone) === cleanPhone)) {
      throw new Error(`Клиент с телефоном ${data.phone} уже зарегистрирован`);
    }

    const newClient: ClientRecord = {
      id: `cli-${Date.now()}`,
      fullName: data.fullName,
      phone: data.phone,
      telegram: data.telegram || null,
      passportSerial: data.passportSerial || null,
      passportNumber: data.passportNumber || null,
      citizenship: data.citizenship || "РФ",
      migrationCard: data.migrationCard || null,
      patentNumber: data.patentNumber || null,
      courierService: data.courierService || null,
      documentPhotoUrls: data.documentPhotoUrls || [],
      status: data.status || ("NORMAL" as ClientStatus),
      clientType: data.clientType || "COURIER",
      manualLoyaltyTierId: data.manualLoyaltyTierId || null,
      blackListReason: null,
      createdAt: new Date().toISOString(),
    };

    db.clients.push(newClient);
    saveDb();
    return this.getById(newClient.id);
  }

  static update(id: string, data: Partial<ClientRecord>) {
    const db = getDb();
    const index = db.clients.findIndex((c) => c.id === id);
    if (index === -1) return null;
    if (data.phone && db.clients.some((client) => client.id !== id && normalizePhone(client.phone) === normalizePhone(data.phone))) {
      throw new Error("Клиент с этим телефоном уже зарегистрирован");
    }

    db.clients[index] = {
      ...db.clients[index],
      ...data,
    };

    saveDb();
    return this.getById(id);
  }

  static setLoyaltyTier(id: string, manualLoyaltyTierId: string | null) {
    const db = getDb();
    const client = db.clients.find((c) => c.id === id);
    if (!client) {
      throw new Error("Клиент не найден");
    }

    client.manualLoyaltyTierId = manualLoyaltyTierId && manualLoyaltyTierId.trim() ? manualLoyaltyTierId.trim() : null;
    saveDb();
    return this.getById(id);
  }

  static updateStatus(id: string, status: ClientStatus, blackListReason?: string) {
    const db = getDb();
    const client = db.clients.find((c) => c.id === id);
    if (!client) return null;

    client.status = status;
    client.blackListReason = blackListReason || null;
    saveDb();
    return this.getById(id);
  }

  static delete(id: string) {
    const db = getDb();
    const index = db.clients.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Курьер не найден");
    }

    const activeRental = db.rentals.find(
      (r) => r.clientId === id && (r.status === "ACTIVE" || r.status === "OVERDUE")
    );
    if (activeRental) {
      throw new Error(`Невозможно удалить курьера с активной арендой (${activeRental.rentalNumber})`);
    }

    const removed = db.clients.splice(index, 1)[0];
    saveDb();
    return removed;
  }
}
