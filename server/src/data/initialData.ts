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

export const INITIAL_MODELS = [
  {
    id: "mdl-1",
    name: "Minako Monster",
    powerWatts: 800,
    batteryCapacityAh: 21.0,
    wheelSizeInch: 16.0,
    winterVersion: false,
  },
  {
    id: "mdl-2",
    name: "Minako Monster Winter Pro",
    powerWatts: 1000,
    batteryCapacityAh: 24.0,
    wheelSizeInch: 16.0,
    winterVersion: true,
  },
  {
    id: "mdl-3",
    name: "Wenbox U3 Pro",
    powerWatts: 600,
    batteryCapacityAh: 20.0,
    wheelSizeInch: 14.0,
    winterVersion: false,
  },
  {
    id: "mdl-4",
    name: "Minako V8 Pro",
    powerWatts: 500,
    batteryCapacityAh: 18.0,
    wheelSizeInch: 18.0,
    winterVersion: false,
  },
  {
    id: "mdl-5",
    name: "Wenbox Monster Max",
    powerWatts: 1200,
    batteryCapacityAh: 30.0,
    wheelSizeInch: 16.0,
    winterVersion: true,
  },
];

export const INITIAL_BIKES = [
  {
    id: "bike-001",
    inventoryNumber: "EV-001",
    modelId: "mdl-1",
    frameNumber: "FRM-MNK-9812",
    motorNumber: "MTR-800W-0192",
    status: "AVAILABLE" as const,
    currentLocation: "Центральная база (м. Дмитровская)",
    mileageKm: 340.5,
    note: "Свежее ТО, новые передние колодки",
  },
  {
    id: "bike-002",
    inventoryNumber: "EV-002",
    modelId: "mdl-2",
    frameNumber: "FRM-MNK-9813",
    motorNumber: "MTR-1000W-0211",
    status: "RENTED" as const,
    currentLocation: "В аренде (Северный округ)",
    mileageKm: 1420.0,
    note: "Зимняя шипованная резина установлена",
  },
  {
    id: "bike-003",
    inventoryNumber: "EV-003",
    modelId: "mdl-3",
    frameNumber: "FRM-WNB-5541",
    motorNumber: "MTR-600W-0084",
    status: "AVAILABLE" as const,
    currentLocation: "Центральная база (м. Дмитровская)",
    mileageKm: 620.0,
    note: "Идеальное состояние",
  },
  {
    id: "bike-004",
    inventoryNumber: "EV-004",
    modelId: "mdl-4",
    frameNumber: "FRM-MNK-4412",
    motorNumber: "MTR-500W-0199",
    status: "RENTED" as const,
    currentLocation: "В аренде (Южный округ)",
    mileageKm: 2150.0,
    note: "Тариф с выкупом",
  },
  {
    id: "bike-005",
    inventoryNumber: "EV-005",
    modelId: "mdl-1",
    frameNumber: "FRM-MNK-7711",
    motorNumber: "MTR-800W-0532",
    status: "IN_MAINTENANCE" as const,
    currentLocation: "Мастерская СТО",
    mileageKm: 3840.0,
    note: "Замена тормозного диска и прокачка гидролинии",
  },
  {
    id: "bike-006",
    inventoryNumber: "EV-006",
    modelId: "mdl-2",
    frameNumber: "FRM-MNK-8821",
    motorNumber: "MTR-1000W-0422",
    status: "RENTED" as const,
    currentLocation: "В аренде (Центр)",
    mileageKm: 890.0,
    note: "Выдан с термомуфтами",
  },
  {
    id: "bike-007",
    inventoryNumber: "EV-007",
    modelId: "mdl-5",
    frameNumber: "FRM-WNB-9011",
    motorNumber: "MTR-1200W-0901",
    status: "AVAILABLE" as const,
    currentLocation: "Центральная база (м. Дмитровская)",
    mileageKm: 120.0,
    note: "Новый байк из последней поставки",
  },
  {
    id: "bike-008",
    inventoryNumber: "EV-008",
    modelId: "mdl-3",
    frameNumber: "FRM-WNB-5542",
    motorNumber: "MTR-600W-0089",
    status: "AVAILABLE" as const,
    currentLocation: "Центральная база (м. Дмитровская)",
    mileageKm: 1540.0,
    note: "Проверена емкость батареи 19.8Ah",
  },
  {
    id: "bike-009",
    inventoryNumber: "EV-009",
    modelId: "mdl-1",
    frameNumber: "FRM-MNK-3341",
    motorNumber: "MTR-800W-0711",
    status: "RENTED" as const,
    currentLocation: "В аренде (Запад)",
    mileageKm: 4200.0,
    note: "Просрочка платежа 2 дня",
  },
  {
    id: "bike-010",
    inventoryNumber: "EV-010",
    modelId: "mdl-4",
    frameNumber: "FRM-MNK-4419",
    motorNumber: "MTR-500W-0210",
    status: "AVAILABLE" as const,
    currentLocation: "Центральная база (м. Дмитровская)",
    mileageKm: 780.0,
    note: "Готов к выдаче",
  },
  {
    id: "bike-011",
    inventoryNumber: "EV-011",
    modelId: "mdl-5",
    frameNumber: "FRM-WNB-9015",
    motorNumber: "MTR-1200W-0908",
    status: "RENTED" as const,
    currentLocation: "В аренде (Восток)",
    mileageKm: 1100.0,
    note: "Второй АКБ в аренде",
  },
  {
    id: "bike-012",
    inventoryNumber: "EV-012",
    modelId: "mdl-2",
    frameNumber: "FRM-MNK-8830",
    motorNumber: "MTR-1000W-0433",
    status: "IN_MAINTENANCE" as const,
    currentLocation: "Мастерская СТО",
    mileageKm: 2900.0,
    note: "Ожидает контроллер с центрального склада",
  },
  {
    id: "bike-013",
    inventoryNumber: "EV-013",
    modelId: "mdl-1",
    frameNumber: "FRM-MNK-3388",
    motorNumber: "MTR-800W-0799",
    status: "AVAILABLE" as const,
    currentLocation: "Центральная база (м. Дмитровская)",
    mileageKm: 510.0,
    note: "Готов к выдаче",
  },
  {
    id: "bike-014",
    inventoryNumber: "EV-014",
    modelId: "mdl-3",
    frameNumber: "FRM-WNB-5599",
    motorNumber: "MTR-600W-0150",
    status: "FOR_SALE" as const,
    currentLocation: "Шоурум б/у техники",
    mileageKm: 6500.0,
    note: "Снят с аренды, выставлен на продажу за 38 000 руб.",
  },
  {
    id: "bike-015",
    inventoryNumber: "EV-015",
    modelId: "mdl-4",
    frameNumber: "FRM-MNK-4499",
    motorNumber: "MTR-500W-0300",
    status: "DECOMMISSIONED" as const,
    currentLocation: "Склад запчастей (донор)",
    mileageKm: 9200.0,
    note: "Списан после тотального повреждения рамы в ДТП",
  },
];

export const INITIAL_OUTFITS = [
  {
    id: "outfit-1",
    name: "Шлем защитный с визором M (Черный)",
    category: "HELMET" as const,
    inventoryNumber: "EQ-HLM-001",
    depositValue: 2000,
    status: "ISSUED" as const,
  },
  {
    id: "outfit-2",
    name: "Шлем защитный с визором L (Черный)",
    category: "HELMET" as const,
    inventoryNumber: "EQ-HLM-002",
    depositValue: 2000,
    status: "IN_STOCK" as const,
  },
  {
    id: "outfit-3",
    name: "Замок цепной закаленный 10мм 120см",
    category: "LOCK" as const,
    inventoryNumber: "EQ-LCK-001",
    depositValue: 1500,
    status: "ISSUED" as const,
  },
  {
    id: "outfit-4",
    name: "Замок цепной закаленный 10мм 120см",
    category: "LOCK" as const,
    inventoryNumber: "EQ-LCK-002",
    depositValue: 1500,
    status: "IN_STOCK" as const,
  },
  {
    id: "outfit-5",
    name: "Сумка курьерская термостойкая 45L",
    category: "BAG" as const,
    inventoryNumber: "EQ-BAG-001",
    depositValue: 2500,
    status: "IN_STOCK" as const,
  },
  {
    id: "outfit-6",
    name: "Аккумулятор дополнительный 60V 21Ah Li-Ion",
    category: "BATTERY" as const,
    inventoryNumber: "EQ-BAT-001",
    depositValue: 18000,
    status: "ISSUED" as const,
  },
  {
    id: "outfit-7",
    name: "Быстрое зарядное устройство 60V 5A",
    category: "CHARGER" as const,
    inventoryNumber: "EQ-CHG-001",
    depositValue: 3500,
    status: "ISSUED" as const,
  },
  {
    id: "outfit-8",
    name: "Быстрое зарядное устройство 60V 5A",
    category: "CHARGER" as const,
    inventoryNumber: "EQ-CHG-002",
    depositValue: 3500,
    status: "IN_STOCK" as const,
  },
  {
    id: "outfit-9",
    name: "Держатель телефона металлический с виброгасителем",
    category: "PHONE_HOLDER" as const,
    inventoryNumber: "EQ-PHN-001",
    depositValue: 1200,
    status: "ISSUED" as const,
  },
  {
    id: "outfit-10",
    name: "Муфты на руль ветрозащитные утепленные (пара)",
    category: "WINTER_GLOVES" as const,
    inventoryNumber: "EQ-GLV-001",
    depositValue: 1800,
    status: "IN_STOCK" as const,
  },
];

export const INITIAL_CLIENTS = [
  {
    id: "cli-1",
    fullName: "Рахимжонов Азизбек Бахтиярович",
    phone: "+7 (901) 234-56-78",
    telegram: "@aziz_courier",
    passportSerial: "FA",
    passportNumber: "4829104",
    citizenship: "Узбекистан",
    migrationCard: "МК 45-88-29104",
    patentNumber: "ПАТ-77-992140",
    courierService: "Яндекс Еда",
    documentPhotoUrls: ["/uploads/samples/passport_sample1.jpg", "/uploads/samples/patent_sample1.jpg"],
    status: "NORMAL" as const,
    blackListReason: null,
  },
  {
    id: "cli-2",
    fullName: "Мамадалиев Нурсултан Эркинович",
    phone: "+7 (902) 345-67-89",
    telegram: "@nurs_delivery",
    passportSerial: "AN",
    passportNumber: "1094821",
    citizenship: "Кыргызстан",
    migrationCard: "МК 50-12-88412",
    patentNumber: "ЕАЭС (без патента)",
    courierService: "Самокат",
    documentPhotoUrls: ["/uploads/samples/passport_sample2.jpg"],
    status: "VIP" as const,
    blackListReason: null,
  },
  {
    id: "cli-3",
    fullName: "Сидоров Артем Викторович",
    phone: "+7 (903) 456-78-90",
    telegram: "@artem_sid",
    passportSerial: "4518",
    passportNumber: "782190",
    citizenship: "РФ",
    migrationCard: null,
    patentNumber: null,
    courierService: "Купер",
    documentPhotoUrls: [],
    status: "NORMAL" as const,
    blackListReason: null,
  },
  {
    id: "cli-4",
    fullName: "Худойбердиев Сардор Джамшедович",
    phone: "+7 (904) 567-89-01",
    telegram: "@sardor_express",
    passportSerial: "TJ",
    passportNumber: "3819024",
    citizenship: "Таджикистан",
    migrationCard: "МК 77-33-10293",
    patentNumber: "ПАТ-77-109284",
    courierService: "Яндекс Еда",
    documentPhotoUrls: [],
    status: "PROBLEM" as const,
    blackListReason: "Задержка платежа более 3 дней, не выходит на связь вовремя",
  },
  {
    id: "cli-5",
    fullName: "Калинин Денис Андреевич",
    phone: "+7 (905) 678-90-12",
    telegram: "@den_speed",
    passportSerial: "4520",
    passportNumber: "312984",
    citizenship: "РФ",
    migrationCard: null,
    patentNumber: null,
    courierService: "Самокат",
    documentPhotoUrls: [],
    status: "NORMAL" as const,
    blackListReason: null,
  },
  {
    id: "cli-6",
    fullName: "Юлдашев Илхом Муродович",
    phone: "+7 (906) 789-01-23",
    telegram: "@ilhom_courier",
    passportSerial: "UZ",
    passportNumber: "9912048",
    citizenship: "Узбекистан",
    migrationCard: "МК 77-09-54129",
    patentNumber: "ПАТ-77-551029",
    courierService: "Купер",
    documentPhotoUrls: [],
    status: "VIP" as const,
    blackListReason: null,
  },
  {
    id: "cli-7",
    fullName: "Петров Михаил Сергеевич",
    phone: "+7 (907) 890-12-34",
    telegram: "@mikhail_p",
    passportSerial: "4512",
    passportNumber: "654120",
    citizenship: "РФ",
    migrationCard: null,
    patentNumber: null,
    courierService: "Яндекс Еда",
    documentPhotoUrls: [],
    status: "BLACKLIST" as const,
    blackListReason: "Попытка разобрать байк на запчасти, сорваны пломбы АКБ, скрывался",
  },
  {
    id: "cli-8",
    fullName: "Шарипов Умед Азимович",
    phone: "+7 (908) 901-23-45",
    telegram: "@umed_tjk",
    passportSerial: "TJ",
    passportNumber: "5512903",
    citizenship: "Таджикистан",
    migrationCard: "МК 50-88-10924",
    patentNumber: "ПАТ-50-291840",
    courierService: "Яндекс Еда",
    documentPhotoUrls: [],
    status: "NORMAL" as const,
    blackListReason: null,
  },
  {
    id: "cli-9",
    fullName: "Васильев Олег Игоревич",
    phone: "+7 (909) 012-34-56",
    telegram: "@oleg_vas",
    passportSerial: "4516",
    passportNumber: "449102",
    citizenship: "РФ",
    migrationCard: null,
    patentNumber: null,
    courierService: "Купер",
    documentPhotoUrls: [],
    status: "NORMAL" as const,
    blackListReason: null,
  },
  {
    id: "cli-10",
    fullName: "Абдуллаев Бахром Саидович",
    phone: "+7 (910) 123-45-67",
    telegram: "@bahrom_fast",
    passportSerial: "UZ",
    passportNumber: "8841920",
    citizenship: "Узбекистан",
    migrationCard: "МК 77-44-88192",
    patentNumber: "ПАТ-77-991204",
    courierService: "Самокат",
    documentPhotoUrls: [],
    status: "NORMAL" as const,
    blackListReason: null,
  },
];

export const INITIAL_TARIFFS = [
  {
    id: "trf-1",
    name: "Суточный (Тест-драйв)",
    type: "STANDARD" as const,
    durationDays: 1,
    price: 1200,
    depositRequired: 3000,
    isActive: true,
  },
  {
    id: "trf-2",
    name: "Недельный рабочий (7 дней)",
    type: "STANDARD" as const,
    durationDays: 7,
    price: 6000,
    depositRequired: 5000,
    isActive: true,
  },
  {
    id: "trf-3",
    name: "Месячный оптимал (30 дней)",
    type: "STANDARD" as const,
    durationDays: 30,
    price: 21000,
    depositRequired: 7000,
    isActive: true,
  },
  {
    id: "trf-4",
    name: "Выкуп байка Rent-to-Own (9 месяцев)",
    type: "RENT_TO_OWN" as const,
    durationDays: 30,
    price: 25000,
    depositRequired: 10000,
    isActive: true,
  },
];

export const INITIAL_PARTS = [
  {
    id: "prt-1",
    name: "Колодки тормозные гидравлические (пара)",
    sku: "SKU-BRAKE-01",
    quantity: 14,
    minQuantity: 5,
    purchasePrice: 350,
    clientPrice: 900,
  },
  {
    id: "prt-2",
    name: "Покрышка 16x3.0 зимняя шипованная Kenda",
    sku: "SKU-TYRE-01",
    quantity: 2, // Low stock alert!
    minQuantity: 4,
    purchasePrice: 1800,
    clientPrice: 3200,
  },
  {
    id: "prt-3",
    name: "Камера 16x3.0 бутиловая с усиленным ниппелем",
    sku: "SKU-TUBE-01",
    quantity: 8,
    minQuantity: 6,
    purchasePrice: 400,
    clientPrice: 950,
  },
  {
    id: "prt-4",
    name: "Цепь усиленная KMC Z-8.3",
    sku: "SKU-CHAIN-01",
    quantity: 6,
    minQuantity: 3,
    purchasePrice: 750,
    clientPrice: 1600,
  },
  {
    id: "prt-5",
    name: "Ручка газа с вольтметром и ключом зажигания",
    sku: "SKU-THROTTLE-01",
    quantity: 1, // Low stock alert!
    minQuantity: 3,
    purchasePrice: 850,
    clientPrice: 1900,
  },
  {
    id: "prt-6",
    name: "Контроллер 60V 800W синусный влагозащищенный",
    sku: "SKU-CTRL-01",
    quantity: 3,
    minQuantity: 2,
    purchasePrice: 3200,
    clientPrice: 5800,
  },
  {
    id: "prt-7",
    name: "Фара LED линзованная с встроенным сигналом",
    sku: "SKU-LIGHT-01",
    quantity: 5,
    minQuantity: 3,
    purchasePrice: 1100,
    clientPrice: 2400,
  },
  {
    id: "prt-8",
    name: "Тормозной диск 160мм стальной 6 болтов",
    sku: "SKU-ROTOR-01",
    quantity: 7,
    minQuantity: 4,
    purchasePrice: 450,
    clientPrice: 1100,
  },
];

export const INITIAL_RENTALS = [
  {
    id: "rnt-001",
    rentalNumber: "RNT-2026-001",
    clientId: "cli-2",
    bikeId: "bike-002",
    tariffId: "trf-2",
    managerId: "usr-mgr-1",
    status: "ACTIVE" as const,
    type: "STANDARD" as const,
    startedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 4 * 86400000).toISOString(),
    nextPaymentDue: new Date(Date.now() + 4 * 86400000).toISOString(),
    depositAmount: 5000,
    depositRefunded: false,
    notes: "Выдан шлем и цепной замок. Оплата за неделю поступила.",
    outfitIds: ["outfit-1", "outfit-3"],
  },
  {
    id: "rnt-002",
    rentalNumber: "RNT-2026-002",
    clientId: "cli-4",
    bikeId: "bike-009",
    tariffId: "trf-2",
    managerId: "usr-mgr-1",
    status: "OVERDUE" as const,
    type: "STANDARD" as const,
    startedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    nextPaymentDue: new Date(Date.now() - 2 * 86400000).toISOString(),
    depositAmount: 5000,
    depositRefunded: false,
    notes: "Срок аренды истек 2 дня назад! Оплата не внесена, звонили курьеру.",
    outfitIds: ["outfit-7"],
  },
  {
    id: "rnt-003",
    rentalNumber: "RNT-2026-003",
    clientId: "cli-5",
    bikeId: "bike-004",
    tariffId: "trf-4",
    managerId: "usr-mgr-1",
    status: "ACTIVE" as const,
    type: "RENT_TO_OWN" as const,
    startedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
    nextPaymentDue: new Date(Date.now() + 15 * 86400000).toISOString(),
    depositAmount: 10000,
    depositRefunded: false,
    notes: "Договор выкупа байка № 4. Месяц 2 из 9.",
    outfitIds: ["outfit-9"],
  },
  {
    id: "rnt-004",
    rentalNumber: "RNT-2026-004",
    clientId: "cli-6",
    bikeId: "bike-006",
    tariffId: "trf-3",
    managerId: "usr-mgr-1",
    status: "ACTIVE" as const,
    type: "STANDARD" as const,
    startedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
    nextPaymentDue: new Date(Date.now() + 25 * 86400000).toISOString(),
    depositAmount: 7000,
    depositRefunded: false,
    notes: "Аккумулятор и зарядное в комплекте.",
    outfitIds: ["outfit-6"],
  },
];

export const INITIAL_REPAIRS = [
  {
    id: "rep-001",
    orderNumber: "REP-2026-001",
    bikeId: "bike-005",
    mechanicId: "usr-mech-1",
    status: "IN_PROGRESS" as const,
    faultType: "COMPANY_EXPENSE" as const,
    description: "Плановое ТО и замена изношенных тормозных колодок и ротора 160мм",
    laborCost: 800,
    partsCost: 800, // колодки (350) + диск (450)
    totalCost: 1600,
    parts: [
      { partId: "prt-1", quantity: 1, priceCharged: 350 },
      { partId: "prt-8", quantity: 1, priceCharged: 450 },
    ],
  },
  {
    id: "rep-002",
    orderNumber: "REP-2026-002",
    bikeId: "bike-012",
    mechanicId: "usr-mech-1",
    status: "WAITING_PARTS" as const,
    faultType: "CLIENT_FAULT" as const,
    description: "Падение курьера: разбита фара LED, сломана ручка газа с вольтметром",
    laborCost: 1200,
    partsCost: 4300, // фара (2400) + ручка газа (1900)
    totalCost: 5500,
    parts: [
      { partId: "prt-5", quantity: 1, priceCharged: 1900 },
      { partId: "prt-7", quantity: 1, priceCharged: 2400 },
    ],
  },
];

export const INITIAL_PAYMENTS = [
  {
    id: "pay-1",
    rentalId: "rnt-001",
    type: "RENTAL" as const,
    amount: 6000,
    method: "CARD" as const,
    description: "Оплата тарифа Недельный по договору RNT-2026-001",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "pay-2",
    rentalId: "rnt-001",
    type: "DEPOSIT" as const,
    amount: 5000,
    method: "SBP" as const,
    description: "Обеспечительный залог по договору RNT-2026-001",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "pay-3",
    rentalId: "rnt-003",
    type: "RENTAL" as const,
    amount: 25000,
    method: "BANK_TRANSFER" as const,
    description: "Платеж за выкуп (месяц 2) по договору RNT-2026-003",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "pay-4",
    rentalId: "rnt-003",
    type: "DEPOSIT" as const,
    amount: 10000,
    method: "BANK_TRANSFER" as const,
    description: "Залог по договору выкупа RNT-2026-003",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "pay-5",
    rentalId: "rnt-004",
    type: "RENTAL" as const,
    amount: 21000,
    method: "CARD" as const,
    description: "Оплата тарифа Месячный по договору RNT-2026-004",
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "pay-6",
    rentalId: null,
    type: "REPAIR" as const,
    amount: 5500,
    method: "CASH" as const,
    description: "Оплата ремонта по вине курьера (Заказ-наряд REP-2026-002)",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

export const INITIAL_REVIEWS = [
  {
    id: "rev-1",
    clientId: "cli-2",
    bikeId: "bike-002",
    rating: 5,
    comment: "Minako Monster Winter Pro просто зверь в сугробах! Шипованная резина держит отлично, заряда на смену 12 часов хватает без проблем.",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "rev-2",
    clientId: "cli-6",
    bikeId: "bike-006",
    rating: 5,
    comment: "Очень удобная посадка, тормоза гидравлические работают как часы. В сервисе выдали быстро за 10 минут.",
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "rev-3",
    clientId: "cli-3",
    bikeId: "bike-003",
    rating: 4,
    comment: "Wenbox U3 Pro легкий и юркий в подъездах, но для моего роста 185см руль хотелось бы чуть повыше.",
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

export const INITIAL_ARTICLES = [
  {
    id: "art-1",
    title: "Регламент выдачи электровелосипеда курьеру",
    category: "Регламенты выдачи",
    content: `# Регламент выдачи электровелосипеда в аренду

## 1. Подготовительный этап
1. Проверить паспорт гражданина РФ или комплект документов СНГ:
   - Паспорт с нотариальным переводом (при необходимости);
   - Миграционная карта с действующим сроком;
   - Патент с чеками об уплате НДФЛ за текущий месяц;
   - Регистрация по месту пребывания.
2. Проверить статус курьера в базе на отсутствие в **Черном списке (BLACKLIST)**.

## 2. Осмотр техники перед выдачей
- Проверить давление в шинах (2.5-3.0 bar);
- Проверить работу гидравлических тормозов (отсутствие подтеков минерального масла, свободный ход ручки не более 2 см);
- Проверить напряжение АКБ по вольтметру (для 60V батареи: 67.2V полный заряд, не ниже 62V при выдаче);
- Проверить светотехнику: передняя фара, стоп-сигнал, звуковой сигнал;
- Зафиксировать пробег в CRM и договоре.

## 3. Оформление и подписание
- Сгенерировать и распечатать в CRM **Акт приема-передачи** в 2 экземплярах;
- Указать инвентарные номера байка и каждого выданного аксессуара (шлем, замок, второй АКБ);
- Принять оплату аренды и обеспечительного депозита (наличные, карта, СБП);
- Передать ключи от зажигания и замка батареи.`,
    authorId: "usr-admin-1",
  },
  {
    id: "art-2",
    title: "Инструкция по приемке байка из аренды и чек-лист дефектов",
    category: "Регламенты выдачи",
    content: `# Инструкция по приемке электровелосипеда из аренды

При возврате байка менеджер обязан лично провести осмотр по следующему чек-листу:

### Чек-лист проверки:
1. **Колеса и покрышки:**
   - Отсутствие грыж, глубоких порезов и торчащего корда;
   - Отсутствие сильных восьмерок на ободах.
2. **Тормозная система:**
   - Целостность тормозных рычагов (не погнуты ли при падении);
   - Толщина фрикционного слоя тормозных колодок (минимум 1 мм);
   - Отсутствие следов удара на тормозных дисках.
3. **Электрика и АКБ:**
   - Отсутствие трещин и вмятин на корпусе аккумулятора;
   - Целостность разъемов XT60 / Anderson;
   - Работа дисплея/вольтметра и ручки газа.
4. **Возврат экипировки:**
   - Шлем: отсутствие сколов и трещин корпуса пенополистирола;
   - Замок: наличие обоих ключей, исправность личинки;
   - Зарядное устройство: целый кабель, рабочий вентилятор охлаждения.

> [!IMPORTANT]
> Если обнаружены следы ударов, трещины или повреждения электрики, байк **НЕЛЬЗЯ** переводить в статус AVAILABLE. Переведите его в IN_MAINTENANCE и создайте заказ-наряд СТО с типом **CLIENT_FAULT**.`,
    authorId: "usr-admin-1",
  },
  {
    id: "art-3",
    title: "СТО: Разделение ответственности (Износ vs Вина курьера)",
    category: "СТО и Ремонт",
    content: `# Правила разделения затрат в мастерской СТО

Четкое разграничение позволяет исключить споры с курьерами и защитить маржинальность сервиса.

---

## 1. За счет компании (COMPANY_EXPENSE)
Курьер **НЕ ОПЛАЧИВАЕТ** следующие работы и запчасти:
- Естественный износ тормозных колодок при пробеге более 800 км;
- Замена растянутой приводной цепи при нормальном регламенте;
- Прокол камеры (1 прокол в месяц компенсируется сервисом);
- Выход из строя контроллера или датчиков Холла при отсутствии механических повреждений и залития водой;
- Плановая смазка подшипников рулевой колонки и каретки.

---

## 2. По вине курьера (CLIENT_FAULT)
Курьер **ОБЯЗАН ОПЛАТИТЬ** стоимость запчастей по клиентскому прайсу + работу мастера:
- Механические повреждения от ДТП или падений (погнутая вилка, сломанные ручки, разбитая фара);
- Восьмерка обода от удара о бордюр на высокой скорости;
- Оборванные провода мотор-колеса при наматывании посторонних предметов;
- Сгоревший контроллер из-за мойки аппаратом высокого давления (Kärcher) напрямую в электрику;
- Утеря ключей зажигания или зарядного устройства.`,
    authorId: "usr-mech-1",
  },
  {
    id: "art-4",
    title: "Скрипты общения с курьерами при задержке платежа",
    category: "Скрипты общения",
    content: `# Скрипты взаимодействия при просрочке аренды

### День 1 просрочки (Мягкое напоминание):
*«Здравствуйте, [Имя]! Напоминаем, что сегодня подошел срок продления аренды электровелосипеда [EV-XXX]. Сумма к оплате: [Сумма] руб. Пожалуйста, внесите оплату в приложении или через СБП, чтобы байк оставался активным. Хороших доставок!»*

### День 2 просрочки (Предупреждение):
*«[Имя], добрый день! Платеж по аренде до сих пор не поступил. По условиям договора при задержке более 24 часов мы вынуждены начислить штраф 300 руб./день. Если у вас возникли сложности — свяжитесь с менеджером прямо сейчас, найдем решение.»*

### День 3 просрочки (Ультиматум и выезд службы безопасности):
*«Внимание! Оплата не внесена 3 дня. Байк подлежит немедленному возврату на базу до 18:00 сегодня. В противном случае залог 5000 руб. будет удержан в полном объеме, договор расторгнут, а данные переданы в службу безопасности агрегаторов (Яндекс Еда, Купер, Самокат) с внесением в единый черный список курьеров.»*`,
    authorId: "usr-mgr-1",
  },
  {
    id: "art-5",
    title: "FAQ: Эксплуатация аккумуляторов зимой и зарядка",
    category: "FAQ",
    content: `# Правила зимней эксплуатации Li-Ion аккумуляторов 60V

1. **Зарядка только в тепле:**
   - **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО** ставить на зарядку холодный аккумулятор сразу после заезда с улицы при минусовой температуре!
   - Аккумулятор должен отстояться в теплом помещении базы не менее **40-60 минут** для выравнивания температуры банок. Зарядка промерзшего лития приводит к деградации и риску замыкания.

2. **Защита от влаги и снега:**
   - Термочехол должен быть плотно застегнут;
   - Не допускать скопления мокрого снега вокруг силового разъема;
   - При попадании влаги продуть разъем сжатым воздухом.

3. **Снижение емкости на морозе:**
   - При температуре -10°C емкость батареи падает в среднем на 25-30%;
   - Курьеру рекомендуется брать второй сменный АКБ на длительные смены (от 8 часов).`,
    authorId: "usr-mech-1",
  },
];

export const INITIAL_OUTFIT_CATEGORIES = [
  { id: "HELMET", name: "Шлемы и защита", isSystem: true },
  { id: "LOCK", name: "Замки и безопасность", isSystem: true },
  { id: "BAG", name: "Термосумки и кофры", isSystem: true },
  { id: "BATTERY", name: "Дополнительные АКБ", isSystem: true },
  { id: "CHARGER", name: "Зарядные устройства", isSystem: true },
  { id: "PHONE_HOLDER", name: "Держатели смартфона", isSystem: true },
  { id: "WINTER_GLOVES", name: "Зимние муфты и перчатки", isSystem: true },
];

export const INITIAL_OUTFIT_TEMPLATES = [
  {
    id: "tmpl-1",
    name: "Шлем защитный с визором M (Черный)",
    categoryId: "HELMET",
    defaultDeposit: 2000,
    description: "Противоударный шлем с регулируемым визором",
  },
  {
    id: "tmpl-2",
    name: "Замок цепной закаленный 10мм 120см",
    categoryId: "LOCK",
    defaultDeposit: 1500,
    description: "Закаленная сталь, влагозащитный нейлоновый чехол, 3 ключа",
  },
  {
    id: "tmpl-3",
    name: "Сумка курьерская термостойкая 45L",
    categoryId: "BAG",
    defaultDeposit: 2500,
    description: "Термоизоляция до 4 часов, внутренняя перегородка",
  },
  {
    id: "tmpl-4",
    name: "Аккумулятор дополнительный 60V 21Ah Li-Ion",
    categoryId: "BATTERY",
    defaultDeposit: 12000,
    description: "Ячейки 18650, BMS 40A с балансировкой, запас хода до 60 км",
  },
  {
    id: "tmpl-5",
    name: "Быстрое зарядное устройство 60V 5A с кулером",
    categoryId: "CHARGER",
    defaultDeposit: 3500,
    description: "Время полной зарядки батареи 21Ah ~4.5 часа",
  },
  {
    id: "tmpl-6",
    name: "Алюминиевый виброгасящий держатель смартфона",
    categoryId: "PHONE_HOLDER",
    defaultDeposit: 1200,
    description: "Крепление на руль 22-31.8мм, надежный винтовой фиксатор",
  },
  {
    id: "tmpl-7",
    name: "Теплые водонепроницаемые муфты на руль с мехом",
    categoryId: "WINTER_GLOVES",
    defaultDeposit: 1800,
    description: "Зимний пакет: плотная оксфорд ткань, искусственный мех",
  },
];

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

export const INITIAL_RETAIL_ORDERS = [
  {
    id: "ord-2026-001",
    orderNumber: "ORD-2026-001",
    customerType: "EXTERNAL" as const,
    customerName: "Максим Громов",
    customerPhone: "+7 (916) 555-12-34",
    clientId: null,
    items: [
      {
        itemType: "PART" as const,
        itemId: "prt-1",
        name: "Колодки тормозные гидравлические керамика",
        quantity: 2,
        price: 600,
        costPrice: 250,
      },
      {
        itemType: "OUTFIT" as const,
        itemId: "outfit-1",
        name: "Шлем защитный с визором M (Черный)",
        quantity: 1,
        price: 2500,
        costPrice: 1200,
      },
    ],
    totalAmount: 3700,
    totalCost: 1700,
    profit: 2000,
    paymentMethod: "SBP" as const,
    notes: "Покупка расходников для личного Minako Monster",
    createdAt: "2026-02-14T14:30:00.000Z",
  },
];

