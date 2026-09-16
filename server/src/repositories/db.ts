import {
  INITIAL_USERS,
  INITIAL_MODELS,
  INITIAL_BIKES,
  INITIAL_OUTFITS,
  INITIAL_OUTFIT_CATEGORIES,
  INITIAL_OUTFIT_TEMPLATES,
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
} from "../data/initialData.js";

export type UserRole = "ADMIN" | "MANAGER" | "MECHANIC";
export type BikeStatus = "AVAILABLE" | "RENTED" | "IN_MAINTENANCE" | "FOR_SALE" | "DECOMMISSIONED" | "SOLD";
export type RentalStatus = "DRAFT" | "RESERVED" | "ACTIVE" | "OVERDUE" | "CLOSED" | "PROBLEM" | "BOUGHT_OUT";
export type RentalType = "STANDARD" | "RENT_TO_OWN";
export type ClientStatus = "NORMAL" | "VIP" | "PROBLEM" | "BLACKLIST";
export type OutfitCategory = "HELMET" | "LOCK" | "BAG" | "BATTERY" | "CHARGER" | "PHONE_HOLDER" | "WINTER_GLOVES";
export type OutfitStatus = "IN_STOCK" | "ISSUED" | "DAMAGED" | "LOST" | "SOLD";
export type RepairStatus = "DIAGNOSTICS" | "WAITING_PARTS" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type RepairFaultType = "COMPANY_EXPENSE" | "CLIENT_FAULT";
export type PaymentType = "RENTAL" | "DEPOSIT" | "DEPOSIT_REFUND" | "REPAIR" | "OUTFIT_SALE" | "FINE" | "SALARY_PAYMENT" | "RETAIL_SALE";
export type PaymentMethod = "CASH" | "CARD" | "SBP" | "BANK_TRANSFER";

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
  batteryCapacityAh: number;
  wheelSizeInch?: number | null;
  winterVersion: boolean;
  description?: string | null;
}

export interface BikeRecord {
  id: string;
  inventoryNumber: string;
  modelId: string;
  frameNumber?: string | null;
  motorNumber?: string | null;
  status: BikeStatus;
  currentLocation: string;
  mileageKm: number;
  note?: string | null;
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
}

export interface OutfitRecord {
  id: string;
  name: string;
  category: string;
  inventoryNumber?: string | null;
  depositValue: number;
  status: OutfitStatus;
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

export interface PartRecord {
  id: string;
  name: string;
  sku: string;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface RepairOrderRecord {
  id: string;
  orderNumber: string;
  bikeId: string;
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
  salaryType: "MONTHLY" | "PER_SHIFT";
  salaryAmount: number;
  status: "ACTIVE" | "ON_LEAVE" | "DISMISSED";
  hiredAt: string;
  notes?: string | null;
}

export interface RetailOrderItem {
  itemType: "BIKE" | "PART" | "OUTFIT";
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
  bikes: BikeRecord[];
  outfits: OutfitRecord[];
  outfitCategories: OutfitCategoryRecord[];
  outfitTemplates: OutfitTemplateRecord[];
  clients: ClientRecord[];
  tariffs: TariffRecord[];
  parts: PartRecord[];
  rentals: RentalRecord[];
  repairs: RepairOrderRecord[];
  payments: PaymentRecord[];
  reviews: ReviewRecord[];
  articles: ArticleRecord[];
  employees: EmployeeRecord[];
  retailOrders: RetailOrderRecord[];
}

// In-Memory state clone initialized with seed data
let db: DBStore = {
  users: JSON.parse(JSON.stringify(INITIAL_USERS)),
  models: JSON.parse(JSON.stringify(INITIAL_MODELS)),
  bikes: JSON.parse(JSON.stringify(INITIAL_BIKES)),
  outfits: JSON.parse(JSON.stringify(INITIAL_OUTFITS)),
  outfitCategories: JSON.parse(JSON.stringify(INITIAL_OUTFIT_CATEGORIES)),
  outfitTemplates: JSON.parse(JSON.stringify(INITIAL_OUTFIT_TEMPLATES)),
  clients: JSON.parse(JSON.stringify(INITIAL_CLIENTS)),
  tariffs: JSON.parse(JSON.stringify(INITIAL_TARIFFS)),
  parts: JSON.parse(JSON.stringify(INITIAL_PARTS)),
  rentals: JSON.parse(JSON.stringify(INITIAL_RENTALS)),
  repairs: JSON.parse(JSON.stringify(INITIAL_REPAIRS)),
  payments: JSON.parse(JSON.stringify(INITIAL_PAYMENTS)),
  reviews: JSON.parse(JSON.stringify(INITIAL_REVIEWS)),
  articles: JSON.parse(JSON.stringify(INITIAL_ARTICLES)),
  employees: JSON.parse(JSON.stringify(INITIAL_EMPLOYEES)),
  retailOrders: JSON.parse(JSON.stringify(INITIAL_RETAIL_ORDERS)),
};

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

// Reset to Full Seed Template
export const resetDb = () => {
  simulatedDate = null;
  db = {
    users: JSON.parse(JSON.stringify(INITIAL_USERS)),
    models: JSON.parse(JSON.stringify(INITIAL_MODELS)),
    bikes: JSON.parse(JSON.stringify(INITIAL_BIKES)),
    outfits: JSON.parse(JSON.stringify(INITIAL_OUTFITS)),
    outfitCategories: JSON.parse(JSON.stringify(INITIAL_OUTFIT_CATEGORIES)),
    outfitTemplates: JSON.parse(JSON.stringify(INITIAL_OUTFIT_TEMPLATES)),
    clients: JSON.parse(JSON.stringify(INITIAL_CLIENTS)),
    tariffs: JSON.parse(JSON.stringify(INITIAL_TARIFFS)),
    parts: JSON.parse(JSON.stringify(INITIAL_PARTS)),
    rentals: JSON.parse(JSON.stringify(INITIAL_RENTALS)),
    repairs: JSON.parse(JSON.stringify(INITIAL_REPAIRS)),
    payments: JSON.parse(JSON.stringify(INITIAL_PAYMENTS)),
    reviews: JSON.parse(JSON.stringify(INITIAL_REVIEWS)),
    articles: JSON.parse(JSON.stringify(INITIAL_ARTICLES)),
    employees: JSON.parse(JSON.stringify(INITIAL_EMPLOYEES)),
    retailOrders: JSON.parse(JSON.stringify(INITIAL_RETAIL_ORDERS)),
  };
};

// Clear All Test Operational Data (Start fresh with 0 items)
export const clearDb = () => {
  simulatedDate = null;
  // All active and past transactions cleared
  db.rentals = [];
  db.repairs = [];
  db.payments = [];
  db.reviews = [];
  db.retailOrders = [];
  // Clear fleet, couriers, equipment and warehouse inventory
  db.bikes = [];
  db.clients = [];
  db.outfits = [];
  db.parts = [];
  // Retain employees or reset to empty
  db.employees = [];
};

