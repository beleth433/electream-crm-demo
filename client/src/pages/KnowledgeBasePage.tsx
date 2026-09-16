import React, { useState, useEffect } from 'react';
import { Article } from '../types';
import { api } from '../services/api';
import { Modal } from '../components/Modal';
import {
  BookOpen,
  Search,
  Plus,
  FileText,
  HelpCircle,
  Wrench,
  MessageSquare,
  ShieldCheck,
  Calendar,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

export const KnowledgeBasePage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Add Article modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newArticleForm, setNewArticleForm] = useState({
    title: '',
    category: 'Регламенты выдачи',
    content: '',
  });

  const loadData = () => {
    setIsLoading(true);
    api
      .getArticles(selectedCategory === 'ALL' ? undefined : selectedCategory)
      .then((data) => {
        setArticles(data);
        if (data.length > 0 && !selectedArticle) {
          setSelectedArticle(data[0]);
        }
      })
      .catch((err) => toast.error('Ошибка загрузки базы знаний: ' + err.message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createArticle(newArticleForm);
      toast.success(`Статья "${created.title}" опубликована в базе знаний!`);
      setIsAddModalOpen(false);
      setNewArticleForm({
        title: '',
        category: 'Регламенты выдачи',
        content: '',
      });
      loadData();
      setSelectedArticle(created);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения статьи');
    }
  };

  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            База знаний и регламенты (FAQ)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Регламенты выдачи и приемки, чек-листы СТО, скрипты общения и правила эксплуатации АКБ
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Новая статья / регламент
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { id: 'ALL', label: 'Все разделы' },
          { id: 'Регламенты выдачи', label: 'Регламенты выдачи и приемки' },
          { id: 'СТО и Ремонт', label: 'СТО и Ремонт' },
          { id: 'Скрипты общения', label: 'Скрипты общения с курьерами' },
          { id: 'FAQ', label: 'FAQ по аккумуляторам' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedCategory(tab.id);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === tab.id
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                : 'bg-white dark:bg-[#0c1511] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-emerald-500/20 hover:bg-slate-50 dark:hover:bg-[#101d17]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Two Column Layout: Articles List & Reader */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Article Selector (4 cols) */}
        <div className="lg:col-span-4 contour-card p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по статьям и инструкциям..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#101d17] border border-slate-200 dark:border-emerald-500/20 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredArticles.map((art) => {
              const isSelected = selectedArticle?.id === art.id;
              return (
                <button
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                      : 'hover:bg-slate-100 dark:hover:bg-emerald-950/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-400 dark:text-emerald-500/70 block uppercase">
                    {art.category}
                  </span>
                  <p className="font-bold text-xs mt-0.5 line-clamp-1">{art.title}</p>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{art.content}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Article Viewer (8 cols) */}
        <div className="lg:col-span-8 contour-card p-6 sm:p-8">
          {selectedArticle ? (
            <div className="space-y-4">
              <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-xs">
                  {selectedArticle.category}
                </span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-3 leading-snug">
                  {selectedArticle.title}
                </h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Автор: {selectedArticle.authorName || 'Администратор'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Обновлено:{' '}
                    {new Date(selectedArticle.updatedAt || selectedArticle.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>

              {/* Formatted Markdown Content */}
              <div className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed space-y-3 font-normal whitespace-pre-line">
                {selectedArticle.content}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              Выберите статью слева для просмотра регламента
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Article */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Опубликовать статью в базе знаний"
        subtitle="Добавление инструкции, скрипта или регламента"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateArticle} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1">Заголовок статьи *</label>
            <input
              required
              type="text"
              placeholder="Регламент выдачи и проверки тормозной системы"
              value={newArticleForm.title}
              onChange={(e) => setNewArticleForm({ ...newArticleForm, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Раздел / Категория *</label>
            <select
              value={newArticleForm.category}
              onChange={(e) => setNewArticleForm({ ...newArticleForm, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              <option value="Регламенты выдачи">Регламенты выдачи</option>
              <option value="СТО и Ремонт">СТО и Ремонт</option>
              <option value="Скрипты общения">Скрипты общения</option>
              <option value="FAQ">FAQ</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-1">Содержимое (Markdown) *</label>
            <textarea
              required
              rows={10}
              placeholder="Текст статьи с заголовками, списками и регламентами..."
              value={newArticleForm.content}
              onChange={(e) => setNewArticleForm({ ...newArticleForm, content: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-xs"
            />
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
              Опубликовать статью
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
