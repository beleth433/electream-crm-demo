import {
  Bike,
  BikeModel,
  Battery,
  BatteryModel,
  BatteryStats,
  Client,
  Rental,
  Tariff,
  Outfit,
  OutfitCategoryItem,
  OutfitTemplate,
  RepairOrder,
  Part,
  Payment,
  Review,
  Article,
  DashboardStats,
  User,
  Employee,
  RetailOrder,
  ShopCatalog,
  LoyaltyTier,
} from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  getMe: () => fetchJson<User>('/auth/me'),
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
  detachBattery: (bikeId: string) =>
    fetchJson<{ bike: Bike; battery: Battery | null }>('/batteries/detach', {
      method: 'POST',
      body: JSON.stringify({ bikeId }),
    }),
  swapBattery: (bikeId: string, newBatteryId: string) =>
    fetchJson<{ bike: Bike; battery: Battery }>('/batteries/swap', {
      method: 'POST',
      body: JSON.stringify({ bikeId, newBatteryId }),
    }),

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

  // Loyalty System (Система лояльности)
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
    notes?: string;
  }) => fetchJson<Rental>('/rentals', { method: 'POST', body: JSON.stringify(data) }),
  renewRental: (id: string, data: { durationDays?: number; amount?: number; method: string; notes?: string }) =>
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
    bikeId: string;
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
  getParts: (params?: { search?: string; lowStockOnly?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.lowStockOnly) q.append('lowStockOnly', 'true');
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
      repairPayments: number;
      outfitSales: number;
      fines: number;
      depositsCollected: number;
      depositsRefunded: number;
      activeDepositsHeld: number;
    }>('/payments/summary'),
  createPayment: (data: Partial<Payment>) =>
    fetchJson<Payment>('/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Reviews
  getReviews: (params?: { bikeId?: string; clientId?: string }) => {
    const q = new URLSearchParams();
    if (params?.bikeId) q.append('bikeId', params.bikeId);
    if (params?.clientId) q.append('clientId', params.clientId);
    return fetchJson<Review[]>(`/reviews?${q.toString()}`);
  },
  createReview: (data: { clientId: string; bikeId: string; rating: number; comment?: string }) =>
    fetchJson<Review>('/reviews', { method: 'POST', body: JSON.stringify(data) }),

  // Knowledge Base (Articles)
  getArticles: (category?: string) => {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetchJson<Article[]>(`/articles${q}`);
  },
  getArticle: (id: string) => fetchJson<Article>(`/articles/${id}`),
  createArticle: (data: { title: string; category: string; content: string }) =>
    fetchJson<Article>('/articles', { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (id: string, data: { title?: string; category?: string; content?: string }) =>
    fetchJson<Article>(`/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

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
