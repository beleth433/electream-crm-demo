export interface CourierServiceOption {
  id: string;
  label: string;
  shortName: string;
}

export const COURIER_SERVICES: CourierServiceOption[] = [
  { id: 'Яндекс Еда', label: 'Яндекс Еда / Маркет', shortName: 'Яндекс Еда' },
  { id: 'Самокат', label: 'Самокат', shortName: 'Самокат' },
  { id: 'Купер', label: 'Купер (СберМаркет)', shortName: 'Купер' },
  { id: 'Магнит Доставка', label: 'Магнит Доставка', shortName: 'Магнит Доставка' },
  { id: 'X5', label: 'X5 (Пятёрочка, Перекрёсток)', shortName: 'X5' },
  { id: 'Достависта', label: 'Достависта / СДЭК', shortName: 'Достависта' },
  { id: 'Ozon fresh', label: 'Ozon fresh', shortName: 'Ozon fresh' },
  { id: 'Частный курьер', label: 'Частный курьер', shortName: 'Частный курьер' },
];
