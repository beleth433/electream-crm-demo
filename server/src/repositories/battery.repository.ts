import { getDb, BatteryRecord, BatteryStatus } from "./db.js";

export class BatteryRepository {
  static getAll(filters?: { status?: BatteryStatus; voltage?: number; search?: string; bikeId?: string }) {
    const db = getDb();
    let list = db.batteries.map((bat) => {
      const bike = bat.installedBikeId ? db.bikes.find((b) => b.id === bat.installedBikeId) : null;
      const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;
      return {
        ...bat,
        installedBike: bike
          ? {
              id: bike.id,
              inventoryNumber: bike.inventoryNumber,
              status: bike.status,
              modelName: bikeModel?.name,
              currentLocation: bike.currentLocation,
            }
          : null,
      };
    });

    if (filters?.status) {
      list = list.filter((b) => b.status === filters.status);
    }
    if (filters?.voltage) {
      list = list.filter((b) => b.voltage === Number(filters.voltage));
    }
    if (filters?.bikeId) {
      list = list.filter((b) => b.installedBikeId === filters.bikeId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.serialNumber.toLowerCase().includes(q) ||
          b.location.toLowerCase().includes(q) ||
          (b.notes && b.notes.toLowerCase().includes(q)) ||
          (b.installedBike && b.installedBike.inventoryNumber.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => a.serialNumber.localeCompare(b.serialNumber, undefined, { numeric: true }));
  }

  static getById(id: string) {
    const db = getDb();
    const bat = db.batteries.find((b) => b.id === id);
    if (!bat) return null;

    const bike = bat.installedBikeId ? db.bikes.find((b) => b.id === bat.installedBikeId) : null;
    const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;

    return {
      ...bat,
      installedBike: bike
        ? {
            id: bike.id,
            inventoryNumber: bike.inventoryNumber,
            status: bike.status,
            modelName: bikeModel?.name,
            currentLocation: bike.currentLocation,
          }
        : null,
    };
  }

  static getStats() {
    const db = getDb();
    const all = db.batteries;
    const total = all.length;
    const available = all.filter((b) => b.status === "AVAILABLE").length;
    const installed = all.filter((b) => b.status === "INSTALLED").length;
    const issuedSpare = all.filter((b) => b.status === "ISSUED_SPARE").length;
    const inMaintenance = all.filter((b) => b.status === "IN_MAINTENANCE").length;
    const decommissioned = all.filter((b) => b.status === "DECOMMISSIONED").length;

    const activeBatteries = all.filter((b) => b.status !== "DECOMMISSIONED" && b.status !== "SOLD");
    const avgHealth =
      activeBatteries.length > 0
        ? Math.round(
            (activeBatteries.reduce((sum, b) => sum + (b.healthPercent || 100), 0) / activeBatteries.length) * 10
          ) / 10
        : 100;

    return {
      total,
      available,
      installed,
      issuedSpare,
      inMaintenance,
      decommissioned,
      avgHealth,
    };
  }

  static create(data: {
    serialNumber: string;
    voltage: number;
    capacityAh: number;
    connector?: string;
    cycleCount?: number;
    healthPercent?: number;
    status?: BatteryStatus;
    location?: string;
    notes?: string;
  }) {
    const db = getDb();
    const cleanSerial = data.serialNumber.trim();
    if (!cleanSerial) {
      throw new Error("Серийный номер аккумулятора обязателен");
    }

    if (db.batteries.some((b) => b.serialNumber.toLowerCase() === cleanSerial.toLowerCase())) {
      throw new Error(`Аккумулятор с серийным номером ${cleanSerial} уже зарегистрирован в системе`);
    }

    const newBattery: BatteryRecord = {
      id: `bat-${Date.now()}`,
      serialNumber: cleanSerial,
      voltage: Number(data.voltage) || 60,
      capacityAh: Number(data.capacityAh) || 20,
      connector: data.connector || "XT60",
      cycleCount: Number(data.cycleCount) || 0,
      healthPercent: Math.min(100, Math.max(0, Number(data.healthPercent) || 100)),
      status: data.status || "AVAILABLE",
      installedBikeId: null,
      location: data.location || "Стеллаж зарядки на центральной базе",
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.batteries.push(newBattery);
    return this.getById(newBattery.id);
  }

  static update(id: string, data: Partial<BatteryRecord>) {
    const db = getDb();
    const index = db.batteries.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error("Аккумулятор не найден");
    }

    if (data.serialNumber && data.serialNumber !== db.batteries[index].serialNumber) {
      const cleanSerial = data.serialNumber.trim();
      const duplicate = db.batteries.find(
        (b) => b.id !== id && b.serialNumber.toLowerCase() === cleanSerial.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Серийный номер ${cleanSerial} уже занят другим аккумулятором`);
      }
      db.batteries[index].serialNumber = cleanSerial;
    }

    if (data.voltage !== undefined) db.batteries[index].voltage = Number(data.voltage);
    if (data.capacityAh !== undefined) db.batteries[index].capacityAh = Number(data.capacityAh);
    if (data.connector !== undefined) db.batteries[index].connector = data.connector;
    if (data.cycleCount !== undefined) db.batteries[index].cycleCount = Number(data.cycleCount);
    if (data.healthPercent !== undefined) {
      db.batteries[index].healthPercent = Math.min(100, Math.max(0, Number(data.healthPercent)));
    }
    if (data.status !== undefined) db.batteries[index].status = data.status;
    if (data.location !== undefined) db.batteries[index].location = data.location;
    if (data.notes !== undefined) db.batteries[index].notes = data.notes;

    db.batteries[index].updatedAt = new Date().toISOString();
    return this.getById(id);
  }

  static delete(id: string) {
    const db = getDb();
    const index = db.batteries.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error("Аккумулятор не найден");
    }

    const battery = db.batteries[index];
    if (battery.installedBikeId) {
      const bike = db.bikes.find((b) => b.id === battery.installedBikeId);
      throw new Error(
        `Невозможно удалить АКБ ${battery.serialNumber}: он установлен на байке ${bike ? bike.inventoryNumber : battery.installedBikeId}. Сначала снимите аккумулятор с байка.`
      );
    }

    const bikeUsingBattery = db.bikes.find((b) => b.batteryId === id);
    if (bikeUsingBattery) {
      throw new Error(
        `Невозможно удалить АКБ ${battery.serialNumber}: он числится за байком ${bikeUsingBattery.inventoryNumber}.`
      );
    }

    if (battery.status === "ISSUED_SPARE") {
      throw new Error(
        `Невозможно удалить АКБ ${battery.serialNumber}: он выдан курьеру как дополнительный.`
      );
    }

    const removed = db.batteries.splice(index, 1)[0];
    return removed;
  }

  static attachToBike(batteryId: string, bikeId: string) {
    const db = getDb();
    const bike = db.bikes.find((b) => b.id === bikeId);
    if (!bike) throw new Error("Электровелосипед не найден");

    const newBattery = db.batteries.find((b) => b.id === batteryId);
    if (!newBattery) throw new Error("Аккумулятор не найден");

    if (newBattery.status === "DECOMMISSIONED" || newBattery.status === "SOLD") {
      throw new Error(`Невозможно установить списанный или проданный АКБ (${newBattery.status})`);
    }

    // 1. If bike already had a battery, detach the old battery
    if (bike.batteryId && bike.batteryId !== batteryId) {
      const oldBattery = db.batteries.find((b) => b.id === bike.batteryId);
      if (oldBattery) {
        oldBattery.installedBikeId = null;
        oldBattery.status = "AVAILABLE";
        oldBattery.location = "Центральная база (склад АКБ)";
        oldBattery.updatedAt = new Date().toISOString();
      }
    }

    // 2. If this new battery was installed on another bike, detach it from that other bike
    if (newBattery.installedBikeId && newBattery.installedBikeId !== bikeId) {
      const previousBike = db.bikes.find((b) => b.id === newBattery.installedBikeId);
      if (previousBike) {
        previousBike.batteryId = null;
        previousBike.updatedAt = new Date().toISOString();
      }
    }

    // 3. Attach new battery to bike
    newBattery.installedBikeId = bike.id;
    newBattery.status = "INSTALLED";
    newBattery.location = `Байк ${bike.inventoryNumber}${bike.status === "RENTED" ? " (В аренде)" : ""}`;
    newBattery.updatedAt = new Date().toISOString();

    bike.batteryId = newBattery.id;
    bike.updatedAt = new Date().toISOString();

    return {
      battery: this.getById(newBattery.id),
      bike: {
        ...bike,
        battery: newBattery,
      },
    };
  }

  static detachFromBike(bikeId: string) {
    const db = getDb();
    const bike = db.bikes.find((b) => b.id === bikeId);
    if (!bike) throw new Error("Электровелосипед не найден");

    let detachedBattery: BatteryRecord | null = null;

    if (bike.batteryId) {
      const battery = db.batteries.find((b) => b.id === bike.batteryId);
      if (battery) {
        battery.installedBikeId = null;
        battery.status = "AVAILABLE";
        battery.location = "Центральная база (склад АКБ, стеллаж зарядки)";
        battery.updatedAt = new Date().toISOString();
        detachedBattery = battery;
      }
      bike.batteryId = null;
      bike.updatedAt = new Date().toISOString();
    } else {
      // Check if any battery points to this bike
      const orphanBattery = db.batteries.find((b) => b.installedBikeId === bikeId);
      if (orphanBattery) {
        orphanBattery.installedBikeId = null;
        orphanBattery.status = "AVAILABLE";
        orphanBattery.location = "Центральная база (склад АКБ, стеллаж зарядки)";
        orphanBattery.updatedAt = new Date().toISOString();
        detachedBattery = orphanBattery;
      }
    }

    return {
      bike: {
        ...bike,
        battery: null,
      },
      battery: detachedBattery ? this.getById(detachedBattery.id) : null,
    };
  }

  static swapBattery(bikeId: string, newBatteryId: string) {
    return this.attachToBike(newBatteryId, bikeId);
  }
}
