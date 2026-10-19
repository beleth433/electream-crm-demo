import { z } from "zod";

export const LoginDto = z.object({
  email: z.string().min(2, "Введите логин или email"),
  password: z.string().min(1, "Введите пароль для входа"),
});

export const BikeCreateDto = z.object({
  inventoryNumber: z.string().min(2, "Инвентарный номер обязателен"),
  modelId: z.string().min(1, "Модель байка обязательна"),
  batteryId: z.string().optional().nullable(),
  frameNumber: z.string().optional(),
  motorNumber: z.string().optional(),
  status: z.enum(["AVAILABLE", "RENTED", "IN_MAINTENANCE", "FOR_SALE", "DECOMMISSIONED"]).optional(),
  currentLocation: z.string().optional(),
  mileageKm: z.number().min(0).optional(),
  note: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
});

export const BikeUpdateDto = z.object({
  inventoryNumber: z.string().optional(),
  modelId: z.string().optional(),
  batteryId: z.string().optional().nullable(),
  frameNumber: z.string().optional(),
  motorNumber: z.string().optional(),
  status: z.enum(["AVAILABLE", "RENTED", "IN_MAINTENANCE", "FOR_SALE", "DECOMMISSIONED"]).optional(),
  currentLocation: z.string().optional(),
  mileageKm: z.number().min(0).optional(),
  note: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
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
  clientType: z.enum(["COURIER", "RETAIL"]).optional(),
  manualLoyaltyTierId: z.string().optional().nullable(),
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
  clientType: z.enum(["COURIER", "RETAIL"]).optional(),
  manualLoyaltyTierId: z.string().optional().nullable(),
  blackListReason: z.string().optional().nullable(),
});

export const TariffBuyoutBatterySchema = z.object({
  batteryModelId: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  price: z.number().min(0).default(0),
});

export const TariffCreateDto = z.object({
  name: z.string().min(2, "Название тарифа обязательно"),
  type: z.enum(["STANDARD", "RENT_TO_OWN"]).default("STANDARD"),
  durationDays: z.number().int().positive("Срок аренды должен быть больше 0 дней"),
  price: z.number().min(0, "Стоимость аренды должна быть >= 0"),
  depositRequired: z.number().min(0, "Сумма залога должна быть >= 0").default(0),
  isActive: z.boolean().optional().default(true),
  totalBuyoutPrice: z.number().min(0).optional(),
  paymentIntervalDays: z.number().int().positive().optional(),
  installmentPayment: z.number().min(0).optional(),
  bikeModelId: z.string().nullable().optional(),
  includedBatteries: z.array(TariffBuyoutBatterySchema).optional(),
});

export const TariffUpdateDto = TariffCreateDto.partial();

export const RentalCreateDto = z.object({
  clientId: z.string().min(1, "Клиент обязателен"),
  bikeId: z.string().min(1, "Байк обязателен"),
  tariffId: z.string().min(1, "Тариф обязателен"),
  managerId: z.string().optional(),
  outfitIds: z.array(z.string()).optional().default([]),
  batteryIds: z.array(z.string()).optional().default([]),
  paymentMethod: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).default("CASH"),
  rentalNumber: z.string().optional(),
  customDeposit: z.number().optional(),
  durationDays: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  totalBuyoutPrice: z.number().min(0).optional(),
  paymentIntervalDays: z.number().int().positive().optional(),
  installmentPayment: z.number().min(0).optional(),
  firstPaymentAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
  courierService: z.string().optional(),
  passportSerial: z.string().optional(),
  passportNumber: z.string().optional(),
  citizenship: z.string().optional(),
  patentNumber: z.string().optional(),
  telegram: z.string().optional(),
});

export const RentalRenewDto = z.object({
  durationDays: z.number().positive().optional(),
  amount: z.number().positive().optional(),
  method: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).default("CASH"),
  notes: z.string().optional(),
  isBuyoutFinal: z.boolean().optional(),
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
  purchasePrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  status: z.enum(["IN_STOCK", "ISSUED", "DAMAGED", "LOST"]).optional(),
});

export const RepairCreateDto = z.object({
  itemType: z.enum(["BIKE", "BATTERY", "EXTERNAL_DEVICE"]).optional().default("BIKE"),
  bikeId: z.string().optional().nullable(),
  batteryId: z.string().optional().nullable(),
  customItemName: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  mechanicId: z.string().optional(),
  orderNumber: z.string().optional(),
  faultType: z.enum(["COMPANY_EXPENSE", "CLIENT_FAULT"]).default("COMPANY_EXPENSE"),
  description: z.string().min(2, "Описание дефекта обязательно"),
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
  categoryId: z.string().optional(),
  quantity: z.number().min(0),
  minQuantity: z.number().min(0).optional().default(3),
  purchasePrice: z.number().min(0),
  clientPrice: z.number().min(0),
});

export const PartCategoryCreateDto = z.object({
  name: z.string().min(2, "Название категории обязательно"),
});

export const PartRestockDto = z.object({
  quantity: z.number().positive("Количество должно быть больше 0"),
});

export const PartOrderCreateDto = z.object({
  partName: z.string().min(2, "Укажите название запчасти"),
  partId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  quantity: z.number().min(1, "Количество должно быть от 1 шт."),
  orderUrl: z.string().optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "URGENT"]).optional().default("NORMAL"),
  estimatedPrice: z.number().min(0).optional(),
  note: z.string().optional().nullable(),
  requestedBy: z.string().optional().nullable(),
});

export const PartOrderUpdateDto = z.object({
  partName: z.string().min(2).optional(),
  partId: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  quantity: z.number().min(1).optional(),
  orderUrl: z.string().optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "URGENT"]).optional(),
  status: z.enum(["REQUESTED", "ORDERED", "RECEIVED", "ARCHIVED", "CANCELLED"]).optional(),
  estimatedPrice: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  note: z.string().optional().nullable(),
  requestedBy: z.string().optional().nullable(),
});

export const PartOrderStatusDto = z.object({
  status: z.enum(["REQUESTED", "ORDERED", "RECEIVED", "ARCHIVED", "CANCELLED"]),
  actualCost: z.number().min(0).optional(),
  paymentMethod: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).optional(),
  addToStock: z.boolean().optional(),
  createPartData: z
    .object({
      name: z.string().optional(),
      sku: z.string().optional(),
      categoryId: z.string().optional(),
      quantity: z.number().min(0).optional(),
      minQuantity: z.number().min(0).optional(),
      purchasePrice: z.number().min(0).optional(),
      clientPrice: z.number().min(0).optional(),
    })
    .optional(),
});

export const PaymentCreateDto = z.object({
  rentalId: z.string().optional(),
  orderId: z.string().optional().nullable(),
  type: z.enum(["RENTAL", "DEPOSIT", "DEPOSIT_REFUND", "REPAIR", "OUTFIT_SALE", "FINE", "SALARY_PAYMENT", "RETAIL_SALE", "BUYOUT", "PART_PURCHASE"]),
  amount: z.number().positive("Сумма должна быть положительной"),
  method: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).default("CASH"),
  description: z.string().optional(),
});

export const PaymentUpdateDto = z.object({
  rentalId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  type: z.enum(["RENTAL", "DEPOSIT", "DEPOSIT_REFUND", "REPAIR", "OUTFIT_SALE", "FINE", "SALARY_PAYMENT", "RETAIL_SALE", "BUYOUT", "PART_PURCHASE"]).optional(),
  amount: z.number().positive("Сумма должна быть положительной").optional(),
  method: z.enum(["CASH", "CARD", "SBP", "BANK_TRANSFER"]).optional(),
  description: z.string().optional().nullable(),
  createdAt: z.string().optional(),
});

export const ExpenseItemDto = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Название статьи обязательно"),
  amount: z.number().min(0, "Сумма не может быть отрицательной"),
});

export const PaymentDetailsDto = z.object({
  recipientName: z.string().optional(),
  bankName: z.string().optional(),
  phoneNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  bik: z.string().optional(),
  inn: z.string().optional(),
  paymentLinkUrl: z.string().optional(),
  instructionNote: z.string().optional(),
});

export const FinanceSettingsUpdateDto = z.object({
  monthlyFixedExpenses: z.number().min(0, "Сумма не может быть отрицательной").optional(),
  fixedExpensesDescription: z.string().optional(),
  fixedExpenseItems: z.array(ExpenseItemDto).optional(),
  paymentDetails: PaymentDetailsDto.optional(),
});



export const ReviewCreateDto = z.object({
  clientId: z.string().min(1, "Курьер обязателен"),
  bikeId: z.string().min(1, "Байк обязателен"),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export const ArticleCreateDto = z.object({
  title: z.string().min(2, "Заголовок статьи обязателен"),
  category: z.string().min(2, "Категория обязательна"),
  content: z.string().min(2, "Содержимое статьи обязательно"),
  authorId: z.string().optional(),
  pinned: z.boolean().optional().default(false),
});

export const ArticleUpdateDto = z.object({
  title: z.string().min(2).optional(),
  category: z.string().min(2).optional(),
  content: z.string().min(2).optional(),
  pinned: z.boolean().optional(),
});
