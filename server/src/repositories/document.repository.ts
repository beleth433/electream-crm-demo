import { getCurrentUser } from '../context/userContext.js';
import { DocumentModule, DocumentRecord, DocumentType, getDb, getSystemTime, saveDb, UserRecord, withDbTransaction } from './db.js';
import { normalizePhone } from './relations.js';

const titles: Record<DocumentType, string> = {
  RENTAL_CONTRACT: 'Договор аренды', HANDOVER_ACT: 'Акт выдачи техники', RETURN_ACT: 'Акт возврата техники', BUYOUT_ACT: 'Акт завершения выкупа',
  SALE_RECEIPT: 'Товарный чек', REPAIR_ORDER: 'Заказ-наряд СТО', REPAIR_ACT: 'Акт выполненных работ СТО',
};
const prefixes: Record<DocumentType, string> = { RENTAL_CONTRACT: 'ДОГ', HANDOVER_ACT: 'ВЫД', RETURN_ACT: 'ВОЗ', BUYOUT_ACT: 'ВЫК', SALE_RECEIPT: 'ЧЕК', REPAIR_ORDER: 'ЗН', REPAIR_ACT: 'РАБ' };

export class DocumentRepository {
  static canReadModule(user: UserRecord, module: DocumentModule) {
    const level = getDb().accessLevels.find((item) => item.id === user.accessLevelId) || getDb().accessLevels.find((item) => item.id === (user.role === 'ADMIN' ? 'lvl-owner' : user.role === 'MECHANIC' ? 'lvl-master' : 'lvl-manager'));
    return Boolean(level && level.permissions.documents?.visible !== false && level.permissions[module]?.visible !== false);
  }

  static capture(type: DocumentType, sourceId: string, reconstructed = false, settlement?: { depositReturned: number; totalDeduction: number; defectDescription?: string; outfitReturns?: Array<{ outfitId: string; condition: 'OK' | 'DAMAGED' | 'LOST'; deductionAmount?: number }> }) {
    const db = getDb();
    if (!db.documents) db.documents = [];
    const id = `doc-${type.toLowerCase()}-${sourceId}`;
    const existing = db.documents.find((document) => document.id === id);
    if (existing) return existing;
    const sourceModule: DocumentModule = type === 'SALE_RECEIPT' ? 'shop' : type.startsWith('REPAIR_') ? 'repairs' : 'rentals';
    const rental = sourceModule === 'rentals' ? db.rentals.find((item) => item.id === sourceId) : undefined;
    const sale = sourceModule === 'shop' ? db.retailOrders.find((item) => item.id === sourceId) : undefined;
    const repair = sourceModule === 'repairs' ? db.repairs.find((item) => item.id === sourceId) : undefined;
    if (!rental && !sale && !repair) throw new Error('Исходная операция не найдена');
    const clientId = rental?.clientId || sale?.clientId || repair?.clientId;
    const client = db.clients.find((item) => item.id === clientId);
    const bike = db.bikes.find((item) => item.id === (rental?.bikeId || repair?.bikeId));
    const tariff = db.tariffs.find((item) => item.id === rental?.tariffId);
    const model = db.models.find((item) => item.id === bike?.modelId);
    const sourceNumber = rental?.rentalNumber || sale?.orderNumber || repair?.orderNumber || sourceId;
    const clientName = sale?.customerName || repair?.clientName || client?.fullName || 'Клиент не указан';
    const clientPhone = sale?.customerPhone || repair?.clientPhone || client?.phone || '';
    const sourceActorId = rental?.managerId || repair?.mechanicId || (sale ? db.payments.find((item) => item.orderId === sale.id)?.cashierId : undefined);
    const actorId = reconstructed ? sourceActorId : getCurrentUser()?.id || sourceActorId;
    const actor = db.users.find((item) => item.id === actorId);
    const date = getSystemTime().toISOString();
    const finished = ['RETURN_ACT', 'BUYOUT_ACT', 'REPAIR_ACT'].includes(type);
    const issuedAt = rental ? (type === 'RETURN_ACT' ? rental.updatedAt || rental.closedAt || date : finished ? rental.closedAt || rental.updatedAt || date : rental.startedAt) : sale?.createdAt || (type === 'REPAIR_ACT' ? repair?.completedAt || repair?.createdAt : repair?.createdAt) || date;
    const details: DocumentRecord['snapshot']['details'] = [];
    const equipment: DocumentRecord['snapshot']['equipment'] = [];
    let items: DocumentRecord['snapshot']['items'] = [];
    let amount = 0;
    let notes = '';
    if (bike) equipment.push({ name: model?.name || 'Электровелосипед', number: [bike.inventoryNumber, bike.frameNumber ? `рама ${bike.frameNumber}` : '', bike.motorNumber ? `мотор ${bike.motorNumber}` : ''].filter(Boolean).join(' · ') });
    if (rental) {
      for (const battery of db.batteries.filter((item) => rental.batteryIds?.includes(item.id) || item.id === bike?.batteryId)) equipment.push({ name: `Аккумулятор ${battery.voltage}V ${battery.capacityAh}Ah`, number: battery.serialNumber });
      if (type !== 'BUYOUT_ACT') for (const outfit of db.outfits.filter((item) => rental.outfitIds.includes(item.id))) {
        const returned = settlement?.outfitReturns?.find((item) => item.outfitId === outfit.id);
        const condition = returned ? ({ OK: 'Возвращено без замечаний', DAMAGED: 'Повреждено', LOST: 'Утрачено' })[returned.condition] : '';
        equipment.push({ name: outfit.name, number: [outfit.inventoryNumber || '—', condition].filter(Boolean).join(' · ') });
      }
      const paid = db.payments.filter((p) => p.rentalId === rental.id && (p.type === 'RENTAL' || p.type === 'BUYOUT')).reduce((total, p) => total + p.amount, 0);
      const firstPayment = db.payments.find((p) => p.rentalId === rental.id && (p.type === 'RENTAL' || p.type === 'BUYOUT'));
      amount = type === 'RETURN_ACT' ? settlement?.depositReturned ?? db.payments.filter((p) => p.rentalId === rental.id && p.type === 'DEPOSIT_REFUND').reduce((total, p) => total + p.amount, 0) : rental.type === 'RENT_TO_OWN' ? rental.totalBuyoutPrice ?? tariff?.totalBuyoutPrice ?? 0 : firstPayment?.amount ?? tariff?.price ?? 0;
      details.push({ label: 'Вид договора', value: rental.type === 'RENT_TO_OWN' ? 'Аренда с правом выкупа' : 'Стандартная аренда' }, { label: 'Тариф', value: tariff?.name || '—' }, { label: 'Начало', value: rental.startedAt }, { label: 'Срок до', value: rental.expiresAt }, { label: 'Обеспечительный залог', value: `${rental.depositAmount} ₽` }, { label: 'Внесено по договору', value: `${paid} ₽` });
      if (rental.type === 'RENT_TO_OWN') details.push({ label: 'Полная цена выкупа', value: `${rental.totalBuyoutPrice ?? tariff?.totalBuyoutPrice ?? 0} ₽` }, { label: 'Регулярный платёж', value: `${rental.installmentPayment ?? tariff?.installmentPayment ?? 0} ₽` }, { label: 'Интервал платежей', value: `${rental.paymentIntervalDays ?? tariff?.paymentIntervalDays ?? 7} дн.` });
      if (finished) details.push({ label: 'Пробег', value: `${bike?.mileageKm || 0} км` }, { label: 'Состояние техники', value: bike?.status === 'IN_MAINTENANCE' ? 'Требуется ремонт' : type === 'BUYOUT_ACT' ? 'Передана в собственность клиента' : rental.status === 'BOUGHT_OUT' ? 'Выкуплена клиентом; расчёт по экипировке и залогу' : 'Принята на базу' });
      if (settlement) details.push({ label: 'Залог возвращён', value: `${settlement.depositReturned} ₽` }, { label: 'Удержано', value: `${settlement.totalDeduction} ₽` });
      notes = [rental.notes, settlement?.defectDescription].filter(Boolean).join('\n');
    } else if (sale) {
      items = sale.items.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price }));
      amount = sale.totalAmount;
      details.push({ label: 'Способ оплаты', value: ({ CASH: 'Наличные', CARD: 'Банковская карта', SBP: 'СБП', BANK_TRANSFER: 'Банковский перевод' } as Record<string, string>)[sale.paymentMethod] || sale.paymentMethod });
      notes = sale.notes || '';
    } else if (repair) {
      if (repair.batteryId) { const battery = db.batteries.find((item) => item.id === repair.batteryId); if (battery) equipment.push({ name: 'Аккумулятор', number: battery.serialNumber }); }
      if (repair.customItemName) equipment.push({ name: repair.customItemName, number: 'Техника клиента' });
      items = repair.parts.map((part) => ({ name: db.parts.find((item) => item.id === part.partId)?.name || 'Запчасть', quantity: part.quantity, price: part.priceCharged }));
      items.push({ name: 'Работы СТО', quantity: 1, price: repair.laborCost });
      amount = repair.totalCost;
      details.push({ label: 'Ответственность', value: repair.faultType === 'CLIENT_FAULT' || repair.itemType === 'EXTERNAL_DEVICE' ? 'Оплата клиента' : 'Расходы сервиса' }, { label: 'Этап', value: type === 'REPAIR_ACT' ? 'Работы выполнены' : 'Приём техники на диагностику' });
      notes = repair.description;
    }
    const document: DocumentRecord = {
      id, type, number: sourceNumber.startsWith(`${prefixes[type]}-`) ? sourceNumber : `${prefixes[type]}-${sourceNumber}`, title: type === 'RENTAL_CONTRACT' && rental?.type === 'RENT_TO_OWN' ? 'Договор аренды с правом выкупа' : titles[type], sourceModule, sourceId, sourceNumber, clientId,
      clientName, clientPhone, bikeNumber: bike?.inventoryNumber || '', issuedAt, capturedAt: date, reconstructed, amount,
      snapshot: { issuer: { ...(db.settings?.paymentDetails || {}) }, client: { fullName: clientName, phone: clientPhone, ...(rental ? { passportSerial: client?.passportSerial, passportNumber: client?.passportNumber, registrationAddress: client?.registrationAddress } : {}) }, actor: actor?.fullName || (!reconstructed ? getCurrentUser()?.fullName : undefined) || 'Сотрудник не указан', equipment, items, details, notes },
    };
    if (rental) {
      Object.assign(document.snapshot.client, { citizenship: client?.citizenship, patentNumber: client?.patentNumber, courierService: client?.courierService });
      const totalPaidForBuyout = db.payments.filter((p) => p.rentalId === rental.id && (p.type === 'RENTAL' || p.type === 'BUYOUT')).reduce((total, p) => total + p.amount, 0);
      document.snapshot.rentalData = { ...rental, totalPaidForBuyout, client: document.snapshot.client, bike: bike ? { ...bike, model, battery: db.batteries.find((item) => item.id === bike.batteryId) || null } : null, tariff: tariff ? { ...tariff, ...(rental.type === 'STANDARD' ? { price: amount } : {}) } : null, manager: { fullName: document.snapshot.actor }, outfits: db.outfits.filter((item) => rental.outfitIds.includes(item.id)), batteries: db.batteries.filter((item) => rental.batteryIds?.includes(item.id)) };
    }
    if (sale) document.snapshot.saleData = { ...sale };
    // Detach every nested field from mutable entities and settings.
    db.documents.push(JSON.parse(JSON.stringify(document)));
    saveDb();
    return document;
  }

  static captureRental(id: string, reconstructed = false) {
    this.capture('RENTAL_CONTRACT', id, reconstructed);
    this.capture('HANDOVER_ACT', id, reconstructed);
  }

  static backfill() {
    const db = getDb();
    const existing = new Set(db.documents.map((item) => item.id));
    const missing: Array<[DocumentType, string]> = [];
    const add = (type: DocumentType, id: string) => { if (!existing.has(`doc-${type.toLowerCase()}-${id}`)) missing.push([type, id]); };
    for (const rental of db.rentals.filter((item) => !['DRAFT', 'RESERVED'].includes(item.status))) {
      add('RENTAL_CONTRACT', rental.id); add('HANDOVER_ACT', rental.id);
      if (rental.status === 'CLOSED' || (rental.status === 'BOUGHT_OUT' && rental.depositRefunded)) add('RETURN_ACT', rental.id);
      if (rental.status === 'BOUGHT_OUT') add('BUYOUT_ACT', rental.id);
    }
    for (const sale of db.retailOrders) add('SALE_RECEIPT', sale.id);
    for (const repair of db.repairs) { add('REPAIR_ORDER', repair.id); if (repair.status === 'COMPLETED') add('REPAIR_ACT', repair.id); }
    if (!missing.length) return false;
    withDbTransaction(() => {
      for (const [type, id] of missing) this.capture(type, id, true);
    });
    return true;
  }

  static getAll(user: UserRecord, filters: { search?: string; type?: string; from?: string; to?: string; sourceId?: string; sourceModule?: string; page?: number } = {}) {
    let documents = getDb().documents.filter((document) => this.canReadModule(user, document.sourceModule));
    if (filters.type) documents = documents.filter((document) => document.type === filters.type);
    if (filters.sourceId) documents = documents.filter((document) => document.sourceId === filters.sourceId);
    if (filters.sourceModule) documents = documents.filter((document) => document.sourceModule === filters.sourceModule);
    if (filters.from) documents = documents.filter((document) => document.issuedAt.slice(0, 10) >= filters.from!);
    if (filters.to) documents = documents.filter((document) => document.issuedAt.slice(0, 10) <= filters.to!);
    if (filters.search?.trim()) {
      const query = filters.search.trim().toLowerCase();
      const phone = normalizePhone(query);
      documents = documents.filter((document) => [document.number, document.sourceNumber, document.clientName, document.clientPhone, document.bikeNumber].some((value) => value.toLowerCase().includes(query)) || (phone.length >= 6 && normalizePhone(document.clientPhone).includes(phone)));
    }
    documents.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt) || a.number.localeCompare(b.number));
    const page = Math.max(1, filters.page || 1);
    return { items: documents.slice((page - 1) * 30, page * 30).map(({ snapshot, ...summary }) => summary), total: documents.length, page, pageSize: 30 };
  }

  static getById(id: string, user: UserRecord) {
    const document = getDb().documents.find((item) => item.id === id);
    return document && this.canReadModule(user, document.sourceModule) ? document : null;
  }
}
