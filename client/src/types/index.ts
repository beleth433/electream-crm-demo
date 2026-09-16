export type UserRole = "ADMIN" | "MANAGER" | "MECHANIC";

export type BikeStatus =
  | "AVAILABLE"
  | "RENTED"
  | "IN_MAINTENANCE"
  | "FOR_SALE"
  | "DECOMMISSIONED"
  | "SOLD";

export type RentalStatus =
  | "DRAFT"
  | "RESERVED"
  | "ACTIVE"
  | "OVERDUE"
  | "CLOSED"
  | "PROBLEM"
  | "BOUGHT_OUT";

export type RentalType = "STANDARD" | "RENT_TO_OWN";

export type ClientStatus = "NORMAL" | "VIP" | "PROBLEM" | "BLACKLIST";

export type OutfitCategory =
  | "HELMET"
  | "LOCK"
  | "BAG"
  | "BATTERY"
  | "CHARGER"
  | "PHONE_HOLDER"
  | "WINTER_GLOVES";

export type OutfitStatus = "IN_STOCK" | "ISSUED" | "DAMAGED" | "LOST" | "SOLD";

export type RepairStatus =
  | "DIAGNOSTICS"
  | "WAITING_PARTS"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type RepairFaultType = "COMPANY_EXPENSE" | "CLIENT_FAULT";

export type PaymentType =
  | "RENTAL"
  | "DEPOSIT"
  | "DEPOSIT_REFUND"
  | "REPAIR"
  | "OUTFIT_SALE"
  | "FINE"
  | "SALARY_PAYMENT"
  | "RETAIL_SALE";

export type PaymentMethod = "CASH" | "CARD" | "SBP" | "BANK_TRANSFER";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
}

export interface BikeModel {
  id: string;
  name: string;
  powerWatts: number;
  batteryCapacityAh: number;
  wheelSizeInch?: number | null;
  winterVersion: boolean;
  description?: string | null;
  bikesCount?: number;
}

export type BatteryStatus =
  | "AVAILABLE"
  | "INSTALLED"
  | "ISSUED_SPARE"
  | "IN_MAINTENANCE"
  | "DECOMMISSIONED"
  | "SOLD";

export interface Battery {
  id: string;
  serialNumber: string;
  voltage: number;
  capacityAh: number;
  connector: string;
  cycleCount?: number;
  healthPercent?: number;
  status: BatteryStatus;
  installedBikeId?: string | null;
  location: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  installedBike?: {
    id: string;
    inventoryNumber: string;
    status: BikeStatus;
    modelName?: string;
    currentLocation?: string;
  } | null;
}

export interface BatteryStats {
  total: number;
  available: number;
  installed: number;
  issuedSpare: number;
  inMaintenance: number;
  decommissioned: number;
  avgHealth?: number;
}

export interface Bike {
  id: string;
  inventoryNumber: string;
  modelId: string;
  batteryId?: string | null;
  battery?: Battery | null;
  model?: BikeModel;
  frameNumber?: string | null;
  motorNumber?: string | null;
  status: BikeStatus;
  currentLocation: string;
  mileageKm: number;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
  activeRental?: {
    id: string;
    rentalNumber: string;
    status: RentalStatus;
    expiresAt: string;
    clientName?: string;
    clientPhone?: string;
  } | null;
}

export interface OutfitCategoryItem {
  id: string;
  name: string;
  isSystem?: boolean;
  itemCount?: number;
}

export interface OutfitTemplate {
  id: string;
  name: string;
  categoryId: string;
  defaultDeposit: number;
  description?: string | null;
  categoryName?: string;
}

export interface Outfit {
  id: string;
  name: string;
  category: string;
  categoryName?: string;
  inventoryNumber?: string | null;
  depositValue: number;
  status: OutfitStatus;
  currentRental?: {
    id: string;
    rentalNumber: string;
    clientName?: string;
  } | null;
}

export interface Client {
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
  documentPhotoUrls?: string[];
  status: ClientStatus;
  blackListReason?: string | null;
  createdAt?: string;
  activeRental?: {
    id: string;
    rentalNumber: string;
    status: RentalStatus;
    expiresAt: string;
  } | null;
  totalRentals?: number;
}

export interface Tariff {
  id: string;
  name: string;
  type: RentalType;
  durationDays: number;
  price: number;
  depositRequired: number;
  isActive: boolean;
}

export interface Rental {
  id: string;
  rentalNumber: string;
  clientId: string;
  client?: Client;
  bikeId: string;
  bike?: Bike;
  tariffId: string;
  tariff?: Tariff;
  managerId: string;
  manager?: User;
  status: RentalStatus;
  type: RentalType;
  startedAt: string;
  expiresAt: string;
  nextPaymentDue: string;
  depositAmount: number;
  depositRefunded: boolean;
  notes?: string | null;
  outfitIds: string[];
  outfits?: Outfit[];
  payments?: Payment[];
  createdAt: string;
  updatedAt: string;
}

export interface Part {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minQuantity: number;
  purchasePrice: number;
  clientPrice: number;
  isLowStock?: boolean;
}

export interface RepairOrder {
  id: string;
  orderNumber: string;
  bikeId: string;
  bike?: Bike;
  mechanicId: string;
  mechanic?: User;
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
    part?: Part;
  }>;
}

export interface Payment {
  id: string;
  rentalId?: string | null;
  employeeId?: string | null;
  orderId?: string | null;
  rental?: {
    id: string;
    rentalNumber: string;
    clientName?: string;
    bikeInventoryNumber?: string;
  } | null;
  type: PaymentType;
  amount: number;
  method: PaymentMethod;
  description?: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  clientId: string;
  client?: {
    id: string;
    fullName: string;
    courierService?: string | null;
  };
  bikeId: string;
  bike?: {
    id: string;
    inventoryNumber: string;
    modelName?: string;
  };
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: string;
  salaryType: 'MONTHLY' | 'PER_SHIFT';
  salaryAmount: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'DISMISSED';
  hiredAt: string;
  notes?: string | null;
  totalPaid?: number;
  thisMonthPaid?: number;
  payoutsCount?: number;
  payouts?: Payment[];
}

export interface RetailOrderItem {
  itemType: 'BIKE' | 'PART' | 'OUTFIT';
  itemId: string;
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
}

export interface RetailOrder {
  id: string;
  orderNumber: string;
  customerType: 'GUEST' | 'CLIENT' | 'EXTERNAL';
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

export interface ShopCatalogItem {
  id: string;
  name: string;
  type: 'BIKE' | 'PART' | 'OUTFIT';
  category?: string;
  sku?: string;
  inventoryNumber?: string;
  price: number;
  costPrice: number;
  quantity: number;
  extraInfo?: string;
}

export interface ShopCatalog {
  bikes: Array<{
    id: string;
    inventoryNumber: string;
    modelName: string;
    powerWatts: number;
    batteryCapacityAh: number;
    winterVersion: boolean;
    status: BikeStatus;
    currentLocation: string;
    mileageKm: number;
    price: number;
    costPrice: number;
    inStock: number;
  }>;
  parts: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    price: number;
    costPrice: number;
  }>;
  outfits: Array<{
    id: string;
    name: string;
    category: string;
    categoryName: string;
    inventoryNumber?: string | null;
    price: number;
    costPrice: number;
    inStock: number;
  }>;
}

export interface DashboardStats {
  fleet: {
    totalBikes: number;
    activeParkBikes: number;
    rentedBikes: number;
    availableBikes: number;
    maintenanceBikes: number;
    forSaleBikes: number;
    decommissionedBikes: number;
    soldBikes?: number;
    fleetUtilization: number;
  };
  rentals: {
    activeRentalsCount: number;
    overdueCount: number;
    urgentOverdueRentals: Array<{
      rentalId: string;
      rentalNumber: string;
      clientId: string;
      clientName: string;
      clientPhone: string;
      courierService: string;
      bikeInventoryNumber: string;
      daysOverdue: number;
      nextPaymentDue: string;
      depositAmount: number;
    }>;
  };
  repairs: {
    openRepairsCount: number;
  };
  inventory: {
    lowStockPartsCount: number;
    lowStockParts: Part[];
  };
  financials: {
    totalRevenue: number;
    rentalRevenue: number;
    clientRepairRevenue: number;
    outfitRevenue: number;
    retailRevenue?: number;
    salaryExpenses?: number;
    totalPartsCost: number;
    retailCogs?: number;
    fixedExpenses: number;
    netMargin: number;
    activeDepositsHeld: number;
  };
  recentPayments: Payment[];
  totalClients: number;
  employeesCount?: number;
  retailOrdersCount?: number;
  systemTime?: {
    currentDate: string;
    isSimulated: boolean;
  };
}
