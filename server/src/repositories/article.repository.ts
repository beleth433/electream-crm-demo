import { getDb, saveDb, ArticleRecord } from "./db.js";
import { HistoryRepository } from "./history.repository.js";
import { getCurrentUser } from "../context/userContext.js";

const DEFAULT_ARTICLES: Array<Omit<ArticleRecord, "id" | "createdAt">> = [
  {
    title: "Прайс-лист и тарифы аренды (Шпаргалка)",
    category: "Цены и тарифы",
    pinned: true,
    content: `📋 ТЕКУЩИЕ ТАРИФЫ АРЕНДЫ ДЛЯ КУРЬЕРОВ:

• Недельный тариф (1 АКБ):
  — Стоимость: 5 600 ₽ / 7 дней (800 ₽/сутки)
  — Обеспечительный залог: 3 000 ₽ (возвратный)
  — В комплекте: байк, 1 АКБ, зарядное 3A/5A, замок

• Недельный тариф (2 АКБ — Двойная смена):
  — Стоимость: 6 600 ₽ / 7 дней (942 ₽/сутки)
  — Обеспечительный залог: 5 000 ₽ (возвратный)
  — В комплекте: байк, 2 АКБ, зарядное, замок, шлем

• Месячный тариф:
  — Стоимость: 22 000 ₽ / 30 дней (скидка ~15%)
  — Залог: 5 000 ₽

💡 Дополнительные опции:
— Второй АКБ на замену: 1 000 ₽/неделя
— Термосумка Delivery / Яндекс: бесплатно под залог 1 500 ₽
— Зимние муфты / перчатки: бесплатно в зимний сезон`,
  },
  {
    title: "Условия и расчет выкупа электровелосипеда (Rent-to-Own)",
    category: "Выкуп техники",
    pinned: true,
    content: `🚴‍♂️ ПРОГРАММА АРЕНДЫ С ВЫКУПОМ:

1. Базовая стоимость выкупа:
   • Wenbox U2 / Maikolin: 60 000 – 75 000 ₽
   • Almiko U2 Pro (60V): 100 000 – 110 000 ₽

2. Условия рассрочки:
   • Взнос оплачивается каждые 7 дней
   • Стандартный взнос: 6 000 ₽ в неделю
   • Срок выплаты: 10 – 18 недель

3. Правила и досрочный выкуп:
   • Досрочный выкуп возможен в любой день без комиссии
   • При досрочном выкупе сумма оставшегося долга гасится разовым платежом
   • После внесения 100% суммы договор закрывается со статусом «Выкуплен», а байк переводится в статус «Продан» и переходит в полную собственность курьера.`,
  },
  {
    title: "Памятка курьеру при выдаче техники",
    category: "Памятка курьеру",
    pinned: false,
    content: `🔍 ЧЕК-ЛИСТ ПРОВЕРКИ ПЕРЕД ВЫЕЗДОМ:

1. Тормозная система:
   — Проверить ход ручек тормоза
   — Проверить толщину колодок и отсутствие скрипа

2. Аккумулятор и электрика:
   — Убедиться, что ключ замка АКБ зафиксирован
   — Разъем XT60 плотно вставлен, нет оплавления
   — Фара, стоп-сигнал и гудок исправны

3. Колеса и давление:
   — Давление в шинах: 2.5 – 3.0 bar
   — Осмотреть покрышки на отсутствие порезов

4. Действия при ЧП или ДТП:
   — Незамедлительно связаться с менеджером парка
   — Сделать фото/видео повреждений
   — При необходимости оформить протокол`,
  },
  {
    title: "Штрафы и компенсация ущерба",
    category: "Правила и регламенты",
    pinned: false,
    content: `⚠️ РЕГЛАМЕНТ ВОЗМЕЩЕНИЯ УЩЕРБА:

• Просрочка регулярного платежа: 300 ₽/день (свыше 24 часов)
• Утеря ключа зажигания / замка АКБ: 500 ₽
• Повреждение зарядного устройства: 1 500 ₽
• Утеря или поломка замка безопасности: 1 000 ₽
• Прокол колеса / замена камеры по вине курьера: 800 ₽
• Механическое повреждение фары / экрана: по себестоимости детали + 500 ₽ работа СТО
• Утеря шлема / термосумки: удержание залоговой стоимости (1 500 – 2 500 ₽)`,
  },
];

export class ArticleRepository {
  private static ensureDefaults() {
    const db = getDb();
    if (!db.settings) {
      db.settings = { monthlyFixedExpenses: 0 };
    }
    if (db.settings.articlesInitialized) {
      return;
    }
    if (Array.isArray(db.articles) && db.articles.length > 0) {
      db.settings.articlesInitialized = true;
      saveDb(true);
      return;
    }
    const now = new Date();
    db.articles = DEFAULT_ARTICLES.map((a, idx) => ({
      ...a,
      id: `art-default-${idx + 1}`,
      createdAt: new Date(now.getTime() - (idx * 3600000)).toISOString(),
      updatedAt: new Date(now.getTime() - (idx * 3600000)).toISOString(),
    }));
    db.settings.articlesInitialized = true;
    saveDb(true);
  }

  static getAll(filters?: { category?: string; search?: string }) {
    this.ensureDefaults();
    const db = getDb();
    let list = [...(db.articles || [])];

    if (filters?.category && filters.category !== "ALL") {
      list = list.filter((a) => a.category.toLowerCase() === filters.category!.toLowerCase());
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    // Sort: pinned first, then newest
    return list.sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }

  static getById(id: string) {
    this.ensureDefaults();
    const db = getDb();
    return (db.articles || []).find((a) => a.id === id) || null;
  }

  static getCategories(): string[] {
    this.ensureDefaults();
    const db = getDb();
    const set = new Set<string>();
    (db.articles || []).forEach((a) => {
      if (a.category?.trim()) set.add(a.category.trim());
    });
    return Array.from(set);
  }

  static create(data: {
    title: string;
    category?: string;
    content: string;
    pinned?: boolean;
    authorId?: string;
  }) {
    this.ensureDefaults();
    const db = getDb();
    if (!db.settings) {
      db.settings = { monthlyFixedExpenses: 0 };
    }
    db.settings.articlesInitialized = true;
    if (!Array.isArray(db.articles)) {
      db.articles = [];
    }
    const nowIso = new Date().toISOString();

    const current = getCurrentUser();
    const newArticle: ArticleRecord = {
      id: `art-${Date.now()}`,
      title: data.title.trim(),
      category: data.category?.trim() || "Общая информация",
      content: data.content.trim(),
      pinned: Boolean(data.pinned),
      authorId: data.authorId || current?.id || "usr-admin",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.articles.unshift(newArticle);
    saveDb(true);

    try {
      HistoryRepository.logAction({
        category: "INFO",
        action: "ARTICLE_CREATE",
        title: `Создана карточка в базе знаний: «${newArticle.title}»`,
        details: `Категория: ${newArticle.category}. ${newArticle.pinned ? "Закреплена вверху списка." : ""}`,
        actorName: current?.displayName || "Администратор",
        badgeText: "База знаний",
        badgeColor: "purple",
        entityId: newArticle.id,
      });
    } catch (e) {
      // Gracefully continue if logging fails
    }

    return newArticle;
  }

  static update(id: string, data: Partial<ArticleRecord>) {
    this.ensureDefaults();
    const db = getDb();
    if (!db.settings) {
      db.settings = { monthlyFixedExpenses: 0 };
    }
    db.settings.articlesInitialized = true;
    const article = (db.articles || []).find((a) => a.id === id);
    if (!article) {
      throw new Error(`Статья/карточка с ID ${id} не найдена`);
    }

    if (data.title !== undefined) article.title = data.title.trim();
    if (data.category !== undefined) article.category = data.category.trim();
    if (data.content !== undefined) article.content = data.content.trim();
    if (data.pinned !== undefined) article.pinned = Boolean(data.pinned);
    article.updatedAt = new Date().toISOString();

    saveDb(true);

    try {
      HistoryRepository.logAction({
        category: "INFO",
        action: "ARTICLE_UPDATE",
        title: `Отредактирована карточка: «${article.title}»`,
        details: `Категория: ${article.category}. Изменения сохранены.`,
        actorName: getCurrentUser()?.displayName || "Администратор",
        badgeText: "База знаний",
        badgeColor: "purple",
        entityId: article.id,
      });
    } catch (e) {
      // Gracefully continue
    }

    return article;
  }

  static delete(id: string) {
    const db = getDb();
    if (!db.settings) {
      db.settings = { monthlyFixedExpenses: 0 };
    }
    db.settings.articlesInitialized = true;

    if (!Array.isArray(db.articles)) {
      db.articles = [];
    }

    const idx = db.articles.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error(`Статья/карточка с ID ${id} не найдена`);
    }

    const [removed] = db.articles.splice(idx, 1);
    saveDb(true);

    try {
      HistoryRepository.logAction({
        category: "INFO",
        action: "ARTICLE_DELETE",
        title: `Удалена карточка: «${removed.title}»`,
        details: `Карточка удалена из базы знаний. Категория: ${removed.category}`,
        actorName: getCurrentUser()?.displayName || "Администратор",
        badgeText: "Удаление",
        badgeColor: "rose",
        entityId: removed.id,
      });
    } catch (e) {
      // Gracefully continue
    }

    return removed;
  }

  static clearAll() {
    const db = getDb();
    if (!db.settings) {
      db.settings = { monthlyFixedExpenses: 0 };
    }
    db.settings.articlesInitialized = true;
    const count = db.articles ? db.articles.length : 0;
    db.articles = [];
    saveDb(true);

    try {
      HistoryRepository.logAction({
        category: "INFO",
        action: "ARTICLES_CLEAR_ALL",
        title: "Очищены все карточки базы знаний",
        details: `Удалено карточек: ${count} шт.`,
        actorName: getCurrentUser()?.displayName || "Администратор",
        badgeText: "Очистка",
        badgeColor: "rose",
      });
    } catch (e) {
      // Gracefully continue
    }

    return { count };
  }

  static resetDefaults() {
    const db = getDb();
    if (!db.settings) {
      db.settings = { monthlyFixedExpenses: 0 };
    }
    const now = new Date();
    db.articles = DEFAULT_ARTICLES.map((a, idx) => ({
      ...a,
      id: `art-default-${idx + 1}`,
      createdAt: new Date(now.getTime() - (idx * 3600000)).toISOString(),
      updatedAt: new Date(now.getTime() - (idx * 3600000)).toISOString(),
    }));
    db.settings.articlesInitialized = true;
    saveDb(true);

    try {
      HistoryRepository.logAction({
        category: "INFO",
        action: "ARTICLES_RESET_DEFAULTS",
        title: "Восстановлены стандартные шаблоны шпаргалок",
        details: "Загружены 4 базовые карточки (тарифы, выкуп, чек-лист, штрафы)",
        actorName: getCurrentUser()?.displayName || "Администратор",
        badgeText: "Шаблоны",
        badgeColor: "emerald",
      });
    } catch (e) {
      // Gracefully continue
    }

    return db.articles;
  }
}
