import React, { useState, useEffect } from 'react';
import { Outfit, OutfitCategoryItem, OutfitTemplate, OutfitStatus } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  ShieldCheck,
  Search,
  Plus,
  Tag,
  Lock,
  BatteryCharging,
  Package,
  Headphones,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  SlidersHorizontal,
  FolderPlus,
  BookmarkPlus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { getNextSequentialNumber, getStoredPrefix, setStoredPrefix } from '../utils/numbering';

export const OutfitsPage: React.FC = () => {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [categories, setCategories] = useState<OutfitCategoryItem[]>([]);
  const [templates, setTemplates] = useState<OutfitTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Add Outfit Modal & Prefix state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [outfitPrefix, setOutfitPrefix] = useState<string>(() => getStoredPrefix('outfit', 'EQ-'));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isQuickCategoryCreating, setIsQuickCategoryCreating] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [newOutfitForm, setNewOutfitForm] = useState({
    name: '',
    category: 'HELMET',
    inventoryNumber: '',
    depositValue: 2000,
  });

  const calculateNextOutfitNumber = (prefixToUse: string, outfitList: Outfit[] = outfits) => {
    const existing = outfitList.map((o) => o.inventoryNumber);
    return getNextSequentialNumber(existing, prefixToUse, 3);
  };

  const handlePrefixChange = (newPrefix: string) => {
    setOutfitPrefix(newPrefix);
    setStoredPrefix('outfit', newPrefix);
    const nextNum = calculateNextOutfitNumber(newPrefix);
    setNewOutfitForm((prev) => ({ ...prev, inventoryNumber: nextNum }));
  };

  const handleOpenAddModal = () => {
    setSelectedTemplateId('');
    const nextNum = calculateNextOutfitNumber(outfitPrefix);
    setNewOutfitForm({
      name: '',
      category: categories[0]?.id || 'HELMET',
      inventoryNumber: nextNum,
      depositValue: 2000,
    });
    setIsAddModalOpen(true);
  };

  // Manage Categories & Templates Modal
  const [isManageMetaOpen, setIsManageMetaOpen] = useState(false);
  const [metaTab, setMetaTab] = useState<'CATEGORIES' | 'TEMPLATES'>('CATEGORIES');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTemplateForm, setNewTemplateForm] = useState({
    name: '',
    categoryId: 'HELMET',
    defaultDeposit: 2000,
    description: '',
  });

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      api.getOutfits({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        category: categoryFilter === 'ALL' ? undefined : categoryFilter,
        search,
      }),
      api.getOutfitCategories(),
      api.getOutfitTemplates(),
    ])
      .then(([outfitsData, categoriesData, templatesData]) => {
        setOutfits(outfitsData);
        setCategories(categoriesData);
        setTemplates(templatesData);
        if (categoriesData.length > 0 && !newOutfitForm.category) {
          setNewOutfitForm((prev) => ({ ...prev, category: categoriesData[0].id }));
        }
      })
      .catch((err) => toast.error('Ошибка загрузки данных экипировки: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, categoryFilter]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      const nextNum = calculateNextOutfitNumber(outfitPrefix);
      setNewOutfitForm({
        name: tmpl.name,
        category: tmpl.categoryId,
        inventoryNumber: nextNum,
        depositValue: tmpl.defaultDeposit,
      });
    }
  };

  const handleCreateCategory = async (nameToCreate: string, isInline = false) => {
    if (!nameToCreate.trim()) {
      toast.error('Введите название категории');
      return;
    }
    try {
      const created = await api.createOutfitCategory({ name: nameToCreate.trim() });
      toast.success(`Категория "${created.name}" добавлена!`);
      const updatedCategories = await api.getOutfitCategories();
      setCategories(updatedCategories);
      if (isInline) {
        setNewOutfitForm((prev) => ({ ...prev, category: created.id }));
        setIsQuickCategoryCreating(false);
        setQuickCategoryName('');
      } else {
        setNewCategoryName('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания категории');
    }
  };

  const handleDeleteCategory = async (category: OutfitCategoryItem) => {
    if ((category.itemCount ?? 0) > 0) {
      toast.error(`Невозможно удалить категорию "${category.name}": на складе есть ${category.itemCount} предметов!`);
      return;
    }
    if (window.confirm(`Вы уверены, что хотите удалить категорию "${category.name}"?`)) {
      try {
        await api.deleteOutfitCategory(category.id);
        toast.success(`Категория "${category.name}" удалена`);
        const updatedCategories = await api.getOutfitCategories();
        setCategories(updatedCategories);
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления категории');
      }
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateForm.name.trim()) {
      toast.error('Введите название шаблона');
      return;
    }
    try {
      const created = await api.createOutfitTemplate(newTemplateForm);
      toast.success(`Шаблон "${created.name}" успешно создан!`);
      const updatedTemplates = await api.getOutfitTemplates();
      setTemplates(updatedTemplates);
      setNewTemplateForm({
        name: '',
        categoryId: categories[0]?.id || 'HELMET',
        defaultDeposit: 2000,
        description: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания шаблона');
    }
  };

  const handleDeleteTemplate = async (template: OutfitTemplate) => {
    if (window.confirm(`Удалить шаблон экипировки "${template.name}"?`)) {
      try {
        await api.deleteOutfitTemplate(template.id);
        toast.success(`Шаблон "${template.name}" удален`);
        const updatedTemplates = await api.getOutfitTemplates();
        setTemplates(updatedTemplates);
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления шаблона');
      }
    }
  };

  const handleCreateOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createOutfit(newOutfitForm);
      toast.success(`Экипировка "${newOutfitForm.name}" добавлена на склад!`);
      const nextNum = getNextSequentialNumber(
        [...outfits.map((o) => o.inventoryNumber), newOutfitForm.inventoryNumber],
        outfitPrefix,
        3
      );
      setIsAddModalOpen(false);
      setSelectedTemplateId('');
      setNewOutfitForm({
        name: '',
        category: categories[0]?.id || 'HELMET',
        inventoryNumber: nextNum,
        depositValue: 2000,
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка добавления экипировки');
    }
  };

  const handleStatusChange = async (outfitId: string, newStatus: OutfitStatus) => {
    try {
      await api.updateOutfitStatus(outfitId, newStatus);
      toast.success('Статус экипировки обновлен');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления статуса');
    }
  };

  const handleDeleteOutfit = async (outfit: Outfit) => {
    if (outfit.status === 'ISSUED' || outfit.currentRental) {
      toast.error(`Невозможно удалить предмет "${outfit.name}": он выдан курьеру!`);
      return;
    }
    if (
      window.confirm(
        `Вы действительно хотите списать и удалить со склада экипировку "${outfit.name}" (${outfit.inventoryNumber || ''})?`
      )
    ) {
      try {
        await api.deleteOutfit(outfit.id);
        toast.success(`Экипировка "${outfit.name}" удалена со склада`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || 'Ошибка удаления экипировки');
      }
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Склад экипировки и аксессуаров
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Учет выданной и свободной экипировки, инвентарные номера и залоговая стоимость
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsManageMetaOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-[#12221b] border border-slate-200 dark:border-emerald-500/20 hover:border-emerald-500/40 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            Категории и шаблоны ({categories.length})
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Добавить предмет на склад
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 p-4 contour-card">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
            {[
              { id: 'ALL', label: 'Все статусы' },
              { id: 'IN_STOCK', label: 'На складе' },
              { id: 'ISSUED', label: 'Выдана курьерам' },
              { id: 'DAMAGED', label: 'Повреждена' },
              { id: 'LOST', label: 'Утеряна' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720] border border-transparent dark:border-emerald-500/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по инв. номеру, названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </form>
        </div>

        {/* Dynamic Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-200/60 dark:border-emerald-500/10 custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
            <Tag className="w-3 h-3 text-emerald-400" />
            Категория:
          </span>
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
              categoryFilter === 'ALL'
                ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Все категории
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                categoryFilter === cat.id
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Outfits Table */}
      <div className="contour-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-emerald-400/80 border-b border-slate-200 dark:border-emerald-500/15">
              <tr>
                <th className="p-3.5 font-semibold">Инвентарный №</th>
                <th className="p-3.5 font-semibold">Наименование</th>
                <th className="p-3.5 font-semibold">Категория</th>
                <th className="p-3.5 font-semibold">Залоговая стоимость</th>
                <th className="p-3.5 font-semibold">Текущее размещение</th>
                <th className="p-3.5 font-semibold text-center">Статус</th>
                <th className="p-3.5 font-semibold text-right">Сменить статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10">
              {outfits.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono font-bold text-sky-600 dark:text-sky-400">
                    {item.inventoryNumber || '—'}
                  </td>
                  <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                    {item.name}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 text-slate-700 dark:text-emerald-300 font-medium">
                      {categories.find((c) => c.id === item.category)?.name || item.category}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                    {item.depositValue.toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="p-3.5 text-slate-500">
                    {item.currentRental ? (
                      <span className="text-sky-600 dark:text-sky-400 font-medium">
                        У курьера: {item.currentRental.clientName} ({item.currentRental.rentalNumber})
                      </span>
                    ) : (
                      'На складе (Центральная база)'
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <StatusBadge type="outfit" status={item.status} />
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as OutfitStatus)}
                        className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      >
                        <option value="IN_STOCK">На склад</option>
                        <option value="ISSUED">Выдана</option>
                        <option value="DAMAGED">Повреждена</option>
                        <option value="LOST">Утеряна</option>
                      </select>
                      <button
                        onClick={() => handleDeleteOutfit(item)}
                        title={item.status === 'ISSUED' ? 'Нельзя удалить: выдано курьеру' : 'Удалить со склада'}
                        disabled={item.status === 'ISSUED'}
                        className={`p-1 rounded-lg transition-all ${
                          item.status === 'ISSUED'
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Outfit */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Добавить экипировку на склад"
        subtitle="Регистрация нового инвентаря на складе"
        maxWidth="md"
      >
        <form onSubmit={handleCreateOutfit} className="space-y-4 text-xs">
          {/* Quick autofill from template */}
          {templates.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1611] border border-slate-200 dark:border-emerald-500/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Быстрое заполнение из шаблона:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setMetaTab('TEMPLATES');
                    setIsManageMetaOpen(true);
                  }}
                  className="text-[11px] text-emerald-500 hover:text-emerald-400 font-semibold"
                >
                  + Создать шаблон
                </button>
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-[#12221b] border border-slate-200 dark:border-emerald-500/20 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- Выберите шаблон или заполните вручную --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (Залог: {t.defaultDeposit.toLocaleString('ru-RU')} ₽)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Наименование предмета *</label>
            <input
              required
              type="text"
              placeholder="Шлем защитный с визором L (Черный)"
              value={newOutfitForm.name}
              onChange={(e) => setNewOutfitForm({ ...newOutfitForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-slate-500 dark:text-slate-400 font-semibold">Категория экипировки *</label>
              <button
                type="button"
                onClick={() => setIsQuickCategoryCreating(!isQuickCategoryCreating)}
                className="text-[11px] text-emerald-500 hover:text-emerald-400 font-semibold"
              >
                {isQuickCategoryCreating ? '✕ Закрыть' : '+ Новая категория'}
              </button>
            </div>
            {isQuickCategoryCreating ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Название новой категории..."
                  value={quickCategoryName}
                  onChange={(e) => setQuickCategoryName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-[#101d17] border border-emerald-500/40 rounded-xl text-xs text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleCreateCategory(quickCategoryName, true)}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Создать
                </button>
              </div>
            ) : (
              <select
                value={newOutfitForm.category}
                onChange={(e) => setNewOutfitForm({ ...newOutfitForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-medium text-slate-900 dark:text-slate-100"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                Инвентарный номер
              </label>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-slate-400 text-[10px]">Пресеты:</span>
                {['EQ-', 'ЭК-', 'ШЛЕМ-', 'СУМКА-'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePrefixChange(p)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                      outfitPrefix === p
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
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
                  value={outfitPrefix}
                  onChange={(e) => handlePrefixChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold font-mono text-center text-xs focus:border-emerald-500 focus:outline-none"
                  title="Префикс инвентарного номера (например, EQ- или ЭК-)"
                />
              </div>

              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="EQ-001"
                  value={newOutfitForm.inventoryNumber}
                  onChange={(e) => setNewOutfitForm({ ...newOutfitForm, inventoryNumber: e.target.value })}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-mono text-slate-900 dark:text-slate-100 font-bold text-sm focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = calculateNextOutfitNumber(outfitPrefix);
                    setNewOutfitForm((prev) => ({ ...prev, inventoryNumber: nextNum }));
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-emerald-500 transition"
                  title="Подобрать следующий свободный номер для этого префикса"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Префикс подбирает следующий номер по порядку (русский или английский). Можно свободно править руками.
            </p>
          </div>

          <div>
            <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Залоговая стоимость (₽) *</label>
            <input
              type="number"
              min="0"
              value={newOutfitForm.depositValue}
              onChange={(e) => setNewOutfitForm({ ...newOutfitForm, depositValue: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-emerald-500/15">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-sm"
            >
              Оприходовать предмет
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Categories & Templates */}
      <Modal
        isOpen={isManageMetaOpen}
        onClose={() => setIsManageMetaOpen(false)}
        title="Категории и шаблоны экипировки"
        subtitle="Регулирование типов инвентаря и предварительно созданных шаблонов для оприходования"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-emerald-500/20 pb-2">
            <button
              onClick={() => setMetaTab('CATEGORIES')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                metaTab === 'CATEGORIES'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720]'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Категории экипировки ({categories.length})
            </button>
            <button
              onClick={() => setMetaTab('TEMPLATES')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                metaTab === 'TEMPLATES'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720]'
              }`}
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              Шаблоны экипировки ({templates.length})
            </button>
          </div>

          {/* TAB 1: Categories */}
          {metaTab === 'CATEGORIES' && (
            <div className="space-y-4">
              {/* Add Category Form */}
              <div className="p-3.5 contour-card bg-slate-50/50 dark:bg-[#08100c] space-y-2">
                <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  Создать новую категорию
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Название категории, напр: Зимняя экипировка"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs text-slate-900 dark:text-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateCategory(newCategoryName, false)}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              {/* Categories List */}
              <div className="contour-card overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-emerald-400/80 border-b border-slate-200 dark:border-emerald-500/15">
                    <tr>
                      <th className="p-3 font-semibold">Название</th>
                      <th className="p-3 font-semibold">Код / ID</th>
                      <th className="p-3 font-semibold text-center">Предметов на складе</th>
                      <th className="p-3 font-semibold text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-emerald-500/10">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {cat.name}
                        </td>
                        <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                          {cat.id}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              (cat.itemCount ?? 0) > 0
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {cat.itemCount ?? 0} шт.
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            title={
                              (cat.itemCount ?? 0) > 0
                                ? `Нельзя удалить: на складе числится ${cat.itemCount} шт.`
                                : 'Удалить категорию'
                            }
                            disabled={(cat.itemCount ?? 0) > 0}
                            className={`p-1.5 rounded-lg transition-all ${
                              (cat.itemCount ?? 0) > 0
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Templates */}
          {metaTab === 'TEMPLATES' && (
            <div className="space-y-4">
              {/* Create Template Form */}
              <form
                onSubmit={handleCreateTemplate}
                className="p-3.5 contour-card bg-slate-50/50 dark:bg-[#08100c] space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-emerald-500/15 pb-2">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    Новый шаблон экипировки
                  </span>
                  <span className="text-[10px] text-slate-400">Шаблон для быстрого оприходования</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Наименование шаблона *
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Шлем защитный Minako (Размер L)"
                      value={newTemplateForm.name}
                      onChange={(e) => setNewTemplateForm({ ...newTemplateForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Категория *
                    </label>
                    <select
                      value={newTemplateForm.categoryId}
                      onChange={(e) => setNewTemplateForm({ ...newTemplateForm, categoryId: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-medium text-slate-900 dark:text-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Залоговая стоимость по умолчанию (₽) *
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      value={newTemplateForm.defaultDeposit}
                      onChange={(e) =>
                        setNewTemplateForm({ ...newTemplateForm, defaultDeposit: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                      Описание / Спецификация
                    </label>
                    <input
                      type="text"
                      placeholder="Материал ABS, визор, вентиляция"
                      value={newTemplateForm.description}
                      onChange={(e) => setNewTemplateForm({ ...newTemplateForm, description: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm"
                  >
                    Сохранить шаблон
                  </button>
                </div>
              </form>

              {/* Existing Templates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-3.5 contour-card flex flex-col justify-between space-y-2 bg-white dark:bg-[#0c1611]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">{tmpl.name}</h4>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-[#101d17] text-emerald-400 border border-emerald-500/20">
                          {categories.find((c) => c.id === tmpl.categoryId)?.name || tmpl.categoryId}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl)}
                        title="Удалить шаблон"
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {tmpl.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {tmpl.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-emerald-500/10 text-[11px]">
                      <span className="text-slate-400">Залог:</span>
                      <span className="font-bold text-slate-900 dark:text-emerald-400">
                        {tmpl.defaultDeposit.toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
