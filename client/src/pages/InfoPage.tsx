import { useCrmRefresh } from '../hooks/useCrmRefresh';
import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import {
  BookOpen,
  Search,
  Plus,
  Copy,
  Check,
  Pin,
  Edit2,
  Trash2,
  Tag,
  Share2,
  Sparkles,
  Info,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

export const InfoPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Цены и тарифы',
    content: '',
    pinned: false,
  });

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      api.getArticles({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        search: searchQuery || undefined,
      }),
      api.getArticleCategories(),
    ])
      .then(([arts, cats]) => {
        setArticles(arts);
        setCategories(cats);
      })
      .catch((err) => toast.error('Ошибка загрузки информации: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useCrmRefresh(loadData);

  useEffect(() => {
    loadData();
  }, [selectedCategory, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      category: categories[0] || 'Цены и тарифы',
      content: '',
      pinned: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      category: article.category || 'Цены и тарифы',
      content: article.content,
      pinned: Boolean(article.pinned),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Укажите заголовок карточки');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Введите текст информации');
      return;
    }

    try {
      if (editingArticle) {
        await api.updateArticle(editingArticle.id, formData);
        toast.success(`Карточка "${formData.title}" обновлена`);
      } else {
        await api.createArticle(formData);
        toast.success(`Карточка "${formData.title}" создана`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения');
    }
  };

  const handleDelete = async (article: Article) => {
    if (!window.confirm(`Вы уверены, что хотите удалить карточку "${article.title}"?`)) {
      return;
    }

    try {
      await api.deleteArticle(article.id);
      toast.success(`Карточка "${article.title}" удалена`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить ВСЕ карточки из раздела «Информация»?')) {
      return;
    }
    try {
      await api.clearAllArticles();
      toast.success('Все карточки удалены');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления всех карточек');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Восстановить стандартные шаблоны карточек (тарифы, выкуп, регламенты)?')) {
      return;
    }
    try {
      await api.resetDefaultArticles();
      toast.success('Стандартные шаблоны восстановлены');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка восстановления шаблонов');
    }
  };

  const handleCopyContent = (article: Article) => {
    const textToCopy = `${article.title}\n\n${article.content}`;
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        setCopiedId(article.id);
        toast.success(`Текст карточки скопирован в буфер!`);
        setTimeout(() => setCopiedId(null), 2500);
      })
      .catch(() => {
        toast.error('Не удалось скопировать в буфер');
      });
  };

  const getCategoryColor = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('цен') || lower.includes('тариф')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (lower.includes('выкуп')) {
      return 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    }
    if (lower.includes('памятк') || lower.includes('курьер')) {
      return 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
    }
    if (lower.includes('штраф') || lower.includes('правил')) {
      return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }
    return 'bg-slate-50 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            База знаний и информация
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Шпаргалки, актуальные тарифы, условия выкупа, регламенты парка и быстрые памятки для курьеров
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {articles.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center justify-center gap-1.5 px-3 h-11 border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold rounded-xl transition-all"
              title="Удалить все карточки"
            >
              <Trash2 className="w-4 h-4" />
              <span>Очистить всё</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center gap-2 px-4 h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Новая карточка / памятка</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 contour-card">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720] border border-transparent dark:border-emerald-500/10'
            }`}
          >
            Все карточки ({articles.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-100 dark:bg-[#101d17] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#162720] border border-transparent dark:border-emerald-500/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по памяткам и тарифам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-11 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Grid of Articles / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Загрузка информации...</div>
      ) : articles.length === 0 ? (
        <div className="p-8 sm:p-12 text-center text-slate-400 contour-card space-y-4">
          <p className="text-sm">
            По вашему запросу карточек не найдено. Вы можете создать новую карточку или загрузить стандартные шаблоны (тарифы, выкуп, чек-лист).
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Создать карточку</span>
            </button>
            <button
              onClick={handleResetDefaults}
              className="flex items-center gap-2 px-4 h-11 border border-slate-200 dark:border-emerald-500/20 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all"
            >
              <RotateCcw className="w-4 h-4 text-emerald-500" />
              <span>Восстановить шаблоны</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => {
            const isCopied = copiedId === article.id;

            return (
              <div
                key={article.id}
                className={`flex flex-col justify-between p-4 rounded-2xl border contour-card transition-all relative ${
                  article.pinned
                    ? 'border-emerald-500/40 bg-emerald-50/5 dark:bg-emerald-950/10 shadow-sm'
                    : 'border-slate-200 dark:border-emerald-500/15'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getCategoryColor(
                        article.category
                      )}`}
                    >
                      {article.category}
                    </span>

                    {article.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        <Pin className="w-3 h-3 fill-emerald-500" />
                        Закреплено
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2 leading-snug">
                    {article.title}
                  </h3>

                  {/* Content */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50/80 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 max-h-72 overflow-y-auto custom-scrollbar select-text">
                    {article.content}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-emerald-500/10 text-xs">
                  <span className="text-[10px] text-slate-400">
                    {article.updatedAt
                      ? `Изм. ${new Date(article.updatedAt).toLocaleDateString('ru-RU')}`
                      : `Создано ${new Date(article.createdAt).toLocaleDateString('ru-RU')}`}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyContent(article)}
                      className={`px-3 h-9 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isCopied
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title="Скопировать текст карточки для отправки курьеру"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Скопировано!' : 'Копировать'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(article)}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Редактировать"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(article)}
                      className="w-9 h-9 inline-flex items-center justify-center rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Удалить карточку"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Article */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingArticle ? 'Редактирование информации' : 'Новая карточка в базу знаний'}
        subtitle="Зафиксируйте цены, условия проката или памятку для сотрудников и клиентов"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-semibold">Заголовок карточки *</label>
            <input
              type="text"
              required
              placeholder="Например: Прейскурант аренды на осень, Условия выкупа Wenbox U2..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 h-11 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-bold text-base sm:text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1 font-semibold">Категория / Раздел</label>
              <input
                type="text"
                list="category-suggestions"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Цены и тарифы, Выкуп техники, Памятка..."
                className="w-full px-3 h-11 bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl font-semibold text-base sm:text-xs"
              />
              <datalist id="category-suggestions">
                <option value="Цены и тарифы" />
                <option value="Условия аренды" />
                <option value="Выкуп техники" />
                <option value="Памятка курьеру" />
                <option value="Правила и регламенты" />
                <option value="Контакты и адреса" />
              </datalist>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.pinned}
                  onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                  className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  Закрепить карточку вверху списка
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-semibold">
              Содержимое карточки (тарифы, списки, условия, памятка) *
            </label>
            <textarea
              required
              rows={8}
              placeholder="Введите условия, цены, списки или пункты регламента..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full p-3 min-h-[160px] bg-white dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-base sm:text-xs custom-scrollbar leading-relaxed font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-emerald-500/15">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="h-11 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium text-xs"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="h-11 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-md shadow-emerald-500/20 transition text-xs"
            >
              {editingArticle ? 'Сохранить изменения' : 'Создать карточку'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
