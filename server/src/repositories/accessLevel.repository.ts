import { getDb, AccessLevelRecord } from "./db.js";
import { HistoryRepository } from "./history.repository.js";

const historyRepo = new HistoryRepository();

export class AccessLevelRepository {
  async findAll(): Promise<AccessLevelRecord[]> {
    const db = getDb();
    if (!Array.isArray(db.accessLevels)) {
      db.accessLevels = [];
    }
    return db.accessLevels;
  }

  async findById(id: string): Promise<AccessLevelRecord | null> {
    const db = getDb();
    if (!Array.isArray(db.accessLevels)) return null;
    return db.accessLevels.find((lvl) => lvl.id === id) || null;
  }

  async create(data: Omit<AccessLevelRecord, "id" | "createdAt" | "updatedAt">): Promise<AccessLevelRecord> {
    const db = getDb();
    if (!Array.isArray(db.accessLevels)) {
      db.accessLevels = [];
    }

    const now = new Date().toISOString();
    const newLvl: AccessLevelRecord = {
      id: `lvl-${Date.now()}`,
      name: data.name.trim(),
      description: data.description?.trim() || "",
      isSystem: false,
      canManageEmployees: Boolean(data.canManageEmployees),
      canSeeProfits: Boolean(data.canSeeProfits),
      permissions: data.permissions || {},
      createdAt: now,
      updatedAt: now,
    };

    db.accessLevels.push(newLvl);

    await HistoryRepository.logAction({
      category: "SYSTEM",
      action: "ACCESS_LEVEL_CREATE",
      title: `Создан уровень доступа: ${newLvl.name}`,
      details: `Назначены права на модули. Управление сотрудниками: ${newLvl.canManageEmployees ? "Да" : "Нет"}, P&L: ${newLvl.canSeeProfits ? "Да" : "Нет"}`,
      badgeText: "Доступ",
      badgeColor: "purple",
      entityId: newLvl.id,
    });

    return newLvl;
  }

  async update(id: string, data: Partial<Omit<AccessLevelRecord, "id" | "isSystem" | "createdAt">>): Promise<AccessLevelRecord | null> {
    const db = getDb();
    if (!Array.isArray(db.accessLevels)) return null;

    const index = db.accessLevels.findIndex((lvl) => lvl.id === id);
    if (index === -1) return null;

    const existing = db.accessLevels[index];
    const updated: AccessLevelRecord = {
      ...existing,
      name: data.name !== undefined ? data.name.trim() : existing.name,
      description: data.description !== undefined ? (data.description?.trim() || "") : existing.description,
      canManageEmployees: data.canManageEmployees !== undefined ? Boolean(data.canManageEmployees) : existing.canManageEmployees,
      canSeeProfits: data.canSeeProfits !== undefined ? Boolean(data.canSeeProfits) : existing.canSeeProfits,
      permissions: data.permissions !== undefined ? { ...existing.permissions, ...data.permissions } : existing.permissions,
      updatedAt: new Date().toISOString(),
    };

    db.accessLevels[index] = updated;

    await HistoryRepository.logAction({
      category: "SYSTEM",
      action: "ACCESS_LEVEL_UPDATE",
      title: `Обновлен уровень доступа: ${updated.name}`,
      details: `Изменены правила видимости и редактирования модулей`,
      badgeText: "Доступ",
      badgeColor: "purple",
      entityId: updated.id,
    });

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    if (!Array.isArray(db.accessLevels)) return false;

    const index = db.accessLevels.findIndex((lvl) => lvl.id === id);
    if (index === -1) return false;

    const target = db.accessLevels[index];
    if (target.id === "lvl-owner" || target.id === "lvl-admin") {
      throw new Error(`Уровень доступа Владелец / SuperAdmin является базовым системным ядром и защищен от удаления`);
    }

    const usersWithThisLevel = (db.users || []).filter((u) => u.accessLevelId === id);
    if (usersWithThisLevel.length > 0) {
      throw new Error(`Нельзя удалить уровень доступа "${target.name}": он назначен ${usersWithThisLevel.length} сотрудникам`);
    }

    db.accessLevels.splice(index, 1);

    await HistoryRepository.logAction({
      category: "SYSTEM",
      action: "ACCESS_LEVEL_DELETE",
      title: `Удален уровень доступа: ${target.name}`,
      badgeText: "Удалено",
      badgeColor: "rose",
      entityId: id,
    });

    return true;
  }
}
