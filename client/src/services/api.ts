import {
  Bike,
  BikeModel,
  Battery,
  BatteryModel,
  BatteryStats,
  Client,
  Rental,
  Tariff,
  RepairOrder,
  Part,
  PartOrder,
  PartCategoryItem,
  PartOrderCategoryItem,
  Payment,
  Review,
  DashboardStats,
  User,
  Employee,
  FinanceSettings,
  ExpenseItem,
  Article,
  HistoryItem,
  AccessLevel,
  ChatMessage,
  PresenceUser,
  Outfit,
  OutfitCategoryItem,
  OutfitTemplate,
  LoyaltyTier,
  ShopCatalog,
  RetailOrder,
} from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Pragma: 'no-cache',
      'Cache-Control': 'no-cache',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    let errorMessage = `HTTP error ${res.status}`;
    try {
      const text = await res.text();
      try {
        const errorData = JSON.parse(text);
        if (errorData.error) errorMessage = errorData.error;
      } catch {
        if (text && text.length < 200) errorMessage = `${errorMessage}: ${text}`;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export const api = {
  // Auth
  getMe: (userId?: string) =>
    fetchJson<User>(userId ? `/auth/me?userId=${encodeURIComponent(userId)}` : '/auth/me'),
  login: (email: string, password?: string) =>
    fetchJson<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  // Dashboard
  getDashboardStats: () => fetchJson<DashboardStats>('/dashboard/stats'),

  // Batteries (АКБ)
  getBatteryModels: () => fetchJson<BatteryModel[]>('/batteries/models'),
  createBatteryModel: (data: Partial<BatteryModel>) =>
    fetchJson<BatteryModel>('/batteries/models', { method: 'POST', body: JSON.stringify(data) }),
  updateBatteryModel: (id: string, data: Partial<BatteryModel>) =>
    fetchJson<BatteryModel>(`/batteries/models/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBatteryModel: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/batteries/models/${id}`, { method: 'DELETE' }),
  getBatteries: (params?: { status?: string; voltage?: number; modelId?: string; search?: string; bikeId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.voltage) q.append('voltage', String(params.voltage));
    if (params?.modelId) q.append('modelId', params.modelId);
    if (params?.search) q.append('search', params.search);
    if (params?.bikeId) q.append('bikeId', params.bikeId);
    return fetchJson<Battery[]>(`/batteries?${q.toString()}`);
  },
  getBatteryStats: () => fetchJson<BatteryStats>('/batteries/stats'),
  getBattery: (id: string) => fetchJson<Battery>(`/batteries/${id}`),
  createBattery: (data: Partial<Battery>) =>
    fetchJson<Battery>('/batteries', { method: 'POST', body: JSON.stringify(data) }),
  updateBattery: (id: string, data: Partial<Battery>) =>
    fetchJson<Battery>(`/batteries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBattery: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/batteries/${id}`, { method: 'DELETE' }),
  attachBattery: (batteryId: string, bikeId: string) =>
    fetchJson<{ bike: Bike; battery: Battery }>('/batteries/attach', {
      method: 'POST',
      body: JSON.stringify({ batteryId, bikeId }),
    }),
  detachBattery: (target: string | { bikeId?: string; batteryId?: string }) => {
    const body = typeof target === 'string' ? { bikeId: target } : target;
    return fetchJson<{ bike?: Bike; battery: Battery | null }>('/batteries/detach', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
  swapBattery: (
    target: string | { bikeId?: string; oldBatteryId?: string; newBatteryId: string; sendOldToCharging?: boolean },
    newBatteryId?: string
  ) => {
    const body = typeof target === 'string'
      ? { bikeId: target, newBatteryId }
      : target;
    return fetchJson<{ bike?: Bike; oldBattery?: Battery; newBattery?: Battery }>('/batteries/swap', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Bikes
  getBikes: (params?: { status?: string; modelId?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.modelId) q.append('modelId', params.modelId);
    if (params?.search) q.append('search', params.search);
    return fetchJson<Bike[]>(`/bikes?${q.toString()}`);
  },
  getBikeModels: () => fetchJson<BikeModel[]>('/bikes/models'),
  createBikeModel: (data: Partial<BikeModel>) =>
    fetchJson<BikeModel>('/bikes/models', { method: 'POST', body: JSON.stringify(data) }),
  updateBikeModel: (id: string, data: Partial<BikeModel>) =>
    fetchJson<BikeModel>(`/bikes/models/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBikeModel: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/bikes/models/${id}`, { method: 'DELETE' }),
  getBike: (id: string) => fetchJson<Bike>(`/bikes/${id}`),
  createBike: (data: Partial<Bike>) =>
    fetchJson<Bike>('/bikes', { method: 'POST', body: JSON.stringify(data) }),
  updateBike: (id: string, data: Partial<Bike>) =>
    fetchJson<Bike>(`/bikes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBike: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/bikes/${id}`, { method: 'DELETE' }),

  // Clients
  getClients: (params?: { status?: string; search?: string; courierService?: string; clientType?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.courierService) q.append('courierService', params.courierService);
    if (params?.clientType) q.append('clientType', params.clientType);
    return fetchJson<Client[]>(`/clients?${q.toString()}`);
  },
  getClient: (id: string) => fetchJson<Client>(`/clients/${id}`),
  searchClientByPhone: (phone: string) =>
    fetchJson<Client | null>(`/clients/search/phone?phone=${encodeURIComponent(phone)}`),
  createClient: (data: Partial<Client>) =>
    fetchJson<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: Partial<Client>) =>
    fetchJson<Client>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateClientStatus: (id: string, status: string, reason?: string) =>
    fetchJson<Client>(`/clients/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    }),
  deleteClient: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/clients/${id}`, { method: 'DELETE' }),

  // Rentals
  getRentals: (params?: { status?: string; search?: string; clientId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.clientId) q.append('clientId', params.clientId);
    return fetchJson<Rental[]>(`/rentals?${q.toString()}`);
  },
  getRentalTariffs: () => fetchJson<Tariff[]>('/rentals/tariffs'),
  createRentalTariff: (data: Partial<Tariff>) =>
    fetchJson<Tariff>('/rentals/tariffs', { method: 'POST', body: JSON.stringify(data) }),
  updateRentalTariff: (id: string, data: Partial<Tariff>) =>
    fetchJson<Tariff>(`/rentals/tariffs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRentalTariff: (id: string) =>
    fetchJson<{ success: boolean; message?: string }>(`/rentals/tariffs/${id}`, { method: 'DELETE' }),
  getRental: (id: string) => fetchJson<Rental>(`/rentals/${id}`),
  createRental: (data: {
    clientId: string;
    bikeId: string;
    tariffId: string;
    managerId?: string;
    outfitIds: string[];
    batteryIds?: string[];
    paymentMethod: string;
    rentalNumber?: string;
    customDeposit?: number;
    durationDays?: number;
    startDate?: string;
    totalBuyoutPrice?: number;
    paymentIntervalDays?: number;
    installmentPayment?: number;
    firstPaymentAmount?: number;
    notes?: string;
    courierService?: string;
    passportSerial?: string;
    passportNumber?: string;
    citizenship?: string;
    patentNumber?: string;
    telegram?: string;
  }) => fetchJson<Rental>('/rentals', { method: 'POST', body: JSON.stringify(data) }),
  renewRental: (id: string, data: { durationDays?: number; amount?: number; method: string; notes?: string; isBuyoutFinal?: boolean }) =>
    fetchJson<Rental>(`/rentals/${id}/renew`, { method: 'POST', body: JSON.stringify(data) }),
  closeRental: (
    id: string,
    data: {
      bikeCondition: 'OK' | 'NEEDS_REPAIR';
      bikeMileageKm?: number;
      defectDescription?: string;
      faultType?: 'COMPANY_EXPENSE' | 'CLIENT_FAULT';
      outfitReturns: Array<{
        outfitId: string;
        condition: 'OK' | 'DAMAGED' | 'LOST';
        deductionAmount?: number;
      }>;
      refundMethod: string;
      notes?: string;
    }
  ) =>
    fetchJson<{
      rental: Rental;
      repairOrder?: RepairOrder | null;
      depositReturned: number;
      totalDeduction: number;
    }>(`/rentals/${id}/close`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRental: (id: string) =>
    fetchJson<{ success: boolean; message?: string }>(`/rentals/${id}`, { method: 'DELETE' }),


  // Repairs
  getRepairs: (params?: { status?: string; faultType?: string; bikeId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.faultType) q.append('faultType', params.faultType);
    if (params?.bikeId) q.append('bikeId', params.bikeId);
    return fetchJson<RepairOrder[]>(`/repairs?${q.toString()}`);
  },
  getRepair: (id: string) => fetchJson<RepairOrder>(`/repairs/${id}`),
  createRepair: (data: {
    itemType?: 'BIKE' | 'BATTERY' | 'EXTERNAL_DEVICE';
    bikeId?: string | null;
    batteryId?: string | null;
    customItemName?: string | null;
    clientName?: string | null;
    clientPhone?: string | null;
    clientId?: string | null;
    orderNumber?: string;
    faultType: string;
    description: string;
    laborCost?: number;
    parts?: Array<{ partId: string; quantity: number }>;
  }) => fetchJson<RepairOrder>('/repairs', { method: 'POST', body: JSON.stringify(data) }),
  updateRepairStatus: (id: string, status: string) =>
    fetchJson<RepairOrder>(`/repairs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  completeRepair: (
    id: string,
    data: {
      laborCost?: number;
      partsUsed?: Array<{ partId: string; quantity: number }>;
      paymentMethod?: string;
      mechanicNotes?: string;
    }
  ) => fetchJson<RepairOrder>(`/repairs/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),

  // Parts
  getPartCategories: () => fetchJson<PartCategoryItem[]>('/parts/categories'),
  createPartCategory: (data: { name: string }) =>
    fetchJson<PartCategoryItem>('/parts/categories', { method: 'POST', body: JSON.stringify(data) }),
  updatePartCategory: (id: string, data: { name: string }) =>
    fetchJson<PartCategoryItem>(`/parts/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePartCategory: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/parts/categories/${id}`, { method: 'DELETE' }),
  getParts: (params?: { search?: string; lowStockOnly?: boolean; categoryId?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.lowStockOnly) q.append('lowStockOnly', 'true');
    if (params?.categoryId) q.append('categoryId', params.categoryId);
    return fetchJson<Part[]>(`/parts?${q.toString()}`);
  },
  getPart: (id: string) => fetchJson<Part>(`/parts/${id}`),
  createPart: (data: Partial<Part>) =>
    fetchJson<Part>('/parts', { method: 'POST', body: JSON.stringify(data) }),
  updatePart: (id: string, data: Partial<Part>) =>
    fetchJson<Part>(`/parts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  restockPart: (id: string, quantity: number) =>
    fetchJson<Part>(`/parts/${id}/restock`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  deletePart: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/parts/${id}`, { method: 'DELETE' }),

  // Part Procurement Orders (Заявки на закупку)
  getPartOrderCategories: () => fetchJson<PartOrderCategoryItem[]>('/parts/orders/categories'),
  createPartOrderCategory: (data: { name: string }) =>
    fetchJson<PartOrderCategoryItem>('/parts/orders/categories', { method: 'POST', body: JSON.stringify(data) }),
  updatePartOrderCategory: (id: string, data: { name: string }) =>
    fetchJson<PartOrderCategoryItem>(`/parts/orders/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePartOrderCategory: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/parts/orders/categories/${id}`, { method: 'DELETE' }),

  getPartOrders: (params?: { status?: string; search?: string; categoryId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    if (params?.categoryId) q.append('categoryId', params.categoryId);
    return fetchJson<PartOrder[]>(`/parts/orders?${q.toString()}`);
  },
  createPartOrder: (data: Partial<PartOrder>) =>
    fetchJson<PartOrder>('/parts/orders', { method: 'POST', body: JSON.stringify(data) }),
  updatePartOrder: (id: string, data: Partial<PartOrder>) =>
    fetchJson<PartOrder>(`/parts/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updatePartOrderStatus: (
    id: string,
    status: string,
    options?: {
      actualCost?: number;
      paymentMethod?: string;
      addToStock?: boolean;
      createPartData?: {
        name?: string;
        sku?: string;
        categoryId?: string;
        quantity?: number;
        minQuantity?: number;
        purchasePrice?: number;
        clientPrice?: number;
      };
    }
  ) =>
    fetchJson<PartOrder>(`/parts/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...options }),
    }),
  deletePartOrder: (id: string, options?: { deletePayment?: boolean }) => {
    const q = new URLSearchParams();
    if (options?.deletePayment !== undefined) q.append('deletePayment', String(options.deletePayment));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJson<{ success: boolean; message: string }>(`/parts/orders/${id}${qs}`, { method: 'DELETE' });
  },

  // Finance
  getPayments: (params?: { type?: string; method?: string; rentalId?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.append('type', params.type);
    if (params?.method) q.append('method', params.method);
    if (params?.rentalId) q.append('rentalId', params.rentalId);
    return fetchJson<Payment[]>(`/payments?${q.toString()}`);
  },
  getFinanceSummary: () =>
    fetchJson<{
      totalRevenue: number;
      rentalPayments: number;
      buyoutPayments: number;
      repairPayments: number;
      outfitSales: number;
      fines: number;
      salaryExpenses?: number;
      totalPartsCost?: number;
      monthlyFixedExpenses?: number;
      fixedExpensesDescription?: string;
      fixedExpenseItems?: ExpenseItem[];
      fixedExpenses?: number;
      netMargin?: number;
      depositsCollected: number;
      depositsRefunded: number;
      activeDepositsHeld: number;
    }>('/payments/summary'),
  getFinanceSettings: () => fetchJson<FinanceSettings>('/payments/settings'),
  updateFinanceSettings: (data: Partial<FinanceSettings>) =>
    fetchJson<FinanceSettings>('/payments/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  createPayment: (data: Partial<Payment>) =>
    fetchJson<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),
  updatePayment: (id: string, data: Partial<Payment>) =>
    fetchJson<Payment>(`/payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePayment: (id: string) =>
    fetchJson<{ success: boolean; removed?: Payment }>(`/payments/${id}`, { method: 'DELETE' }),

  // Reviews
  getReviews: (params?: { bikeId?: string; clientId?: string }) => {
    const q = new URLSearchParams();
    if (params?.bikeId) q.append('bikeId', params.bikeId);
    if (params?.clientId) q.append('clientId', params.clientId);
    return fetchJson<Review[]>(`/reviews?${q.toString()}`);
  },
  createReview: (data: { clientId: string; bikeId: string; rating: number; comment?: string }) =>
    fetchJson<Review>('/reviews', { method: 'POST', body: JSON.stringify(data) }),


  // File Upload
  uploadFile: async (file: File): Promise<{ url: string; filename: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ошибка загрузки файла');
    }
    return res.json();
  },

  // System Simulation & Template Controls
  getSystemState: () => fetchJson<{ currentDate: string; isSimulated: boolean }>('/system/state'),
  setSystemTime: (payload: { date?: string; addDays?: number; reset?: boolean }) =>
    fetchJson<{ currentDate: string; isSimulated: boolean; message: string }>('/system/time', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resetTemplates: () =>
    fetchJson<{ success: boolean; message: string }>('/system/reset', { method: 'POST' }),
  clearTemplates: () =>
    fetchJson<{ success: boolean; message: string }>('/system/clear', { method: 'POST' }),

  // Employees & Payroll
  getEmployees: () => fetchJson<Employee[]>('/employees'),
  getEmployee: (id: string) => fetchJson<Employee>(`/employees/${id}`),
  createEmployee: (data: Partial<Employee>) =>
    fetchJson<Employee>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: Partial<Employee>) =>
    fetchJson<Employee>(`/employees/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEmployee: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/employees/${id}`, { method: 'DELETE' }),
  payoutSalary: (id: string, data: { amount: number; method: string; comment?: string }) =>
    fetchJson<{ success: boolean; message: string; payment: Payment }>(`/employees/${id}/payout`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Articles / Knowledge Base ("Информация")
  getArticles: (params?: { category?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.search) q.append('search', params.search);
    return fetchJson<Article[]>(`/articles?${q.toString()}`);
  },
  getArticleCategories: () => fetchJson<string[]>('/articles/categories'),
  getArticle: (id: string) => fetchJson<Article>(`/articles/${id}`),
  createArticle: (data: Partial<Article>) =>
    fetchJson<Article>('/articles', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (id: string, data: Partial<Article>) =>
    fetchJson<Article>(`/articles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteArticle: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/articles/${id}`, { method: 'DELETE' }),
  clearAllArticles: () =>
    fetchJson<{ success: boolean; message: string; count: number }>('/articles/clear-all', { method: 'DELETE' }),
  resetDefaultArticles: () =>
    fetchJson<{ success: boolean; message: string; articles: Article[] }>('/articles/reset-defaults', { method: 'POST' }),

  // History & Audit Log ("История")
  getHistory: (params?: { category?: string; search?: string; limit?: number; days?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.search) q.append('search', params.search);
    if (params?.limit) q.append('limit', String(params.limit));
    if (params?.days) q.append('days', String(params.days));
    return fetchJson<{ items: HistoryItem[]; totalCount: number }>(`/history?${q.toString()}`);
  },
  logHistory: (data: { category: string; action: string; title: string; details?: string; amount?: number }) =>
    fetchJson<HistoryItem>('/history', { method: 'POST', body: JSON.stringify(data) }),
  clearHistory: () =>
    fetchJson<{ success: boolean; message: string }>('/history', { method: 'DELETE' }),

  // Access Levels (Уровни доступа / RBAC)
  getAccessLevels: () => fetchJson<AccessLevel[]>('/access-levels'),
  getAccessLevel: (id: string) => fetchJson<AccessLevel>(`/access-levels/${id}`),
  createAccessLevel: (data: Partial<AccessLevel>) =>
    fetchJson<AccessLevel>('/access-levels', { method: 'POST', body: JSON.stringify(data) }),
  updateAccessLevel: (id: string, data: Partial<AccessLevel>) =>
    fetchJson<AccessLevel>(`/access-levels/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAccessLevel: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/access-levels/${id}`, { method: 'DELETE' }),

  // Team Users (Служебные аккаунты, логины и доступы)
  getUsers: () => fetchJson<User[]>('/users'),
  createUser: (data: any) => fetchJson<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) =>
    fetchJson<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/users/${id}`, { method: 'DELETE' }),

  // Team Chat ("Командный чат базы")
  getChatMessages: (limit = 100) => fetchJson<ChatMessage[]>(`/chat/messages?limit=${limit}`),
  sendChatMessage: (data: { text: string; senderId?: string; senderName?: string; senderRole?: string }) =>
    fetchJson<ChatMessage>('/chat/messages', { method: 'POST', body: JSON.stringify(data) }),
  deleteChatMessage: (id: string) =>
    fetchJson<{ success: boolean }>(`/chat/messages/${id}`, { method: 'DELETE' }),

  // Team Presence & Online Status
  getOnlineUsers: () => fetchJson<PresenceUser[]>('/presence'),
  sendPresenceHeartbeat: (data: { userId: string; userName: string; userRole?: string; roleTitle?: string; deviceInfo?: string }) =>
    fetchJson<PresenceUser[]>('/presence/heartbeat', { method: 'POST', body: JSON.stringify(data) }),
  sendPresenceLogout: (userId: string) =>
    fetchJson<{ success: boolean }>('/presence/logout', { method: 'POST', body: JSON.stringify({ userId }) }),

  // Outfits
  getOutfitCategories: () => fetchJson<OutfitCategoryItem[]>('/outfits/categories'),
  createOutfitCategory: (data: { name: string }) =>
    fetchJson<OutfitCategoryItem>('/outfits/categories', { method: 'POST', body: JSON.stringify(data) }),
  deleteOutfitCategory: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/outfits/categories/${id}`, { method: 'DELETE' }),
  getOutfitTemplates: () => fetchJson<OutfitTemplate[]>('/outfits/templates'),
  createOutfitTemplate: (data: { name: string; categoryId: string; defaultDeposit: number; description?: string }) =>
    fetchJson<OutfitTemplate>('/outfits/templates', { method: 'POST', body: JSON.stringify(data) }),
  deleteOutfitTemplate: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/outfits/templates/${id}`, { method: 'DELETE' }),
  getOutfits: (params?: { category?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    return fetchJson<Outfit[]>(`/outfits?${q.toString()}`);
  },
  getAvailableOutfits: () => fetchJson<Outfit[]>('/outfits/available'),
  createOutfit: (data: Partial<Outfit>) =>
    fetchJson<Outfit>('/outfits', { method: 'POST', body: JSON.stringify(data) }),
  updateOutfitStatus: (id: string, status: string) =>
    fetchJson<Outfit>(`/outfits/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  deleteOutfit: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/outfits/${id}`, { method: 'DELETE' }),

  // Loyalty System
  getLoyaltyTiers: () => fetchJson<LoyaltyTier[]>('/loyalty/tiers'),
  getLoyaltyTier: (id: string) => fetchJson<LoyaltyTier>(`/loyalty/tiers/${id}`),
  createLoyaltyTier: (data: Partial<LoyaltyTier>) =>
    fetchJson<LoyaltyTier>('/loyalty/tiers', { method: 'POST', body: JSON.stringify(data) }),
  updateLoyaltyTier: (id: string, data: Partial<LoyaltyTier>) =>
    fetchJson<LoyaltyTier>(`/loyalty/tiers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLoyaltyTier: (id: string) =>
    fetchJson<{ message: string }>(`/loyalty/tiers/${id}`, { method: 'DELETE' }),
  setClientLoyaltyTier: (clientId: string, manualLoyaltyTierId: string | null) =>
    fetchJson<Client>(`/loyalty/clients/${clientId}/tier`, {
      method: 'PATCH',
      body: JSON.stringify({ manualLoyaltyTierId }),
    }),

  // Shop & POS Retail Sales
  getShopCatalog: () => fetchJson<ShopCatalog>('/shop/catalog'),
  getShopOrders: () => fetchJson<RetailOrder[]>('/shop/orders'),
  getShopOrder: (id: string) => fetchJson<RetailOrder>(`/shop/orders/${id}`),
  createShopOrder: (data: {
    customerType: 'GUEST' | 'CLIENT' | 'EXTERNAL';
    customerName: string;
    customerPhone?: string | null;
    clientId?: string | null;
    items: Array<{
      itemType: 'BIKE' | 'PART' | 'OUTFIT' | 'BATTERY';
      itemId: string;
      quantity: number;
      price?: number;
    }>;
    paymentMethod: string;
    orderNumber?: string;
    notes?: string | null;
  }) =>
    fetchJson<{ success: boolean; message: string; order: RetailOrder }>('/shop/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

