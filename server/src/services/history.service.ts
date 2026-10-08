import { HistoryRepository } from "../repositories/history.repository.js";

export class HistoryService {
  static getHistory(filters?: {
    category?: string;
    search?: string;
    limit?: number;
    days?: number;
  }) {
    return HistoryRepository.getAll(filters);
  }

  static logAction(entry: {
    category: "RENTAL" | "PAYMENT" | "REPAIR" | "FLEET" | "CLIENT" | "INFO" | "SYSTEM";
    action: string;
    title: string;
    details?: string;
    actorName?: string;
    amount?: number;
    badgeText?: string;
    badgeColor?: string;
    entityId?: string;
  }) {
    return HistoryRepository.logAction(entry);
  }

  static clearAuditLogs() {
    return HistoryRepository.clearAuditLogs();
  }
}
