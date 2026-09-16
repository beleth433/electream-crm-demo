import { ArticleRepository } from "../repositories/article.repository.js";

export class ArticleService {
  static getAll(category?: string) {
    return ArticleRepository.getAll(category);
  }

  static getById(id: string) {
    const article = ArticleRepository.getById(id);
    if (!article) {
      throw new Error(`Статья ${id} не найдена`);
    }
    return article;
  }

  static create(data: { title: string; category: string; content: string; authorId?: string }) {
    return ArticleRepository.create(data);
  }

  static update(id: string, data: { title?: string; category?: string; content?: string }) {
    const article = ArticleRepository.update(id, data);
    if (!article) {
      throw new Error(`Статья ${id} не найдена`);
    }
    return article;
  }
}
