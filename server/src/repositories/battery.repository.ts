import { getDb, BatteryRecord, BatteryStatus, BatteryModelRecord, BatteryChemistry, saveDb } from "./db.js";
import { activeRentalForBike, activeRentalForBattery, isOpenRental } from "./relations.js";

export class BatteryRepository {
  // Battery Model Templates CRUD
  static getBatteryModels() {
    const db = getDb();
    return db.batteryModels.map((m) => {
      const batteriesCount = db.batteries.filter((b) => b.modelId === m.id).length;
      return {
        ...m,
        batteriesCount,
      };
    });
  }

  static createBatteryModel(data: {
    name: string;
    voltage: number;
    capacityAh: number;
    chemistry?: BatteryChemistry;
    description?: string | null;
    purchasePrice?: number;
    salePrice?: number;
  }) {
    const db = getDb();
    if (!data.name || !data.name.trim()) {
      throw new Error("Название модели аккумулятора обязательно для заполнения");
    }
    const cleanName = data.name.trim();
    if (db.batteryModels.some((m) => m.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error(`Шаблон модели "${cleanName}" уже существует`);
    }

    const newModel: BatteryModelRecord = {
      id: `bat-mdl-${Date.now()}`,
      name: cleanName,
      voltage: Number(data.voltage) || 60,
      capacityAh: Number(data.capacityAh) || 20,
      chemistry: data.chemistry === 'LiFePO4' ? 'LiFePO4' : 'Li-ion',
      description: data.description || null,
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
      salePrice: data.salePrice !== undefined ? Number(data.salePrice) : undefined,
    };
    db.batteryModels.push(newModel);
    saveDb();
    return {
      ...newModel,
      batteriesCount: 0,
    };
  }

  static updateBatteryModel(
    id: string,
    data: {
      name?: string;
      voltage?: number;
      capacityAh?: number;
      chemistry?: BatteryChemistry;
      description?: string | null;
      purchasePrice?: number;
      salePrice?: number;
    }
  ) {
    const db = getDb();
    const model = db.batteryModels.find((m) => m.id === id);
    if (!model) {
      throw new Error("Шаблон модели аккумулятора не найден");
    }

    if (data.name !== undefined) {
      const cleanName = data.name.trim();
      const duplicate = db.batteryModels.find(
        (m) => m.id !== id && m.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Шаблон модели "${cleanName}" уже существует`);
      }
      model.name = cleanName;
    }

    if (data.voltage !== undefined) model.voltage = Number(data.voltage);
    if (data.capacityAh !== undefined) model.capacityAh = Number(data.capacityAh);
    if (data.chemistry !== undefined) model.chemistry = data.chemistry;
    if (data.description !== undefined) model.description = data.description;
    if (data.purchasePrice !== undefined) model.purchasePrice = Number(data.purchasePrice);
    if (data.salePrice !== undefined) model.salePrice = Number(data.salePrice);

    saveDb();
    const batteriesCount = db.batteries.filter((b) => b.modelId === model.id).length;
    return {
      ...model,
      batteriesCount,
    };
  }

  static deleteBatteryModel(id: string) {
    const db = getDb();
    if (db.tariffs.some((tariff) => tariff.includedBatteries?.some((battery) => battery.batteryModelId === id))) throw new Error("Модель АКБ используется в тарифах выкупа");
    const index = db.batteryModels.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error("Шаблон модели аккумулятора не найден");
    }

    const batteriesWithModel = db.batteries.filter((b) => b.modelId === id);
    if (batteriesWithModel.length > 0) {
      throw new Error(
        `Невозможно удалить шаблон "${db.batteryModels[index].name}": в парке зарегистрировано ${batteriesWithModel.length} батарей этой модели (${batteriesWithModel.map((b) => b.serialNumber).join(', ')})`
      );
    }

    const removed = db.batteryModels.splice(index, 1)[0];
    saveDb();
    return removed;
  }

  private static enrichBattery(bat: BatteryRecord, db: ReturnType<typeof getDb>) {
    const bike = bat.installedBikeId ? db.bikes.find((b) => b.id === bat.installedBikeId) : null;
    const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;
    const batModel = bat.modelId ? db.batteryModels.find((m) => m.id === bat.modelId) : null;

    // Active rentals: ACTIVE or OVERDUE
    const activeRentals = db.rentals.filter((r) => r.status === "ACTIVE" || r.status === "OVERDUE");
    const activeRental = activeRentals.find(
      (r) =>
        (r.batteryIds && r.batteryIds.includes(bat.id)) ||
        (bat.installedBikeId && r.bikeId === bat.installedBikeId) ||
        (bat.issuedBikeId && r.bikeId === bat.issuedBikeId)
    );

    let currentRental = null;
    if (activeRental) {
      const client = db.clients.find((c) => c.id === activeRental.clientId);
      const rentalBike = activeRental.bikeId ? db.bikes.find((b) => b.id === activeRental.bikeId) : null;
      currentRental = {
        id: activeRental.id,
        rentalNumber: activeRental.rentalNumber,
        clientId: activeRental.clientId,
        clientName: client?.fullName || "Курьер",
        clientPhone: client?.phone || null,
        bikeId: activeRental.bikeId || null,
        bikeInventoryNumber: rentalBike?.inventoryNumber || null,
        isSpare: bat.status === "ISSUED_SPARE" || (activeRental.bikeId ? bat.installedBikeId !== activeRental.bikeId : false),
      };
    }

    const targetIssuedBikeId = bat.issuedBikeId || (bat.status === "ISSUED_SPARE" && activeRental ? activeRental.bikeId : null);
    const issuedBikeRecord = targetIssuedBikeId ? db.bikes.find((b) => b.id === targetIssuedBikeId) : null;
    const issuedBikeModel = issuedBikeRecord ? db.models.find((m) => m.id === issuedBikeRecord.modelId) : null;
    const issuedBike = issuedBikeRecord
      ? {
          id: issuedBikeRecord.id,
          inventoryNumber: issuedBikeRecord.inventoryNumber,
          status: issuedBikeRecord.status,
          modelName: issuedBikeModel?.name,
          currentLocation: issuedBikeRecord.currentLocation,
        }
      : null;

    return {
      ...bat,
      modelName: batModel?.name || bat.modelName,
      installedBike: bike
        ? {
            id: bike.id,
            inventoryNumber: bike.inventoryNumber,
            status: bike.status,
            modelName: bikeModel?.name,
            currentLocation: bike.currentLocation,
          }
        : null,
      issuedBike,
      currentRental,
    };
  }

  static getAll(filters?: { status?: BatteryStatus; voltage?: number; modelId?: string; search?: string; bikeId?: string }) {
    const db = getDb();
    let list = db.batteries.map((bat) => this.enrichBattery(bat, db));

    if (filters?.status) {
      list = list.filter((b) => b.status === filters.status);
    }
    if (filters?.voltage) {
      list = list.filter((b) => b.voltage === Number(filters.voltage));
    }
    if (filters?.modelId) {
      list = list.filter((b) => b.modelId === filters.modelId);
    }
    if (filters?.bikeId) {
      list = list.filter((b) => b.installedBikeId === filters.bikeId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.serialNumber.toLowerCase().includes(q) ||
          (b.modelName && b.modelName.toLowerCase().includes(q)) ||
          (b.notes && b.notes.toLowerCase().includes(q)) ||
          (b.installedBike && b.installedBike.inventoryNumber.toLowerCase().includes(q)) ||
          (b.issuedBike && b.issuedBike.inventoryNumber.toLowerCase().includes(q)) ||
          (b.currentRental && b.currentRental.clientName.toLowerCase().includes(q)) ||
          (b.currentRental && b.currentRental.rentalNumber.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => a.serialNumber.localeCompare(b.serialNumber, undefined, { numeric: true }));
  }

  static getById(id: string) {
    const db = getDb();
    const bat = db.batteries.find((b) => b.id === id);
    if (!bat) return null;
    return this.enrichBattery(bat, db);
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

    return {
      total,
      available,
      installed,
      issuedSpare,
      inMaintenance,
      decommissioned,
    };
  }

  static create(data: {
    serialNumber: string;
    modelId?: string;
    voltage?: number;
    capacityAh?: number;
    chemistry?: BatteryChemistry;
    status?: BatteryStatus;
    notes?: string;
    purchasePrice?: number;
    salePrice?: number;
  }) {
    const db = getDb();
    const cleanSerial = data.serialNumber?.trim();
    if (!cleanSerial) {
      throw new Error("Серийный номер аккумулятора обязателен");
    }

    if (db.batteries.some((b) => b.serialNumber.toLowerCase() === cleanSerial.toLowerCase())) {
      throw new Error(`Аккумулятор с серийным номером ${cleanSerial} уже зарегистрирован в системе`);
    }

    let modelName: string | null = null;
    let voltage = Number(data.voltage) || 60;
    let capacityAh = Number(data.capacityAh) || 20;
    let chemistry: BatteryChemistry = (data.chemistry as BatteryChemistry) || 'Li-ion';
    let purchasePrice = data.purchasePrice !== undefined ? Number(data.purchasePrice) : 0;
    let salePrice = data.salePrice !== undefined ? Number(data.salePrice) : 0;

    if (data.modelId) {
      const batModel = db.batteryModels.find((m) => m.id === data.modelId);
      if (batModel) {
        modelName = batModel.name;
        voltage = batModel.voltage;
        capacityAh = batModel.capacityAh;
        if (batModel.chemistry) {
          chemistry = batModel.chemistry;
        }
        if (data.purchasePrice === undefined && batModel.purchasePrice !== undefined) {
          purchasePrice = batModel.purchasePrice;
        }
        if (data.salePrice === undefined && batModel.salePrice !== undefined) {
          salePrice = batModel.salePrice;
        }
      }
    }

    const newBattery: BatteryRecord = {
      id: `bat-${Date.now()}`,
      serialNumber: cleanSerial,
      modelId: data.modelId || null,
      modelName,
      voltage,
      capacityAh,
      chemistry,
      status: data.status || "AVAILABLE",
      installedBikeId: null,
      notes: data.notes || null,
      purchasePrice,
      salePrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.batteries.push(newBattery);
    saveDb();
    return this.getById(newBattery.id);
  }

  static update(id: string, data: Partial<BatteryRecord>) {
    const db = getDb();
    const index = db.batteries.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error("Аккумулятор не найден");
    }
    const existing = db.batteries[index];
    if (["SOLD", "DECOMMISSIONED"].includes(existing.status) && data.status && data.status !== existing.status) throw new Error("АКБ выбыл из парка; его нельзя вернуть изменением статуса");
    if (data.status && data.status !== existing.status) {
      if ((data.status === "INSTALLED" && !existing.installedBikeId) || (data.status === "ISSUED_SPARE" && !existing.issuedBikeId)) {
        throw new Error("Для выдачи или установки АКБ используйте привязку к велосипеду или договору");
      }
      if (data.status !== "INSTALLED" && data.status !== "ISSUED_SPARE") {
        if (existing.installedBikeId) {
          const bike = db.bikes.find((b) => b.id === existing.installedBikeId);
          if (bike?.batteryId === id) bike.batteryId = null;
        }
        existing.installedBikeId = null;
        existing.issuedBikeId = null;
        for (const rental of db.rentals.filter(isOpenRental)) rental.batteryIds = rental.batteryIds?.filter((batteryId) => batteryId !== id);
      }
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

    if (data.modelId !== undefined) {
      db.batteries[index].modelId = data.modelId;
      if (data.modelId) {
        const batModel = db.batteryModels.find((m) => m.id === data.modelId);
        if (batModel) {
          db.batteries[index].modelName = batModel.name;
          db.batteries[index].voltage = batModel.voltage;
          db.batteries[index].capacityAh = batModel.capacityAh;
          if (batModel.chemistry) {
            db.batteries[index].chemistry = batModel.chemistry;
          }
        }
      }
    }

    if (data.voltage !== undefined) db.batteries[index].voltage = Number(data.voltage);
    if (data.capacityAh !== undefined) db.batteries[index].capacityAh = Number(data.capacityAh);
    if (data.chemistry !== undefined) db.batteries[index].chemistry = data.chemistry;
    if (data.status !== undefined) db.batteries[index].status = data.status;
    if (data.notes !== undefined) db.batteries[index].notes = data.notes;
    if (data.purchasePrice !== undefined) db.batteries[index].purchasePrice = Number(data.purchasePrice);
    if (data.salePrice !== undefined) db.batteries[index].salePrice = Number(data.salePrice);
    if (data.cycleCount !== undefined) db.batteries[index].cycleCount = Math.max(0, Number(data.cycleCount));
    if (data.healthPercent !== undefined) db.batteries[index].healthPercent = Math.min(100, Math.max(0, Number(data.healthPercent)));

    db.batteries[index].updatedAt = new Date().toISOString();
    saveDb();
    return this.getById(id);
  }

  static delete(id: string) {
    const db = getDb();
    const index = db.batteries.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error("Аккумулятор не найден");
    }

    const battery = db.batteries[index];
    if (db.rentals.some((r) => r.batteryIds?.includes(id)) || db.repairs.some((r) => r.batteryId === id) || db.retailOrders.some((order) => order.items.some((item) => item.itemType === "BATTERY" && item.itemId === id))) throw new Error("АКБ используется в договорах, заказ-нарядах или чеках. Сохраните карточку для истории");
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
    saveDb();
    return removed;
  }

  static attachToBike(batteryId: string, bikeId: string) {
    const db = getDb();
    const bike = db.bikes.find((b) => b.id === bikeId);
    if (!bike) throw new Error("Электровелосипед не найден");
    if (["SOLD", "BOUGHT_OUT", "DECOMMISSIONED"].includes(bike.status)) throw new Error("Нельзя установить АКБ на технику, выбывшую из парка");

    const newBattery = db.batteries.find((b) => b.id === batteryId);
    if (!newBattery) throw new Error("Аккумулятор не найден");

    if (newBattery.status === "DECOMMISSIONED" || newBattery.status === "SOLD" || newBattery.status === "IN_MAINTENANCE") {
      throw new Error(`Невозможно установить списанный или проданный АКБ (${newBattery.status})`);
    }
    const sourceRental = activeRentalForBattery(batteryId);
    const targetRental = activeRentalForBike(bikeId);
    if (sourceRental && sourceRental.id !== targetRental?.id) throw new Error("АКБ закреплён за другим действующим договором");
    const oldBatteryId = bike.batteryId;

    // 1. If bike already had a battery, detach the old battery
    if (bike.batteryId && bike.batteryId !== batteryId) {
      const oldBattery = db.batteries.find((b) => b.id === bike.batteryId);
      if (oldBattery) {
        oldBattery.installedBikeId = null;
        oldBattery.status = "AVAILABLE";
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
    newBattery.issuedBikeId = null;
    newBattery.updatedAt = new Date().toISOString();

    bike.batteryId = newBattery.id;
    bike.updatedAt = new Date().toISOString();
    if (targetRental) {
      targetRental.batteryIds = [...new Set([...(targetRental.batteryIds || []).filter((id) => id !== oldBatteryId), newBattery.id])];
      targetRental.updatedAt = new Date().toISOString();
    }

    saveDb();
    return {
      battery: this.getById(newBattery.id),
      bike: {
        ...bike,
        battery: newBattery,
      },
    };
  }

  static returnToWarehouse(batteryId: string) {
    const db = getDb();
    const battery = db.batteries.find((b) => b.id === batteryId);
    if (!battery) throw new Error("Аккумулятор не найден");
    if (battery.status === "SOLD" || battery.status === "DECOMMISSIONED") throw new Error("АКБ выбыл из парка и не может быть возвращён на склад");

    const now = new Date().toISOString();

    // 1. If installed on a bike
    if (battery.installedBikeId) {
      const bike = db.bikes.find((b) => b.id === battery.installedBikeId);
      if (bike) {
        bike.batteryId = null;
        bike.updatedAt = now;
      }
      battery.installedBikeId = null;
    }

    // 2. If recorded as bike.batteryId directly
    const bikeHolding = db.bikes.find((b) => b.batteryId === batteryId);
    if (bikeHolding) {
      bikeHolding.batteryId = null;
      bikeHolding.updatedAt = now;
    }

    // 3. If issued as spare or included in active rentals
    const activeRentals = db.rentals.filter((r) => r.status === "ACTIVE" || r.status === "OVERDUE");
    for (const r of activeRentals) {
      if (r.batteryIds && r.batteryIds.includes(batteryId)) {
        r.batteryIds = r.batteryIds.filter((id) => id !== batteryId);
        r.updatedAt = now;
      }
    }

    battery.status = "AVAILABLE";
    battery.issuedBikeId = null;
    battery.installedBikeId = null;
    battery.updatedAt = now;

    saveDb();
    return {
      success: true,
      message: `АКБ ${battery.serialNumber} возвращен на склад`,
      battery: this.getById(battery.id),
    };
  }

  static detachFromBike(bikeId: string) {
    const db = getDb();
    const bike = db.bikes.find((b) => b.id === bikeId);
    if (!bike) throw new Error("Электровелосипед не найден");
    if (["SOLD", "BOUGHT_OUT", "DECOMMISSIONED"].includes(bike.status)) throw new Error("Техника выбыла из парка");

    const now = new Date().toISOString();
    let detachedBattery: BatteryRecord | null = null;
    const targetBatteryId = bike.batteryId;

    if (targetBatteryId) {
      const battery = db.batteries.find((b) => b.id === targetBatteryId);
      if (battery) {
        battery.installedBikeId = null;
        battery.issuedBikeId = null;
        battery.status = "AVAILABLE";
        battery.updatedAt = now;
        detachedBattery = battery;
      }
      bike.batteryId = null;
      bike.updatedAt = now;
    } else {
      // Check if any battery points to this bike
      const orphanBattery = db.batteries.find((b) => b.installedBikeId === bikeId);
      if (orphanBattery) {
        orphanBattery.installedBikeId = null;
        orphanBattery.issuedBikeId = null;
        orphanBattery.status = "AVAILABLE";
        orphanBattery.updatedAt = now;
        detachedBattery = orphanBattery;
      }
    }

    // If bike was in active rental, keep rental's batteryIds updated
    if (detachedBattery) {
      const activeRentals = db.rentals.filter((r) => r.status === "ACTIVE" || r.status === "OVERDUE");
      const rental = activeRentals.find((r) => r.bikeId === bikeId);
      if (rental && rental.batteryIds) {
        rental.batteryIds = rental.batteryIds.filter((id) => id !== detachedBattery!.id);
        rental.updatedAt = now;
      }
    }

    saveDb();
    return {
      bike: {
        ...bike,
        battery: null,
      },
      battery: detachedBattery ? this.getById(detachedBattery.id) : null,
    };
  }

  static swapBatteryGeneral({
    oldBatteryId,
    newBatteryId,
    sendOldToCharging = false,
  }: {
    oldBatteryId: string;
    newBatteryId: string;
    sendOldToCharging?: boolean;
  }) {
    const db = getDb();
    const oldBat = db.batteries.find((b) => b.id === oldBatteryId);
    if (!oldBat) throw new Error("Текущий аккумулятор не найден");
    if (["SOLD", "DECOMMISSIONED"].includes(oldBat.status)) throw new Error("Текущий АКБ выбыл из парка");

    const newBat = db.batteries.find((b) => b.id === newBatteryId);
    if (!newBat) throw new Error("Новый аккумулятор не найден");
    if (oldBat.id === newBat.id) throw new Error("Для замены выберите другой аккумулятор");
    if (newBat.installedBikeId || newBat.issuedBikeId || activeRentalForBattery(newBat.id)) throw new Error("Новый АКБ уже закреплён за техникой или договором");

    if (newBat.status !== "AVAILABLE") {
      throw new Error(`Выбранный аккумулятор ${newBat.serialNumber} недоступен (статус: ${newBat.status})`);
    }

    const now = new Date().toISOString();

    // Check active rentals
    const activeRentals = db.rentals.filter((r) => r.status === "ACTIVE" || r.status === "OVERDUE");
    const rental = activeRentals.find(
      (r) =>
        (r.batteryIds && r.batteryIds.includes(oldBat.id)) ||
        (oldBat.installedBikeId && r.bikeId === oldBat.installedBikeId) ||
        (oldBat.issuedBikeId && r.bikeId === oldBat.issuedBikeId)
    );

    if (oldBat.status === "ISSUED_SPARE" || (!oldBat.installedBikeId && rental)) {
      // Spare battery replacement
      newBat.status = "ISSUED_SPARE";
      newBat.issuedBikeId = oldBat.issuedBikeId || (rental ? rental.bikeId : null);
      newBat.installedBikeId = null;
      newBat.updatedAt = now;

      if (rental) {
        if (!rental.batteryIds) rental.batteryIds = [];
        rental.batteryIds = rental.batteryIds.map((id) => (id === oldBat.id ? newBat.id : id));
        if (!rental.batteryIds.includes(newBat.id)) {
          rental.batteryIds.push(newBat.id);
        }
        rental.updatedAt = now;
      }

      oldBat.status = sendOldToCharging ? "IN_MAINTENANCE" : "AVAILABLE";
      oldBat.issuedBikeId = null;
      oldBat.installedBikeId = null;
      oldBat.updatedAt = now;
    } else if (oldBat.installedBikeId) {
      // Bike-installed battery replacement
      const bike = db.bikes.find((b) => b.id === oldBat.installedBikeId);
      if (bike) {
        bike.batteryId = newBat.id;
        bike.updatedAt = now;
      }

      newBat.status = "INSTALLED";
      newBat.installedBikeId = oldBat.installedBikeId;
      newBat.issuedBikeId = null;
      newBat.updatedAt = now;

      if (rental) {
        if (!rental.batteryIds) rental.batteryIds = [];
        rental.batteryIds = rental.batteryIds.map((id) => (id === oldBat.id ? newBat.id : id));
        if (!rental.batteryIds.includes(newBat.id)) {
          rental.batteryIds.push(newBat.id);
        }
        rental.updatedAt = now;
      }

      oldBat.status = sendOldToCharging ? "IN_MAINTENANCE" : "AVAILABLE";
      oldBat.installedBikeId = null;
      oldBat.issuedBikeId = null;
      oldBat.updatedAt = now;
    } else {
      // Default replacement
      newBat.status = "AVAILABLE";
      newBat.updatedAt = now;
      oldBat.status = sendOldToCharging ? "IN_MAINTENANCE" : "AVAILABLE";
      oldBat.updatedAt = now;
    }

    saveDb();
    return {
      success: true,
      message: `Замена АКБ выполнена: ${oldBat.serialNumber} ➔ ${newBat.serialNumber}`,
      oldBattery: this.getById(oldBat.id),
      newBattery: this.getById(newBat.id),
    };
  }

  static swapBattery(bikeId: string, newBatteryId: string) {
    return this.attachToBike(newBatteryId, bikeId);
  }
}
