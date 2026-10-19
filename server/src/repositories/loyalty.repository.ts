import { getDb, LoyaltyTierRecord, saveDb } from "./db.js";

export class LoyaltyRepository {
  static getAll(): LoyaltyTierRecord[] {
    const db = getDb();
    if (!db.loyaltyTiers || db.loyaltyTiers.length === 0) {
      return [];
    }
    // Return tiers sorted by qualification thresholds ascending (entry to premium)
    return [...db.loyaltyTiers].sort((a, b) => {
      if (a.minRentalDays !== b.minRentalDays) {
        return a.minRentalDays - b.minRentalDays;
      }
      return a.minTotalSpent - b.minTotalSpent;
    });
  }

  static getById(id: string): LoyaltyTierRecord | null {
    const db = getDb();
    return db.loyaltyTiers.find((t) => t.id === id) || null;
  }

  static create(data: {
    name: string;
    color?: string;
    minRentalDays?: number;
    minTotalSpent?: number;
    discountRentalPercent?: number;
    discountPartsPercent?: number;
    discountRepairsPercent?: number;
    description?: string;
    isDefault?: boolean;
  }): LoyaltyTierRecord {
    const db = getDb();
    const newTier: LoyaltyTierRecord = {
      id: `tier-${Date.now()}`,
      name: data.name.trim(),
      color: data.color || "amber",
      minRentalDays: Math.max(0, Number(data.minRentalDays) || 0),
      minTotalSpent: Math.max(0, Number(data.minTotalSpent) || 0),
      discountRentalPercent: Math.min(100, Math.max(0, Number(data.discountRentalPercent) || 0)),
      discountPartsPercent: Math.min(100, Math.max(0, Number(data.discountPartsPercent) || 0)),
      discountRepairsPercent: Math.min(100, Math.max(0, Number(data.discountRepairsPercent) || 0)),
      description: data.description?.trim() || "",
      isDefault: Boolean(data.isDefault),
    };

    db.loyaltyTiers.push(newTier);
    saveDb();
    return newTier;
  }

  static update(id: string, data: Partial<LoyaltyTierRecord>): LoyaltyTierRecord | null {
    const db = getDb();
    const index = db.loyaltyTiers.findIndex((t) => t.id === id);
    if (index === -1) return null;

    db.loyaltyTiers[index] = {
      ...db.loyaltyTiers[index],
      ...data,
      minRentalDays: data.minRentalDays !== undefined ? Math.max(0, Number(data.minRentalDays) || 0) : db.loyaltyTiers[index].minRentalDays,
      minTotalSpent: data.minTotalSpent !== undefined ? Math.max(0, Number(data.minTotalSpent) || 0) : db.loyaltyTiers[index].minTotalSpent,
      discountRentalPercent: data.discountRentalPercent !== undefined ? Math.min(100, Math.max(0, Number(data.discountRentalPercent) || 0)) : db.loyaltyTiers[index].discountRentalPercent,
      discountPartsPercent: data.discountPartsPercent !== undefined ? Math.min(100, Math.max(0, Number(data.discountPartsPercent) || 0)) : db.loyaltyTiers[index].discountPartsPercent,
      discountRepairsPercent: data.discountRepairsPercent !== undefined ? Math.min(100, Math.max(0, Number(data.discountRepairsPercent) || 0)) : db.loyaltyTiers[index].discountRepairsPercent,
    };

    saveDb();
    return db.loyaltyTiers[index];
  }

  static delete(id: string): boolean {
    const db = getDb();
    const index = db.loyaltyTiers.findIndex((t) => t.id === id);
    if (index === -1) return false;

    // Do not allow deleting if only 1 tier remains
    if (db.loyaltyTiers.length <= 1) {
      throw new Error("Нельзя удалить единственный оставшийся уровень лояльности");
    }

    db.loyaltyTiers.splice(index, 1);

    // If any clients had this tier manually assigned, reset to null (auto)
    for (const client of db.clients) {
      if (client.manualLoyaltyTierId === id) {
        client.manualLoyaltyTierId = null;
      }
    }

    saveDb();
    return true;
  }

  /**
   * Determine client tier based on manual assignment or automatic thresholds
   */
  static determineTier(
    totalDays: number,
    totalSpent: number,
    manualTierId?: string | null
  ): { tier: LoyaltyTierRecord; mode: "MANUAL" | "AUTO" } {
    const tiers = this.getAll();

    // Default fallback tier
    const fallbackTier: LoyaltyTierRecord = tiers.find((t) => t.isDefault) || tiers[0] || {
      id: "tier-bronze",
      name: "Базовый",
      color: "slate",
      minRentalDays: 0,
      minTotalSpent: 0,
      discountRentalPercent: 0,
      discountPartsPercent: 0,
      discountRepairsPercent: 0,
    };

    // 1. Check manual override
    if (manualTierId) {
      const manual = tiers.find((t) => t.id === manualTierId);
      if (manual) {
        return { tier: manual, mode: "MANUAL" };
      }
    }

    // 2. Automatic threshold check:
    // Sort tiers from highest qualification requirement to lowest
    const sortedDescending = [...tiers].sort((a, b) => {
      const scoreB = b.minTotalSpent + b.minRentalDays * 1000;
      const scoreA = a.minTotalSpent + a.minRentalDays * 1000;
      return scoreB - scoreA;
    });

    for (const t of sortedDescending) {
      const daysMet = t.minRentalDays > 0 && totalDays >= t.minRentalDays;
      const spentMet = t.minTotalSpent > 0 && totalSpent >= t.minTotalSpent;

      if (daysMet || spentMet || (t.minRentalDays === 0 && t.minTotalSpent === 0)) {
        return { tier: t, mode: "AUTO" };
      }
    }

    return { tier: fallbackTier, mode: "AUTO" };
  }
}
