import { FinanceRepository } from "../repositories/finance.repository.js";
import { PaymentType, PaymentMethod } from "../repositories/db.js";

export class FinanceService {
  static getAll(filters?: { type?: PaymentType; method?: PaymentMethod; rentalId?: string }) {
    return FinanceRepository.getAll(filters);
  }

  static createPayment(data: {
    rentalId?: string;
    type: PaymentType;
    amount: number;
    method: PaymentMethod;
    description?: string;
  }) {
    return FinanceRepository.create(data);
  }

  static getSummary() {
    return FinanceRepository.getSummary();
  }
}
