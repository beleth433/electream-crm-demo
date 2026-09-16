import React, { useState, useEffect } from 'react';
import { Part } from '../types';
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
} from 'lucide-react';
import { toast } from 'sonner';

export const InventoryPage: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [search, setSearch] = useState('');

  // Restock Modal
  const [restockPart, setRestockPart] = useState<Part | null>(null);
  const [quantityToAdd, setQuantityToAdd] = useState<number>(5);

  // Add Part Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPartForm, setNewPartForm] = useState({
    name: '',
    sku: '',
    quantity: 10,
    minQuantity: 3,
    purchasePrice: 500,
    clientPrice: 1200,
  });

  const loadData = () => {
    setIsLoading(true);
    api
      .getParts({
        lowStockOnly: lowStockFilter,
        search,
      })
      .then((data) => setParts(data))
      .catch((err) => toast.error('Ошибка загрузки запчастей: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [lowStockFilter]);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPart({
        ...newPartForm,
        quantity: Number(newPartForm.quantity),
        minQuantity: Number(newPartForm.minQuantity),
        purchasePrice: Number(newPartForm.purchasePrice),
        clientPrice: Number(newPartForm.clientPrice),
      });
      toast.success(`Деталь "${newPartForm.name}" добавлена на склад!`);
      setIsAddModalOpen(false);
      setNewPartForm({
        name: '',
        sku: '',
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

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Новая номенклатура
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 contour-card">
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

      {/* Parts Table */}
      <div className="contour-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-[#08100c] text-slate-500 dark:text-emerald-400/80 border-b border-slate-200 dark:border-emerald-500/15">
              <tr>
                <th className="p-3.5 font-semibold">Артикул (SKU)</th>
                <th className="p-3.5 font-semibold">Наименование запчасти</th>
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

          <div>
            <label className="block text-slate-500 mb-1">Артикул (SKU) *</label>
            <input
              required
              type="text"
              placeholder="SKU-BRAKE-02"
              value={newPartForm.sku}
              onChange={(e) => setNewPartForm({ ...newPartForm, sku: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
            />
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
    </div>
  );
};
