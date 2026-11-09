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
    id: 'usr-demo',
    login: 'demo',
    username: 'demo',
    email: 'demo@electream.ru',
    passwordHash: 'scrypt:1234567890abcdef1234567890abcdef:221af72c20f716c2cc32eec6ba806377e35df46d446912ac6960918424e320c69ef9c685494dfc2ddb95e5f721c1ddc903bd641333fbedde68638b31634a4e14',
    fullName: 'Демо-Администратор',
    phone: '+7 (999) 777-88-99',
    role: 'ADMIN' as const,
    roleTitle: 'Демо-Администратор',
    accessLevelId: 'lvl-owner',
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

export const INITIAL_MODELS = [
  {
    "id": "mdl-minako-monster",
    "name": "Minako Monster Pro 60V",
    "powerWatts": 500,
    "wheelSizeInch": 16,
    "baseRentalPrice": 600,
    "buyoutPrice": 75000,
    "purchasePrice": 45000,
    "salePrice": 65000,
    "description": "Флагманский курьерский электровелосипед высокой грузоподъемности"
  },
  {
    "id": "mdl-wenbox-u3",
    "name": "Wenbox U3 Pro 60V",
    "powerWatts": 500,
    "wheelSizeInch": 16,
    "baseRentalPrice": 550,
    "buyoutPrice": 70000,
    "purchasePrice": 42000,
    "salePrice": 60000,
    "description": "Надежный городской электробайк для интенсивных смен"
  }
];
export const INITIAL_BATTERY_MODELS = [
  {
    "id": "bat-mdl-60v21ah",
    "name": "АКБ 60V 21Ah (Li-ion)",
    "voltage": 60,
    "capacityAh": 21,
    "chemistry": "Li-ion",
    "purchasePrice": 18000,
    "salePrice": 28000,
    "description": "Штатная тяговая батарея для Minako Monster"
  },
  {
    "id": "bat-mdl-60v30ah",
    "name": "АКБ 60V 30Ah Long Range",
    "voltage": 60,
    "capacityAh": 30,
    "chemistry": "Li-ion",
    "purchasePrice": 24000,
    "salePrice": 36000,
    "description": "Увеличенная емкость для смен до 14 часов"
  }
];
export const INITIAL_BIKES = [
  {
    "id": "bike-demo-1",
    "inventoryNumber": "ЭВ-001",
    "modelId": "mdl-minako-monster",
    "frameNumber": "FRM-MONSTER-001",
    "motorNumber": "MTR-500W-001",
    "voltage": 60,
    "status": "AVAILABLE",
    "installedBatteryId": null,
    "mileageKm": 120,
    "photos": [],
    "createdAt": "2026-11-01T00:00:00.000Z"
  },
  {
    "id": "bike-demo-2",
    "inventoryNumber": "ЭВ-002",
    "modelId": "mdl-minako-monster",
    "frameNumber": "FRM-MONSTER-002",
    "motorNumber": "MTR-500W-002",
    "voltage": 60,
    "status": "AVAILABLE",
    "installedBatteryId": null,
    "mileageKm": 85,
    "photos": [],
    "createdAt": "2026-11-01T00:00:00.000Z"
  },
  {
    "id": "bike-demo-3",
    "inventoryNumber": "ЭВ-003",
    "modelId": "mdl-wenbox-u3",
    "frameNumber": "FRM-WENBOX-003",
    "motorNumber": "MTR-500W-003",
    "voltage": 60,
    "status": "AVAILABLE",
    "installedBatteryId": null,
    "mileageKm": 210,
    "photos": [],
    "createdAt": "2026-11-01T00:00:00.000Z"
  },
  {
    "id": "bike-demo-4",
    "inventoryNumber": "ЭВ-004",
    "modelId": "mdl-wenbox-u3",
    "frameNumber": "FRM-WENBOX-004",
    "motorNumber": "MTR-500W-004",
    "voltage": 60,
    "status": "AVAILABLE",
    "installedBatteryId": null,
    "mileageKm": 0,
    "photos": [],
    "createdAt": "2026-11-01T00:00:00.000Z"
  }
];
export const INITIAL_BATTERIES = [
  {
    "id": "bat-demo-1",
    "serialNumber": "BAT-60V-001",
    "modelId": "bat-mdl-60v21ah",
    "voltage": 60,
    "capacityAh": 21,
    "sohPercent": 99,
    "chargeCycles": 28,
    "status": "AVAILABLE",
    "installedBikeId": null,
    "createdAt": "2026-11-01T00:00:00.000Z"
  },
  {
    "id": "bat-demo-2",
    "serialNumber": "BAT-60V-002",
    "modelId": "bat-mdl-60v21ah",
    "voltage": 60,
    "capacityAh": 21,
    "sohPercent": 97,
    "chargeCycles": 45,
    "status": "AVAILABLE",
    "installedBikeId": null,
    "createdAt": "2026-11-01T00:00:00.000Z"
  },
  {
    "id": "bat-demo-3",
    "serialNumber": "BAT-60V-003",
    "modelId": "bat-mdl-60v30ah",
    "voltage": 60,
    "capacityAh": 30,
    "sohPercent": 100,
    "chargeCycles": 12,
    "status": "AVAILABLE",
    "installedBikeId": null,
    "createdAt": "2026-11-01T00:00:00.000Z"
  },
  {
    "id": "bat-demo-4",
    "serialNumber": "BAT-60V-004",
    "modelId": "bat-mdl-60v30ah",
    "voltage": 60,
    "capacityAh": 30,
    "sohPercent": 98,
    "chargeCycles": 34,
    "status": "AVAILABLE",
    "installedBikeId": null,
    "createdAt": "2026-11-01T00:00:00.000Z"
  }
];
export const INITIAL_OUTFITS = [
  {
    "id": "outfit-demo-1",
    "name": "Шлем защитный курьерский (M/L)",
    "category": "cat-helmet",
    "inventoryNumber": "EQ-001",
    "serialNumber": "EQ-001",
    "depositValue": 1500,
    "depositAmount": 1500,
    "purchasePrice": 800,
    "salePrice": 1500,
    "status": "IN_STOCK",
    "createdAt": "2026-11-01T00:00:00.000Z"
  },
  {
    "id": "outfit-demo-2",
    "name": "Замок цепной противоугонный 10 мм",
    "category": "cat-lock",
    "inventoryNumber": "EQ-002",
    "serialNumber": "EQ-002",
    "depositValue": 2000,
    "depositAmount": 2000,
    "purchasePrice": 1000,
    "salePrice": 2000,
    "status": "IN_STOCK",
    "createdAt": "2026-11-01T00:00:00.000Z"
  },
  {
    "id": "outfit-demo-3",
    "name": "Термосумка курьерская 45л",
    "category": "cat-bag",
    "inventoryNumber": "EQ-003",
    "serialNumber": "EQ-003",
    "depositValue": 2500,
    "depositAmount": 2500,
    "purchasePrice": 1200,
    "salePrice": 2500,
    "status": "IN_STOCK",
    "createdAt": "2026-11-01T00:00:00.000Z"
  }
];
export const INITIAL_OUTFIT_TEMPLATES = [
  {
    "id": "tmpl-helmet",
    "name": "Шлем защитный курьерский (M/L)",
    "categoryId": "cat-helmet",
    "category": "cat-helmet",
    "defaultDeposit": 1500,
    "depositAmount": 1500,
    "purchasePrice": 800,
    "salePrice": 1500,
    "description": "Усиленный ABS-пластик с вентиляцией"
  },
  {
    "id": "tmpl-lock",
    "name": "Замок цепной противоугонный 10 мм",
    "categoryId": "cat-lock",
    "category": "cat-lock",
    "defaultDeposit": 2000,
    "depositAmount": 2000,
    "purchasePrice": 1000,
    "salePrice": 2000,
    "description": "Закаленная сталь 10мм в нейлоновом чехле"
  },
  {
    "id": "tmpl-bag",
    "name": "Термосумка курьерская 45л",
    "categoryId": "cat-bag",
    "category": "cat-bag",
    "defaultDeposit": 2500,
    "depositAmount": 2500,
    "purchasePrice": 1200,
    "salePrice": 2500,
    "description": "Фольгированный термослой с перегородками"
  }
];
export const INITIAL_CLIENTS: any[] = [];
export const INITIAL_PARTS = [
  {
    "id": "part-demo-1",
    "name": "Колодки тормозные Monster (полуметалл)",
    "categoryId": "cat-part-brakes",
    "sku": "PRT-001",
    "quantity": 30,
    "minQuantity": 10,
    "purchasePrice": 250,
    "clientPrice": 600,
    "costPrice": 250,
    "price": 600,
    "unit": "компл.",
    "description": "Износостойкие тормозные колодки для гидравлических тормозов"
  },
  {
    "id": "part-demo-2",
    "name": "Камера 16×3.0 усиленная (бутил)",
    "categoryId": "cat-part-wheels",
    "sku": "PRT-002",
    "quantity": 20,
    "minQuantity": 8,
    "purchasePrice": 350,
    "clientPrice": 800,
    "costPrice": 350,
    "price": 800,
    "unit": "шт.",
    "description": "Утолщенная антипрокольная камера для курьерских условий"
  },
  {
    "id": "part-demo-3",
    "name": "Контроллер 60V 500W синусный",
    "categoryId": "cat-part-controllers",
    "sku": "PRT-003",
    "quantity": 6,
    "minQuantity": 2,
    "purchasePrice": 2100,
    "clientPrice": 3800,
    "costPrice": 2100,
    "price": 3800,
    "unit": "шт.",
    "description": "Оригинальный контроллер с тихим плавным стартом"
  },
  {
    "id": "part-demo-4",
    "name": "Ручка газа с вольтметром и ключом",
    "categoryId": "cat-part-steering",
    "sku": "PRT-004",
    "quantity": 12,
    "minQuantity": 4,
    "purchasePrice": 500,
    "clientPrice": 1200,
    "costPrice": 500,
    "price": 1200,
    "unit": "шт.",
    "description": "Универсальная ручка газа с цифровой индикацией вольтажа"
  }
];
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

export const INITIAL_TARIFFS = [
  {
    "id": "trf-weekly-standard",
    "name": "Недельный стандарт (Minako Monster)",
    "type": "STANDARD",
    "bikeModelId": "mdl-minako-monster",
    "durationDays": 7,
    "price": 3850,
    "depositAmount": 3000,
    "paymentIntervalDays": 7,
    "isActive": true,
    "description": "Оплата раз в неделю, депозит возвращается при сдаче техники"
  },
  {
    "id": "trf-rent-to-own-90",
    "name": "Выкуп за 90 дней (Rent-to-Own)",
    "type": "RENT_TO_OWN",
    "bikeModelId": "mdl-minako-monster",
    "durationDays": 90,
    "price": 900,
    "depositAmount": 5000,
    "buyoutPrice": 81000,
    "paymentIntervalDays": 1,
    "isActive": true,
    "description": "Посуточная оплата с переходом электровелосипеда в собственность курьера"
  }
];

export const INITIAL_EMPLOYEES: any[] = [];

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
