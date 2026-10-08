import { ArticleRepository } from "../repositories/article.repository.js";
import { ArticleRecord } from "../repositories/db.js";

export class ArticleService {
  static getAll(filters?: { category?: string; search?: string }) {
    return ArticleRepository.getAll(filters);
  }

  static getById(id: string) {
    const article = ArticleRepository.getById(id);
    if (!article) {
      throw new Error("Статья не найдена");
    }
    return article;
  }

  static getCategories() {
    return ArticleRepository.getCategories();
  }

  static create(data: {
    title: string;
    category?: string;
    content: string;
    pinned?: boolean;
    authorId?: string;
  }) {
    return ArticleRepository.create(data);
  }

  static update(id: string, data: Partial<ArticleRecord>) {
    return ArticleRepository.update(id, data);
  }

  static delete(id: string) {
    return ArticleRepository.delete(id);
  }

  static clearAll() {
    return ArticleRepository.clearAll();
  }

  static resetDefaults() {
    return ArticleRepository.resetDefaults();
  }
}
