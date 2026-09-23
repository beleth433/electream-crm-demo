import React, { useState, useEffect } from 'react';
import { Part, PartCategoryItem } from '../types';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix, setStoredPrefix } from '../utils/numbering';

export const InventoryPage: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [categories, setCategories] = useState<PartCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

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

  const calculateNextPartSku = (prefixToUse: string, partList: Part[] = parts) => {
    const existing = partList.map((p) => p.sku);
    return getNextSequentialNumber(existing, prefixToUse, 3);
  };

  const handlePrefixChange = (newPrefix: string) => {
    setPartPrefix(newPrefix);
    setStoredPrefix('part', newPrefix);
    const nextNum = calculateNextPartSku(newPrefix);
    setNewPartForm((prev) => ({ ...prev, sku: nextNum }));
  };

  const handleOpenAddModal = () => {
    const nextNum = calculateNextPartSku(partPrefix);
    setIsQuickCategoryCreating(false);
    setQuickCategoryName('');
    setNewPartForm({
      name: '',
      sku: nextNum,
      categoryId: categories[0]?.id || '',
      quantity: 10,
      minQuantity: 3,
      purchasePrice: 500,
      clientPrice: 1200,
    });
    setIsAddModalOpen(true);
  };

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      api.getParts({
        lowStockOnly: lowStockFilter,
        categoryId: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search,
      }),
      api.getPartCategories(),
    ])
      .then(([partsRes, categoriesRes]) => {
        setParts(partsRes);
        setCategories(categoriesRes);
        if (categoriesRes.length > 0 && !newPartForm.categoryId) {
          setNewPartForm((prev) => ({ ...prev, categoryId: categoriesRes[0].id }));
        }
      })
      .catch((err) => toast.error('Ошибка загрузки запчастей: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [lowStockFilter, categoryFilter]);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPart({
        ...newPartForm,
        categoryId: newPartForm.categoryId || undefined,
        quantity: Number(newPartForm.quantity),
        minQuantity: Number(newPartForm.minQuantity),
        purchasePrice: Number(newPartForm.purchasePrice),
        clientPrice: Number(newPartForm.clientPrice),
      });
      toast.success(`Деталь "${newPartForm.name}" добавлена на склад!`);
      const nextNum = getNextSequentialNumber(
        [...parts.map((p) => p.sku), newPartForm.sku],
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


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Склад запчастей и расходников
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Учет остатков, закупочных и клиентских цен, автоматический контроль неснижаемого остатка
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsManageCategoriesOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700"
          >
            <FolderPlus className="w-4 h-4 text-emerald-500" />
            Категории запчастей
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Новая номенклатура
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="space-y-3 p-4 contour-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLowStockFilter(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                !lowStockFilter
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720] border border-transparent dark:border-emerald-500/10'
              }`}
            >
              Все позиции
            </button>
            <button
              onClick={() => setLowStockFilter(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                lowStockFilter
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-300/40 dark:border-amber-500/20 hover:border-amber-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Только дефицит (ниже порога)
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию или SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </form>
        </div>

        {/* Dynamic Category Filter Pills - wraps naturally across lines without scrollbar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-200/60 dark:border-emerald-500/10 w-full">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-emerald-500" />
            Категория:
          </span>
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
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

      {/* Parts Table */}
      <div className="contour-card overflow-hidden">
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
                      <div className="flex items-center justify-end gap-2">
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
                  onClick={() => {
                    const nextNum = calculateNextPartSku(partPrefix);
                    setNewPartForm((prev) => ({ ...prev, sku: nextNum }));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-500 transition"
                  title="Подобрать следующий свободный номер для этого префикса"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Префикс подбирает следующий артикул по порядку. Можно свободно править вручную.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Начальное количество (шт.) *</label>
              <input
                required
                type="number"
                min="0"
                value={newPartForm.quantity}
                onChange={(e) => setNewPartForm({ ...newPartForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Порог предупреждения *</label>
              <input
                required
                type="number"
                min="1"
                value={newPartForm.minQuantity}
                onChange={(e) => setNewPartForm({ ...newPartForm, minQuantity: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1">Закупочная цена (₽) *</label>
              <input
                required
                type="number"
                min="0"
                value={newPartForm.purchasePrice}
                onChange={(e) => setNewPartForm({ ...newPartForm, purchasePrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1">Клиентская цена СТО (₽) *</label>
              <input
                required
                type="number"
                min="0"
                value={newPartForm.clientPrice}
                onChange={(e) => setNewPartForm({ ...newPartForm, clientPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
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
    </div>
  );
};
