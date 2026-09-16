import { getDb, ClientStatus, ClientRecord } from "./db.js";

export class ClientRepository {
  static getAll(filters?: { status?: ClientStatus; search?: string; courierService?: string }) {
    const db = getDb();
    let list = db.clients.map((c) => {
      const activeRental = db.rentals.find(
        (r) => r.clientId === c.id && (r.status === "ACTIVE" || r.status === "OVERDUE")
      );
      const totalRentals = db.rentals.filter((r) => r.clientId === c.id).length;

      return {
        ...c,
        activeRental: activeRental
          ? {
              id: activeRental.id,
              rentalNumber: activeRental.rentalNumber,
              status: activeRental.status,
              expiresAt: activeRental.expiresAt,
            }
          : null,
        totalRentals,
      };
    });

    if (filters?.status) {
      list = list.filter((c) => c.status === filters.status);
    }
    if (filters?.courierService) {
      list = list.filter((c) => c.courierService === filters.courierService);
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

    return {
      ...client,
      rentals,
      reviews,
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
  }) {
    const db = getDb();

    // Check unique phone
    const cleanPhone = data.phone.replace(/\D/g, "");
    if (db.clients.some((c) => c.phone.replace(/\D/g, "") === cleanPhone)) {
      throw new Error(`Курьер с телефоном ${data.phone} уже зарегистрирован`);
    }

    const newClient = {
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
      blackListReason: null,
      createdAt: new Date().toISOString(),
    };

    db.clients.push(newClient);
    return newClient;
  }

  static update(id: string, data: Partial<ClientRecord>) {
    const db = getDb();
    const index = db.clients.findIndex((c) => c.id === id);
    if (index === -1) return null;

    db.clients[index] = {
      ...db.clients[index],
      ...data,
    };

    return db.clients[index];
  }

  static updateStatus(id: string, status: ClientStatus, blackListReason?: string) {
    const db = getDb();
    const client = db.clients.find((c) => c.id === id);
    if (!client) return null;

    client.status = status;
    client.blackListReason = blackListReason || null;
    return client;
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

