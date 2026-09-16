import { StatsRepository } from "../repositories/stats.repository.js";

export class DashboardService {
  static getStats() {
    return StatsRepository.getDashboardStats();
  }
}
