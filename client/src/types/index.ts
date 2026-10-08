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
export type ClientType = "COURIER" | "RETAIL";

export interface LoyaltyTier {
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
  | "BUYOUT"
  | "DEPOSIT"
  | "DEPOSIT_REFUND"
  | "REPAIR"
  | "OUTFIT_SALE"
  | "FINE"
  | "SALARY_PAYMENT"
  | "RETAIL_SALE"
  | "PART_PURCHASE";

export type PaymentMethod = "CASH" | "CARD" | "SBP" | "BANK_TRANSFER";

export interface AccessLevelModulePermission {
  visible: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface AccessLevel {
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

export interface User {
  id: string;
  login?: string;
  username?: string;
  email: string;
  fullName: string;
  role: UserRole;
  roleTitle?: string;
  phone?: string | null;
  accessLevelId?: string;
  accessLevel?: AccessLevel | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
  password?: string;
  employeeId?: string | null;
  salaryAmount?: number;
  salaryType?: 'MONTHLY' | 'PER_SHIFT' | 'PIECEWORK';
  thisMonthPaid?: number;
}

export interface BikeModel {
  id: string;
  name: string;
  powerWatts: number;
  wheelSizeInch?: number | null;
  description?: string | null;
  purchasePrice?: number;
  salePrice?: number;
  baseRentalPrice?: number;
  baseBuyoutPrice?: number;
  bikesCount?: number;
}

export type BatteryChemistry = 'Li-ion' | 'LiFePO4';

export interface BatteryModel {
  id: string;
  name: string;
  voltage: number;
  capacityAh: number;
  chemistry?: BatteryChemistry;
  description?: string | null;
  purchasePrice?: number;
  salePrice?: number;
  batteriesCount?: number;
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
  modelId?: string | null;
  modelName?: string | null;
  model?: BatteryModel | null;
  voltage: number;
  capacityAh: number;
  chemistry?: BatteryChemistry;
  connector?: string;
  cycleCount?: number;
  healthPercent?: number;
  status: BatteryStatus;
  installedBikeId?: string | null;
  issuedBikeId?: string | null;
  location?: string;
  notes?: string | null;
  purchasePrice?: number;
  salePrice?: number;
  createdAt?: string;
  updatedAt?: string;
  installedBike?: {
    id: string;
    inventoryNumber: string;
    status: BikeStatus;
    modelName?: string;
    currentLocation?: string;
  } | null;
  issuedBike?: {
    id: string;
    inventoryNumber: string;
    status?: BikeStatus;
    modelName?: string;
    currentLocation?: string;
  } | null;
  currentRental?: {
    id: string;
    rentalNumber: string;
    clientId: string;
    clientName: string;
    clientPhone?: string | null;
    bikeId?: string | null;
    bikeInventoryNumber?: string | null;
    isSpare?: boolean;
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
  purchasePrice?: number;
  salePrice?: number;
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
  purchasePrice?: number;
  salePrice?: number;
}

export interface Outfit {
  id: string;
  name: string;
  category: string;
  categoryName?: string;
  inventoryNumber?: string | null;
  depositValue: number;
  status: OutfitStatus;
  purchasePrice?: number;
  salePrice?: number;
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
  clientType?: ClientType;
  manualLoyaltyTierId?: string | null;
  loyaltyTier?: LoyaltyTier;
  loyaltyMode?: 'AUTO' | 'MANUAL';
  totalRentalDays?: number;
  totalSpent?: number;
  blackListReason?: string | null;
  createdAt?: string;
  activeRental?: {
    id: string;
    rentalNumber: string;
    status: RentalStatus;
    expiresAt: string;
  } | null;
  totalRentals?: number;
  retailOrdersCount?: number;
  retailOrdersSpent?: number;
  retailOrders?: RetailOrder[];
  isCourier?: boolean;
  isRetailBuyer?: boolean;
}

export interface TariffBuyoutBatteryItem {
  batteryModelId: string;
  quantity: number;
  price: number;
}

export interface Tariff {
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
  bikeModel?: BikeModel | null;
  includedBatteries?: TariffBuyoutBatteryItem[];
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
  batteryIds?: string[];
  batteries?: Battery[];
  payments?: Payment[];
  totalBuyoutPrice?: number;
  paymentIntervalDays?: number;
  installmentPayment?: number;
  totalPaidForBuyout?: number;
  remainingBuyoutAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PartCategoryItem {
  id: string;
  name: string;
  isSystem?: boolean;
  partCount?: number;
}

export interface Part {
  id: string;
  name: string;
  sku: string;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  minQuantity: number;
  purchasePrice: number;
  clientPrice: number;
  isLowStock?: boolean;
}

export type PartOrderStatus = "REQUESTED" | "ORDERED" | "RECEIVED" | "ARCHIVED" | "CANCELLED";
export type PartOrderPriority = "LOW" | "NORMAL" | "URGENT";

export interface PartOrderCategoryItem {
  id: string;
  name: string;
  isSystem?: boolean;
  orderCount?: number;
}

export interface PartOrder {
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

export interface RepairOrder {
  id: string;
  orderNumber: string;
  itemType?: 'BIKE' | 'BATTERY' | 'EXTERNAL_DEVICE';
  bikeId?: string | null;
  batteryId?: string | null;
  customItemName?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientId?: string | null;
  client?: Client | { id: string; fullName: string; phone?: string | null } | null;
  bike?: Bike | null;
  battery?: Battery | null;
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
  authorId?: string;
  authorName?: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Employee {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  role: string;
  salaryType: 'MONTHLY' | 'PER_SHIFT' | 'PIECEWORK';
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
  itemType: 'BIKE' | 'PART' | 'OUTFIT' | 'BATTERY';
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
  type: 'BIKE' | 'PART' | 'OUTFIT' | 'BATTERY';
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
  batteries: Array<{
    id: string;
    serialNumber: string;
    modelName: string;
    voltage: number;
    capacityAh: number;
    chemistry?: BatteryChemistry;
    healthPercent?: number;
    status: BatteryStatus;
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
      clientTelegram?: string | null;
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
    buyoutRevenue?: number;
    clientRepairRevenue: number;
    outfitRevenue: number;
    retailRevenue?: number;
    salaryExpenses?: number;
    totalPartsCost: number;
    retailCogs?: number;
    fixedExpenses: number;
    monthlyFixedExpenses?: number;
    fixedExpensesDescription?: string;
    fixedExpenseItems?: ExpenseItem[];
    netMargin: number;
    activeDepositsHeld: number;
  };
  recentPayments: Payment[];
  totalClients: number;
  employeesCount?: number;
  retailOrdersCount?: number;
  modelsBreakdown?: Array<{
    modelId: string;
    name: string;
    powerWatts: number;
    total: number;
    rented: number;
    available: number;
    maintenance: number;
    utilization: number;
  }>;
  systemTime?: {
    currentDate: string;
    isSimulated: boolean;
  };
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
}

export interface PaymentDetails {
  recipientName?: string;
  bankName?: string;
  phoneNumber?: string;
  accountNumber?: string;
  bik?: string;
  inn?: string;
  paymentLinkUrl?: string; // Прямая ссылка для онлайн-оплаты (сбор Т-Банк, Сбер, эквайринг)
  instructionNote?: string;
}

export interface FinanceSettings {
  monthlyFixedExpenses: number;
  fixedExpensesDescription?: string;
  fixedExpenseItems?: ExpenseItem[];
  paymentDetails?: PaymentDetails;
}

export interface HistoryItem {
  id: string;
  category: 'RENTAL' | 'PAYMENT' | 'REPAIR' | 'FLEET' | 'CLIENT' | 'INFO' | 'SYSTEM';
  action: string;
  title: string;
  details: string;
  timestamp: string;
  actor: string;
  amount?: number;
  badgeText: string;
  badgeColor: string;
  entityId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: string;
  text: string;
  createdAt: string;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  userRole?: string;
  roleTitle?: string;
  lastSeenAt: string;
  deviceInfo?: string;
}



