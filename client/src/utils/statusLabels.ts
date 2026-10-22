export const BIKE_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Свободен',
  RENTED: 'В аренде',
  IN_MAINTENANCE: 'В ремонте / СТО',
  FOR_SALE: 'На продаже',
  DECOMMISSIONED: 'Списан',
  SOLD: 'Продан',
  BOUGHT_OUT: 'Выкуплен',
};

export const BATTERY_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Свободен',
  INSTALLED: 'Установлен на байке',
  ISSUED_SPARE: 'Выдан второй АКБ',
  CHARGING: 'На зарядке',
  IN_MAINTENANCE: 'В ремонте / ТО',
  DECOMMISSIONED: 'Списан',
  SOLD: 'Продан',
};

export const RENTAL_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активен',
  OVERDUE: 'Просрочен',
  CLOSED: 'Завершен',
  BOUGHT_OUT: 'Выкуплен',
  PROBLEM: 'Проблема / ДТП',
  DRAFT: 'Черновик',
  RESERVED: 'Забронирован',
};

export const REPAIR_STATUS_LABELS: Record<string, string> = {
  DIAGNOSTICS: 'Диагностика',
  WAITING_PARTS: 'Ожидание запчастей',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершен',
  CANCELLED: 'Отменен',
};

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  NORMAL: 'Надежный',
  VIP: 'VIP Клиент',
  PROBLEM: 'Проблемный',
  BLACKLIST: 'Черный список',
};

export const getBikeStatusLabel = (status?: string | null): string => {
  if (!status) return '—';
  return BIKE_STATUS_LABELS[status] || status;
};

export const getBatteryStatusLabel = (status?: string | null): string => {
  if (!status) return '—';
  return BATTERY_STATUS_LABELS[status] || status;
};

export const getRentalStatusLabel = (status?: string | null): string => {
  if (!status) return '—';
  return RENTAL_STATUS_LABELS[status] || status;
};

export const getRepairStatusLabel = (status?: string | null): string => {
  if (!status) return '—';
  return REPAIR_STATUS_LABELS[status] || status;
};

export const getClientStatusLabel = (status?: string | null): string => {
  if (!status) return '—';
  return CLIENT_STATUS_LABELS[status] || status;
};
