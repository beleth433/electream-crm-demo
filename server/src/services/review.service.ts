import { ReviewRepository } from "../repositories/review.repository.js";

export class ReviewService {
  static getAll(filters?: { bikeId?: string; clientId?: string }) {
    return ReviewRepository.getAll(filters);
  }

  static createReview(data: { clientId: string; bikeId: string; rating: number; comment?: string }) {
    return ReviewRepository.create(data);
  }
}
