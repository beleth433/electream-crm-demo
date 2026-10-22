import { useCrmRefresh } from '../hooks/useCrmRefresh';
import React, { useState, useEffect, useMemo } from 'react';
import { Part, PartOrder, PartCategoryItem, PartOrderCategoryItem, PaymentMethod, User as AppUser } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import {
  Boxes,
  Search,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Layers,
  PackagePlus,
  Trash2,
  Sparkles,
  Tag,
  FolderPlus,
  Edit2,
  Check,
  X,
  ShoppingCart,
  ExternalLink,
  Clock,
  CheckCircle2,
  Truck,
  AlertCircle,
  ShoppingBag,
  ArrowRight,
  CreditCard,
  Smartphone,
  Banknote,
  Landmark,
  Receipt,
  Wallet,
  Wrench,
  PackageCheck,
  Archive,
  RotateCw,
  History,
  User as UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix, setStoredPrefix } from '../utils/numbering';

export interface InventoryPageProps {
  currentUser?: AppUser | null;
}

export const InventoryPage: React.FC<InventoryPageProps> = ({ currentUser }) => {
  // Mode switcher: 'stock' (В наличии на складе) or 'orders' (Заявки на закупку)
  const [activeMode, setActiveMode] = useState<'stock' | 'orders'>(() => {
    try {
      return (localStorage.getItem('crm_inventory_mode') as any) || 'stock';
    } catch {
      return 'stock';
    }
  });

  const handleSelectMode = (mode: 'stock' | 'orders') => {
    setActiveMode(mode);
    try {
      localStorage.setItem('crm_inventory_mode', mode);
    } catch {}
  };

  // Determine currently authenticated user display name
  const currentUserName = useMemo(() => {
    if (currentUser) {
      const name = currentUser.fullName || currentUser.username || currentUser.login || '';
      const role = currentUser.roleTitle || (currentUser.role === 'ADMIN' ? 'Руководитель' : currentUser.role === 'MECHANIC' ? 'Мастер' : '');
      if (name && role) return `${name} (${role})`;
      if (name) return name;
    }
    try {
      const saved = localStorage.getItem('crm_auth_user') || localStorage.getItem('crm_user');
      if (saved) {
        const u = JSON.parse(saved);
        const name = u.fullName || u.username || u.login || '';
        const role = u.roleTitle || (u.role === 'ADMIN' ? 'Руководитель' : u.role === 'MECHANIC' ? 'Мастер' : '');
        if (name && role) return `${name} (${role})`;
        if (name) return name;
      }
    } catch {}
    return 'Мастер';
  }, [currentUser]);

  const [parts, setParts] = useState<Part[]>([]);
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<PartCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Procurement Orders (Заявки на закупку) State
  const [orders, setOrders] = useState<PartOrder[]>([]);
  const [orderCategories, setOrderCategories] = useState<PartOrderCategoryItem[]>([]);
  const [orderCategoryFilter, setOrderCategoryFilter] = useState<string>('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    partName: '',
    partId: '',
    categoryId: '',
    quantity: 1,
    orderUrl: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'URGENT',
    estimatedPrice: 0,
    note: '',
    requestedBy: currentUserName,
  });

  // Sync requestedBy when currentUser profile loads
  useEffect(() => {
    if (currentUserName) {
      setOrderForm((prev) => {
        if (!prev.requestedBy || prev.requestedBy === 'Владислав (Мастер)' || prev.requestedBy === 'Мастер') {
          return { ...prev, requestedBy: currentUserName };
        }
        return prev;
      });
    }
  }, [currentUserName]);

  // Manage Order Categories Modal State
  const [isManageOrderCategoriesOpen, setIsManageOrderCategoriesOpen] = useState(false);
  const [newOrderCategoryName, setNewOrderCategoryName] = useState('');
  const [editingOrderCategoryId, setEditingOrderCategoryId] = useState<string | null>(null);
  const [editingOrderCategoryName, setEditingOrderCategoryName] = useState<string>('');

  // Edit Order Modal State
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PartOrder | null>(null);
  const [editOrderForm, setEditOrderForm] = useState({
    partName: '',
    partId: '',
    categoryId: '',
    quantity: 1,
    orderUrl: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'URGENT',
    estimatedPrice: 0,
    note: '',
    requestedBy: currentUserName,
  });

  // Confirm Purchase & Cash Expense Modal State
  const [orderToConfirmPurchase, setOrderToConfirmPurchase] = useState<PartOrder | null>(null);
  const [purchaseForm, setPurchaseForm] = useState<{
    actualCost: number | '';
    paymentMethod: PaymentMethod;
  }>({
    actualCost: '',
    paymentMethod: 'CARD',
  });

  // Receive Order (Оприходование новинки на склад / как расходник) Modal State
  const [orderToReceive, setOrderToReceive] = useState<PartOrder | null>(null);
  const [receiveMode, setReceiveMode] = useState<'CATALOG' | 'CONSUMABLE'>('CATALOG');
  const [receivePartForm, setReceivePartForm] = useState({
    name: '',
    sku: '',
    categoryId: '',
    quantity: 1,
    minQuantity: 3,
    purchasePrice: 0,
    clientPrice: 0,
  });
  const [isReceiveQuickCategoryCreating, setIsReceiveQuickCategoryCreating] = useState(false);
  const [receiveQuickCategoryName, setReceiveQuickCategoryName] = useState('');

  // Smart Delete & Archive Order Modal State
  const [orderToDelete, setOrderToDelete] = useState<PartOrder | null>(null);

  // Restock Modal
  const [restockPart, setRestockPart] = useState<Part | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState<number>(5);

  // Manage Categories Modal
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');

  // Add Part Modal & Prefix State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [partPrefix, setPartPrefix] = useState<string>(() => getStoredPrefix('part', 'PRT-'));
  const [isQuickCategoryCreating, setIsQuickCategoryCreating] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [newPartForm, setNewPartForm] = useState({
    name: '',
    sku: '',
    categoryId: '',
    quantity: 10,
    minQuantity: 3,
    purchasePrice: 500,
    clientPrice: 1200,
  });

  // Edit Part Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [editPartForm, setEditPartForm] = useState({
    name: '',
    sku: '',
    categoryId: '',
    quantity: 0,
    minQuantity: 3,
    purchasePrice: 0,
    clientPrice: 0,
  });

  const handleOpenEditModal = (part: Part) => {
    setEditingPart(part);
    setEditPartForm({
      name: part.name,
      sku: part.sku,
      categoryId: part.categoryId || categories[0]?.id || '',
      quantity: part.quantity,
      minQuantity: part.minQuantity,
      purchasePrice: part.purchasePrice,
      clientPrice: part.clientPrice,
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;
    try {
      await api.updatePart(editingPart.id, {
        ...editPartForm,
        categoryId: editPartForm.categoryId || undefined,
        quantity: Number(editPartForm.quantity),
        minQuantity: Number(editPartForm.minQuantity),
        purchasePrice: Number(editPartForm.purchasePrice),
        clientPrice: Number(editPartForm.clientPrice),
      });
      toast.success(`Запчасть "${editPartForm.name}" успешно обновлена!`);
      setIsEditModalOpen(false);
      setEditingPart(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления запчасти');
    }
  };

  const calculateNextPartSku = (prefixToUse: string, partList: Part[] = allParts) => {
    const existing = partList.map((p) => p.sku);
    return getNextSequentialNumber(existing, prefixToUse, 3);
  };

  const handlePrefixChange = (newPrefix: string) => {
    setPartPrefix(newPrefix);
    setStoredPrefix('part', newPrefix);
    const nextNum = calculateNextPartSku(newPrefix, allParts);
    setNewPartForm((prev) => ({ ...prev, sku: nextNum }));
  };

  const handleOpenAddModal = async () => {
    setIsQuickCategoryCreating(false);
    setQuickCategoryName('');
    try {
      const latestAll = await api.getParts();
      setAllParts(latestAll);
      const nextNum = calculateNextPartSku(partPrefix, latestAll);
      setNewPartForm({
        name: '',
        sku: nextNum,
        categoryId: categories[0]?.id || '',
        quantity: 10,
        minQuantity: 3,
        purchasePrice: 500,
        clientPrice: 1200,
      });
    } catch {
      const nextNum = calculateNextPartSku(partPrefix, allParts);
      setNewPartForm({
        name: '',
        sku: nextNum,
        categoryId: categories[0]?.id || '',
        quantity: 10,
        minQuantity: 3,
        purchasePrice: 500,
        clientPrice: 1200,
      });
    }
    setIsAddModalOpen(true);
  };

  const handleRecalculatePartSku = async () => {
    try {
      const latestAll = await api.getParts();
      setAllParts(latestAll);
      const nextNum = calculateNextPartSku(partPrefix, latestAll);
      setNewPartForm((prev) => ({ ...prev, sku: nextNum }));
      toast.success(`Подобран следующий артикул: ${nextNum}`);
    } catch {
      const nextNum = calculateNextPartSku(partPrefix, allParts);
      setNewPartForm((prev) => ({ ...prev, sku: nextNum }));
    }
  };

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      api.getParts({
        lowStockOnly: lowStockFilter,
        categoryId: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search,
      }),
      api.getParts(),
      api.getPartCategories(),
      api.getPartOrders(),
      api.getPartOrderCategories(),
    ])
      .then(([partsRes, allPartsRes, categoriesRes, ordersRes, orderCatsRes]) => {
        setParts(partsRes);
        setAllParts(allPartsRes);
        setCategories(categoriesRes);
        setOrders(ordersRes);
        setOrderCategories(orderCatsRes);
        if (categoriesRes.length > 0 && !newPartForm.categoryId) {
          setNewPartForm((prev) => ({ ...prev, categoryId: categoriesRes[0].id }));
        }
        if (orderCatsRes.length > 0 && !orderForm.categoryId) {
          setOrderForm((prev) => ({ ...prev, categoryId: orderCatsRes[0].id }));
        }
      })
      .catch((err) => toast.error('Ошибка загрузки склада запчастей: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.partName.trim()) {
      toast.error('Укажите название запчасти');
      return;
    }
    try {
      await api.createPartOrder({
        partName: orderForm.partName.trim(),
        partId: orderForm.partId || undefined,
        categoryId: orderForm.categoryId || undefined,
        quantity: Number(orderForm.quantity) || 1,
        orderUrl: orderForm.orderUrl.trim() || undefined,
        priority: orderForm.priority,
        estimatedPrice: Number(orderForm.estimatedPrice) || undefined,
        note: orderForm.note.trim() || undefined,
        requestedBy: orderForm.requestedBy.trim() || currentUserName,
      });
      toast.success(`Заявка на "${orderForm.partName}" успешно создана!`);
      setIsAddOrderModalOpen(false);
      setOrderForm({
        partName: '',
        partId: '',
        categoryId: orderCategories[0]?.id || '',
        quantity: 1,
        orderUrl: '',
        priority: 'NORMAL',
        estimatedPrice: 0,
        note: '',
        requestedBy: currentUserName,
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания заявки');
    }
  };

  const handleOpenAddOrderModal = () => {
    setOrderForm({
      partName: '',
      partId: '',
      categoryId: orderCategories[0]?.id || '',
      quantity: 1,
      orderUrl: '',
      priority: 'NORMAL',
      estimatedPrice: 0,
      note: '',
      requestedBy: currentUserName,
    });
    setIsAddOrderModalOpen(true);
  };

  const handleOpenEditOrderModal = (order: PartOrder) => {
    setEditingOrder(order);
    setEditOrderForm({
      partName: order.partName,
      partId: order.partId || '',
      categoryId: order.categoryId || '',
      quantity: order.quantity,
      orderUrl: order.orderUrl || '',
      priority: order.priority,
      estimatedPrice: order.estimatedPrice || 0,
      note: order.note || '',
      requestedBy: order.requestedBy || currentUserName,
    });
    setIsEditOrderModalOpen(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!editOrderForm.partName.trim()) {
      toast.error('Укажите название запчасти');
      return;
    }
    try {
      await api.updatePartOrder(editingOrder.id, {
        partName: editOrderForm.partName.trim(),
        partId: editOrderForm.partId || null,
        categoryId: editOrderForm.categoryId || null,
        quantity: Number(editOrderForm.quantity) || 1,
        orderUrl: editOrderForm.orderUrl.trim() || null,
        priority: editOrderForm.priority,
        estimatedPrice: Number(editOrderForm.estimatedPrice) || 0,
        note: editOrderForm.note.trim() || null,
        requestedBy: editOrderForm.requestedBy.trim() || currentUserName,
      });
      toast.success(`Заявка на "${editOrderForm.partName}" обновлена!`);
      setIsEditOrderModalOpen(false);
      setEditingOrder(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления заявки');
    }
  };

  // Order Categories Handlers
  const handleCreateOrderCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newOrderCategoryName.trim();
    if (!trimmed) return;
    try {
      await api.createPartOrderCategory({ name: trimmed });
      toast.success(`Отдел закупки "${trimmed}" успешно добавлен!`);
      setNewOrderCategoryName('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания отдела закупки');
    }
  };

  const handleStartEditOrderCategory = (cat: PartOrderCategoryItem) => {
    setEditingOrderCategoryId(cat.id);
    setEditingOrderCategoryName(cat.name);
  };

  const handleCancelEditOrderCategory = () => {
    setEditingOrderCategoryId(null);
    setEditingOrderCategoryName('');
  };

  const handleSaveEditOrderCategory = async (catId: string) => {
    const trimmed = editingOrderCategoryName.trim();
    if (!trimmed) {
      toast.error('Название отдела не может быть пустым');
      return;
    }
    try {
      await api.updatePartOrderCategory(catId, { name: trimmed });
      toast.success(`Отдел переименован в "${trimmed}"`);
      handleCancelEditOrderCategory();
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления отдела');
    }
  };

  const handleDeleteOrderCategory = async (cat: PartOrderCategoryItem) => {
    if ((cat.orderCount ?? 0) > 0) {
      toast.error(`Нельзя удалить отдел "${cat.name}": к нему привязано ${cat.orderCount} заявок`);
      return;
    }
    if (window.confirm(`Вы уверены, что хотите удалить отдел закупки "${cat.name}"?`)) {
      try {
        await api.deletePartOrderCategory(cat.id);
        toast.success(`Отдел "${cat.name}" удален`);
        if (orderCategoryFilter === cat.id) setOrderCategoryFilter('ALL');
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления отдела');
      }
    }
  };

  const handlePromptPurchase = (order: PartOrder) => {
    const defaultCost =
      order.actualCost !== undefined && order.actualCost > 0
        ? order.actualCost
        : (Number(order.estimatedPrice) || 0) * (Number(order.quantity) || 1);
    setOrderToConfirmPurchase(order);
    setPurchaseForm({
      actualCost: defaultCost > 0 ? defaultCost : '',
      paymentMethod: order.paymentMethod || 'CARD',
    });
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToConfirmPurchase) return;
    try {
      const cost = purchaseForm.actualCost === '' ? 0 : Number(purchaseForm.actualCost);
      await api.updatePartOrderStatus(orderToConfirmPurchase.id, 'ORDERED', {
        actualCost: cost,
        paymentMethod: purchaseForm.paymentMethod,
        addToStock: true,
      });
      toast.success(
        `Заявка на "${orderToConfirmPurchase.partName}" переведена в статус "В пути" 🚚. ${
          cost > 0 ? `Расход ${cost.toLocaleString('ru-RU')} ₽ зафиксирован в кассе!` : ''
        }`
      );
      setOrderToConfirmPurchase(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка проведения списания закупки');
    }
  };

  const handlePromptReceiveOrder = (order: PartOrder) => {
    // Check if part already exists in warehouse (by partId or case-insensitive name)
    const existingPart = order.partId
      ? allParts.find((p) => p.id === order.partId)
      : allParts.find((p) => p.name.trim().toLowerCase() === order.partName.trim().toLowerCase());

    if (existingPart) {
      // Existing part: directly accept & restock
      api
        .updatePartOrderStatus(order.id, 'RECEIVED', { addToStock: true })
        .then(() => {
          toast.success(`Деталь "${existingPart.name}" оприходована на склад (+${order.quantity} шт.)! ✅`);
          loadData();
        })
        .catch((err) => toast.error(err.message || 'Ошибка оприходования детали'));
      return;
    }

    // New part: Open ReceiveNewPartModal
    const nextSku = calculateNextPartSku(partPrefix, allParts);
    const purchaseCost =
      order.actualCost && order.quantity
        ? Math.round(order.actualCost / order.quantity)
        : order.estimatedPrice || 0;
    const clientPrice = Math.round(purchaseCost * 1.5) || Math.round(purchaseCost * 2) || 0;

    setReceiveMode('CATALOG');
    setReceivePartForm({
      name: order.partName,
      sku: nextSku,
      categoryId: categories[0]?.id || '',
      quantity: order.quantity || 1,
      minQuantity: 3,
      purchasePrice: purchaseCost,
      clientPrice: clientPrice,
    });
    setIsReceiveQuickCategoryCreating(false);
    setReceiveQuickCategoryName('');
    setOrderToReceive(order);
  };

  const handleConfirmReceiveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToReceive) return;

    try {
      if (receiveMode === 'CATALOG') {
        if (!receivePartForm.name.trim()) {
          toast.error('Укажите наименование детали');
          return;
        }
        if (!receivePartForm.sku.trim()) {
          toast.error('Укажите артикул детали');
          return;
        }

        await api.updatePartOrderStatus(orderToReceive.id, 'RECEIVED', {
          addToStock: true,
          createPartData: {
            name: receivePartForm.name.trim(),
            sku: receivePartForm.sku.trim(),
            categoryId: receivePartForm.categoryId || categories[0]?.id || undefined,
            quantity: Number(receivePartForm.quantity) || 1,
            minQuantity: Number(receivePartForm.minQuantity) || 3,
            purchasePrice: Number(receivePartForm.purchasePrice) || 0,
            clientPrice: Number(receivePartForm.clientPrice) || 0,
          },
        });

        toast.success(
          `Новая деталь "${receivePartForm.name}" (${receivePartForm.sku}) успешно создана и оприходована на склад (${receivePartForm.quantity} шт.)! 📦✅`
        );
      } else {
        // Consumable / Workshop Tool
        await api.updatePartOrderStatus(orderToReceive.id, 'RECEIVED', { addToStock: false });
        toast.success(`Заявка отмечена как полученная (инструмент / расходник мастерской) 🛠️✅`);
      }

      setOrderToReceive(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка оприходования');
    }
  };

  const handleCreateReceiveQuickCategory = async () => {
    if (!receiveQuickCategoryName.trim()) return;
    try {
      const created = await api.createPartCategory({ name: receiveQuickCategoryName.trim() });
      toast.success(`Категория склада "${created.name}" создана!`);
      setCategories((prev) => [...prev, created]);
      setReceivePartForm((prev) => ({ ...prev, categoryId: created.id }));
      setReceiveQuickCategoryName('');
      setIsReceiveQuickCategoryCreating(false);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания категории');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: any) => {
    const order = orders.find((o) => o.id === orderId);

    if (status === 'ORDERED') {
      if (order) {
        handlePromptPurchase(order);
        return;
      }
    }

    if (status === 'RECEIVED') {
      if (order) {
        handlePromptReceiveOrder(order);
        return;
      }
    }

    try {
      await api.updatePartOrderStatus(orderId, status, { addToStock: true });
      if (status === 'REQUESTED') {
        toast.info('Заявка возвращена в статус "Требуется" (расход из кассы аннулирован)');
      } else if (status === 'CANCELLED') {
        toast.info('Заявка отменена (расход из кассы аннулирован)');
      } else if (status === 'ARCHIVED') {
        toast.success('Заявка перемещена в архив (кассовый расход сохранён) 📁');
      }
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления статуса заявки');
    }
  };

  const handleArchiveOrder = async (order: PartOrder) => {
    try {
      await api.updatePartOrderStatus(order.id, 'ARCHIVED');
      toast.success(`Заявка на "${order.partName}" перемещена в архив 📁 (кассовый расход сохранён)`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка архивации заявки');
    }
  };

  const handleReorder = (order: PartOrder) => {
    const estPrice =
      order.actualCost && order.quantity
        ? Math.round(order.actualCost / order.quantity)
        : order.estimatedPrice || 0;

    setOrderForm({
      partName: order.partName,
      partId: order.partId || '',
      categoryId: order.categoryId || orderCategories[0]?.id || '',
      quantity: order.quantity || 1,
      orderUrl: order.orderUrl || '',
      priority: order.priority || 'NORMAL',
      estimatedPrice: estPrice,
      note: order.note || '',
      requestedBy: currentUserName,
    });
    setIsAddOrderModalOpen(true);
    toast.info(`Параметры закупки "${order.partName}" предзаполнены для повторного заказа 🔁`);
  };

  const handleOrderFromStock = (part: Part) => {
    const matchingCat = orderCategories.find(
      (c) => c.name.toLowerCase() === (part.categoryName || '').toLowerCase()
    );
    const neededQty = Math.max(1, (part.minQuantity || 3) - part.quantity);

    setOrderForm({
      partName: part.name,
      partId: part.id,
      categoryId: matchingCat?.id || orderCategories[0]?.id || '',
      quantity: neededQty > 0 ? neededQty : 5,
      orderUrl: '',
      priority: part.quantity <= (part.minQuantity || 3) ? 'URGENT' : 'NORMAL',
      estimatedPrice: part.purchasePrice || 0,
      note: `Пополнение склада: ${part.sku} (текущий остаток ${part.quantity} шт.)`,
      requestedBy: currentUserName,
    });
    setActiveMode('orders');
    setIsAddOrderModalOpen(true);
    toast.info(`Создание заявки на закупку детали "${part.name}" 🛒`);
  };

  const handleDeleteOrderClick = (order: PartOrder) => {
    setOrderToDelete(order);
  };

  const handleConfirmArchiveFromModal = async () => {
    if (!orderToDelete) return;
    const target = orderToDelete;
    setOrderToDelete(null);
    await handleArchiveOrder(target);
  };

  const handleConfirmDeleteWithPaymentRemoval = async () => {
    if (!orderToDelete) return;
    try {
      await api.deletePartOrder(orderToDelete.id, { deletePayment: true });
      toast.success(`Заявка "${orderToDelete.partName}" удалена (расход кассы аннулирован)`);
      setOrderToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления заявки');
    }
  };

  const handleConfirmDeleteWithoutPaymentRemoval = async () => {
    if (!orderToDelete) return;
    try {
      await api.deletePartOrder(orderToDelete.id, { deletePayment: false });
      toast.success(`Заявка "${orderToDelete.partName}" удалена (чек в кассе сохранён)`);
      setOrderToDelete(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления заявки');
    }
  };

  useCrmRefresh(loadData);

  useEffect(() => {
    loadData();
  }, [lowStockFilter, categoryFilter]);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createPart({
        ...newPartForm,
        categoryId: newPartForm.categoryId || undefined,
        quantity: Number(newPartForm.quantity),
        minQuantity: Number(newPartForm.minQuantity),
        purchasePrice: Number(newPartForm.purchasePrice),
        clientPrice: Number(newPartForm.clientPrice),
      });
      toast.success(`Деталь "${newPartForm.name}" добавлена на склад!`);
      const updatedAll = [...allParts, created];
      setAllParts(updatedAll);
      const nextNum = getNextSequentialNumber(
        updatedAll.map((p) => p.sku),
        partPrefix,
        3
      );
      setIsAddModalOpen(false);
      setNewPartForm({
        name: '',
        sku: nextNum,
        categoryId: categories[0]?.id || '',
        quantity: 10,
        minQuantity: 3,
        purchasePrice: 500,
        clientPrice: 1200,
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка добавления детали');
    }
  };

  const handleCreateQuickCategory = async () => {
    if (!quickCategoryName.trim()) return;
    try {
      const created = await api.createPartCategory({ name: quickCategoryName.trim() });
      toast.success(`Категория "${created.name}" создана!`);
      setCategories((prev) => [...prev, created]);
      setNewPartForm((prev) => ({ ...prev, categoryId: created.id }));
      setQuickCategoryName('');
      setIsQuickCategoryCreating(false);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания категории');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      const created = await api.createPartCategory({ name: newCategoryName.trim() });
      toast.success(`Категория "${created.name}" добавлена в справочник!`);
      setCategories((prev) => [...prev, created]);
      setNewCategoryName('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания категории');
    }
  };

  const handleStartEditCategory = (cat: PartCategoryItem) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleSaveEditCategory = async (id: string) => {
    if (!editingCategoryName.trim()) {
      toast.error('Название категории не может быть пустым');
      return;
    }
    try {
      const updated = await api.updatePartCategory(id, { name: editingCategoryName.trim() });
      toast.success(`Категория переименована: "${updated.name}"`);
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: updated.name } : c)));
      setEditingCategoryId(null);
      setEditingCategoryName('');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления категории');
    }
  };

  const handleDeleteCategory = async (cat: PartCategoryItem) => {
    if ((cat.partCount ?? 0) > 0) {
      toast.error(`Нельзя удалить категорию "${cat.name}": в ней числится ${cat.partCount} поз. запчастей`);
      return;
    }
    if (window.confirm(`Вы уверены, что хотите удалить категорию "${cat.name}"?`)) {
      try {
        await api.deletePartCategory(cat.id);
        toast.success(`Категория "${cat.name}" удалена`);
        if (categoryFilter === cat.id) setCategoryFilter('ALL');
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления категории');
      }
    }
  };

  const handleConfirmRestock = async () => {
    if (!restockPart) return;
    try {
      await api.restockPart(restockPart.id, Number(quantityToAdd));
      toast.success(`Склад пополнен: ${restockPart.name} (+${quantityToAdd} шт.)`);
      setRestockPart(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка оприходования');
    }
  };

  const handleDeletePart = async (part: Part) => {
    if (
      window.confirm(
        `Вы действительно хотите удалить позицию номенклатуры "${part.name}" (${part.sku}) с остатком ${part.quantity} шт.?`
      )
    ) {
      try {
        await api.deletePart(part.id);
        toast.success(`Запчасть "${part.name}" удалена со склада`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления запчасти');
      }
    }
  };

  const ordersInCategory =
    orderCategoryFilter === 'ALL'
      ? orders
      : orders.filter((o) => o.categoryId === orderCategoryFilter);

  const priorityWeight: Record<string, number> = {
    URGENT: 1,
    NORMAL: 2,
    LOW: 3,
  };

  const statusWeight: Record<string, number> = {
    REQUESTED: 1,
    ORDERED: 2,
    RECEIVED: 3,
    ARCHIVED: 4,
    CANCELLED: 5,
  };

  const filteredOrders = ordersInCategory
    .filter((order) => {
      const matchesStatus =
        orderStatusFilter === 'ALL'
          ? order.status !== 'ARCHIVED'
          : order.status === orderStatusFilter;
      const term = orderSearch.toLowerCase().trim();
      const matchesSearch =
        !term ||
        order.partName.toLowerCase().includes(term) ||
        (order.categoryName && order.categoryName.toLowerCase().includes(term)) ||
        (order.requestedBy && order.requestedBy.toLowerCase().includes(term)) ||
        (order.note && order.note.toLowerCase().includes(term)) ||
        (order.orderUrl && order.orderUrl.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      // 1. Статус заявки: Требуется (1) -> В пути (2) -> Получено (3) -> Архив (4) -> Отменено (5)
      const sA = statusWeight[a.status] || 6;
      const sB = statusWeight[b.status] || 6;
      if (sA !== sB) return sA - sB;

      // 2. Внутри каждого статуса: Срочно (URGENT) всегда выше обычного
      const pA = priorityWeight[a.priority || 'NORMAL'] || 2;
      const pB = priorityWeight[b.priority || 'NORMAL'] || 2;
      if (pA !== pB) return pA - pB;

      // 3. Дата: новые сначала
      const dateA = new Date(a.requestedAt || 0).getTime();
      const dateB = new Date(b.requestedAt || 0).getTime();
      return dateB - dateA;
    });

  const totalOrdersCount = ordersInCategory.filter((o) => o.status !== 'ARCHIVED').length;
  const requestedOrdersCount = ordersInCategory.filter((o) => o.status === 'REQUESTED').length;
  const orderedOrdersCount = ordersInCategory.filter((o) => o.status === 'ORDERED').length;
  const receivedOrdersCount = ordersInCategory.filter((o) => o.status === 'RECEIVED').length;
  const archivedOrdersCount = ordersInCategory.filter((o) => o.status === 'ARCHIVED').length;
  const cancelledOrdersCount = ordersInCategory.filter((o) => o.status === 'CANCELLED').length;

  const getOrderCost = (o: PartOrder) => {
    if (o.actualCost !== undefined && o.actualCost > 0) return o.actualCost;
    return (Number(o.estimatedPrice) || 0) * (Number(o.quantity) || 1);
  };

  const totalOrdersSum = ordersInCategory
    .filter((o) => o.status !== 'ARCHIVED')
    .reduce((sum, o) => sum + getOrderCost(o), 0);
  const requestedOrdersSum = ordersInCategory
    .filter((o) => o.status === 'REQUESTED')
    .reduce((sum, o) => sum + getOrderCost(o), 0);
  const orderedOrdersSum = ordersInCategory
    .filter((o) => o.status === 'ORDERED')
    .reduce((sum, o) => sum + getOrderCost(o), 0);
  const receivedOrdersSum = ordersInCategory
    .filter((o) => o.status === 'RECEIVED')
    .reduce((sum, o) => sum + getOrderCost(o), 0);
  const archivedOrdersSum = ordersInCategory
    .filter((o) => o.status === 'ARCHIVED')
    .reduce((sum, o) => sum + getOrderCost(o), 0);

  const filteredOrdersTotalSum = filteredOrders.reduce((sum, o) => sum + getOrderCost(o), 0);
  const filteredOrdersTotalQuantity = filteredOrders.reduce(
    (sum, o) => sum + (Number(o.quantity) || 1),
    0
  );

  const getCategoryStats = (categoryId: string | 'ALL') => {
    const list = categoryId === 'ALL' ? orders : orders.filter((o) => o.categoryId === categoryId);
    const count = list.length;
    const sum = list.reduce((acc, o) => acc + getOrderCost(o), 0);
    return { count, sum };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {activeMode === 'stock' ? 'Склад запчастей и расходников' : 'Заявки на закупку расходников'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {activeMode === 'stock'
              ? 'Учет остатков, закупочных и клиентских цен, автоматический контроль неснижаемого остатка'
              : 'Оперативные заявки мастера СТО, прямые ссылки на маркетплейсы и контроль этапов поставки'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto w-full sm:w-auto">
          {activeMode === 'stock' ? (
            <>
              <button
                onClick={() => setIsManageCategoriesOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700"
              >
                <FolderPlus className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">Категории</span>
              </button>
              <button
                onClick={handleOpenAddModal}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">Новая номенклатура</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsManageOrderCategoriesOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700"
              >
                <FolderPlus className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="truncate">Отделы заявок</span>
              </button>
              <button
                onClick={handleOpenAddOrderModal}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className="truncate">Новая заявка на закупку</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dual Mode Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-[#0c1812] rounded-2xl border border-slate-200/80 dark:border-emerald-500/20">
        <button
          type="button"
          onClick={() => handleSelectMode('stock')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeMode === 'stock'
              ? 'bg-white dark:bg-[#152a20] text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4 shrink-0" />
          <span>В наличии на складе</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeMode === 'stock'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {parts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectMode('orders')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 sm:px-4 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeMode === 'orders'
              ? 'bg-white dark:bg-[#152a20] text-amber-600 dark:text-amber-400 shadow-sm border border-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span>Заявки на закупку (Мастер)</span>
          {orders.filter((o) => o.status !== 'RECEIVED' && o.status !== 'CANCELLED').length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950">
              {orders.filter((o) => o.status !== 'RECEIVED' && o.status !== 'CANCELLED').length}
            </span>
          )}
        </button>
      </div>

      {activeMode === 'stock' ? (
        <>
          {/* Filter and Search */}
      <div className="space-y-3 p-4 contour-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setLowStockFilter(false)}
              className={`flex-1 sm:flex-none text-center px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                !lowStockFilter
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720] border border-transparent dark:border-emerald-500/10'
              }`}
            >
              Все позиции
            </button>
            <button
              onClick={() => setLowStockFilter(true)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                lowStockFilter
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-500/20 hover:border-amber-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Дефицит (ниже порога)</span>
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию или SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 min-h-[40px] bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </form>
        </div>

        {/* Dynamic Category Filter Pills - wraps naturally across lines without scrollbar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-200/60 dark:border-emerald-500/10 w-full">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Категория:
          </span>
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 min-h-[32px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === 'ALL'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/40 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            Все категории ({parts.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 min-h-[32px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat.id
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/40 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {cat.name} {cat.partCount !== undefined ? `(${cat.partCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Parts Table (Desktop) */}
      <div className="contour-card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-emerald-400/80 border-b border-slate-200 dark:border-emerald-500/15">
              <tr>
                <th className="p-3.5 font-semibold">Артикул (SKU)</th>
                <th className="p-3.5 font-semibold">Наименование запчасти</th>
                <th className="p-3.5 font-semibold">Категория</th>
                <th className="p-3.5 font-semibold text-center">Остаток на складе</th>
                <th className="p-3.5 font-semibold text-center">Порог предупреждения</th>
                <th className="p-3.5 font-semibold">Закупочная цена (себестоимость)</th>
                <th className="p-3.5 font-semibold">Клиентская цена (СТО)</th>
                <th className="p-3.5 font-semibold text-right">Оприходовать</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {parts.map((p) => {
                const isLow = p.quantity <= p.minQuantity;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      isLow ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    <td className="p-3.5 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {p.sku}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                      {p.name}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 text-slate-700 dark:text-emerald-300 font-medium whitespace-nowrap">
                        {p.categoryName || 'Без категории'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full font-black text-xs ${
                          isLow
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                        }`}
                      >
                        {p.quantity} шт.
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-medium text-slate-500">
                      {p.minQuantity} шт.
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {p.purchasePrice.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {p.clientPrice.toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOrderFromStock(p)}
                          title="Создать заявку на закупку (Мастер)"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 rounded-lg text-xs font-bold transition-all border border-amber-300/40"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Заказать
                        </button>
                        <button
                          onClick={() => {
                            setRestockPart(p);
                            setQuantityToAdd(5);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 rounded-lg text-xs font-bold transition-all"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          Пополнить
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          title="Редактировать параметры запчасти"
                          className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePart(p)}
                          title="Удалить деталь из каталога"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parts Cards (Mobile) */}
      <div className="block md:hidden space-y-3">
        {parts.map((p) => {
          const isLow = p.quantity <= p.minQuantity;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all ${
                isLow
                  ? 'bg-amber-500/5 dark:bg-amber-950/20 border-amber-500/30'
                  : 'bg-white dark:bg-[#0c1812] border-slate-200 dark:border-emerald-500/15'
              }`}
            >
              {/* Top row: SKU, category, stock */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400">
                      {p.sku}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 text-slate-700 dark:text-emerald-300 font-medium truncate max-w-[150px]">
                      {p.categoryName || 'Без категории'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1 break-words">
                    {p.name}
                  </h3>
                </div>

                <span
                  className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full font-black text-xs ${
                    isLow
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                  }`}
                >
                  {p.quantity} шт.
                </span>
              </div>

              {/* Price & threshold details */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101d17]/80 text-xs mb-3 border border-slate-100 dark:border-emerald-500/10">
                <div>
                  <span className="text-slate-400 text-[10px] block">Клиентская (СТО):</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                    {p.clientPrice.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Себестоимость:</span>
                  <span className="text-slate-600 dark:text-slate-300 text-xs">
                    {p.purchasePrice.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-emerald-500/10 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Порог предупреждения:</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    {isLow && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                    {p.minQuantity} шт.
                  </span>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={() => handleOrderFromStock(p)}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 active:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-all border border-amber-300/40"
                >
                  <ShoppingCart className="w-4 h-4 shrink-0" />
                  Заказать
                </button>
                <button
                  onClick={() => {
                    setRestockPart(p);
                    setQuantityToAdd(5);
                  }}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-50 active:bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-bold transition-all border border-sky-200/60 dark:border-sky-500/20"
                >
                  <PackagePlus className="w-4 h-4 shrink-0" />
                  Пополнить
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    title="Редактировать параметры запчасти"
                    className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-sky-600 bg-slate-100 dark:bg-slate-800/80 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePart(p)}
                    title="Удалить деталь из каталога"
                    className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-rose-600 bg-slate-100 dark:bg-slate-800/80 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  ) : (
    <div className="space-y-6">
      {/* Orders KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 contour-card flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Всего заявок
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5">
              <span>{totalOrdersCount}</span>
              <span className="text-xs font-bold text-slate-400">
                ({totalOrdersSum.toLocaleString('ru-RU')} ₽)
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 contour-card flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              Требуется заказать
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 flex items-baseline gap-1.5">
              <span>{requestedOrdersCount}</span>
              <span className="text-xs font-bold text-amber-600/80 dark:text-amber-400/80">
                ({requestedOrdersSum.toLocaleString('ru-RU')} ₽)
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 contour-card flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
              В пути / Заказано
            </div>
            <div className="text-xl font-black text-sky-600 dark:text-sky-400 flex items-baseline gap-1.5">
              <span>{orderedOrdersCount}</span>
              <span className="text-xs font-bold text-sky-600/80 dark:text-sky-400/80">
                ({orderedOrdersSum.toLocaleString('ru-RU')} ₽)
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 contour-card flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              Получено на склад
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-baseline gap-1.5">
              <span>{receivedOrdersCount}</span>
              <span className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80">
                ({receivedOrdersSum.toLocaleString('ru-RU')} ₽)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Categories Filter Box */}
      <div className="space-y-3 p-4 contour-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Отделы и направления закупки
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Фильтрация по категориям заявок: Тюнинг, Запчасти, Гараж, Инструмент, Расходники
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsManageOrderCategoriesOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 self-start sm:self-auto"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Настроить отделы</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-200/60 dark:border-amber-500/10 w-full">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            Отдел:
          </span>
          <button
            onClick={() => setOrderCategoryFilter('ALL')}
            className={`px-3 py-1.5 min-h-[34px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              orderCategoryFilter === 'ALL'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/40 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            Все отделы ({getCategoryStats('ALL').count} • {getCategoryStats('ALL').sum.toLocaleString('ru-RU')} ₽)
          </button>
          {orderCategories.map((cat) => {
            const st = getCategoryStats(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setOrderCategoryFilter(cat.id)}
                className={`px-3 py-1.5 min-h-[34px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  orderCategoryFilter === cat.id
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/40 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                {cat.name} ({st.count} • {st.sum.toLocaleString('ru-RU')} ₽)
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Filter and Search Bar */}
      <div className="space-y-3 p-4 contour-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setOrderStatusFilter('ALL')}
              className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                orderStatusFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720]'
              }`}
            >
              Все ({totalOrdersCount} • {totalOrdersSum.toLocaleString('ru-RU')} ₽)
            </button>
            <button
              onClick={() => setOrderStatusFilter('REQUESTED')}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                orderStatusFilter === 'REQUESTED'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-500/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Требуется ({requestedOrdersCount} • {requestedOrdersSum.toLocaleString('ru-RU')} ₽)</span>
            </button>
            <button
              onClick={() => setOrderStatusFilter('ORDERED')}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                orderStatusFilter === 'ORDERED'
                  ? 'bg-sky-500 text-white font-bold shadow-sm shadow-sky-500/20'
                  : 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-300/40 dark:border-sky-500/20'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>В пути ({orderedOrdersCount} • {orderedOrdersSum.toLocaleString('ru-RU')} ₽)</span>
            </button>
            <button
              onClick={() => setOrderStatusFilter('RECEIVED')}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                orderStatusFilter === 'RECEIVED'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Получено ({receivedOrdersCount} • {receivedOrdersSum.toLocaleString('ru-RU')} ₽)</span>
            </button>
            <button
              onClick={() => setOrderStatusFilter('ARCHIVED')}
              className={`flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                orderStatusFilter === 'ARCHIVED'
                  ? 'bg-slate-700 text-white font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720] border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-slate-400" />
              <span>Архив ({archivedOrdersCount} • {archivedOrdersSum.toLocaleString('ru-RU')} ₽)</span>
            </button>
            {orders.some((o) => o.status === 'CANCELLED') && (
              <button
                onClick={() => setOrderStatusFilter('CANCELLED')}
                className={`px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-all ${
                  orderStatusFilter === 'CANCELLED'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-100 dark:bg-[#101d17] text-slate-500 dark:text-slate-400'
                }`}
              >
                Отменено ({orders.filter((o) => o.status === 'CANCELLED').length})
              </button>
            )}
          </div>

          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по запчасти, мастеру, ссылке..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 min-h-[40px] bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-amber-500/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Orders List: Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 p-6 contour-card flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
            {orderSearch || orderStatusFilter !== 'ALL' ? 'Заявок не найдено' : 'Список заявок пуст'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
            {orderSearch || orderStatusFilter !== 'ALL'
              ? 'Попробуйте сбросить фильтры или изменить поисковый запрос'
              : 'Мастер может оперативно добавить заявку на расходники с прямой ссылкой для закупки'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddOrderModal}
            className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Создать первую заявку</span>
          </button>
        </div>
      ) : (
        <>
          {/* Orders Table (Desktop) */}
          <div className="contour-card overflow-hidden hidden md:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-amber-400/80 border-b border-slate-200 dark:border-amber-500/15">
                <tr>
                  <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">Статус</th>
                  <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Срочность</th>
                  <th className="px-2 py-2.5 font-semibold whitespace-nowrap">Отдел</th>
                  <th className="px-3 py-2.5 font-semibold">Наименование расходника</th>
                  <th className="px-2 py-2.5 font-semibold text-center whitespace-nowrap">Кол-во</th>
                  <th className="px-2.5 py-2.5 font-semibold whitespace-nowrap">Ориент. цена</th>
                  <th className="px-2 py-2.5 font-semibold whitespace-nowrap text-center">Ссылка</th>
                  <th className="px-2.5 py-2.5 font-semibold">Заявитель</th>
                  <th className="px-2.5 py-2.5 font-semibold text-right whitespace-nowrap">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOrders.map((order) => {
                  const isUrgent = order.priority === 'URGENT';
                  const isLow = order.priority === 'LOW';

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isUrgent ? 'bg-rose-500/5 dark:bg-rose-950/15 border-l-2 border-l-rose-500' : ''
                      }`}
                    >
                      {/* Status */}
                      <td className="px-2.5 py-2.5 whitespace-nowrap">
                        {order.status === 'REQUESTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                            <Clock className="w-3.5 h-3.5" />
                            Требуется
                          </span>
                        )}
                        {order.status === 'ORDERED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
                            <Truck className="w-3.5 h-3.5" />
                            В пути
                          </span>
                        )}
                        {order.status === 'RECEIVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            На складе
                          </span>
                        )}
                        {order.status === 'ARCHIVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700">
                            <Archive className="w-3.5 h-3.5 text-slate-400" />
                            В архиве
                          </span>
                        )}
                        {order.status === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            <X className="w-3.5 h-3.5" />
                            Отменено
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        {isUrgent ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-500/30">
                            🔥 Срочно
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Низкий
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Обычный
                          </span>
                        )}
                      </td>

                      {/* Department / Category - Fully visible without truncation */}
                      <td className="px-2 py-2.5">
                        {order.categoryName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 whitespace-normal break-words leading-tight">
                            <Tag className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>{order.categoryName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </td>

                      {/* Part Name + Note - Multi-line without truncation */}
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900 dark:text-white leading-snug whitespace-normal break-words">
                          {order.partName}
                        </div>
                        {order.note && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5 leading-snug whitespace-normal break-words">
                            {order.note}
                          </div>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="px-2 py-2.5 text-center whitespace-nowrap">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {order.quantity} шт.
                        </span>
                      </td>

                      {/* Estimated Price / Actual Cost */}
                      <td className="px-2.5 py-2.5 text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                        {order.actualCost !== undefined && order.actualCost > 0 ? (
                          <div>
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {order.actualCost.toLocaleString('ru-RU')} ₽
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                              <Receipt className="w-3 h-3 shrink-0" />
                              <span>
                                {order.paymentMethod === 'CARD'
                                  ? 'Карта'
                                  : order.paymentMethod === 'SBP'
                                  ? 'СБП'
                                  : order.paymentMethod === 'CASH'
                                  ? 'Наличные'
                                  : 'Р/С'}
                              </span>
                            </div>
                          </div>
                        ) : order.estimatedPrice ? (
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {((order.estimatedPrice || 0) * (order.quantity || 1)).toLocaleString('ru-RU')} ₽
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              ({order.estimatedPrice.toLocaleString('ru-RU')} ₽/шт.)
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Marketplace link */}
                      <td className="px-2 py-2.5 text-center whitespace-nowrap">
                        {order.orderUrl ? (
                          <a
                            href={order.orderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[28px] bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all whitespace-nowrap"
                            title="Открыть ссылку на товар"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                            <span>Купить</span>
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Requester - Fully visible without truncation */}
                      <td className="px-2.5 py-2.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs leading-tight whitespace-normal break-words">
                          {order.requestedBy}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                          {order.requestedAt ? new Date(order.requestedAt).toLocaleDateString('ru-RU') : '—'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          {order.status === 'REQUESTED' && (
                            <button
                              onClick={() => handlePromptPurchase(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[28px] bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-lg text-xs font-bold transition-all border border-sky-300/40 whitespace-nowrap shrink-0"
                              title="Оплатить и перевести в статус: Заказано / В пути"
                            >
                              <Truck className="w-3.5 h-3.5 shrink-0" />
                              <span>Заказано</span>
                            </button>
                          )}

                          {order.status === 'ORDERED' && (
                            <button
                              onClick={() => handlePromptReceiveOrder(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[28px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-xs whitespace-nowrap shrink-0"
                              title="Оприходовать на склад или как расходник"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Принять</span>
                            </button>
                          )}

                          {(order.status === 'RECEIVED' || order.status === 'ARCHIVED' || order.status === 'CANCELLED') && (
                            <button
                              onClick={() => handleReorder(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[28px] bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold transition-all border border-amber-300/40 whitespace-nowrap shrink-0"
                              title="Заказать снова"
                            >
                              <RotateCw className="w-3.5 h-3.5 shrink-0" />
                              <span>Повторить</span>
                            </button>
                          )}

                          {order.status === 'RECEIVED' && (
                            <button
                              onClick={() => handleArchiveOrder(order)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[28px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0"
                              title="Перенести в архив"
                            >
                              <Archive className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <span>В архив</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEditOrderModal(order)}
                            title="Редактировать заявку"
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-all shrink-0"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteOrderClick(order)}
                            title="Удалить заявку"
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50/95 dark:bg-[#08100c]/95 border-t-2 border-slate-200 dark:border-amber-500/30 text-xs">
                <tr>
                  <td colSpan={4} className="px-3 py-3 font-black text-slate-800 dark:text-slate-100">
                    Итого по текущей выборке ({filteredOrders.length} {filteredOrders.length === 1 ? 'позиция' : filteredOrders.length < 5 ? 'позиции' : 'позиций'}):
                  </td>
                  <td className="px-2 py-3 text-center text-slate-900 dark:text-white font-extrabold whitespace-nowrap">
                    {filteredOrdersTotalQuantity} шт.
                  </td>
                  <td className="px-2.5 py-3 text-amber-600 dark:text-amber-400 font-black text-sm whitespace-nowrap">
                    {filteredOrdersTotalSum.toLocaleString('ru-RU')} ₽
                  </td>
                  <td colSpan={3} className="px-2.5 py-3 text-right text-[11px] font-medium text-slate-400">
                    Авторасчет: кол-во × цена
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Orders Cards (Mobile Touch UX) */}
          <div className="block md:hidden space-y-3">
            {/* Mobile Summary Banner */}
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                В выборке: <b>{filteredOrders.length} поз.</b> ({filteredOrdersTotalQuantity} шт.)
              </span>
              <span className="font-black text-sm text-amber-600 dark:text-amber-400">
                {filteredOrdersTotalSum.toLocaleString('ru-RU')} ₽
              </span>
            </div>

            {filteredOrders.map((order) => {
              const isUrgent = order.priority === 'URGENT';

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isUrgent
                      ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
                      : 'bg-white dark:bg-[#0c1812] border-slate-200 dark:border-amber-500/15'
                  }`}
                >
                  {/* Top row: Priority & Status & Quantity */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      {isUrgent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-500/30">
                          🔥 Срочно
                        </span>
                      )}
                      {order.status === 'REQUESTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Clock className="w-3 h-3" />
                          Требуется
                        </span>
                      )}
                      {order.status === 'ORDERED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                          <Truck className="w-3 h-3" />
                          В пути
                        </span>
                      )}
                      {order.status === 'RECEIVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          На складе
                        </span>
                      )}
                      {order.status === 'ARCHIVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300/40">
                          <Archive className="w-3 h-3 text-slate-400" />
                          В архиве
                        </span>
                      )}
                      {order.status === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Отменено
                        </span>
                      )}
                    </div>

                    <span className="font-extrabold text-sm text-slate-900 dark:text-white shrink-0">
                      {order.quantity} шт.
                    </span>
                  </div>

                  {/* Part Title & Department */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white break-words">
                      {order.partName}
                    </h3>
                    {order.categoryName && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        <Tag className="w-2.5 h-2.5 text-amber-500" />
                        {order.categoryName}
                      </span>
                    )}
                  </div>

                  {/* Meta details */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-[#101d17]/80 text-xs mb-3 border border-slate-100 dark:border-amber-500/10">
                    <div>
                      <span className="text-slate-400 text-[10px] block">
                        {order.actualCost !== undefined && order.actualCost > 0 ? 'Списано в кассу:' : 'Ориент. сумма:'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {order.actualCost !== undefined && order.actualCost > 0
                          ? `${order.actualCost.toLocaleString('ru-RU')} ₽ (${
                              order.paymentMethod === 'CARD'
                                ? 'Карта'
                                : order.paymentMethod === 'SBP'
                                ? 'СБП'
                                : order.paymentMethod === 'CASH'
                                ? 'Наличные'
                                : 'Р/С'
                            })`
                          : order.estimatedPrice
                          ? `${((order.estimatedPrice || 0) * (order.quantity || 1)).toLocaleString('ru-RU')} ₽`
                          : 'Не указана'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Заявитель:</span>
                      <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold truncate block">
                        {order.requestedBy}
                      </span>
                    </div>
                    {order.note && (
                      <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-amber-500/10 text-[11px] text-slate-500 dark:text-slate-400 italic">
                        Примечание: {order.note}
                      </div>
                    )}
                  </div>

                  {/* Marketplace Big Button */}
                  {order.orderUrl && (
                    <div className="mb-3">
                      <a
                        href={order.orderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 min-h-[44px] bg-gradient-to-r from-blue-600 to-indigo-600 active:from-blue-700 active:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                      >
                        <ShoppingCart className="w-4 h-4 shrink-0" />
                        <span>Купить</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      </a>
                    </div>
                  )}

                  {/* Bottom Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {order.status === 'REQUESTED' && (
                      <button
                        onClick={() => handlePromptPurchase(order)}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-50 active:bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-bold transition-all border border-sky-300/40"
                      >
                        <Truck className="w-4 h-4 shrink-0" />
                        Заказано
                      </button>
                    )}

                    {order.status === 'ORDERED' && (
                      <button
                        onClick={() => handlePromptReceiveOrder(order)}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 active:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Принять на склад
                      </button>
                    )}

                    {(order.status === 'RECEIVED' || order.status === 'ARCHIVED' || order.status === 'CANCELLED') && (
                      <button
                        onClick={() => handleReorder(order)}
                        className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 active:bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold transition-all border border-amber-300/40"
                      >
                        <RotateCw className="w-4 h-4 shrink-0" />
                        Заказать снова
                      </button>
                    )}

                    {order.status === 'RECEIVED' && (
                      <button
                        onClick={() => handleArchiveOrder(order)}
                        className="min-h-[44px] px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
                        title="В архив"
                      >
                        <Archive className="w-4 h-4 text-slate-400" />
                        <span>В архив</span>
                      </button>
                    )}

                    <select
                      value={order.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as any;
                        if (newStatus === 'ORDERED') {
                          handlePromptPurchase(order);
                        } else if (newStatus === 'RECEIVED') {
                          handlePromptReceiveOrder(order);
                        } else {
                          handleUpdateOrderStatus(order.id, newStatus);
                        }
                      }}
                      className="min-h-[44px] px-2.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="REQUESTED">Требуется</option>
                      <option value="ORDERED">В пути</option>
                      <option value="RECEIVED">Получено</option>
                      <option value="ARCHIVED">В архиве</option>
                      <option value="CANCELLED">Отменено</option>
                    </select>

                    <button
                      onClick={() => handleOpenEditOrderModal(order)}
                      title="Редактировать заявку"
                      className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-amber-600 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all shrink-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteOrderClick(order)}
                      title="Удалить заявку / Перенести в архив"
                      className="w-11 h-11 flex items-center justify-center text-slate-500 hover:text-rose-600 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  )}

  {/* Modal: Add Order */}
  <Modal
    isOpen={isAddOrderModalOpen}
    onClose={() => setIsAddOrderModalOpen(false)}
    title="Новая заявка на закупку"
    subtitle="Оперативный заказ расходников и запчастей для мастерской"
    maxWidth="md"
  >
    <form onSubmit={handleCreateOrder} className="space-y-4 text-xs">
      {/* Pick existing part or custom */}
      <div>
        <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
          Выбрать из существующей номенклатуры (опционально)
        </label>
        <select
          value={orderForm.partId}
          onChange={(e) => {
            const selectedId = e.target.value;
            const found = allParts.find((p) => p.id === selectedId);
            if (found) {
              setOrderForm((prev) => ({
                ...prev,
                partId: found.id,
                partName: found.name,
                estimatedPrice: found.purchasePrice || prev.estimatedPrice,
              }));
            } else {
              setOrderForm((prev) => ({ ...prev, partId: '' }));
            }
          }}
          className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white"
        >
          <option value="">-- Ввести название вручную или выбрать из базы --</option>
          {allParts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} | {p.name} (остаток: {p.quantity} шт., себестоимость: {p.purchasePrice} ₽)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
          Наименование запчасти / расходника *
        </label>
        <input
          required
          type="text"
          placeholder="Например: Тормозные колодки полуметалл Minako V8"
          value={orderForm.partName}
          onChange={(e) => setOrderForm({ ...orderForm, partName: e.target.value })}
          className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
          Отдел / категория закупки
        </label>
        <select
          value={orderForm.categoryId}
          onChange={(e) => setOrderForm({ ...orderForm, categoryId: e.target.value })}
          className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
        >
          <option value="">-- Без привязки к отделу --</option>
          {orderCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div>
          <label className="min-h-[22px] flex items-end text-slate-500 dark:text-slate-400 mb-1.5 font-medium leading-tight">
            Количество (шт.) *
          </label>
          <input
            required
            type="number"
            step="any"
            min="1"
            value={orderForm.quantity}
            onChange={(e) => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })}
            className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-bold text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="min-h-[22px] flex items-end text-slate-500 dark:text-slate-400 mb-1.5 font-medium leading-tight">
            Приоритет срочности
          </label>
          <select
            value={orderForm.priority}
            onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value as any })}
            className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
          >
            <option value="NORMAL">Обычный (плановое пополнение)</option>
            <option value="URGENT">🔥 Срочно (горит ремонт)</option>
            <option value="LOW">Низкий (не к спеху)</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
          Прямая ссылка на товар (магазин / маркетплейс)
        </label>
        <div className="relative">
          <ShoppingCart className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="url"
            placeholder="https://... ссылка на товар"
            value={orderForm.orderUrl}
            onChange={(e) => setOrderForm({ ...orderForm, orderUrl: e.target.value })}
            className="w-full pl-9 pr-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div>
          <label className="min-h-[28px] flex items-end text-slate-500 dark:text-slate-400 mb-1.5 font-medium leading-tight">
            Ориентировочная цена (₽ за шт.)
          </label>
          <input
            type="number"
            step="any"
            min="0"
            value={orderForm.estimatedPrice || ''}
            onChange={(e) =>
              setOrderForm({ ...orderForm, estimatedPrice: Number(e.target.value) })
            }
            placeholder="500"
            className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="min-h-[28px] flex items-end text-slate-500 dark:text-slate-400 mb-1.5 font-medium leading-tight">
            Заявитель
          </label>
          <div className="relative">
            <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={orderForm.requestedBy}
              onChange={(e) => setOrderForm({ ...orderForm, requestedBy: e.target.value })}
              className="w-full pl-9 pr-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
          Примечание / для какого байка или заказ-наряда
        </label>
        <textarea
          rows={2}
          placeholder="Например: Для курьера Марата (заказ-наряд #12) или замена вилки"
          value={orderForm.note}
          onChange={(e) => setOrderForm({ ...orderForm, note: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setIsAddOrderModalOpen(false)}
          className="px-4 py-2.5 min-h-[44px] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
        >
          Отмена
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20"
        >
          Создать заявку
        </button>
      </div>
    </form>
  </Modal>

  {/* Modal: Restock */}
      <Modal
        isOpen={!!restockPart}
        onClose={() => setRestockPart(null)}
        title="Оприходование партии запчастей"
        subtitle={restockPart?.name}
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            Текущий остаток на складе: <strong>{restockPart?.quantity} шт.</strong>
          </p>

          <div>
            <label className="block text-slate-500 mb-1">Количество поступивших деталей *</label>
            <input
              type="number"
              step="any"
              min="1"
              value={quantityToAdd}
              onChange={(e) => setQuantityToAdd(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-center text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setRestockPart(null)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirmRestock}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
            >
              Принять на склад
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Add Part */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Добавить новую запчасть в каталог"
        subtitle="Создание номенклатурной позиции"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePart} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">Наименование детали *</label>
            <input
              required
              type="text"
              placeholder="Тормозные колодки полуметалл"
              value={newPartForm.name}
              onChange={(e) => setNewPartForm({ ...newPartForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
            />
          </div>

          {/* Category Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-500 font-medium">Категория запчасти *</label>
              <button
                type="button"
                onClick={() => setIsQuickCategoryCreating(!isQuickCategoryCreating)}
                className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <FolderPlus className="w-3 h-3" />
                {isQuickCategoryCreating ? 'Выбрать из списка' : '+ Новая категория'}
              </button>
            </div>

            {isQuickCategoryCreating ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Например: Оптика и свет"
                  value={quickCategoryName}
                  onChange={(e) => setQuickCategoryName(e.target.value)}
                  className="grow px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleCreateQuickCategory}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shrink-0 text-xs"
                >
                  Сохранить
                </button>
              </div>
            ) : (
              <select
                required
                value={newPartForm.categoryId}
                onChange={(e) => setNewPartForm({ ...newPartForm, categoryId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                Артикул (SKU) *
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 text-[10px]">Пресеты:</span>
                {['PRT-', 'ЗЧ-', 'ДЕТ-'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePrefixChange(p)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                      partPrefix === p
                        ? 'bg-emerald-600 text-white font-bold shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700'
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
                  value={partPrefix}
                  onChange={(e) => handlePrefixChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono text-center text-xs focus:border-emerald-500 focus:outline-none"
                  title="Префикс артикула (например, PRT- или русский ЗЧ-)"
                />
              </div>

              <div className="flex-1 relative">
                <input
                  required
                  type="text"
                  placeholder="PRT-001"
                  value={newPartForm.sku}
                  onChange={(e) => setNewPartForm({ ...newPartForm, sku: e.target.value })}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100 font-bold text-sm focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleRecalculatePartSku}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-500 transition"
                  title="Подобрать следующий свободный номер для этого префикса во всей базе запчастей"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Префикс подбирает следующий артикул по порядку. Можно свободно править вручную.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Начальное количество (шт.) *</label>
              <input
                required
                type="number"
                step="any"
                min="0"
                value={newPartForm.quantity}
                onChange={(e) => setNewPartForm({ ...newPartForm, quantity: Number(e.target.value) })}
                className="w-full h-9 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Порог предупреждения *</label>
              <input
                required
                type="number"
                step="any"
                min="1"
                value={newPartForm.minQuantity}
                onChange={(e) => setNewPartForm({ ...newPartForm, minQuantity: Number(e.target.value) })}
                className="w-full h-9 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Закупочная цена (₽) *</label>
              <input
                required
                type="number"
                step="any"
                min="0"
                value={newPartForm.purchasePrice}
                onChange={(e) => setNewPartForm({ ...newPartForm, purchasePrice: Number(e.target.value) })}
                className="w-full h-9 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Клиентская цена СТО (₽) *</label>
              <input
                required
                type="number"
                step="any"
                min="0"
                value={newPartForm.clientPrice}
                onChange={(e) => setNewPartForm({ ...newPartForm, clientPrice: Number(e.target.value) })}
                className="w-full h-9 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm"
            >
              Создать позицию
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Part */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPart(null);
        }}
        title="Редактировать запчасть"
        subtitle={editingPart ? `Артикул: ${editingPart.sku}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleUpdatePart} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">Наименование детали *</label>
            <input
              required
              type="text"
              value={editPartForm.name}
              onChange={(e) => setEditPartForm({ ...editPartForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Категория запчасти *</label>
            <select
              required
              value={editPartForm.categoryId}
              onChange={(e) => setEditPartForm({ ...editPartForm, categoryId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Артикул (SKU) *
            </label>
            <input
              required
              type="text"
              value={editPartForm.sku}
              onChange={(e) => setEditPartForm({ ...editPartForm, sku: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100 font-bold text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Количество на складе (шт.) *</label>
              <input
                required
                type="number"
                step="any"
                min="0"
                value={editPartForm.quantity}
                onChange={(e) => setEditPartForm({ ...editPartForm, quantity: Number(e.target.value) })}
                className="w-full h-9 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-xs"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Порог предупреждения *</label>
              <input
                required
                type="number"
                step="any"
                min="1"
                value={editPartForm.minQuantity}
                onChange={(e) => setEditPartForm({ ...editPartForm, minQuantity: Number(e.target.value) })}
                className="w-full h-9 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Себестоимость / закупка (₽) *</label>
              <input
                required
                type="number"
                step="any"
                min="0"
                value={editPartForm.purchasePrice}
                onChange={(e) => setEditPartForm({ ...editPartForm, purchasePrice: Number(e.target.value) })}
                className="w-full h-9 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div className="flex flex-col justify-between">
              <label className="block text-slate-500 mb-1 text-xs min-h-[1.25rem]">Клиентская цена СТО (₽) *</label>
              <input
                required
                type="number"
                step="any"
                min="0"
                value={editPartForm.clientPrice}
                onChange={(e) => setEditPartForm({ ...editPartForm, clientPrice: Number(e.target.value) })}
                className="w-full h-9 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-emerald-600 dark:text-emerald-400 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingPart(null);
              }}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Categories */}
      <Modal
        isOpen={isManageCategoriesOpen}
        onClose={() => {
          setIsManageCategoriesOpen(false);
          handleCancelEditCategory();
        }}
        title="Категории запчастей и расходников"
        subtitle="Справочник разделов номенклатуры склада"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <form onSubmit={handleCreateCategory} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Добавить новую категорию:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Например: Трансмиссия и педали"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="grow px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
          </form>

          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Существующие категории ({categories.length}):
            </p>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-80 overflow-y-auto custom-scrollbar">
              {categories.map((cat) => {
                const isEditing = editingCategoryId === cat.id;

                return (
                  <div key={cat.id} className="py-2.5 flex items-center justify-between gap-3">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="grow px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-500 rounded-lg text-xs font-semibold focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditCategory(cat.id);
                            if (e.key === 'Escape') handleCancelEditCategory();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditCategory(cat.id)}
                          className="p-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition shadow-sm"
                          title="Сохранить название"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditCategory}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                          title="Отмена"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {cat.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Позиций на складе: {cat.partCount ?? 0} шт.
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(cat)}
                            title="Переименовать категорию"
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            disabled={(cat.partCount ?? 0) > 0}
                            title={(cat.partCount ?? 0) > 0 ? 'Нельзя удалить: в категории есть запчасти' : 'Удалить категорию'}
                            className={`p-1.5 rounded-lg transition ${
                              (cat.partCount ?? 0) > 0
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsManageCategoriesOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              Закрыть
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Edit Part Order */}
      <Modal
        isOpen={isEditOrderModalOpen}
        onClose={() => {
          setIsEditOrderModalOpen(false);
          setEditingOrder(null);
        }}
        title="Редактировать заявку на закупку"
        subtitle={editingOrder ? `Заявка от ${editingOrder.requestedBy}` : ''}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateOrder} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
              Наименование запчасти / расходника *
            </label>
            <input
              required
              type="text"
              placeholder="Например: Тормозные колодки полуметалл Minako V8"
              value={editOrderForm.partName}
              onChange={(e) => setEditOrderForm({ ...editOrderForm, partName: e.target.value })}
              className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
              Отдел / категория закупки
            </label>
            <select
              value={editOrderForm.categoryId}
              onChange={(e) => setEditOrderForm({ ...editOrderForm, categoryId: e.target.value })}
              className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="">-- Без привязки к отделу --</option>
              {orderCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="min-h-[22px] flex items-end text-slate-500 dark:text-slate-400 mb-1.5 font-medium leading-tight">
                Количество (шт.) *
              </label>
              <input
                required
                type="number"
                step="any"
                min="1"
                value={editOrderForm.quantity}
                onChange={(e) => setEditOrderForm({ ...editOrderForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="min-h-[22px] flex items-end text-slate-500 dark:text-slate-400 mb-1.5 font-medium leading-tight">
                Приоритет срочности
              </label>
              <select
                value={editOrderForm.priority}
                onChange={(e) => setEditOrderForm({ ...editOrderForm, priority: e.target.value as any })}
                className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="NORMAL">Обычный (плановое пополнение)</option>
                <option value="URGENT">🔥 Срочно (горит ремонт)</option>
                <option value="LOW">Низкий (не к спеху)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
              Прямая ссылка на товар (магазин / маркетплейс)
            </label>
            <div className="relative">
              <ShoppingCart className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                placeholder="https://... ссылка на товар"
                value={editOrderForm.orderUrl}
                onChange={(e) => setEditOrderForm({ ...editOrderForm, orderUrl: e.target.value })}
                className="w-full pl-9 pr-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="min-h-[28px] flex items-end text-slate-500 dark:text-slate-400 mb-1.5 font-medium leading-tight">
                Ориентировочная цена (₽ за шт.)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={editOrderForm.estimatedPrice || ''}
                onChange={(e) =>
                  setEditOrderForm({ ...editOrderForm, estimatedPrice: Number(e.target.value) })
                }
                placeholder="500"
                className="w-full px-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="min-h-[28px] flex items-end text-slate-500 dark:text-slate-400 mb-1.5 font-medium leading-tight">
                Заявитель
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={editOrderForm.requestedBy}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, requestedBy: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 min-h-[44px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-medium">
              Примечание / для какого байка или заказ-наряда
            </label>
            <textarea
              rows={2}
              placeholder="Например: Для курьера Марата (заказ-наряд #12) или замена вилки"
              value={editOrderForm.note}
              onChange={(e) => setEditOrderForm({ ...editOrderForm, note: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditOrderModalOpen(false);
                setEditingOrder(null);
              }}
              className="px-4 py-2.5 min-h-[44px] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md shadow-amber-500/20"
            >
              Сохранить изменения
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Order Categories */}
      <Modal
        isOpen={isManageOrderCategoriesOpen}
        onClose={() => {
          setIsManageOrderCategoriesOpen(false);
          handleCancelEditOrderCategory();
        }}
        title="Отделы и направления закупки"
        subtitle="Справочник категорий заявок СТО и снабжения"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <form
            onSubmit={handleCreateOrderCategory}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2"
          >
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Добавить новый отдел / категорию закупки:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Например: Защита и экипировка"
                value={newOrderCategoryName}
                onChange={(e) => setNewOrderCategoryName(e.target.value)}
                className="grow px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[40px] text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 min-h-[40px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
          </form>

          <div>
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Существующие отделы ({orderCategories.length}):
            </p>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-80 overflow-y-auto custom-scrollbar">
              {orderCategories.map((cat) => {
                const isEditing = editingOrderCategoryId === cat.id;

                return (
                  <div key={cat.id} className="py-2.5 flex items-center justify-between gap-3">
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingOrderCategoryName}
                          onChange={(e) => setEditingOrderCategoryName(e.target.value)}
                          className="grow px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-500 rounded-lg text-xs font-semibold focus:outline-none min-h-[36px]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditOrderCategory(cat.id);
                            if (e.key === 'Escape') handleCancelEditOrderCategory();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditOrderCategory(cat.id)}
                          className="p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition shadow-sm"
                          title="Сохранить название"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditOrderCategory}
                          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                          title="Отмена"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {cat.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Привязано заявок: {cat.orderCount ?? 0} шт.
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditOrderCategory(cat)}
                            title="Переименовать отдел"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrderCategory(cat)}
                            disabled={(cat.orderCount ?? 0) > 0}
                            title={
                              (cat.orderCount ?? 0) > 0
                                ? 'Нельзя удалить: к отделу привязаны заявки'
                                : 'Удалить отдел'
                            }
                            className={`p-1.5 rounded-lg transition ${
                              (cat.orderCount ?? 0) > 0
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsManageOrderCategoriesOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl"
            >
              Закрыть
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Order Purchase & Cash Expense */}
      <Modal
        isOpen={!!orderToConfirmPurchase}
        onClose={() => setOrderToConfirmPurchase(null)}
        title="Оплата и перевод в доставку («В пути»)"
        subtitle="Списание средств в кассу и фиксация расхода"
        maxWidth="md"
      >
        {orderToConfirmPurchase && (
          <form onSubmit={handleConfirmPurchase} className="space-y-4 text-xs">
            {/* Order summary block */}
            <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Заказ расходников #{orderToConfirmPurchase.id.slice(-6)}
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {orderToConfirmPurchase.partName}
                  </h4>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-sky-500 text-white shrink-0">
                  {orderToConfirmPurchase.quantity} шт.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sky-200/60 dark:border-sky-800/40 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Отдел / Направление:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {orderToConfirmPurchase.categoryName || 'Общий отдел'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Заявитель:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {orderToConfirmPurchase.requestedBy || 'Мастер'}
                  </span>
                </div>
                {orderToConfirmPurchase.estimatedPrice ? (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Ориентировочно за шт.:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {orderToConfirmPurchase.estimatedPrice.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ) : null}
                {orderToConfirmPurchase.orderUrl ? (
                  <div className="col-span-2 pt-1">
                    <a
                      href={orderToConfirmPurchase.orderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Открыть товар на маркетплейсе</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Actual Expense Amount input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 dark:text-slate-300 font-bold">
                  Фактическая сумма списания (₽) <span className="text-rose-500">*</span>
                </label>
                {orderToConfirmPurchase.estimatedPrice ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPurchaseForm((prev) => ({
                        ...prev,
                        actualCost:
                          (orderToConfirmPurchase.estimatedPrice || 0) * (orderToConfirmPurchase.quantity || 1),
                      }))
                    }
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium"
                  >
                    Подставить расчёт ({(
                      (orderToConfirmPurchase.estimatedPrice || 0) * (orderToConfirmPurchase.quantity || 1)
                    ).toLocaleString('ru-RU')} ₽)
                  </button>
                ) : null}
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={purchaseForm.actualCost}
                  onChange={(e) =>
                    setPurchaseForm((prev) => ({
                      ...prev,
                      actualCost: e.target.value === '' ? '' : Number(e.target.value),
                    }))
                  }
                  placeholder="Например: 3500"
                  className="w-full px-3.5 py-2.5 min-h-[46px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  ₽
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Эта сумма спишется как расход кассы («Закупка расходников») и будет учтена в расчете чистой прибыли (P&L).
              </p>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2">
                Способ оплаты / кошелек списания <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'CARD', label: 'Банк. карта', icon: CreditCard },
                  { id: 'SBP', label: 'СБП / Перевод', icon: Smartphone },
                  { id: 'CASH', label: 'Наличные', icon: Banknote },
                  { id: 'BANK_TRANSFER', label: 'Р/Счёт (ИП/ООО)', icon: Landmark },
                ].map((item) => {
                  const isSelected = purchaseForm.paymentMethod === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setPurchaseForm((prev) => ({ ...prev, paymentMethod: item.id as PaymentMethod }))
                      }
                      className={`min-h-[48px] p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 text-center transition-all ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500 text-sky-700 dark:text-sky-300 font-bold shadow-xs ring-1 ring-sky-500'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                      <span className="text-[11px] leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOrderToConfirmPurchase(null)}
                className="px-4 py-2.5 min-h-[44px] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 min-h-[44px] bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>Списать и перевести «В пути»</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Receive Order (Оприходование новой номенклатуры / расходника) */}
      <Modal
        isOpen={!!orderToReceive}
        onClose={() => setOrderToReceive(null)}
        title="Приемка и оприходование заказа"
        subtitle={orderToReceive ? `Заявка #${orderToReceive.id.slice(-6)} • ${orderToReceive.partName}` : ''}
        maxWidth="lg"
      >
        {orderToReceive && (
          <form onSubmit={handleConfirmReceiveOrder} className="space-y-4 text-xs">
            {/* Order Brief Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Поступление партии
                </span>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  {orderToReceive.partName}
                </h4>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Отдел: <b>{orderToReceive.categoryName || 'Общий'}</b></span>
                  <span>•</span>
                  <span>Заявитель: <b>{orderToReceive.requestedBy || 'Мастер'}</b></span>
                  {orderToReceive.actualCost ? (
                    <>
                      <span>•</span>
                      <span>Списано: <b className="text-slate-900 dark:text-white">{orderToReceive.actualCost.toLocaleString('ru-RU')} ₽</b></span>
                    </>
                  ) : null}
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500 text-slate-950 shrink-0 shadow-xs">
                {orderToReceive.quantity} шт.
              </span>
            </div>

            {/* Mode Selector Tabs */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Куда оприходовать поступившую позицию?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReceiveMode('CATALOG')}
                  className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all min-h-[48px] ${
                    receiveMode === 'CATALOG'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    receiveMode === 'CATALOG' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold leading-tight">В каталог запчастей</span>
                    <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 leading-tight">
                      Будет на складе, доступна для ремонтов и заказ-нарядов
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiveMode('CONSUMABLE')}
                  className={`p-3 rounded-xl border flex items-center gap-3 text-left transition-all min-h-[48px] ${
                    receiveMode === 'CONSUMABLE'
                      ? 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-300 font-bold ring-1 ring-amber-500 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    receiveMode === 'CONSUMABLE' ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs font-extrabold leading-tight">Расходник / инструмент базы</span>
                    <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400 leading-tight">
                      Для нужд сервиса, без добавления в прайс-лист запчастей
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Mode A: New Part in Catalog Form */}
            {receiveMode === 'CATALOG' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Part Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Наименование детали <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={receivePartForm.name}
                      onChange={(e) => setReceivePartForm({ ...receivePartForm, name: e.target.value })}
                      placeholder="Например: Колодки тормозные гидравлические"
                      className="w-full px-3 py-2 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* SKU / Article */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 dark:text-slate-300 font-bold">
                        Артикул (SKU) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const nextNum = calculateNextPartSku(partPrefix, allParts);
                          setReceivePartForm((prev) => ({ ...prev, sku: nextNum }));
                          toast.success(`Подобран следующий артикул: ${nextNum}`);
                        }}
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        ↻ Подобрать
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={receivePartForm.sku}
                      onChange={(e) => setReceivePartForm({ ...receivePartForm, sku: e.target.value })}
                      placeholder="PRT-042"
                      className="w-full px-3 py-2 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Warehouse Category */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 dark:text-slate-300 font-bold">
                        Категория склада <span className="text-rose-500">*</span>
                      </label>
                      {!isReceiveQuickCategoryCreating && (
                        <button
                          type="button"
                          onClick={() => setIsReceiveQuickCategoryCreating(true)}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                        >
                          + Создать
                        </button>
                      )}
                    </div>

                    {isReceiveQuickCategoryCreating ? (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Новая категория..."
                          value={receiveQuickCategoryName}
                          onChange={(e) => setReceiveQuickCategoryName(e.target.value)}
                          className="w-full px-2.5 py-1.5 min-h-[44px] bg-white dark:bg-slate-900 border border-emerald-500 rounded-xl text-base sm:text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleCreateReceiveQuickCategory();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleCreateReceiveQuickCategory}
                          className="px-3 min-h-[44px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shrink-0"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsReceiveQuickCategoryCreating(false)}
                          className="px-2.5 min-h-[44px] border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 rounded-xl shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={receivePartForm.categoryId}
                        onChange={(e) =>
                          setReceivePartForm({ ...receivePartForm, categoryId: e.target.value })
                        }
                        className="w-full px-3 py-2 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Количество к оприходованию (шт.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={receivePartForm.quantity}
                      onChange={(e) =>
                        setReceivePartForm({ ...receivePartForm, quantity: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-bold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Min Quantity Alert */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Мин. остаток для предупреждения
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={receivePartForm.minQuantity}
                      onChange={(e) =>
                        setReceivePartForm({ ...receivePartForm, minQuantity: Number(e.target.value) })
                      }
                      placeholder="3"
                      className="w-full px-3 py-2 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Purchase Price */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Закупочная себестоимость (₽/шт)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={receivePartForm.purchasePrice || ''}
                      onChange={(e) => {
                        const cost = Number(e.target.value);
                        setReceivePartForm({
                          ...receivePartForm,
                          purchasePrice: cost,
                          clientPrice: Math.round(cost * 1.5),
                        });
                      }}
                      placeholder="300"
                      className="w-full px-3 py-2 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Client Price */}
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Цена клиенту в ремонте СТО (₽/шт)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={receivePartForm.clientPrice || ''}
                      onChange={(e) =>
                        setReceivePartForm({ ...receivePartForm, clientPrice: Number(e.target.value) })
                      }
                      placeholder="600"
                      className="w-full px-3 py-2 min-h-[44px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base sm:text-xs font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 pt-1">
                  💡 Новая деталь появится во вкладке «В наличии на складе» и будет навсегда привязана к этой заявке.
                </p>
              </div>
            )}

            {/* Mode B: Workshop Consumable Explanation */}
            {receiveMode === 'CONSUMABLE' && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Приемка без добавления в прайс-лист запчастей</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Позиция будет закрыта в статусе <b>«Получено»</b>. Финансовый расход на закупку уже учтён в кассе и отчете P&L. Каталог деталей для байков останется чистым от хозяйственного инвентаря и инструментов.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOrderToReceive(null)}
                className="px-4 py-2.5 min-h-[44px] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Отмена
              </button>
              <button
                type="submit"
                className={`px-5 py-2.5 min-h-[44px] font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all ${
                  receiveMode === 'CATALOG'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                <PackageCheck className="w-4 h-4" />
                <span>
                  {receiveMode === 'CATALOG' ? 'Оприходовать в каталог склада' : 'Принять как расходник базы'}
                </span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Smart Delete & Archive Order */}
      <Modal
        isOpen={!!orderToDelete}
        onClose={() => setOrderToDelete(null)}
        title="Управление удалением / архивом заявки"
        subtitle={orderToDelete ? `Заявка #${orderToDelete.id.slice(-6)} • ${orderToDelete.partName}` : ''}
        maxWidth="md"
      >
        {orderToDelete && (
          <div className="space-y-4 text-xs">
            {/* Order summary info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {orderToDelete.partName}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Кол-во: <b>{orderToDelete.quantity} шт.</b> • Отдел: <b>{orderToDelete.categoryName || 'Общий'}</b>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {orderToDelete.status === 'REQUESTED'
                    ? 'Требуется'
                    : orderToDelete.status === 'ORDERED'
                    ? 'В пути'
                    : orderToDelete.status === 'RECEIVED'
                    ? 'На складе'
                    : orderToDelete.status === 'ARCHIVED'
                    ? 'В архиве'
                    : 'Отменено'}
                </span>
              </div>

              {orderToDelete.actualCost && orderToDelete.actualCost > 0 ? (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-[11px]">
                    В кассе зафиксирован кассовый расход: <b>{orderToDelete.actualCost.toLocaleString('ru-RU')} ₽</b> ({orderToDelete.paymentMethod || 'CARD'})
                  </span>
                </div>
              ) : null}
            </div>

            {/* Options explanation */}
            {orderToDelete.actualCost && orderToDelete.actualCost > 0 ? (
              <div className="space-y-3">
                <p className="text-slate-600 dark:text-slate-300 text-xs">
                  Выберите, что сделать с данной заявкой и связанным чеком в кассе:
                </p>

                <div className="space-y-2">
                  {/* Option 1: Archive (Recommended) */}
                  <button
                    type="button"
                    onClick={handleConfirmArchiveFromModal}
                    className="w-full p-3 rounded-2xl border border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 text-left transition-all flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-emerald-800 dark:text-emerald-300">
                          📁 Перенести в архив
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-500 text-slate-950">
                          Рекомендуется
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                        Скроет позицию из активного списка заявок, но сохранит чек в кассе, учет расходов и историю P&L.
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Annul and Delete completely */}
                  <button
                    type="button"
                    onClick={handleConfirmDeleteWithPaymentRemoval}
                    className="w-full p-3 rounded-2xl border border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/10 hover:bg-rose-100/50 dark:hover:bg-rose-950/30 text-left transition-all flex items-start gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Trash2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-rose-700 dark:text-rose-400">
                        🗑️ Аннулировать расход и удалить навсегда
                      </span>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                        Удалит заявку и безвозвратно аннулирует чек расхода из кассы (используйте только при ошибочном создании).
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs">
                По данной заявке не было проведено денежных списаний в кассе. Вы уверены, что хотите удалить заявку на «{orderToDelete.partName}»?
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2.5 min-h-[44px] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                Отмена
              </button>

              {(!orderToDelete.actualCost || orderToDelete.actualCost <= 0) && (
                <button
                  type="button"
                  onClick={handleConfirmDeleteWithPaymentRemoval}
                  className="px-5 py-2.5 min-h-[44px] bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Удалить заявку</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
