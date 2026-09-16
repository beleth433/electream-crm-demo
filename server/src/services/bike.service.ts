import { BikeRepository } from "../repositories/bike.repository.js";
import { BikeStatus } from "../repositories/db.js";

export class BikeService {
  static getAllBikes(filters?: { status?: BikeStatus; modelId?: string; search?: string }) {
    return BikeRepository.getAll(filters);
  }

  static getBikeById(id: string) {
    const bike = BikeRepository.getById(id);
    if (!bike) {
      throw new Error(`Байк с ID ${id} не найден`);
    }
    return bike;
  }

  static getModels() {
    return BikeRepository.getModels();
  }

  static createModel(data: {
    name: string;
    powerWatts: number;
    batteryCapacityAh: number;
    wheelSizeInch?: number | null;
    winterVersion: boolean;
    description?: string | null;
  }) {
    return BikeRepository.createModel(data);
  }

  static updateModel(id: string, data: any) {
    return BikeRepository.updateModel(id, data);
  }

  static deleteModel(id: string) {
    return BikeRepository.deleteModel(id);
  }

  static createBike(data: {
    inventoryNumber: string;
    modelId: string;
    frameNumber?: string;
    motorNumber?: string;
    status?: BikeStatus;
    currentLocation?: string;
    mileageKm?: number;
    note?: string;
  }) {
    return BikeRepository.create(data);
  }

  static updateBike(id: string, data: any) {
    const bike = BikeRepository.update(id, data);
    if (!bike) {
      throw new Error(`Байк с ID ${id} не найден`);
    }
    return bike;
  }

  static changeStatus(id: string, status: BikeStatus, location?: string) {
    const bike = BikeRepository.updateStatus(id, status, location);
    if (!bike) {
      throw new Error(`Байк с ID ${id} не найден`);
    }
    return bike;
  }

  static deleteBike(id: string) {
    return BikeRepository.delete(id);
  }
}

