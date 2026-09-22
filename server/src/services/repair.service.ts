import { RepairRepository } from "../repositories/repair.repository.js";
import { RepairStatus, RepairFaultType, PaymentMethod } from "../repositories/db.js";

export class RepairService {
  static getAllRepairs(filters?: { status?: RepairStatus; faultType?: RepairFaultType; bikeId?: string }) {
    return RepairRepository.getAll(filters);
  }

  static getRepairById(id: string) {
    const repair = RepairRepository.getById(id);
    if (!repair) {
      throw new Error(`Заказ-наряд ${id} не найден`);
    }
    return repair;
  }

  static createRepair(data: {
    bikeId: string;
    mechanicId?: string;
    orderNumber?: string;
    faultType: RepairFaultType;
    description: string;
    laborCost?: number;
    parts?: Array<{ partId: string; quantity: number }>;
  }) {
    return RepairRepository.create(data);
  }

  static updateStatus(id: string, status: RepairStatus) {
    const repair = RepairRepository.updateStatus(id, status);
    if (!repair) {
      throw new Error(`Заказ-наряд ${id} не найден`);
    }
    return repair;
  }

  static completeRepair(
    id: string,
    data: {
      laborCost?: number;
      partsUsed?: Array<{ partId: string; quantity: number }>;
      paymentMethod?: PaymentMethod;
      mechanicNotes?: string;
    }
  ) {
    return RepairRepository.complete(id, data);
  }
}
