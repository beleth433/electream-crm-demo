import { RentalRepository } from "../repositories/rental.repository.js";
import { RentalStatus, PaymentMethod } from "../repositories/db.js";

export class RentalService {
  static getAllRentals(filters?: { status?: RentalStatus; search?: string; clientId?: string }) {
    return RentalRepository.getAll(filters);
  }

  static getRentalById(id: string) {
    const rental = RentalRepository.getById(id);
    if (!rental) {
      throw new Error(`Договор аренды ${id} не найден`);
    }
    return rental;
  }

  static getTariffs() {
    return RentalRepository.getTariffs();
  }

  static createRental(data: {
    clientId: string;
    bikeId: string;
    tariffId: string;
    managerId: string;
    outfitIds: string[];
    paymentMethod: PaymentMethod;
    customDeposit?: number;
    notes?: string;
  }) {
    return RentalRepository.create(data);
  }

  static renewRental(
    id: string,
    data: {
      durationDays?: number;
      amount?: number;
      method: PaymentMethod;
      notes?: string;
    }
  ) {
    return RentalRepository.renew(id, data);
  }

  static closeRental(
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
    return RentalRepository.close(id, data);
  }
}
