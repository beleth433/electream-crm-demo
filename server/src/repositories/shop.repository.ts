import {
  getDb,
  getSystemTime,
  RetailOrderRecord,
  RetailOrderItem,
  PaymentRecord,
  PaymentMethod,
} from './db.js';

export interface CreateOrderDto {
  customerType: 'GUEST' | 'CLIENT' | 'EXTERNAL';
  customerName: string;
  customerPhone?: string | null;
  clientId?: string | null;
  items: Array<{
    itemType: 'BIKE' | 'PART' | 'OUTFIT';
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
        // Estimated retail and cost price based on bike specs
        const batCap = battery?.capacityAh || 20;
        const retailPrice =
          b.status === 'FOR_SALE'
            ? 45000 + batCap * 800
            : 55000 + batCap * 1000;
        const costPrice = Math.round(retailPrice * 0.65);

        return {
          id: b.id,
          inventoryNumber: b.inventoryNumber,
          modelName: model?.name || 'Электровелосипед',
          powerWatts: model?.powerWatts || 500,
          status: b.status,
          currentLocation: b.currentLocation,
          mileageKm: b.mileageKm,
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
        return {
          id: o.id,
          name: o.name,
          category: o.category,
          categoryName: cat?.name || o.category,
          inventoryNumber: o.inventoryNumber,
          price: Math.round(o.depositValue * 1.2) || 2000,
          costPrice: o.depositValue || 1500,
          inStock: 1,
        };
      });

    return {
      bikes,
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
        const battery = bike.batteryId ? db.batteries.find((bt) => bt.id === bike.batteryId) : null;
        const batCap = battery?.capacityAh || 20;
        const defaultPrice =
          bike.status === 'FOR_SALE'
            ? 45000 + batCap * 800
            : 55000 + batCap * 1000;
        const price = item.price !== undefined ? Number(item.price) : defaultPrice;
        const costPrice = Math.round(price * 0.65);

        // Mark bike as SOLD (decommissioned from active fleet due to retail sale)
        bike.status = 'SOLD';
        bike.note = `Продан в розницу покупателю: ${data.customerName || 'Гость'}`;
        bike.updatedAt = getSystemTime().toISOString();

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

        const defaultPrice = Math.round(outfit.depositValue * 1.2) || 2000;
        const price = item.price !== undefined ? Number(item.price) : defaultPrice;
        const costPrice = outfit.depositValue || 1500;

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

    const order: RetailOrderRecord = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerType: data.customerType || 'GUEST',
      customerName: data.customerName?.trim() || 'Розничный покупатель',
      customerPhone: data.customerPhone?.trim() || null,
      clientId: data.clientId || null,
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
      type: 'RETAIL_SALE',
      amount: totalAmount,
      method: data.paymentMethod || 'CASH',
      description: `Розничная продажа (Чек ${order.orderNumber}): ${order.customerName}`,
      createdAt: getSystemTime().toISOString(),
    };

    db.payments.unshift(payment);

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
