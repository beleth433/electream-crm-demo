import { HistoryRepository } from './history.repository.js';
import {
  getDb,
  getSystemTime,
  ClientRecord,
  RetailOrderRecord,
  RetailOrderItem,
  PaymentRecord,
  PaymentMethod,
  saveDb,
} from './db.js';

export interface CreateOrderDto {
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
  paymentMethod: PaymentMethod;
  orderNumber?: string;
  notes?: string | null;
}

export class ShopRepository {
  async getCatalog() {
    const db = getDb();

    // Bikes available for sale
    const bikes = db.bikes
      .filter((b) => b.status === 'FOR_SALE' || b.status === 'AVAILABLE')
      .map((b) => {
        const model = db.models.find((m) => m.id === b.modelId);
        const battery = b.batteryId ? db.batteries.find((bt) => bt.id === b.batteryId) : null;
        
        const retailPrice = b.salePrice || model?.salePrice || (b.status === 'FOR_SALE' ? 45000 : 55000);
        const costPrice = b.purchasePrice || model?.purchasePrice || Math.round(retailPrice * 0.7);

        return {
          id: b.id,
          inventoryNumber: b.inventoryNumber,
          modelName: model?.name || 'Электровелосипед',
          powerWatts: model?.powerWatts || 500,
          batteryCapacityAh: battery?.capacityAh || 20,
          winterVersion: false,
          status: b.status,
          currentLocation: b.currentLocation,
          mileageKm: b.mileageKm,
          price: retailPrice,
          costPrice,
          inStock: 1,
        };
      });

    // Batteries available for sale (free on rack, not installed on any bike)
    const batteries = db.batteries
      .filter((bt) => bt.status === 'AVAILABLE' && !bt.installedBikeId)
      .map((bt) => {
        const model = bt.modelId ? db.batteryModels.find((m) => m.id === bt.modelId) : null;
        const retailPrice = bt.salePrice || model?.salePrice || 25000;
        const costPrice = bt.purchasePrice || model?.purchasePrice || 16000;

        return {
          id: bt.id,
          serialNumber: bt.serialNumber,
          modelName: model?.name || bt.modelName || 'Аккумулятор',
          voltage: bt.voltage,
          capacityAh: bt.capacityAh,
          chemistry: bt.chemistry,
          healthPercent: bt.healthPercent ?? 100,
          status: bt.status,
          price: retailPrice,
          costPrice,
          inStock: 1,
        };
      });

    // Spare parts in stock
    const parts = db.parts
      .filter((p) => p.quantity > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantity: p.quantity,
        price: p.clientPrice,
        costPrice: p.purchasePrice,
      }));

    // Outfits in stock
    const outfits = db.outfits
      .filter((o) => o.status === 'IN_STOCK')
      .map((o) => {
        const cat = db.outfitCategories.find((c) => c.id === o.category);
        const tmpl = db.outfitTemplates.find(
          (t) => (t.categoryId === o.category || t.name === o.name) && t.name.toLowerCase() === o.name.toLowerCase()
        );
        const retailPrice = o.salePrice || tmpl?.salePrice || Math.round(o.depositValue * 1.2) || 2000;
        const costPrice = o.purchasePrice || tmpl?.purchasePrice || o.depositValue || 1500;

        return {
          id: o.id,
          name: o.name,
          category: o.category,
          categoryName: cat?.name || o.category,
          inventoryNumber: o.inventoryNumber,
          price: retailPrice,
          costPrice,
          inStock: 1,
        };
      });

    return {
      bikes,
      batteries,
      parts,
      outfits,
    };
  }

  async createOrder(data: CreateOrderDto) {
    const db = getDb();

    if (!data.items || data.items.length === 0) {
      throw new Error('Корзина пуста: добавьте хотя бы один товар');
    }

    const processedItems: RetailOrderItem[] = [];
    let totalAmount = 0;
    let totalCost = 0;

    for (const item of data.items) {
      const qty = Number(item.quantity) || 1;
      if (qty <= 0) continue;

      if (item.itemType === 'BIKE') {
        const bike = db.bikes.find((b) => b.id === item.itemId);
        if (!bike) throw new Error(`Велосипед с ID ${item.itemId} не найден`);
        if (bike.status !== 'AVAILABLE' && bike.status !== 'FOR_SALE') {
          throw new Error(
            `Байк ${bike.inventoryNumber} не может быть продан (текущий статус: ${bike.status})`
          );
        }

        const model = db.models.find((m) => m.id === bike.modelId);
        const defaultPrice =
          bike.salePrice || model?.salePrice || (bike.status === 'FOR_SALE' ? 45000 : 55000);
        const price = item.price !== undefined ? Number(item.price) : defaultPrice;
        const costPrice = bike.purchasePrice || model?.purchasePrice || Math.round(price * 0.7);

        // Mark bike as SOLD (decommissioned from active fleet due to retail sale)
        bike.status = 'SOLD';
        bike.note = `Продан в розницу покупателю: ${data.customerName || 'Гость'}`;
        bike.updatedAt = getSystemTime().toISOString();

        if (bike.batteryId) {
          const installedBat = db.batteries.find((bt) => bt.id === bike.batteryId);
          if (installedBat) {
            installedBat.status = 'SOLD';
            installedBat.notes = `Продан в составе байка ${bike.inventoryNumber}`;
            installedBat.updatedAt = getSystemTime().toISOString();
          }
        }

        processedItems.push({
          itemType: 'BIKE',
          itemId: bike.id,
          name: `${model?.name || 'Электровелосипед'} (${bike.inventoryNumber})`,
          quantity: 1,
          price,
          costPrice,
        });

        totalAmount += price;
        totalCost += costPrice;
      } else if (item.itemType === 'BATTERY') {
        const battery = db.batteries.find((b) => b.id === item.itemId);
        if (!battery) throw new Error(`Аккумулятор с ID ${item.itemId} не найден`);
        if (battery.status !== 'AVAILABLE' || battery.installedBikeId) {
          throw new Error(
            `Аккумулятор ${battery.serialNumber} недоступен для продажи (статус: ${battery.status}${battery.installedBikeId ? ', установлен на байк' : ''})`
          );
        }

        const model = battery.modelId ? db.batteryModels.find((m) => m.id === battery.modelId) : null;
        const defaultPrice = battery.salePrice || model?.salePrice || 25000;
        const price = item.price !== undefined ? Number(item.price) : defaultPrice;
        const costPrice = battery.purchasePrice || model?.purchasePrice || 16000;

        // Mark battery as SOLD
        battery.status = 'SOLD';
        battery.notes = `Продан в розницу покупателю: ${data.customerName || 'Гость'}`;
        if (battery.installedBikeId) {
          const bike = db.bikes.find((b) => b.id === battery.installedBikeId);
          if (bike) bike.batteryId = null;
          battery.installedBikeId = null;
        }
        battery.updatedAt = getSystemTime().toISOString();

        processedItems.push({
          itemType: 'BATTERY',
          itemId: battery.id,
          name: `${model?.name || battery.modelName || 'Аккумулятор'} ${battery.voltage}V ${battery.capacityAh}Ah (${battery.serialNumber})`,
          quantity: 1,
          price,
          costPrice,
        });

        totalAmount += price;
        totalCost += costPrice;
      } else if (item.itemType === 'PART') {
        const part = db.parts.find((p) => p.id === item.itemId);
        if (!part) throw new Error(`Запчасть с ID ${item.itemId} не найдена`);
        if (part.quantity < qty) {
          throw new Error(
            `Недостаточно товара на складе для "${part.name}": запрошено ${qty} шт., в наличии ${part.quantity} шт.`
          );
        }

        const price = item.price !== undefined ? Number(item.price) : part.clientPrice;
        const costPrice = part.purchasePrice;

        // Atomically decrement stock quantity
        part.quantity -= qty;

        processedItems.push({
          itemType: 'PART',
          itemId: part.id,
          name: `${part.name} [${part.sku}]`,
          quantity: qty,
          price,
          costPrice,
        });

        totalAmount += price * qty;
        totalCost += costPrice * qty;
      } else if (item.itemType === 'OUTFIT') {
        const outfit = db.outfits.find((o) => o.id === item.itemId);
        if (!outfit) throw new Error(`Экипировка с ID ${item.itemId} не найдена`);
        if (outfit.status !== 'IN_STOCK') {
          throw new Error(
            `Предмет экипировки "${outfit.name}" недоступен для продажи (статус: ${outfit.status})`
          );
        }

        const tmpl = db.outfitTemplates.find(
          (t) =>
            (t.categoryId === outfit.category || t.name === outfit.name) &&
            t.name.toLowerCase() === outfit.name.toLowerCase()
        );
        const defaultPrice =
          outfit.salePrice || tmpl?.salePrice || Math.round(outfit.depositValue * 1.2) || 2000;
        const price = item.price !== undefined ? Number(item.price) : defaultPrice;
        const costPrice =
          outfit.purchasePrice || tmpl?.purchasePrice || outfit.depositValue || 1500;

        // Mark outfit as SOLD
        outfit.status = 'SOLD';

        processedItems.push({
          itemType: 'OUTFIT',
          itemId: outfit.id,
          name: `${outfit.name}${outfit.inventoryNumber ? ` (${outfit.inventoryNumber})` : ''}`,
          quantity: 1,
          price,
          costPrice,
        });

        totalAmount += price;
        totalCost += costPrice;
      }
    }

    const orderNumber = data.orderNumber && data.orderNumber.trim()
      ? data.orderNumber.trim()
      : `ORD-${Date.now().toString().slice(-6)}`;
    const profit = totalAmount - totalCost;

    // 1. Resolve or Auto-create Client in db.clients
    let resolvedClientId = data.clientId || null;
    let customerFullName = data.customerName?.trim() || 'Розничный покупатель';
    const customerPhone = data.customerPhone?.trim() || null;

    if (!resolvedClientId && customerPhone) {
      const cleanPhone = customerPhone.replace(/\D/g, '');
      if (cleanPhone.length >= 6) {
        const existing = db.clients.find((c) => c.phone.replace(/\D/g, '') === cleanPhone);
        if (existing) {
          resolvedClientId = existing.id;
          if (
            existing.fullName &&
            (!customerFullName ||
              customerFullName === 'Розничный покупатель' ||
              customerFullName === 'Покупатель' ||
              customerFullName.includes('Гость'))
          ) {
            customerFullName = existing.fullName;
          }
        } else {
          // Auto-create client in database so they are saved for warranty and loyalty
          const newClient: ClientRecord = {
            id: `cli-${Date.now()}`,
            fullName:
              customerFullName !== 'Розничный покупатель' &&
              customerFullName !== 'Покупатель' &&
              !customerFullName.includes('Гость')
                ? customerFullName
                : `Покупатель ${customerPhone}`,
            phone: customerPhone,
            telegram: null,
            passportSerial: null,
            passportNumber: null,
            citizenship: 'РФ',
            migrationCard: null,
            patentNumber: null,
            courierService: null,
            documentPhotoUrls: [],
            status: 'NORMAL',
            clientType: 'RETAIL',
            manualLoyaltyTierId: null,
            blackListReason: null,
            createdAt: getSystemTime().toISOString(),
          };
          db.clients.push(newClient);
          resolvedClientId = newClient.id;
          customerFullName = newClient.fullName;
        }
      }
    } else if (resolvedClientId) {
      const existing = db.clients.find((c) => c.id === resolvedClientId);
      if (existing) {
        customerFullName = existing.fullName;
      }
    }

    const order: RetailOrderRecord = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerType: data.customerType || 'GUEST',
      customerName: customerFullName,
      customerPhone,
      clientId: resolvedClientId,
      items: processedItems,
      totalAmount,
      totalCost,
      profit,
      paymentMethod: data.paymentMethod || 'CASH',
      notes: data.notes || null,
      createdAt: getSystemTime().toISOString(),
    };

    db.retailOrders.unshift(order);

    // Register incoming payment in Finance
    const payment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      orderId: order.id,
      clientId: resolvedClientId,
      type: 'RETAIL_SALE',
      amount: totalAmount,
      method: data.paymentMethod || 'CASH',
      description: `Розничная продажа (Чек ${order.orderNumber}): ${order.customerName}`,
      createdAt: getSystemTime().toISOString(),
    };

    db.payments.unshift(payment);

    // Explicit audit log
    HistoryRepository.logAction({
      category: 'PAYMENT',
      action: 'SHOP_SALE',
      title: `Розничная продажа: Чек ${order.orderNumber} на сумму ${order.totalAmount.toLocaleString('ru-RU')} ₽`,
      details: `Покупатель: ${order.customerName}. Оплата: ${order.paymentMethod}. Товаров: ${order.items.length} шт. Прибыль: +${order.profit.toLocaleString('ru-RU')} ₽`,
      amount: order.totalAmount,
      badgeText: 'Магазин',
      badgeColor: 'teal',
      entityId: order.id,
    });

    saveDb(true);

    return order;
  }

  async getOrders() {
    const db = getDb();
    return [...db.retailOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getOrderById(id: string) {
    const db = getDb();
    return db.retailOrders.find((o) => o.id === id || o.orderNumber === id) || null;
  }
}

export const shopRepository = new ShopRepository();
