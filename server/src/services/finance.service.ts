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

  static updatePayment(
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
    return FinanceRepository.update(id, data);
  }

  static deletePayment(id: string) {
    return FinanceRepository.delete(id);
  }

  static getSummary() {
    return FinanceRepository.getSummary();
  }

  static getSettings() {
    return FinanceRepository.getSettings();
  }

  static updateSettings(data: {
    monthlyFixedExpenses?: number;
    fixedExpensesDescription?: string;
    fixedExpenseItems?: Array<{ id?: string; name: string; amount: number }>;
    paymentDetails?: any;
  }) {
    return FinanceRepository.updateSettings(data);
  }
}


