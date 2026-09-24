import { getDb, BikeStatus, BikeRecord } from "./db.js";

export class BikeRepository {
  static getAll(filters?: { status?: BikeStatus; modelId?: string; search?: string }) {
    const db = getDb();
    let list = db.bikes.map((bike) => {
      const model = db.models.find((m) => m.id === bike.modelId);
      const battery = bike.batteryId ? db.batteries.find((bt) => bt.id === bike.batteryId) : null;
      const activeRental = db.rentals.find(
        (r) => r.bikeId === bike.id && (r.status === "ACTIVE" || r.status === "OVERDUE")
      );
      const client = activeRental ? db.clients.find((c) => c.id === activeRental.clientId) : null;

      return {
        ...bike,
        model,
        battery: battery
          ? {
              id: battery.id,
              serialNumber: battery.serialNumber,
              voltage: battery.voltage,
              capacityAh: battery.capacityAh,
              status: battery.status,
            }
          : null,
        activeRental: activeRental
          ? {
              id: activeRental.id,
              rentalNumber: activeRental.rentalNumber,
              status: activeRental.status,
              expiresAt: activeRental.expiresAt,
              clientName: client?.fullName,
              clientPhone: client?.phone,
            }
          : null,
      };
    });

    if (filters?.status) {
      list = list.filter((b) => b.status === filters.status);
    }
    if (filters?.modelId) {
      list = list.filter((b) => b.modelId === filters.modelId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (b) =>
          b.inventoryNumber.toLowerCase().includes(q) ||
          b.frameNumber?.toLowerCase().includes(q) ||
          b.motorNumber?.toLowerCase().includes(q) ||
          b.model?.name.toLowerCase().includes(q) ||
          b.battery?.serialNumber.toLowerCase().includes(q) ||
          b.currentLocation.toLowerCase().includes(q)
      );
    }

    return list;
  }

  static getById(id: string) {
    const db = getDb();
    const bike = db.bikes.find((b) => b.id === id);
    if (!bike) return null;

    const model = db.models.find((m) => m.id === bike.modelId);
    const battery = bike.batteryId ? db.batteries.find((bt) => bt.id === bike.batteryId) : null;
    const rentals = db.rentals
      .filter((r) => r.bikeId === bike.id)
      .map((r) => {
        const client = db.clients.find((c) => c.id === r.clientId);
        return { ...r, client };
      });
    const repairs = db.repairs
      .filter((rp) => rp.bikeId === bike.id)
      .map((rp) => {
        const mechanic = db.users.find((u) => u.id === rp.mechanicId);
        return { ...rp, mechanic };
      });
    const reviews = db.reviews
      .filter((rv) => rv.bikeId === bike.id)
      .map((rv) => {
        const client = db.clients.find((c) => c.id === rv.clientId);
        return { ...rv, client };
      });

    return {
      ...bike,
      model,
      battery,
      rentals,
      repairs,
      reviews,
    };
  }

  static getModels() {
    const db = getDb();
    return db.models.map((m) => {
      const bikesCount = db.bikes.filter((b) => b.modelId === m.id).length;
      return {
        ...m,
        baseRentalPrice: m.baseRentalPrice !== undefined && m.baseRentalPrice > 0 ? m.baseRentalPrice : 6000,
        baseBuyoutPrice: m.baseBuyoutPrice !== undefined && m.baseBuyoutPrice > 0 ? m.baseBuyoutPrice : (m.salePrice || 60000),
        bikesCount,
      };
    });
  }

  static createModel(data: {
    name: string;
    powerWatts: number;
    wheelSizeInch?: number | null;
    description?: string | null;
    purchasePrice?: number;
    salePrice?: number;
    baseRentalPrice?: number;
    baseBuyoutPrice?: number;
  }) {
    const db = getDb();
    if (!data.name || !data.name.trim()) {
      throw new Error("Название модели обязательно для заполнения");
    }
    const newModel = {
      id: `mdl-${Date.now()}`,
      name: data.name.trim(),
      powerWatts: Number(data.powerWatts) || 500,
      wheelSizeInch: data.wheelSizeInch ? Number(data.wheelSizeInch) : 16.0,
      description: data.description || null,
      purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : undefined,
      salePrice: data.salePrice !== undefined ? Number(data.salePrice) : undefined,
      baseRentalPrice: data.baseRentalPrice !== undefined ? Number(data.baseRentalPrice) : undefined,
      baseBuyoutPrice: data.baseBuyoutPrice !== undefined ? Number(data.baseBuyoutPrice) : undefined,
    };
    db.models.push(newModel);
    return {
      ...newModel,
      bikesCount: 0,
    };
  }

  static updateModel(
    id: string,
    data: {
      name?: string;
      powerWatts?: number;
      wheelSizeInch?: number | null;
      description?: string | null;
      purchasePrice?: number;
      salePrice?: number;
      baseRentalPrice?: number;
      baseBuyoutPrice?: number;
    }
  ) {
    const db = getDb();
    const model = db.models.find((m) => m.id === id);
    if (!model) {
      throw new Error("Шаблон модели не найден");
    }
    if (data.name !== undefined) model.name = data.name.trim();
    if (data.powerWatts !== undefined) model.powerWatts = Number(data.powerWatts);
    if (data.wheelSizeInch !== undefined) model.wheelSizeInch = data.wheelSizeInch ? Number(data.wheelSizeInch) : null;
    if (data.description !== undefined) model.description = data.description;
    if (data.purchasePrice !== undefined) model.purchasePrice = Number(data.purchasePrice);
    if (data.salePrice !== undefined) model.salePrice = Number(data.salePrice);
    if (data.baseRentalPrice !== undefined) model.baseRentalPrice = Number(data.baseRentalPrice);
    if (data.baseBuyoutPrice !== undefined) model.baseBuyoutPrice = Number(data.baseBuyoutPrice);

    const bikesCount = db.bikes.filter((b) => b.modelId === model.id).length;
    return {
      ...model,
      bikesCount,
    };
  }

  static deleteModel(id: string) {
    const db = getDb();
    const index = db.models.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error("Шаблон модели не найден");
    }

    const bikesWithModel = db.bikes.filter((b) => b.modelId === id);
    if (bikesWithModel.length > 0) {
      throw new Error(
        `Невозможно удалить шаблон "${db.models[index].name}": в парке зарегистрировано ${bikesWithModel.length} байков этой модели (${bikesWithModel.map((b) => b.inventoryNumber).join(', ')})`
      );
    }

    const removed = db.models.splice(index, 1)[0];
    return removed;
  }

  static create(data: {
    inventoryNumber: string;
    modelId: string;
    batteryId?: string | null;
    frameNumber?: string;
    motorNumber?: string;
    status?: BikeStatus;
    currentLocation?: string;
    mileageKm?: number;
    note?: string;
    purchasePrice?: number;
    salePrice?: number;
  }) {
    const db = getDb();
    if (db.bikes.some((b) => b.inventoryNumber.toLowerCase() === data.inventoryNumber.toLowerCase())) {
      throw new Error(`Байк с инвентарным номером ${data.inventoryNumber} уже существует`);
    }

    const model = db.models.find((m) => m.id === data.modelId);
    const purchasePrice =
      data.purchasePrice !== undefined ? Number(data.purchasePrice) : (model?.purchasePrice ?? 0);
    const salePrice =
      data.salePrice !== undefined ? Number(data.salePrice) : (model?.salePrice ?? 0);

    const newBike = {
      id: `bike-${Date.now()}`,
      inventoryNumber: data.inventoryNumber,
      modelId: data.modelId,
      batteryId: data.batteryId || null,
      frameNumber: data.frameNumber || null,
      motorNumber: data.motorNumber || null,
      status: data.status || ("AVAILABLE" as BikeStatus),
      currentLocation: data.currentLocation || "Центральная база (м. Дмитровская)",
      mileageKm: data.mileageKm || 0,
      note: data.note || null,
      purchasePrice,
      salePrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.bikes.push(newBike);

    // If battery was selected, link it
    if (newBike.batteryId) {
      const battery = db.batteries.find((b) => b.id === newBike.batteryId);
      if (battery) {
        battery.installedBikeId = newBike.id;
        battery.status = "INSTALLED";
        battery.updatedAt = new Date().toISOString();
      }
    }

    return this.getById(newBike.id);
  }

  static update(id: string, data: Partial<BikeRecord>) {
    const db = getDb();
    const index = db.bikes.findIndex((b) => b.id === id);
    if (index === -1) return null;

    db.bikes[index] = {
      ...db.bikes[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return this.getById(id);
  }

  static updateStatus(id: string, status: BikeStatus, location?: string) {
    const db = getDb();
    const bike = db.bikes.find((b) => b.id === id);
    if (!bike) return null;

    bike.status = status;
    if (location) bike.currentLocation = location;
    bike.updatedAt = new Date().toISOString();
    return bike;
  }

  static delete(id: string) {
    const db = getDb();
    const index = db.bikes.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error("Электровелосипед не найден");
    }

    const activeRental = db.rentals.find(
      (r) => r.bikeId === id && (r.status === "ACTIVE" || r.status === "OVERDUE")
    );
    if (activeRental) {
      throw new Error(`Невозможно удалить байк, так как он находится в активной аренде (${activeRental.rentalNumber})`);
    }

    const removed = db.bikes.splice(index, 1)[0];

    // Detach any battery that was on this bike so it returns to AVAILABLE on base
    const attachedBattery = db.batteries.find(
      (b) => b.installedBikeId === id || (removed.batteryId && b.id === removed.batteryId)
    );
    if (attachedBattery) {
      attachedBattery.installedBikeId = null;
      attachedBattery.status = "AVAILABLE";
      attachedBattery.updatedAt = new Date().toISOString();
    }

    return removed;
  }
}

