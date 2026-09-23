import { getDb, ClientStatus, ClientRecord, ClientType } from "./db.js";
import { LoyaltyRepository } from "./loyalty.repository.js";

export class ClientRepository {
  static computeClientLoyalty(client: ClientRecord) {
    const db = getDb();
    const clientRentals = db.rentals.filter((r) => r.clientId === client.id);

    // 1. Calculate total rental days
    let totalRentalDays = 0;
    for (const r of clientRentals) {
      if (r.startedAt && r.expiresAt) {
        const start = new Date(r.startedAt).getTime();
        const end = new Date(r.expiresAt).getTime();
        if (!isNaN(start) && !isNaN(end) && end > start) {
          totalRentalDays += Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)));
          continue;
        }
      }
      const trf = db.tariffs.find((t) => t.id === r.tariffId);
      totalRentalDays += trf?.durationDays || 1;
    }

    // 2. Calculate total spent
    const retailSpent = (db.retailOrders || [])
      .filter((ro) => ro.clientId === client.id)
      .reduce((sum, ro) => sum + (Number(ro.totalAmount) || 0), 0);

    const rentalIds = new Set(clientRentals.map((r) => r.id));
    const rentalPayments = (db.payments || [])
      .filter((p) => p.rentalId && rentalIds.has(p.rentalId) && (p.type === "RENTAL" || p.type === "FINE"))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const calculatedRentalSpent = clientRentals.reduce((sum, r) => {
      const trf = db.tariffs.find((t) => t.id === r.tariffId);
      return sum + (trf?.price || 0);
    }, 0);
    const effectiveRentalSpent = Math.max(rentalPayments, calculatedRentalSpent);

    const totalSpent = retailSpent + effectiveRentalSpent;

    // 3. Determine tier
    const loyaltyResult = LoyaltyRepository.determineTier(
      totalRentalDays,
      totalSpent,
      client.manualLoyaltyTierId
    );

    return {
      totalRentalDays,
      totalSpent,
      loyaltyTier: loyaltyResult.tier,
      loyaltyMode: loyaltyResult.mode,
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
      const activeRental = db.rentals.find(
        (r) => r.clientId === c.id && (r.status === "ACTIVE" || r.status === "OVERDUE")
      );
      const totalRentals = db.rentals.filter((r) => r.clientId === c.id).length;
      const clientOrders = (db.retailOrders || []).filter((ro) => ro.clientId === c.id);
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

    const clientOrders = (db.retailOrders || [])
      .filter((ro) => ro.clientId === client.id)
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
      isCourier,
      isRetailBuyer,
      ...loyalty,
    };
  }

  static getByPhone(phone: string) {
    const db = getDb();
    const cleanPhone = phone.replace(/\D/g, "");
    return db.clients.find((c) => c.phone.replace(/\D/g, "") === cleanPhone) || null;
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
    const cleanPhone = data.phone.replace(/\D/g, "");
    if (db.clients.some((c) => c.phone.replace(/\D/g, "") === cleanPhone)) {
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
    return this.getById(newClient.id);
  }

  static update(id: string, data: Partial<ClientRecord>) {
    const db = getDb();
    const index = db.clients.findIndex((c) => c.id === id);
    if (index === -1) return null;

    db.clients[index] = {
      ...db.clients[index],
      ...data,
    };

    return this.getById(id);
  }

  static setLoyaltyTier(id: string, manualLoyaltyTierId: string | null) {
    const db = getDb();
    const client = db.clients.find((c) => c.id === id);
    if (!client) {
      throw new Error("Клиент не найден");
    }

    client.manualLoyaltyTierId = manualLoyaltyTierId && manualLoyaltyTierId.trim() ? manualLoyaltyTierId.trim() : null;
    return this.getById(id);
  }

  static updateStatus(id: string, status: ClientStatus, blackListReason?: string) {
    const db = getDb();
    const client = db.clients.find((c) => c.id === id);
    if (!client) return null;

    client.status = status;
    client.blackListReason = blackListReason || null;
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
    return removed;
  }
}

