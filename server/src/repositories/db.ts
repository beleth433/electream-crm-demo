import fs from "fs";
import path from "path";
import {
  INITIAL_USERS,
  INITIAL_MODELS,
  INITIAL_BATTERY_MODELS,
  INITIAL_BIKES,
  INITIAL_BATTERIES,
  INITIAL_OUTFITS,
  INITIAL_OUTFIT_CATEGORIES,
  INITIAL_OUTFIT_TEMPLATES,
  INITIAL_PART_CATEGORIES,
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
export type BikeStatus = "AVAILABLE" | "RENTED" | "IN_MAINTENANCE" | "FOR_SALE" | "DECOMMISSIONED" | "SOLD";
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
export type PaymentType = "RENTAL" | "DEPOSIT" | "DEPOSIT_REFUND" | "REPAIR" | "OUTFIT_SALE" | "FINE" | "SALARY_PAYMENT" | "RETAIL_SALE";
export type PaymentMethod = "CASH" | "CARD" | "SBP" | "BANK_TRANSFER";
export type BatteryChemistry = "Li-ion" | "LiFePO4";

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

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
}

export interface BikeModelRecord {
  id: string;
  name: string;
  powerWatts: number;
  wheelSizeInch?: number | null;
  description?: string | null;
  purchasePrice?: number;
  salePrice?: number;
}

export interface BikeRecord {
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

export interface TariffRecord {
  id: string;
  name: string;
  type: RentalType;
  durationDays: number;
  price: number;
  depositRequired: number;
  isActive: boolean;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface RepairOrderRecord {
  id: string;
  orderNumber: string;
  itemType?: "BIKE" | "BATTERY";
  bikeId?: string | null;
  batteryId?: string | null;
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
  }>;
}

export interface PaymentRecord {
  id: string;
  rentalId?: string | null;
  employeeId?: string | null;
  orderId?: string | null;
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
  authorId: string;
  createdAt: string;
  updatedAt?: string;
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

export interface DBStore {
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
  partCategories: PartCategoryRecord[];
  rentals: RentalRecord[];
  repairs: RepairOrderRecord[];
  payments: PaymentRecord[];
  reviews: ReviewRecord[];
  articles: ArticleRecord[];
  employees: EmployeeRecord[];
  retailOrders: RetailOrderRecord[];
  loyaltyTiers: LoyaltyTierRecord[];
}

const DATA_DIR = typeof __dirname !== "undefined"
  ? path.resolve(__dirname, "../../data")
  : path.resolve(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "crm_db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const createDefaultEmptyDb = (): DBStore => ({
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
  partCategories: JSON.parse(JSON.stringify(INITIAL_PART_CATEGORIES)),
  rentals: [],
  repairs: [],
  payments: [],
  reviews: [],
  articles: [],
  employees: JSON.parse(JSON.stringify(INITIAL_EMPLOYEES)),
  retailOrders: [],
  loyaltyTiers: JSON.parse(JSON.stringify(INITIAL_LOYALTY_TIERS)),
});

let rawDb: DBStore;

function loadFromDisk(): DBStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileContent = fs.readFileSync(DB_FILE, "utf-8").trim();
      if (fileContent) {
        const parsed = JSON.parse(fileContent);
        const defaultDb = createDefaultEmptyDb();
        const merged: DBStore = {
          users: parsed.users && parsed.users.length > 0 ? parsed.users : defaultDb.users,
          models: parsed.models || [],
          batteryModels: parsed.batteryModels || [],
          bikes: parsed.bikes || [],
          batteries: parsed.batteries || [],
          outfits: parsed.outfits || [],
          outfitCategories: Array.isArray(parsed.outfitCategories) ? parsed.outfitCategories : defaultDb.outfitCategories,
          outfitTemplates: parsed.outfitTemplates || [],
          clients: parsed.clients || [],
          tariffs: parsed.tariffs || [],
          parts: parsed.parts || [],
          partCategories: Array.isArray(parsed.partCategories) && parsed.partCategories.length > 0
            ? parsed.partCategories
            : defaultDb.partCategories,
          rentals: parsed.rentals || [],
          repairs: parsed.repairs || [],
          payments: parsed.payments || [],
          reviews: parsed.reviews || [],
          articles: parsed.articles || [],
          employees: parsed.employees && parsed.employees.length > 0 ? parsed.employees : defaultDb.employees,
          retailOrders: parsed.retailOrders || [],
          loyaltyTiers: Array.isArray(parsed.loyaltyTiers) && parsed.loyaltyTiers.length > 0
            ? parsed.loyaltyTiers
            : JSON.parse(JSON.stringify(INITIAL_LOYALTY_TIERS)),
        };
        return merged;
      }
    }
  } catch (err) {
    console.error("[CRM DB] Ошибка чтения crm_db.json, инициализация чистого хранилища:", err);
  }

  const cleanDb = createDefaultEmptyDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cleanDb, null, 2), "utf-8");
  } catch (err) {
    console.error("[CRM DB] Ошибка создания crm_db.json:", err);
  }
  return cleanDb;
}

rawDb = loadFromDisk();

let saveTimeout: NodeJS.Timeout | null = null;

export const saveDb = (immediate = false) => {
  if (immediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = null;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(rawDb, null, 2), "utf-8");
    } catch (err) {
      console.error("[CRM DB] Ошибка немедленной записи crm_db.json:", err);
    }
    return;
  }

  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(rawDb, null, 2), "utf-8");
    } catch (err) {
      console.error("[CRM DB] Ошибка фоновой записи crm_db.json:", err);
    }
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
  rawDb.loyaltyTiers = JSON.parse(JSON.stringify(INITIAL_LOYALTY_TIERS));
  saveDb(true);
};

export const resetDb = () => {
  clearDb();
};

