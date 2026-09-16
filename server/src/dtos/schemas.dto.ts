import { z } from "zod";

export const LoginDto = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().optional(),
});

export const BikeCreateDto = z.object({
  inventoryNumber: z.string().min(2, "Инвентарный номер обязателен"),
  modelId: z.string().min(1, "Модель байка обязательна"),
  frameNumber: z.string().optional(),
  motorNumber: z.string().optional(),
  status: z.enum(["AVAILABLE", "RENTED", "IN_MAINTENANCE", "FOR_SALE", "DECOMMISSIONED"]).optional(),
  currentLocation: z.string().optional(),
  mileageKm: z.number().min(0).optional(),
  note: z.string().optional(),
});

export const BikeUpdateDto = z.object({
  inventoryNumber: z.string().optional(),
  modelId: z.string().optional(),
  frameNumber: z.string().optional(),
  motorNumber: z.string().optional(),
  status: z.enum(["AVAILABLE", "RENTED", "IN_MAINTENANCE", "FOR_SALE", "DECOMMISSIONED"]).optional(),
  currentLocation: z.string().optional(),
  mileageKm: z.number().min(0).optional(),
  note: z.string().optional(),
});

export const ClientCreateDto = z.object({
  fullName: z.string().min(3, "ФИО обязательно"),
  phone: z.string().min(10, "Телефон обязателен"),
  telegram: z.string().optional(),
  passportSerial: z.string().optional(),
  passportNumber: z.string().optional(),
  citizenship: z.string().optional().default("РФ"),
  migrationCard: z.string().optional(),
  patentNumber: z.string().optional(),
  courierService: z.string().optional(),
  documentPhotoUrls: z.array(z.string()).optional(),
  status: z.enum(["NORMAL", "VIP", "PROBLEM", "BLACKLIST"]).optional(),
});

export const ClientUpdateDto = z.object({
  fullName: z.string().optional(),
  phone: z.string().optional(),
  telegram: z.string().optional(),
  passportSerial: z.string().optional(),
  passportNumber: z.string().optional(),
  citizenship: z.string().optional(),
  migrationCard: z.string().optional(),
  patentNumber: z.string().optional(),
  courierService: z.string().optional(),
  documentPhotoUrls: z.array(z.string()).optional(),
  status: z.enum(["NORMAL", "VIP", "PROBLEM", "BLACKLIST"]).optional(),
  blackListReason: z.string().optional().nullable(),
});

export const RentalCreateDto = z.object({
  clientId: z.string().min(1, "Курьер обязателен"),
  bikeId: z.string().min(1, "Байк обязателен"),
  tariffId: z.string().min(1, "Тариф обязателен"),
  managerId: z.string().optional().default("usr-mgr-1"),
  outfitIds: z.array(z.string()).optional().default([]),
  paymentMethod: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).default("CASH"),
  customDeposit: z.number().optional(),
  notes: z.string().optional(),
});

export const RentalRenewDto = z.object({
  durationDays: z.number().positive().optional(),
  amount: z.number().positive().optional(),
  method: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).default("CASH"),
  notes: z.string().optional(),
});

export const RentalCloseDto = z.object({
  bikeCondition: z.enum(["OK", "NEEDS_REPAIR"]).default("OK"),
  bikeMileageKm: z.number().optional(),
  defectDescription: z.string().optional(),
  faultType: z.enum(["COMPANY_EXPENSE", "CLIENT_FAULT"]).optional(),
  outfitReturns: z
    .array(
      z.object({
        outfitId: z.string(),
        condition: z.enum(["OK", "DAMAGED", "LOST"]),
        deductionAmount: z.number().optional(),
      })
    )
    .default([]),
  refundMethod: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).default("CASH"),
  notes: z.string().optional(),
});

export const OutfitCreateDto = z.object({
  name: z.string().min(2, "Наименование экипировки обязательно"),
  category: z.string().min(1, "Категория экипировки обязательна"),
  inventoryNumber: z.string().optional(),
  depositValue: z.number().min(0, "Залоговая стоимость >= 0"),
  status: z.enum(["IN_STOCK", "ISSUED", "DAMAGED", "LOST"]).optional(),
});

export const RepairCreateDto = z.object({
  bikeId: z.string().min(1, "Байк обязателен"),
  mechanicId: z.string().optional(),
  faultType: z.enum(["COMPANY_EXPENSE", "CLIENT_FAULT"]).default("COMPANY_EXPENSE"),
  description: z.string().min(5, "Описание дефекта обязательно"),
  laborCost: z.number().min(0).optional().default(0),
  parts: z
    .array(
      z.object({
        partId: z.string(),
        quantity: z.number().positive(),
      })
    )
    .optional(),
});

export const RepairCompleteDto = z.object({
  laborCost: z.number().min(0).optional(),
  partsUsed: z
    .array(
      z.object({
        partId: z.string(),
        quantity: z.number().positive(),
      })
    )
    .optional(),
  paymentMethod: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).optional(),
  mechanicNotes: z.string().optional(),
});

export const PartCreateDto = z.object({
  name: z.string().min(2, "Название запчасти обязательно"),
  sku: z.string().min(2, "Артикул (SKU) обязателен"),
  quantity: z.number().min(0),
  minQuantity: z.number().min(0).optional().default(3),
  purchasePrice: z.number().min(0),
  clientPrice: z.number().min(0),
});

export const PartRestockDto = z.object({
  quantity: z.number().positive("Количество должно быть больше 0"),
});

export const PaymentCreateDto = z.object({
  rentalId: z.string().optional(),
  type: z.enum(["RENTAL", "DEPOSIT", "DEPOSIT_REFUND", "REPAIR", "OUTFIT_SALE", "FINE"]),
  amount: z.number().positive("Сумма должна быть положительной"),
  method: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).default("CASH"),
  description: z.string().optional(),
});

export const ReviewCreateDto = z.object({
  clientId: z.string().min(1, "Курьер обязателен"),
  bikeId: z.string().min(1, "Байк обязателен"),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export const ArticleCreateDto = z.object({
  title: z.string().min(3, "Заголовок статьи обязателен"),
  category: z.string().min(2, "Категория обязательна"),
  content: z.string().min(10, "Содержимое статьи обязательно"),
  authorId: z.string().optional(),
});
