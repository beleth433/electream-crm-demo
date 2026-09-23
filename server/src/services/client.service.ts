import { ClientRepository } from "../repositories/client.repository.js";
import { ClientStatus, ClientType } from "../repositories/db.js";

export class ClientService {
  static getAllClients(filters?: {
    status?: ClientStatus;
    search?: string;
    courierService?: string;
    clientType?: string;
  }) {
    return ClientRepository.getAll(filters);
  }

  static getClientById(id: string) {
    const client = ClientRepository.getById(id);
    if (!client) {
      throw new Error(`Клиент с ID ${id} не найден`);
    }
    return client;
  }

  static searchByPhone(phone: string) {
    return ClientRepository.getByPhone(phone);
  }

  static createClient(data: {
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
    // CIS onboarding rule validation (only for couriers)
    const clientType = data.clientType || "COURIER";
    const citizenship = data.citizenship?.trim() || "РФ";

    if (clientType === "COURIER" && citizenship !== "РФ") {
      if (!data.migrationCard) {
        throw new Error("Для иностранных граждан обязательно указание номера миграционной карты");
      }
      if (!data.patentNumber) {
        throw new Error("Для иностранных граждан обязательно указание патента или статуса ЕАЭС");
      }
    }

    return ClientRepository.create({
      ...data,
      citizenship,
      clientType,
      manualLoyaltyTierId: data.manualLoyaltyTierId || null,
    });
  }

  static updateClient(id: string, data: any) {
    const client = ClientRepository.update(id, data);
    if (!client) {
      throw new Error(`Курьер с ID ${id} не найден`);
    }
    return client;
  }

  static updateStatus(id: string, status: ClientStatus, blackListReason?: string) {
    const client = ClientRepository.updateStatus(id, status, blackListReason);
    if (!client) {
      throw new Error(`Курьер с ID ${id} не найден`);
    }
    return client;
  }

  static deleteClient(id: string) {
    return ClientRepository.delete(id);
  }
}

