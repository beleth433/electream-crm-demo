import React, { useState, useEffect } from 'react';
import { ShopCatalog, RetailOrder, Client, PaymentMethod } from '../types';
import { api } from '../services/api';
import { PrintableSaleReceiptModal } from './PrintableSaleReceiptModal';
import {
  ShoppingBag,
  Bike as BikeIcon,
  Wrench,
  ShieldCheck,
  BatteryCharging,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  User,
  Phone,
  FileText,
  Printer,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix, setStoredPrefix } from '../utils/numbering';

interface CartItem {
  itemType: 'BIKE' | 'PART' | 'OUTFIT' | 'BATTERY';
  itemId: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  maxStock: number;
  inventoryNumber?: string | null;
  sku?: string;
}

export const ShopPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'POS' | 'ORDERS'>('POS');
  const [catalog, setCatalog] = useState<ShopCatalog | null>(null);
  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters for POS catalog
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'BIKES' | 'BATTERIES' | 'PARTS' | 'OUTFITS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Order State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shopOrderPrefix, setShopOrderPrefix] = useState<string>(() => getStoredPrefix('shop', 'ЧЕК-'));
  const [shopOrderNumber, setShopOrderNumber] = useState<string>('');
  const [customerType, setCustomerType] = useState<'GUEST' | 'CLIENT' | 'EXTERNAL'>('GUEST');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('SBP');
  const [orderNotes, setOrderNotes] = useState('');

  const calculateNextShopOrderNumber = (prefixToUse: string, orderList: RetailOrder[] = orders) => {
    const existing = orderList.map((o) => o.orderNumber);
    return getNextSequentialNumber(existing, prefixToUse, 3);
  };

  const handleShopPrefixChange = (newPrefix: string) => {
    setShopOrderPrefix(newPrefix);
    setStoredPrefix('shop', newPrefix);
    const nextNum = calculateNextShopOrderNumber(newPrefix);
    setShopOrderNumber(nextNum);
  };

  // Printable Receipt Modal
  const [printedOrder, setPrintedOrder] = useState<RetailOrder | null>(null);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([api.getShopCatalog(), api.getShopOrders(), api.getClients()])
      .then(([catalogData, ordersData, clientsData]) => {
        setCatalog(catalogData);
        setOrders(ordersData);
        setClients(clientsData);
        const nextNum = getNextSequentialNumber(
          ordersData.map((o) => o.orderNumber),
          shopOrderPrefix,
          3
        );
        setShopOrderNumber(nextNum);
      })
      .catch((err) => toast.error('Ошибка загрузки данных магазина: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cart Management
  const handleAddToCart = (
    itemType: 'BIKE' | 'PART' | 'OUTFIT' | 'BATTERY',
    item: {
      id: string;
      name?: string;
      modelName?: string;
      inventoryNumber?: string | null;
      serialNumber?: string;
      voltage?: number;
      capacityAh?: number;
      sku?: string;
      price: number;
      costPrice: number;
      quantity?: number;
      inStock?: number;
    }
  ) => {
    const itemName =
      itemType === 'BIKE'
        ? `${item.modelName || 'Электробайк'} (${item.inventoryNumber})`
        : itemType === 'BATTERY'
        ? `${item.modelName || 'АКБ'} ${item.voltage || ''}V ${item.capacityAh || ''}Ah (${item.serialNumber})`
        : itemType === 'PART'
        ? `${item.name} [${item.sku}]`
        : `${item.name}${item.inventoryNumber ? ` (${item.inventoryNumber})` : ''}`;

    const maxStock = item.quantity !== undefined ? item.quantity : item.inStock || 1;

    setCart((prev) => {
      const existing = prev.find((i) => i.itemType === itemType && i.itemId === item.id);
      if (existing) {
        if (existing.quantity >= maxStock) {
          toast.warning(`Достигнут максимальный остаток на складе (${maxStock} шт.)`);
          return prev;
        }
        return prev.map((i) =>
          i.itemType === itemType && i.itemId === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          itemType,
          itemId: item.id,
          name: itemName,
          price: item.price,
          costPrice: item.costPrice,
          quantity: 1,
          maxStock,
          inventoryNumber: item.inventoryNumber || item.serialNumber,
          sku: item.sku,
        },
      ];
    });

    toast.success(`"${itemName}" добавлен в корзину`);
  };

  const handleUpdateQuantity = (itemId: string, itemType: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.itemId === itemId && i.itemType === itemType) {
            const newQty = i.quantity + delta;
            if (newQty > i.maxStock) {
              toast.warning(`Максимум в наличии: ${i.maxStock} шт.`);
              return i;
            }
            return { ...i, quantity: newQty };
          }
          return i;
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const handleRemoveFromCart = (itemId: string, itemType: string) => {
    setCart((prev) => prev.filter((i) => !(i.itemId === itemId && i.itemType === itemType)));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setCustomerName(client.fullName);
      setCustomerPhone(client.phone);
    }
  };

  // Calculations
  const selectedClient = customerType === 'CLIENT' ? clients.find((c) => c.id === selectedClientId) : null;
  const loyaltyDiscountPercent = selectedClient?.loyaltyTier?.discountPartsPercent || 0;

  const rawTotalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const loyaltyDiscountAmount = cart.reduce((sum, item) => {
    if ((item.itemType === 'PART' || item.itemType === 'OUTFIT') && loyaltyDiscountPercent > 0) {
      return sum + Math.round(item.price * item.quantity * (loyaltyDiscountPercent / 100));
    }
    return sum;
  }, 0);

  const totalAmount = Math.max(0, rawTotalAmount - loyaltyDiscountAmount);
  const totalCost = cart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  const profitMargin = totalAmount - totalCost;

  // Checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error('Корзина пуста: выберите товары для продажи');
      return;
    }

    const finalCustomerName =
      customerType === 'CLIENT'
        ? customerName
        : customerName.trim() || (customerType === 'GUEST' ? 'Розничный покупатель (Гость)' : 'Покупатель');

    try {
      const res = await api.createShopOrder({
        customerType,
        customerName: finalCustomerName,
        customerPhone: customerPhone.trim() || undefined,
        clientId: customerType === 'CLIENT' ? selectedClientId : undefined,
        items: cart.map((i) => {
          const discountPerItem =
            (i.itemType === 'PART' || i.itemType === 'OUTFIT') && loyaltyDiscountPercent > 0
              ? Math.round(i.price * (loyaltyDiscountPercent / 100))
              : 0;
          return {
            itemType: i.itemType,
            itemId: i.itemId,
            quantity: i.quantity,
            price: Math.max(0, i.price - discountPerItem),
          };
        }),
        paymentMethod,
        orderNumber: shopOrderNumber.trim() ? shopOrderNumber.trim() : undefined,
        notes: orderNotes.trim() || undefined,
      });

      toast.success(res.message);
      const nextNum = getNextSequentialNumber(
        [...orders.map((o) => o.orderNumber), res.order.orderNumber],
        shopOrderPrefix,
        3
      );
      setShopOrderNumber(nextNum);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedClientId('');
      setOrderNotes('');
      loadData();

      // Open printable receipt
      setPrintedOrder(res.order);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка оформления продажи');
    }
  };

  // Filter Catalog Items
  const filteredBikes = (catalog?.bikes || []).filter((b) => {
    if (categoryFilter !== 'ALL' && categoryFilter !== 'BIKES') return false;
    const q = searchQuery.toLowerCase();
    return b.inventoryNumber.toLowerCase().includes(q) || b.modelName.toLowerCase().includes(q);
  });

  const filteredBatteries = (catalog?.batteries || []).filter((b) => {
    if (categoryFilter !== 'ALL' && categoryFilter !== 'BATTERIES') return false;
    const q = searchQuery.toLowerCase();
    return (
      b.serialNumber.toLowerCase().includes(q) ||
      b.modelName.toLowerCase().includes(q) ||
      `${b.voltage}v`.includes(q) ||
      `${b.capacityAh}ah`.includes(q)
    );
  });

  const filteredParts = (catalog?.parts || []).filter((p) => {
    if (categoryFilter !== 'ALL' && categoryFilter !== 'PARTS') return false;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const filteredOutfits = (catalog?.outfits || []).filter((o) => {
    if (categoryFilter !== 'ALL' && categoryFilter !== 'OUTFITS') return false;
    const q = searchQuery.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.inventoryNumber && o.inventoryNumber.toLowerCase().includes(q)) ||
      o.categoryName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            Магазин и кассовый терминал (POS)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Продажа электровелосипедов, аккумуляторов, запчастей и экипировки
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('POS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'POS'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Кассовый терминал (POS)
          </button>
          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ORDERS'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Журнал продаж ({orders.length})
          </button>
        </div>
      </div>

      {activeTab === 'POS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Product Showcase (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filters Bar */}
            <div className="p-4 contour-card space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
                  {[
                    { id: 'ALL', label: 'Все товары' },
                    { id: 'BIKES', label: 'Электровелосипеды' },
                    { id: 'BATTERIES', label: 'Аккумуляторы' },
                    { id: 'PARTS', label: 'Запчасти' },
                    { id: 'OUTFITS', label: 'Экипировка' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setCategoryFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        categoryFilter === tab.id
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                          : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-60 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Поиск по товарам..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="space-y-4">
              {/* 1. Bikes section */}
              {filteredBikes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <BikeIcon className="w-3.5 h-3.5 text-sky-400" />
                    Электровелосипеды ({filteredBikes.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredBikes.map((bike) => (
                      <div
                        key={bike.id}
                        className="p-3.5 contour-card flex flex-col justify-between space-y-3 bg-white dark:bg-[#0c1611] hover:border-emerald-500/40 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                                {bike.modelName}
                              </h4>
                              <span className="font-mono text-[11px] font-bold text-sky-500">
                                {bike.inventoryNumber}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                bike.status === 'FOR_SALE'
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {bike.status === 'FOR_SALE' ? 'К продаже' : 'Свободен'}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              {bike.powerWatts}W
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                              {bike.batteryCapacityAh}Ah АКБ
                            </span>
                            {bike.winterVersion && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400">
                                Зима ❄️
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-emerald-500/10">
                          <div>
                            <span className="text-[10px] text-slate-400">Цена продажи:</span>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {bike.price.toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddToCart('BIKE', bike)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />В чек
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batteries section */}
              {filteredBatteries.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                    Аккумуляторы (АКБ) ({filteredBatteries.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredBatteries.map((bat) => (
                      <div
                        key={bat.id}
                        className="p-3.5 contour-card flex flex-col justify-between space-y-3 bg-white dark:bg-[#0c1611] hover:border-emerald-500/40 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                                {bat.modelName}
                              </h4>
                              <span className="font-mono text-[11px] font-bold text-emerald-500">
                                {bat.serialNumber}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              На складе
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-300">
                              {bat.voltage}V • {bat.capacityAh}Ah
                            </span>
                            {bat.chemistry && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                                {bat.chemistry}
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                              Здоровье: {bat.healthPercent}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-emerald-500/10">
                          <div>
                            <span className="text-[10px] text-slate-400">Цена продажи:</span>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {bat.price.toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddToCart('BATTERY', bat)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />В чек
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Parts section */}
              {filteredParts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-400" />
                    Запчасти и расходники ({filteredParts.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredParts.map((part) => (
                      <div
                        key={part.id}
                        className="p-3.5 contour-card flex flex-col justify-between space-y-3 bg-white dark:bg-[#0c1611] hover:border-emerald-500/40 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                {part.name}
                              </h4>
                              <span className="font-mono text-[10px] text-slate-400">
                                Артикул: {part.sku}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-300">
                              {part.quantity} шт.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-emerald-500/10">
                          <div>
                            <span className="text-[10px] text-slate-400">Цена:</span>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {part.price.toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddToCart('PART', part)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />В чек
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Outfits section */}
              {filteredOutfits.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Экипировка и аксессуары ({filteredOutfits.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredOutfits.map((outfit) => (
                      <div
                        key={outfit.id}
                        className="p-3.5 contour-card flex flex-col justify-between space-y-3 bg-white dark:bg-[#0c1611] hover:border-emerald-500/40 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                                {outfit.name}
                              </h4>
                              <span className="text-[10px] text-emerald-400 font-semibold">
                                {outfit.categoryName}
                              </span>
                            </div>
                            {outfit.inventoryNumber && (
                              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-400">
                                {outfit.inventoryNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-emerald-500/10">
                          <div>
                            <span className="text-[10px] text-slate-400">Цена:</span>
                            <p className="text-sm font-black text-slate-900 dark:text-white">
                              {outfit.price.toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddToCart('OUTFIT', outfit)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />В чек
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredBikes.length === 0 &&
                filteredParts.length === 0 &&
                filteredOutfits.length === 0 && (
                  <div className="p-8 contour-card text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                    По вашему запросу товары не найдены
                  </div>
                )}
            </div>
          </div>

          {/* Right Column: POS Cart & Checkout (5 cols) */}
          <div className="lg:col-span-5 sticky top-20">
            <form
              onSubmit={handleCheckout}
              className="p-5 contour-card space-y-4 bg-white dark:bg-[#0a140f] border-emerald-500/30 shadow-xl shadow-emerald-500/5"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Текущий чек продажи
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      Позиций в чеке: {cart.reduce((s, i) => s + i.quantity, 0)} шт.
                    </span>
                  </div>
                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-[11px] text-rose-500 hover:underline"
                  >
                    Очистить
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 space-y-1">
                    <ShoppingBag className="w-8 h-8 mx-auto text-slate-500/60" />
                    <p className="text-xs font-semibold">Корзина пуста</p>
                    <p className="text-[11px] text-slate-500">
                      Нажмите «+ В чек» на карточке товара слева
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={`${item.itemType}-${item.itemId}`}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/15 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {item.price.toLocaleString('ru-RU')} ₽ / шт.
                        </span>
                      </div>

                      {/* Qty controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.itemType === 'PART' ? (
                          <div className="flex items-center gap-1 bg-white dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.itemId, item.itemType, -1)}
                              className="p-1 text-slate-400 hover:text-white rounded"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-bold text-xs text-slate-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.itemId, item.itemType, 1)}
                              className="p-1 text-slate-400 hover:text-white rounded"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 px-1">1 шт.</span>
                        )}

                        <span className="w-16 text-right font-bold text-xs text-slate-900 dark:text-white">
                          {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.itemId, item.itemType)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer Selector */}
              <div className="pt-2 border-t border-slate-200 dark:border-emerald-500/15 space-y-2.5 text-xs">
                <span className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider block">
                  Покупатель и гарантийный чек:
                </span>

                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-[#101d17] rounded-xl border border-slate-200 dark:border-emerald-500/10">
                  <button
                    type="button"
                    onClick={() => setCustomerType('GUEST')}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                      customerType === 'GUEST'
                        ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Гость
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('CLIENT')}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                      customerType === 'CLIENT'
                        ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Курьер CRM
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerType('EXTERNAL')}
                    className={`py-1 text-[11px] font-bold rounded-lg transition-all ${
                      customerType === 'EXTERNAL'
                        ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Физическое лицо
                  </button>
                </div>

                {customerType === 'CLIENT' ? (
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400">
                      Выберите клиента из базы CRM *
                    </label>
                    <select
                      value={selectedClientId}
                      onChange={(e) => handleSelectClient(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-medium text-slate-900 dark:text-white text-xs"
                    >
                      <option value="">-- Выберите клиента / курьера --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName} ({c.clientType === 'RETAIL' ? 'Розничный' : c.courierService || 'Курьер'}, {c.phone})
                          {c.loyaltyTier ? ` • ${c.loyaltyTier.name} (-${c.loyaltyTier.discountPartsPercent}%)` : ''}
                        </option>
                      ))}
                    </select>

                    {selectedClient && selectedClient.loyaltyTier && (
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-amber-500 flex items-center gap-1">
                          ★ Программа лояльности: {selectedClient.loyaltyTier.name}
                        </span>
                        <span className="font-extrabold text-amber-500">
                          Скидка {loyaltyDiscountPercent}%
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder="ФИО покупателя..."
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Телефон для гарантии..."
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Order / Receipt Number with Prefix */}
              <div className="pt-2 border-t border-slate-200 dark:border-emerald-500/15 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider block">
                    Номер чека / продажи:
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-400">Пресеты:</span>
                    {['ЧЕК-', 'ORD-', 'ПР-'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleShopPrefixChange(p)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                          shopOrderPrefix === p
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:text-white border border-slate-200 dark:border-emerald-500/10'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-24 shrink-0">
                    <input
                      type="text"
                      placeholder="Префикс"
                      value={shopOrderPrefix}
                      onChange={(e) => handleShopPrefixChange(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold font-mono text-center text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                      title="Префикс чека (например, ЧЕК- или ORD-)"
                    />
                  </div>

                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="ЧЕК-001"
                      value={shopOrderNumber}
                      onChange={(e) => setShopOrderNumber(e.target.value)}
                      className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-mono text-slate-900 dark:text-white font-bold text-xs focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nextNum = calculateNextShopOrderNumber(shopOrderPrefix);
                        setShopOrderNumber(nextNum);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-400 transition"
                      title="Подобрать следующий свободный номер чека"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="pt-2 border-t border-slate-200 dark:border-emerald-500/15 space-y-2 text-xs">
                <span className="font-bold text-slate-900 dark:text-white text-[11px] uppercase tracking-wider block">
                  Способ оплаты:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CASH', label: 'Наличные', icon: Banknote },
                    { id: 'CARD', label: 'Карта', icon: CreditCard },
                    { id: 'SBP', label: 'СБП (QR)', icon: QrCode },
                    { id: 'BANK_TRANSFER', label: 'Р/с компании', icon: Building },
                  ].map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                        className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border transition-all ${
                          paymentMethod === m.id
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                            : 'bg-slate-50 dark:bg-[#101d17] border-slate-200 dark:border-emerald-500/10 text-slate-600 dark:text-slate-400 hover:border-emerald-500/30'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <input
                  type="text"
                  placeholder="Примечание к заказу (необязательно)..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* Financial Totals & Margins */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 space-y-1.5 text-xs">
                {loyaltyDiscountAmount > 0 && (
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Сумма без скидки:</span>
                    <span className="line-through">{rawTotalAmount.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                {loyaltyDiscountAmount > 0 && (
                  <div className="flex justify-between font-bold text-amber-500">
                    <span>Скидка лояльности ({loyaltyDiscountPercent}%):</span>
                    <span>-{loyaltyDiscountAmount.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Себестоимость товаров (COGS):</span>
                  <span>{totalCost.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-500">
                  <span>Торговая маржа:</span>
                  <span>+{profitMargin.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-emerald-500/15 text-base font-black text-slate-900 dark:text-white">
                  <span>Итого к оплате:</span>
                  <span className="text-xl text-emerald-500">
                    {totalAmount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={cart.length === 0}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-sm font-black rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Оформить продажу и пробить чек
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Orders Journal Tab */}
      {activeTab === 'ORDERS' && (
        <div className="contour-card overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-emerald-500/15 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Журнал розничных продаж
              </h3>
              <p className="text-[11px] text-slate-400">
                Все чеки, выданные через кассовый терминал магазина
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Всего чеков: {orders.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-emerald-400/80 border-b border-slate-200 dark:border-emerald-500/15">
                <tr>
                  <th className="p-3.5 font-semibold">Номер чека</th>
                  <th className="p-3.5 font-semibold">Дата и время</th>
                  <th className="p-3.5 font-semibold">Покупатель</th>
                  <th className="p-3.5 font-semibold">Товары в чеке</th>
                  <th className="p-3.5 font-semibold">Оплата</th>
                  <th className="p-3.5 font-semibold text-right">Сумма</th>
                  <th className="p-3.5 font-semibold text-right">Прибыль</th>
                  <th className="p-3.5 font-semibold text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      {ord.orderNumber}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {new Date(ord.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{ord.customerName}</p>
                      {ord.customerPhone && (
                        <p className="text-[10px] text-slate-400">{ord.customerPhone}</p>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="space-y-0.5 max-w-xs">
                        {ord.items.map((it, idx) => (
                          <p key={idx} className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                            • {it.name} × {it.quantity}
                          </p>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 text-slate-700 dark:text-slate-300">
                        {ord.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-900 dark:text-white">
                      {ord.totalAmount.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-500">
                      +{ord.profit.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setPrintedOrder(ord)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Распечатать товарный чек"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <PrintableSaleReceiptModal
        isOpen={!!printedOrder}
        onClose={() => setPrintedOrder(null)}
        order={printedOrder}
      />
    </div>
  );
};
