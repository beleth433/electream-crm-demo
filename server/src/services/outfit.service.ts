import { OutfitRepository } from "../repositories/outfit.repository.js";
import { OutfitStatus, OutfitCategory } from "../repositories/db.js";

export class OutfitService {
  static getCategories() {
    return OutfitRepository.getCategories();
  }

  static createCategory(data: { name: string }) {
    return OutfitRepository.createCategory(data);
  }

  static deleteCategory(id: string) {
    return OutfitRepository.deleteCategory(id);
  }

  static getTemplates() {
    return OutfitRepository.getTemplates();
  }

  static createTemplate(data: {
    name: string;
    categoryId: string;
    defaultDeposit: number;
    description?: string;
  }) {
    return OutfitRepository.createTemplate(data);
  }

  static deleteTemplate(id: string) {
    return OutfitRepository.deleteTemplate(id);
  }

  static getAll(filters?: { category?: string; status?: OutfitStatus; search?: string }) {
    return OutfitRepository.getAll(filters);
  }

  static getAvailable() {
    return OutfitRepository.getAvailable();
  }

  static getById(id: string) {
    const outfit = OutfitRepository.getById(id);
    if (!outfit) {
      throw new Error(`Экипировка ${id} не найдена`);
    }
    return outfit;
  }

  static create(data: {
    name: string;
    category: string;
    inventoryNumber?: string;
    depositValue: number;
    status?: OutfitStatus;
  }) {
    return OutfitRepository.create(data);
  }

  static updateStatus(id: string, status: OutfitStatus) {
    const outfit = OutfitRepository.updateStatus(id, status);
    if (!outfit) {
      throw new Error(`Экипировка ${id} не найдена`);
    }
    return outfit;
  }

  static deleteOutfit(id: string) {
    return OutfitRepository.delete(id);
  }
}

