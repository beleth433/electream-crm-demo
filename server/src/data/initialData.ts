export const INITIAL_ACCESS_LEVELS = [
  {
    id: "lvl-owner",
    name: "Владелец / SuperAdmin",
    description: "Полный доступ ко всей системе, кассе, прибыли, управлению сотрудниками и паролями",
    isSystem: true,
    canManageEmployees: true,
    canSeeProfits: true,
    permissions: {
      dashboard: { visible: true, canEdit: true, canDelete: true },
      rentals: { visible: true, canEdit: true, canDelete: true },
      shop: { visible: true, canEdit: true, canDelete: true },
      bikes: { visible: true, canEdit: true, canDelete: true },
      batteries: { visible: true, canEdit: true, canDelete: true },
      outfits: { visible: true, canEdit: true, canDelete: true },
      clients: { visible: true, canEdit: true, canDelete: true },
      repairs: { visible: true, canEdit: true, canDelete: true },
      inventory: { visible: true, canEdit: true, canDelete: true },
      finance: { visible: true, canEdit: true, canDelete: true },
      employees: { visible: true, canEdit: true, canDelete: true },
      loyalty: { visible: true, canEdit: true, canDelete: true },
      info: { visible: true, canEdit: true, canDelete: true },
      history: { visible: true, canEdit: true, canDelete: true },
    },
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "lvl-manager",
    name: "Менеджер парка",
    description: "Аренда, курьеры, касса, байки и АКБ. Скрыты сотрудники, настройки и чистая прибыль P&L",
    isSystem: true,
    canManageEmployees: false,
    canSeeProfits: false,
    permissions: {
      dashboard: { visible: true, canEdit: false, canDelete: false },
      rentals: { visible: true, canEdit: true, canDelete: false },
      shop: { visible: true, canEdit: true, canDelete: false },
      bikes: { visible: true, canEdit: true, canDelete: false },
      batteries: { visible: true, canEdit: true, canDelete: false },
      outfits: { visible: true, canEdit: true, canDelete: false },
      clients: { visible: true, canEdit: true, canDelete: false },
      repairs: { visible: true, canEdit: true, canDelete: false },
      inventory: { visible: true, canEdit: true, canDelete: false },
      finance: { visible: true, canEdit: true, canDelete: false },
      employees: { visible: false, canEdit: false, canDelete: false },
      loyalty: { visible: true, canEdit: true, canDelete: false },
      info: { visible: true, canEdit: false, canDelete: false },
      history: { visible: true, canEdit: false, canDelete: false },
    },
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
  {
    id: "lvl-master",
    name: "Мастер СТО",
    description: "Мастерская СТО, склад запчастей, заявки на закупку Ozon, статус техники. Касса и аренда скрыты",
    isSystem: true,
    canManageEmployees: false,
    canSeeProfits: false,
    permissions: {
      dashboard: { visible: false, canEdit: false, canDelete: false },
      rentals: { visible: false, canEdit: false, canDelete: false },
      shop: { visible: false, canEdit: false, canDelete: false },
      bikes: { visible: true, canEdit: true, canDelete: false },
      batteries: { visible: true, canEdit: true, canDelete: false },
      outfits: { visible: true, canEdit: true, canDelete: false },
      clients: { visible: false, canEdit: false, canDelete: false },
      repairs: { visible: true, canEdit: true, canDelete: false },
      inventory: { visible: true, canEdit: true, canDelete: false },
      finance: { visible: false, canEdit: false, canDelete: false },
      employees: { visible: false, canEdit: false, canDelete: false },
      loyalty: { visible: false, canEdit: false, canDelete: false },
      info: { visible: true, canEdit: false, canDelete: false },
      history: { visible: false, canEdit: false, canDelete: false },
    },
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  },
];

export const INITIAL_USERS = [
  {
    id: "usr-bogdan",
    login: "bogdan",
    username: "bogdan",
    email: "bogdan@ebike-crm.ru",
    passwordHash: "1234",
    fullName: "Богдан",
    phone: "+7 (999) 000-02-02",
    role: "MANAGER" as const,
    roleTitle: "Управляющий базой",
    accessLevelId: "lvl-manager",
    isActive: true,
  },
  {
    id: "usr-vladik",
    login: "vladik",
    username: "vladik",
    email: "vladik@ebike-crm.ru",
    passwordHash: "1234",
    fullName: "Владислав",
    phone: "+7 (999) 000-03-03",
    role: "MECHANIC" as const,
    roleTitle: "Мастер СТО",
    accessLevelId: "lvl-master",
    isActive: true,
  },
  {
    id: "usr-bxleth",
    login: "bxleth",
    username: "bxleth",
    email: "bxleth@ebike-crm.ru",
    passwordHash: "admin",
    fullName: "BXLETH",
    phone: "+7 (999) 000-00-00",
    role: "ADMIN" as const,
    roleTitle: "Главный инженер / Разработчик",
    accessLevelId: "lvl-owner",
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

export const INITIAL_PART_ORDER_CATEGORIES = [
  { id: "cat-ord-tuning", name: "Тюнинг", isSystem: false },
  { id: "cat-ord-parts", name: "Запчасти (пластик, ручки, тормоза)", isSystem: false },
  { id: "cat-ord-garage", name: "Закуп для гаража", isSystem: false },
  { id: "cat-ord-tools", name: "Закуп инструментов для работы", isSystem: false },
  { id: "cat-ord-consumables", name: "Расходники (перчатки, очистители)", isSystem: false },
];

export const INITIAL_TARIFFS: any[] = [];

export const INITIAL_EMPLOYEES = [
  {
    id: "emp-bogdan",
    fullName: "Богдан",
    phone: "+7 (999) 000-02-02",
    email: "bogdan@ebike-crm.ru",
    role: "Управляющий базой",
    salaryType: "MONTHLY" as const,
    salaryAmount: 65000,
    status: "ACTIVE" as const,
    hiredAt: "2026-09-01",
    notes: "Ответственный за выдачу байков курьерам и кассу",
  },
  {
    id: "emp-vladik",
    fullName: "Владислав",
    phone: "+7 (999) 000-03-03",
    email: "vladik@ebike-crm.ru",
    role: "Мастер СТО",
    salaryType: "MONTHLY" as const,
    salaryAmount: 60000,
    status: "ACTIVE" as const,
    hiredAt: "2026-09-01",
    notes: "Ремонт электровелосипедов, АКБ, заказ запчастей",
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
