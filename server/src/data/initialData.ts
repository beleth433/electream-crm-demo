export const INITIAL_USERS = [
  {
    id: "usr-admin-1",
    email: "admin@ebike-crm.ru",
    passwordHash: "hash_admin_secret",
    fullName: "Дмитрий Орлов",
    phone: "+7 (999) 111-22-33",
    role: "ADMIN" as const,
    isActive: true,
  },
  {
    id: "usr-mgr-1",
    email: "manager@ebike-crm.ru",
    passwordHash: "hash_manager_secret",
    fullName: "Иван Ковалев",
    phone: "+7 (999) 222-33-44",
    role: "MANAGER" as const,
    isActive: true,
  },
  {
    id: "usr-mech-1",
    email: "mechanic@ebike-crm.ru",
    passwordHash: "hash_mechanic_secret",
    fullName: "Алексей Смирнов",
    phone: "+7 (999) 333-44-55",
    role: "MECHANIC" as const,
    isActive: true,
  },
];

export const INITIAL_MODELS: any[] = [];
export const INITIAL_BATTERY_MODELS: any[] = [];
export const INITIAL_BIKES: any[] = [];
export const INITIAL_BATTERIES: any[] = [];
export const INITIAL_OUTFITS: any[] = [];
export const INITIAL_OUTFIT_TEMPLATES: any[] = [];
export const INITIAL_CLIENTS: any[] = [];
export const INITIAL_PARTS: any[] = [];
export const INITIAL_RENTALS: any[] = [];
export const INITIAL_REPAIRS: any[] = [];
export const INITIAL_PAYMENTS: any[] = [];
export const INITIAL_REVIEWS: any[] = [];
export const INITIAL_ARTICLES: any[] = [];
export const INITIAL_RETAIL_ORDERS: any[] = [];

export const INITIAL_OUTFIT_CATEGORIES = [
  { id: "cat-helmet", name: "Шлемы и защита", isSystem: false },
  { id: "cat-lock", name: "Замки и безопасность", isSystem: false },
  { id: "cat-bag", name: "Термосумки и кофры", isSystem: false },
  { id: "cat-charger", name: "Зарядные устройства", isSystem: false },
  { id: "cat-phone-holder", name: "Держатели смартфона", isSystem: false },
  { id: "cat-winter-gloves", name: "Зимние муфты и перчатки", isSystem: false },
];

export const INITIAL_PART_CATEGORIES = [
  { id: "cat-part-brakes", name: "Колодки и тормоза", isSystem: true },
  { id: "cat-part-steering", name: "Рули и управление", isSystem: true },
  { id: "cat-part-displays", name: "Экраны и дисплеи", isSystem: true },
  { id: "cat-part-controllers", name: "Контроллеры", isSystem: true },
  { id: "cat-part-wheels", name: "Колеса и обода", isSystem: true },
  { id: "cat-part-tires", name: "Шины и камеры", isSystem: true },
  { id: "cat-part-consumables", name: "Расходники", isSystem: true },
  { id: "cat-part-other", name: "Прочее", isSystem: false },
];

export const INITIAL_TARIFFS: any[] = [];

export const INITIAL_EMPLOYEES = [
  {
    id: "emp-1",
    fullName: "Иван Ковалев",
    phone: "+7 (999) 222-33-44",
    email: "manager@ebike-crm.ru",
    role: "Менеджер смены",
    salaryType: "MONTHLY" as const,
    salaryAmount: 75000,
    status: "ACTIVE" as const,
    hiredAt: "2025-10-01",
    notes: "Ответственный за выдачу/прием техники и кассовые операции",
  },
  {
    id: "emp-2",
    fullName: "Алексей Смирнов",
    phone: "+7 (999) 333-44-55",
    email: "mechanic@ebike-crm.ru",
    role: "Старший мастер СТО",
    salaryType: "PER_SHIFT" as const,
    salaryAmount: 3800,
    status: "ACTIVE" as const,
    hiredAt: "2025-11-15",
    notes: "Диагностика электроники, сборка АКБ, сложный ремонт моторов",
  },
  {
    id: "emp-3",
    fullName: "Сергей Морозов",
    phone: "+7 (999) 444-55-66",
    email: "sergey.mech@ebike-crm.ru",
    role: "Помощник механика",
    salaryType: "MONTHLY" as const,
    salaryAmount: 55000,
    status: "ACTIVE" as const,
    hiredAt: "2026-01-10",
    notes: "Шиномонтаж, регламентная замена колодок и цепей",
  },
  {
    id: "emp-4",
    fullName: "Дмитрий Орлов",
    phone: "+7 (999) 111-22-33",
    email: "admin@ebike-crm.ru",
    role: "Управляющий базой",
    salaryType: "MONTHLY" as const,
    salaryAmount: 95000,
    status: "ACTIVE" as const,
    hiredAt: "2025-09-01",
    notes: "Руководитель филиала, контроль парка и финансового баланса",
  },
];

export const INITIAL_LOYALTY_TIERS = [
  {
    id: "tier-bronze",
    name: "Бронза",
    color: "amber",
    minRentalDays: 0,
    minTotalSpent: 0,
    discountRentalPercent: 0,
    discountPartsPercent: 0,
    discountRepairsPercent: 0,
    description: "Начальный базовый ранг для всех новых клиентов и курьеров",
    isDefault: true,
  },
  {
    id: "tier-silver",
    name: "Серебро",
    color: "slate",
    minRentalDays: 14,
    minTotalSpent: 15000,
    discountRentalPercent: 5,
    discountPartsPercent: 5,
    discountRepairsPercent: 5,
    description: "От 14 дней аренды или 15 000 ₽ трат. Скидка 5% на аренду, запчасти и СТО",
    isDefault: false,
  },
  {
    id: "tier-gold",
    name: "Золото",
    color: "emerald",
    minRentalDays: 45,
    minTotalSpent: 45000,
    discountRentalPercent: 10,
    discountPartsPercent: 10,
    discountRepairsPercent: 10,
    description: "От 45 дней аренды или 45 000 ₽ трат. Скидка 10% на все услуги и товары",
    isDefault: false,
  },
  {
    id: "tier-platinum",
    name: "Платина",
    color: "purple",
    minRentalDays: 90,
    minTotalSpent: 100000,
    discountRentalPercent: 15,
    discountPartsPercent: 15,
    discountRepairsPercent: 15,
    description: "От 90 дней аренды или 100 000 ₽ трат. VIP-статус и максимальная скидка 15%",
    isDefault: false,
  },
];
