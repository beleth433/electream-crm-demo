export type ClientRequestType = 'RENTAL' | 'BUY' | 'REPAIR' | 'BATTERY_SWAP' | 'RETURN';

export type ClientStatusInQueue = 'WAITING' | 'SERVED' | 'REJECTED';

export interface SimulatedClient {
  id: string;
  name: string;
  avatar: string;
  company: string; // 'Самокат' | 'Яндекс Еда' | 'Купер' | 'Достависта' | 'Частный курьер' | 'Розничный покупатель'
  phone: string;
  requestType: ClientRequestType;
  title: string;
  dialogue: string;
  requestedDetails: {
    item?: string;
    duration?: string;
    issue?: string;
    budget?: string;
  };
  status: ClientStatusInQueue;
  createdAtGameTime: string; // e.g. "10:14"
  createdAtRealTime: number; // timestamp
}

export interface DaySummaryStats {
  dayNumber: number;
  totalClients: number;
  servedCount: number;
  rejectedCount: number;
  rentalsCount: number;
  purchasesCount: number;
  repairsCount: number;
  batterySwapsCount: number;
}
