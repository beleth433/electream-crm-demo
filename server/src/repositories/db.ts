import fs from "fs";
import path from "path";
import { supabaseAdapter, StorageStatus } from "./supabase.adapter.js";
import {
  INITIAL_ACCESS_LEVELS,
  INITIAL_USERS,
  INITIAL_MODELS,
  INITIAL_BATTERY_MODELS,
  INITIAL_BIKES,
  INITIAL_BATTERIES,
  INITIAL_OUTFITS,
  INITIAL_OUTFIT_CATEGORIES,
  INITIAL_OUTFIT_TEMPLATES,
  INITIAL_PART_CATEGORIES,
  INITIAL_PART_ORDER_CATEGORIES,
  INITIAL_CLIENTS,
  INITIAL_TARIFFS,
  INITIAL_PARTS,
  INITIAL_RENTALS,
  INITIAL_REPAIRS,
  INITIAL_PAYMENTS,
  INITIAL_REVIEWS,
  INITIAL_ARTICLES,
  INITIAL_EMPLOYEES,
  INITIAL_RETAIL_ORDERS,
  INITIAL_LOYALTY_TIERS,
} from "../data/initialData.js";

export type UserRole = "ADMIN" | "MANAGER" | "MECHANIC";
export type BikeStatus = "AVAILABLE" | "RENTED" | "IN_MAINTENANCE" | "FOR_SALE" | "DECOMMISSIONED" | "SOLD" | "BOUGHT_OUT";
export type BatteryStatus =
  | "AVAILABLE"       // Свободен на складе базы
  | "INSTALLED"       // Установлен в электровелосипед
  | "ISSUED_SPARE"    // Выдан курьеру как дополнительный АКБ
  | "IN_MAINTENANCE"  // На диагностике / ремонте BMS / балансировке ячеек
  | "DECOMMISSIONED"  // Списан / утилизирован
  | "SOLD";           // Продан через магазин
export type RentalStatus = "DRAFT" | "RESERVED" | "ACTIVE" | "OVERDUE" | "CLOSED" | "PROBLEM" | "BOUGHT_OUT";
export type RentalType = "STANDARD" | "RENT_TO_OWN";
export type ClientStatus = "NORMAL" | "VIP" | "PROBLEM" | "BLACKLIST";
export type ClientType = "COURIER" | "RETAIL";

export interface LoyaltyTierRecord {
  id: string;
  name: string;
  color: string;
  minRentalDays: number;
  minTotalSpent: number;
  discountRentalPercent: number;
  discountPartsPercent: number;
  discountRepairsPercent: number;
  description?: string;
  isDefault?: boolean;
}
export type OutfitCategory = "HELMET" | "LOCK" | "BAG" | "BATTERY" | "CHARGER" | "PHONE_HOLDER" | "WINTER_GLOVES";
export type OutfitStatus = "IN_STOCK" | "ISSUED" | "DAMAGED" | "LOST" | "SOLD";
export type RepairStatus = "DIAGNOSTICS" | "WAITING_PARTS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type RepairFaultType = "COMPANY_EXPENSE" | "CLIENT_FAULT";
export type PaymentType = "RENTAL" | "DEPOSIT" | "DEPOSIT_REFUND" | "REPAIR" | "OUTFIT_SALE" | "FINE" | "SALARY_PAYMENT" | "RETAIL_SALE" | "BUYOUT" | "PART_PURCHASE";
export type PaymentMethod = "CASH" | "CARD" | "SBP" | "BANK_TRANSFER";
export type BatteryChemistry = "Li-ion" | "LiFePO4";

export interface ExpenseItemRecord {
  id?: string;
  name: string;
  amount: number;
}


export interface PaymentDetailsRecord {
  recipientName?: string;       // ФИО или ИП владельца (например, "ИП Ковалев И.В.")
  bankName?: string;            // Наименование банка (например, "Т-Банк", "Сбербанк")
  phoneNumber?: string;         // Телефон для СБП (например, "+7 999 123-45-67")
  accountNumber?: string;       // Расчетный счет или номер карты
  bik?: string;                 // БИК банка (для платежей по реквизитам)
  inn?: string;                 // ИНН получателя
  paymentLinkUrl?: string;      // Персональная ссылка для оплаты (сбор Т-Банк, Сбер, эквайринг)
  instructionNote?: string;     // Краткая памятка для курьера ("В назначении платежа обязательно пишите номер договора")
}

export interface SystemSettingsRecord {
  monthlyFixedExpenses: number;
  fixedExpensesDescription?: string;
  fixedExpenseItems?: ExpenseItemRecord[];
  articlesInitialized?: boolean;
  paymentDetails?: PaymentDetailsRecord;
  authSigningKey?: string;
}


export interface BatteryModelRecord {
  id: string;
  name: string;
  voltage: number;
  capacityAh: number;
  chemistry?: BatteryChemistry;
  description?: string | null;
  purchasePrice?: number;
  salePrice?: number;
}

export interface BatteryRecord {
  id: string;
  serialNumber: string;       // e.g. BAT-60V-001
  modelId?: string | null;
  modelName?: string | null;
  voltage: number;
  capacityAh: number;
  chemistry?: BatteryChemistry;
  cycleCount?: number;
  healthPercent?: number;
  status: BatteryStatus;
  installedBikeId?: string | null; // Привязка к байку (установлен)
  issuedBikeId?: string | null;    // Привязка к байку (доп. АКБ у курьера)
  notes?: string | null;
  purchasePrice?: number;
  salePrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccessLevelModulePermission {
  visible: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AccessLevelRecord {
  id: string;
  name: string;
  description?: string;
  isSystem?: boolean;
  canManageEmployees: boolean;
  canSeeProfits: boolean;
  permissions: Record<string, AccessLevelModulePermission>;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
  id: string;
  login?: string;
  username?: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  roleTitle?: string;
  accessLevelId?: string;
  isActive: boolean;
  lastLoginAt?: string;
  employeeId?: string | null;
}

export interface BikeModelRecord {
  id: string;
  name: string;
  powerWatts: number;
  wheelSizeInch?: number | null;
  description?: string | null;
  purchasePrice?: number;
  salePrice?: number;
  baseRentalPrice?: number;
  baseBuyoutPrice?: number;
}

export interface BikeRecord {
  photos?: BikePhoto[];
  id: string;
  inventoryNumber: string;
  modelId: string;
  batteryId?: string | null;
  frameNumber?: string | null;
  motorNumber?: string | null;
  status: BikeStatus;
  currentLocation: string;
  mileageKm: number;
  note?: string | null;
  purchasePrice?: number;
  salePrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BikePhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface OutfitCategoryRecord {
  id: string;
  name: string;
  isSystem?: boolean;
}

export interface OutfitTemplateRecord {
  id: string;
  name: string;
  categoryId: string;
  defaultDeposit: number;
  description?: string | null;
  purchasePrice?: number;
  salePrice?: number;
}

export interface OutfitRecord {
  id: string;
  name: string;
  category: string;
  inventoryNumber?: string | null;
  depositValue: number;
  status: OutfitStatus;
  purchasePrice?: number;
  salePrice?: number;
}

export interface ClientRecord {
  registrationAddress?: string | null;
  id: string;
  fullName: string;
  phone: string;
  telegram?: string | null;
  passportSerial?: string | null;
  passportNumber?: string | null;
  citizenship: string;
  migrationCard?: string | null;
  patentNumber?: string | null;
  courierService?: string | null;
  documentPhotoUrls: string[];
  status: ClientStatus;
  clientType?: ClientType;
  manualLoyaltyTierId?: string | null;
  blackListReason?: string | null;
  createdAt?: string;
}

export interface TariffBuyoutBatteryItem {
  batteryModelId: string;
  quantity: number;
  price: number;
}

export interface TariffRecord {
  id: string;
  name: string;
  type: RentalType;
  durationDays: number;
  price: number;
  depositRequired: number;
  isActive: boolean;
  totalBuyoutPrice?: number;
  paymentIntervalDays?: number;
  installmentPayment?: number;
  bikeModelId?: string | null;
  includedBatteries?: TariffBuyoutBatteryItem[];
}

export interface PartCategoryRecord {
  id: string;
  name: string;
  isSystem?: boolean;
}

export interface PartRecord {
  id: string;
  name: string;
  sku: string;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  minQuantity: number;
  purchasePrice: number;
  clientPrice: number;
}

export type PartOrderStatus = "REQUESTED" | "ORDERED" | "RECEIVED" | "ARCHIVED" | "CANCELLED";
export type PartOrderPriority = "LOW" | "NORMAL" | "URGENT";

export interface PartOrderRecord {
  id: string;
  partName: string;
  partId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  quantity: number;
  orderUrl?: string | null;
  priority: PartOrderPriority;
  status: PartOrderStatus;
  estimatedPrice?: number;
  actualCost?: number;
  note?: string | null;
  requestedBy?: string;
  requestedAt: string;
  orderedAt?: string | null;
  receivedAt?: string | null;
  paymentId?: string | null;
  paymentMethod?: PaymentMethod | null;
}

export interface RentalRecord {
  id: string;
  rentalNumber: string;
  clientId: string;
  bikeId: string;
  tariffId: string;
  managerId: string;
  status: RentalStatus;
  type: RentalType;
  startedAt: string;
  expiresAt: string;
  nextPaymentDue: string;
  depositAmount: number;
  depositRefunded: boolean;
  notes?: string | null;
  outfitIds: string[];
  batteryIds?: string[];
  closedAt?: string | null;
  totalBuyoutPrice?: number;
  paymentIntervalDays?: number;
  installmentPayment?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RepairOrderRecord {
  id: string;
  orderNumber: string;
  itemType?: "BIKE" | "BATTERY" | "EXTERNAL_DEVICE";
  bikeId?: string | null;
  batteryId?: string | null;
  customItemName?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientId?: string | null;
  mechanicId: string;
  status: RepairStatus;
  faultType: RepairFaultType;
  description: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  createdAt: string;
  completedAt?: string | null;
  parts: Array<{
    partId: string;
    quantity: number;
    priceCharged: number;
    purchasePrice?: number;
  }>;
}

export interface PaymentRecord {
  id: string;
  rentalId?: string | null;
  employeeId?: string | null;
  orderId?: string | null;
  clientId?: string | null;
  repairOrderId?: string | null;
  cashierId?: string | null;
  externalReference?: string | null;
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  description?: string | null;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  clientId: string;
  bikeId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface ArticleRecord {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId?: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuditLogRecord {
  id: string;
  category: "RENTAL" | "PAYMENT" | "REPAIR" | "FLEET" | "CLIENT" | "INFO" | "SYSTEM";
  action: string;
  title: string;
  details?: string;
  actorId?: string;
  actorName?: string;
  amount?: number;
  badgeText?: string;
  badgeColor?: string;
  entityId?: string;
  createdAt: string;
}

export interface EmployeeRecord {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: string;
  salaryType: "MONTHLY" | "PER_SHIFT" | "PIECEWORK";
  salaryAmount: number;
  status: "ACTIVE" | "ON_LEAVE" | "DISMISSED";
  hiredAt: string;
  notes?: string | null;
}

export interface RetailOrderItem {
  itemType: "BIKE" | "PART" | "OUTFIT" | "BATTERY";
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
}

export interface RetailOrderRecord {
  id: string;
  orderNumber: string;
  customerType: "GUEST" | "CLIENT" | "EXTERNAL";
  customerName: string;
  customerPhone?: string | null;
  clientId?: string | null;
  items: RetailOrderItem[];
  totalAmount: number;
  totalCost: number;
  profit: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  createdAt: string;
}

export interface ChatMessageRecord {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  text: string;
  createdAt: string;
}

export interface PresenceRecord {
  userId: string;
  userName: string;
  userRole?: string;
  roleTitle?: string;
  lastSeenAt: string;
  deviceInfo?: string;
}

export interface DBStore {
  accessLevels: AccessLevelRecord[];
  users: UserRecord[];
  models: BikeModelRecord[];
  batteryModels: BatteryModelRecord[];
  bikes: BikeRecord[];
  batteries: BatteryRecord[];
  outfits: OutfitRecord[];
  outfitCategories: OutfitCategoryRecord[];
  outfitTemplates: OutfitTemplateRecord[];
  clients: ClientRecord[];
  tariffs: TariffRecord[];
  parts: PartRecord[];
  partOrders?: PartOrderRecord[];
  partCategories: PartCategoryRecord[];
  partOrderCategories?: PartCategoryRecord[];
  rentals: RentalRecord[];
  repairs: RepairOrderRecord[];
  payments: PaymentRecord[];
  reviews: ReviewRecord[];
  articles: ArticleRecord[];
  employees: EmployeeRecord[];
  retailOrders: RetailOrderRecord[];
  loyaltyTiers: LoyaltyTierRecord[];
  auditLogs?: AuditLogRecord[];
  chatMessages?: ChatMessageRecord[];
  presence?: PresenceRecord[];
  settings?: SystemSettingsRecord;
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = process.env.CRM_DATA_DIR ? path.resolve(process.env.CRM_DATA_DIR) : isVercel
  ? path.resolve("/tmp", "data")
  : typeof __dirname !== "undefined"
  ? path.resolve(__dirname, "../../data")
  : path.resolve(process.cwd(), "data");
export const DB_FILE = path.join(DATA_DIR, "crm_db.json");

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err: any) {
  // Gracefully ignore directory creation failure in read-only environments
}

export const createDefaultEmptyDb = (): DBStore => ({
  accessLevels: JSON.parse(JSON.stringify(INITIAL_ACCESS_LEVELS)),
  users: JSON.parse(JSON.stringify(INITIAL_USERS)),
  models: [],
  batteryModels: [],
  bikes: [],
  batteries: [],
  outfits: [],
  outfitCategories: JSON.parse(JSON.stringify(INITIAL_OUTFIT_CATEGORIES)),
  outfitTemplates: [],
  clients: [],
  tariffs: [],
  parts: [],
  partOrders: [],
  partCategories: JSON.parse(JSON.stringify(INITIAL_PART_CATEGORIES)),
  partOrderCategories: JSON.parse(JSON.stringify(INITIAL_PART_ORDER_CATEGORIES)),
  rentals: [],
  repairs: [],
  payments: [],
  reviews: [],
  articles: [],
  employees: JSON.parse(JSON.stringify(INITIAL_EMPLOYEES)),
  retailOrders: [],
  loyaltyTiers: JSON.parse(JSON.stringify(INITIAL_LOYALTY_TIERS)),
  auditLogs: [],
  chatMessages: [
    {
      id: "msg-welcome",
      senderId: "u-bxleth",
      senderName: "BXLETH (Главный инженер)",
      senderRole: "ADMIN",
      text: "Рабочее пространство ELECTREAM CRM активно. Система готова к работе.",
      createdAt: new Date().toISOString(),
    },
  ],
  settings: {
    monthlyFixedExpenses: 0,
    fixedExpensesDescription: "Аренда помещения мастерской и накладные расходы",
    articlesInitialized: false,
  },
});

let rawDb: DBStore;

export function sanitizeLoadedDb(parsed: any): DBStore {
  const defaultDb = createDefaultEmptyDb();
  if (!parsed || typeof parsed !== "object") return defaultDb;

  // Ensure all standard system access levels (lvl-owner, lvl-manager, lvl-master) exist in db
  const existingAccessLevels: AccessLevelRecord[] = Array.isArray(parsed.accessLevels)
    ? parsed.accessLevels
    : [];
  for (const initLvl of INITIAL_ACCESS_LEVELS) {
    const found = existingAccessLevels.find((l) => l.id === initLvl.id);
    if (!found) {
      existingAccessLevels.push({ ...initLvl });
    }
  }

  // Merge loaded users with INITIAL_USERS to ensure admin account (BXLETH) is present
  const existingUsers: UserRecord[] = (Array.isArray(parsed.users) ? parsed.users : []).filter(
    (u: any) =>
      u.id !== "usr-twizzy" &&
      u.login !== "twizzy" &&
      u.username !== "twizzy" &&
      u.id !== "usr-bogdan" &&
      u.id !== "usr-vladik" &&
      u.login?.toLowerCase() !== "bogdan" &&
      u.username?.toLowerCase() !== "bogdan" &&
      u.login?.toLowerCase() !== "vladik" &&
      u.username?.toLowerCase() !== "vladik"
  );
  for (const initUser of INITIAL_USERS) {
    const found = existingUsers.find(
      (u: any) =>
        u.id === initUser.id ||
        (u.login && u.login.toLowerCase() === initUser.login.toLowerCase()) ||
        (u.username && u.username.toLowerCase() === initUser.username.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === initUser.email.toLowerCase())
    );
    if (!found) {
      existingUsers.push({ ...initUser });
    } else {
      if (!found.roleTitle) found.roleTitle = initUser.roleTitle;
      if (!found.login) found.login = initUser.login;
      if (!found.username) found.username = initUser.username;
      if (!found.accessLevelId) found.accessLevelId = initUser.accessLevelId;
      if (found.isActive === undefined) found.isActive = true;
      if (found.passwordHash === "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918") {
        found.passwordHash = initUser.passwordHash;
      }
    }
  }

  return {
    accessLevels: existingAccessLevels.length > 0 ? existingAccessLevels : defaultDb.accessLevels,
    users: existingUsers.length > 0 ? existingUsers : defaultDb.users,
    models: (parsed.models || []).map((m: any) => ({
      ...m,
      baseRentalPrice: m.baseRentalPrice !== undefined && m.baseRentalPrice > 0 ? m.baseRentalPrice : 6000,
      baseBuyoutPrice: m.baseBuyoutPrice !== undefined && m.baseBuyoutPrice > 0 ? m.baseBuyoutPrice : (m.salePrice || 60000),
    })),
    batteryModels: parsed.batteryModels || [],
    bikes: parsed.bikes || [],
    batteries: parsed.batteries || [],
    outfits: parsed.outfits || [],
    outfitCategories: Array.isArray(parsed.outfitCategories) ? parsed.outfitCategories : defaultDb.outfitCategories,
    outfitTemplates: parsed.outfitTemplates || [],
    clients: parsed.clients || [],
    tariffs: parsed.tariffs || [],
    parts: parsed.parts || [],
    partOrders: Array.isArray(parsed.partOrders) ? parsed.partOrders : [],
    partCategories: Array.isArray(parsed.partCategories) && parsed.partCategories.length > 0
      ? parsed.partCategories
      : defaultDb.partCategories,
    partOrderCategories: Array.isArray(parsed.partOrderCategories) && parsed.partOrderCategories.length > 0
      ? parsed.partOrderCategories
      : JSON.parse(JSON.stringify(INITIAL_PART_ORDER_CATEGORIES)),
    rentals: parsed.rentals || [],
    repairs: parsed.repairs || [],
    payments: parsed.payments || [],
    reviews: parsed.reviews || [],
    articles: parsed.articles || [],
    employees: (() => {
      const emps: EmployeeRecord[] = (Array.isArray(parsed.employees) ? parsed.employees : []).filter(
        (e: any) =>
          e.id !== "emp-bogdan" &&
          e.id !== "emp-vladik" &&
          e.fullName !== "Богдан" &&
          e.fullName !== "Владислав"
      );
      for (const initEmp of INITIAL_EMPLOYEES) {
        if (!emps.some((e) => e.id === initEmp.id || e.phone === initEmp.phone)) {
          emps.push({ ...initEmp });
        }
      }
      return emps;
    })(),
    retailOrders: (() => {
      const orders = Array.isArray(parsed.retailOrders) ? parsed.retailOrders : [];
      const clients = Array.isArray(parsed.clients) ? parsed.clients : [];
      orders.forEach((ro: any) => {
        if (!ro.clientId && ro.customerPhone) {
          const clean = ro.customerPhone.replace(/\D/g, "");
          if (clean.length >= 6) {
            const match = clients.find((c: any) => c.phone?.replace(/\D/g, "") === clean);
            if (match) ro.clientId = match.id;
          }
        }
      });
      return orders;
    })(),
    loyaltyTiers: Array.isArray(parsed.loyaltyTiers) && parsed.loyaltyTiers.length > 0
      ? parsed.loyaltyTiers
      : JSON.parse(JSON.stringify(INITIAL_LOYALTY_TIERS)),
    auditLogs: (Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [])
      .filter((l: any) =>
        l.entityId !== "usr-twizzy" &&
        !l.title?.toLowerCase().includes("twizzy") &&
        l.entityId !== "usr-bogdan" &&
        l.entityId !== "usr-vladik" &&
        !l.title?.toLowerCase().includes("bogdan") &&
        !l.title?.toLowerCase().includes("vladik")
      )
      .map((l: any) => {
        let actorName = l.actorName || "Администратор";
        if ((actorName.includes("Ковалев") || actorName.includes("Смирнов")) && !existingUsers.some((user: UserRecord) => actorName.includes(user.fullName))) {
          actorName = "BXLETH (Руководитель парка)";
        }
        return {
          ...l,
          actorName,
        };
      }),
    chatMessages: (() => {
      const filtered = (Array.isArray(parsed.chatMessages) ? parsed.chatMessages : []).filter(
        (m: any) => m.senderId !== "u-bogdan" && m.senderId !== "u-vladik"
      );
      return filtered.length > 0 ? filtered : defaultDb.chatMessages;
    })(),
    settings: parsed.settings
      ? {
          ...parsed.settings,
          articlesInitialized:
            typeof parsed.settings.articlesInitialized === "boolean"
              ? parsed.settings.articlesInitialized
              : Array.isArray(parsed.articles) && parsed.articles.length > 0,
        }
      : defaultDb.settings,
  };
}

function loadFromDisk(): DBStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileContent = fs.readFileSync(DB_FILE, "utf-8").trim();
      if (fileContent) {
        const parsed = JSON.parse(fileContent);
        return sanitizeLoadedDb(parsed);
      }
    }

    // Also attempt reading bundled template data if DB_FILE is in /tmp
    const bundledPath = typeof __dirname !== "undefined"
      ? path.resolve(__dirname, "../../data/crm_db.json")
      : path.resolve(process.cwd(), "data/crm_db.json");
    if (bundledPath !== DB_FILE && fs.existsSync(bundledPath)) {
      const fileContent = fs.readFileSync(bundledPath, "utf-8").trim();
      if (fileContent) {
        const parsed = JSON.parse(fileContent);
        return sanitizeLoadedDb(parsed);
      }
    }
  } catch (err) {
    console.error("[CRM DB] Ошибка чтения crm_db.json, инициализация чистого хранилища:", err);
  }

  const cleanDb = createDefaultEmptyDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cleanDb, null, 2), "utf-8");
  } catch (err: any) {
    // Gracefully ignore write failures in read-only environments
  }
  return cleanDb;
}

rawDb = loadFromDisk();

let isCloudInitialized = false;
let hasPendingChanges = false;
let changeVersion = 0;
let cloudInitialization: Promise<void> | null = null;

export const initCloudDb = async (): Promise<void> => {
  if (isCloudInitialized) return;
  if (cloudInitialization) return cloudInitialization;

  cloudInitialization = (async () => { try {
    const cloudData = await supabaseAdapter.init(() => rawDb);
    if (cloudData) {
      const sanitized = sanitizeLoadedDb(cloudData);
      Object.assign(rawDb, sanitized);
      // Also cache to disk if writable
      try {
        if (fs.existsSync(DATA_DIR)) {
          fs.writeFileSync(DB_FILE, JSON.stringify(rawDb, null, 2), "utf-8");
        }
      } catch (e: any) {
        // Silently ignore in read-only environment
      }
    }
    isCloudInitialized = true;
  } catch (err: any) {
    console.error("[CRM DB] Ошибка инициализации облачной БД:", err.message);
    throw err;
  } finally { cloudInitialization = null; } })();
  return cloudInitialization;
};

export const checkAndSyncCloudDb = async (force = false): Promise<boolean> => {
  // Never overwrite dirty in-memory state that has not been flushed yet
  if (hasPendingChanges) {
    return false;
  }
  try {
    const version = changeVersion;
    const cloudData = await supabaseAdapter.syncIfOutdated(force);
    if (cloudData && !hasPendingChanges && version === changeVersion) {
      const sanitized = sanitizeLoadedDb(cloudData);
      Object.assign(rawDb, sanitized);
      return true;
    }
  } catch (err: any) {
    console.error("[CRM DB] Ошибка синхронизации с облаком:", err);
  }
  return false;
};

export const getStorageStatus = (): StorageStatus => {
  return supabaseAdapter.getStatus();
};

export const flushDb = async (force = false): Promise<void> => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (!hasPendingChanges && !force) {
    return;
  }
  saveDbToDiskSafe();
  const version = changeVersion;
  const snapshot = JSON.parse(JSON.stringify(rawDb));
  try {
    await supabaseAdapter.saveToCloud(snapshot);
    await supabaseAdapter.flush();
  } catch (error: any) {
    if (error.code === "CRM_STORE_CONFLICT" && error.cloudData && version === changeVersion) {
      Object.assign(rawDb, sanitizeLoadedDb(error.cloudData));
      hasPendingChanges = false;
      saveDbToDiskSafe();
    }
    throw error;
  }
  if (version === changeVersion) hasPendingChanges = false;
};

function saveDbToDiskSafe() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(rawDb, null, 2), "utf-8");
  } catch (err: any) {
    if (err.code !== "EROFS") {
      console.error("[CRM DB] Ошибка записи на диск crm_db.json:", err);
    }
  }
}

let saveTimeout: NodeJS.Timeout | null = null;
let transactionDepth = 0;

// Repository operations are synchronous: commit all related entities together,
// and never persist an intermediate or rejected operation through the proxy.
export function withDbTransaction<T>(operation: () => T): T {
  const snapshot = JSON.stringify(rawDb);
  const wasPending = hasPendingChanges;
  transactionDepth++;
  try {
    const result = operation();
    if (result && typeof (result as any).then === "function") {
      throw new Error("Database transaction must be synchronous");
    }
    transactionDepth--;
    if (transactionDepth === 0 && hasPendingChanges) saveDb();
    return result;
  } catch (error) {
    Object.assign(rawDb, JSON.parse(snapshot));
    hasPendingChanges = wasPending;
    transactionDepth--;
    throw error;
  }
}

export const saveDb = (immediate = false) => {
  hasPendingChanges = true;
  changeVersion++;
  if (transactionDepth > 0) return;
  saveDbToDiskSafe();

  if (immediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = null;
    flushDb().catch((err) => {
      console.error("[CRM DB] Ошибка сохранения в Supabase:", err.message);
    });
    return;
  }

  if (isVercel) {
    // On Vercel, storage middleware doFlush() will await flushDb() sequentially before response completes
    return;
  }

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveTimeout = null;
    flushDb().catch((err) => {
      console.error("[CRM DB] Ошибка фоновой синхронизации Supabase:", err.message);
    });
  }, 50);
};

process.on("beforeExit", () => saveDb(true));

function createAutoSavingProxy<T extends object>(targetObj: T, onMutate: () => void): T {
  const proxyCache = new WeakMap<object, any>();

  function wrap<O extends object>(obj: O): O {
    if (proxyCache.has(obj)) {
      return proxyCache.get(obj);
    }

    const proxy = new Proxy(obj, {
      get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver);
        if (val !== null && typeof val === "object") {
          return wrap(val);
        }
        return val;
      },
      set(target, prop, value, receiver) {
        const res = Reflect.set(target, prop, value, receiver);
        onMutate();
        return res;
      },
      deleteProperty(target, prop) {
        const res = Reflect.deleteProperty(target, prop);
        onMutate();
        return res;
      },
    });

    proxyCache.set(obj, proxy);
    return proxy;
  }

  return wrap(targetObj);
}

const db = createAutoSavingProxy(rawDb, () => saveDb(false));

export const getDb = () => db;

export const getSettings = (): SystemSettingsRecord => {
  const currentDb = getDb();
  if (!currentDb.settings) {
    currentDb.settings = {
      monthlyFixedExpenses: 0,
      fixedExpensesDescription: "Аренда сервисного хаба и накладные расходы",
      fixedExpenseItems: [],
    };
  }
  if (!Array.isArray(currentDb.settings.fixedExpenseItems)) {
    if (currentDb.settings.monthlyFixedExpenses > 0) {
      currentDb.settings.fixedExpenseItems = [
        {
          id: "exp-1",
          name: currentDb.settings.fixedExpensesDescription || "Аренда сервисного хаба",
          amount: currentDb.settings.monthlyFixedExpenses,
        },
      ];
    } else {
      currentDb.settings.fixedExpenseItems = [];
    }
  }
  return currentDb.settings;
};

export const updateSettings = (data: Partial<SystemSettingsRecord>): SystemSettingsRecord => {
  const currentDb = getDb();
  if (!currentDb.settings) {
    currentDb.settings = {
      monthlyFixedExpenses: 0,
      fixedExpensesDescription: "Аренда сервисного хаба и накладные расходы",
      fixedExpenseItems: [],
    };
  }

  if (Array.isArray(data.fixedExpenseItems)) {
    currentDb.settings.fixedExpenseItems = data.fixedExpenseItems.map((item, idx) => ({
      id: item.id || `exp-${Date.now()}-${idx}`,
      name: String(item.name || "").trim() || "Расход",
      amount: Math.max(0, Number(item.amount) || 0),
    }));
    // Recalculate total sum from items
    currentDb.settings.monthlyFixedExpenses = currentDb.settings.fixedExpenseItems.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    if (data.fixedExpensesDescription !== undefined) {
      currentDb.settings.fixedExpensesDescription = String(data.fixedExpensesDescription);
    } else if (currentDb.settings.fixedExpenseItems.length > 0) {
      currentDb.settings.fixedExpensesDescription = currentDb.settings.fixedExpenseItems
        .map((i) => i.name)
        .join(", ");
    } else {
      currentDb.settings.fixedExpensesDescription = "";
    }
  } else {
    if (data.monthlyFixedExpenses !== undefined) {
      currentDb.settings.monthlyFixedExpenses = Math.max(0, Number(data.monthlyFixedExpenses) || 0);
    }
    if (data.fixedExpensesDescription !== undefined) {
      currentDb.settings.fixedExpensesDescription = String(data.fixedExpensesDescription);
    }
  }

  if (data.paymentDetails !== undefined) {
    currentDb.settings.paymentDetails = {
      ...(currentDb.settings.paymentDetails || {}),
      ...data.paymentDetails,
    };
  }

  saveDb(true);
  return currentDb.settings;
};


// Time Simulation Machine
let simulatedDate: Date | null = null;

export const getSystemTime = (): Date => {
  return simulatedDate ? new Date(simulatedDate) : new Date();
};

export const setSystemTime = (d: Date | string | null): Date => {
  simulatedDate = d ? new Date(d) : null;
  return getSystemTime();
};

export const addSystemDays = (days: number): Date => {
  const cur = getSystemTime();
  cur.setDate(cur.getDate() + days);
  simulatedDate = cur;
  return getSystemTime();
};

export const isTimeSimulated = (): boolean => simulatedDate !== null;

// Reset / Clear database to completely clean state
export const clearDb = () => {
  const authSigningKey = rawDb.settings?.authSigningKey;
  simulatedDate = null;
  rawDb.rentals = [];
  rawDb.repairs = [];
  rawDb.payments = [];
  rawDb.reviews = [];
  rawDb.retailOrders = [];
  rawDb.bikes = [];
  rawDb.batteries = [];
  rawDb.clients = [];
  rawDb.outfits = [];
  rawDb.parts = [];
  rawDb.models = [];
  rawDb.batteryModels = [];
  rawDb.outfitTemplates = [];
  rawDb.tariffs = [];
  rawDb.partOrders = [];
  rawDb.auditLogs = [];
  rawDb.articles = [];
  rawDb.loyaltyTiers = JSON.parse(JSON.stringify(INITIAL_LOYALTY_TIERS));
  rawDb.settings = {
    authSigningKey,
    monthlyFixedExpenses: 0,
    fixedExpensesDescription: "",
    fixedExpenseItems: [],
    articlesInitialized: true,
  };
  saveDb(true);
};

export const resetDb = () => {
  clearDb();
};

