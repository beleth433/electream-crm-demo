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
    fullName: "Рустам Алиев",
    phone: "+7 (999) 444-55-66",
    email: "rustam.tech@ebike-crm.ru",
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
