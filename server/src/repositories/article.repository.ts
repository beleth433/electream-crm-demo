import { getDb } from "./db.js";

export class ArticleRepository {
  static getAll(category?: string) {
    const db = getDb();
    let list = db.articles.map((a) => {
      const author = db.users.find((u) => u.id === a.authorId);
      return {
        ...a,
        authorName: author?.fullName,
      };
    });

    if (category) {
      list = list.filter((a) => a.category === category);
    }

    return list;
  }

  static getById(id: string) {
    const db = getDb();
    const a = db.articles.find((art) => art.id === id);
    if (!a) return null;
    const author = db.users.find((u) => u.id === a.authorId);
    return {
      ...a,
      authorName: author?.fullName,
    };
  }

  static create(data: { title: string; category: string; content: string; authorId?: string }) {
    const db = getDb();
    const newArticle = {
      id: `art-${Date.now()}`,
      title: data.title,
      category: data.category,
      content: data.content,
      authorId: data.authorId || db.users[0].id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.articles.push(newArticle);
    return newArticle;
  }

  static update(id: string, data: { title?: string; category?: string; content?: string }) {
    const db = getDb();
    const article = db.articles.find((a) => a.id === id);
    if (!article) return null;

    if (data.title) article.title = data.title;
    if (data.category) article.category = data.category;
    if (data.content) article.content = data.content;
    article.updatedAt = new Date().toISOString();

    return article;
  }
}
