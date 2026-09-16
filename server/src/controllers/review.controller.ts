import { Request, Response } from "express";
import { ReviewService } from "../services/review.service.js";
import { ReviewCreateDto } from "../dtos/schemas.dto.js";

export class ReviewController {
  static getAll(req: Request, res: Response) {
    try {
      const { bikeId, clientId } = req.query;
      const reviews = ReviewService.getAll({
        bikeId: bikeId as string,
        clientId: clientId as string,
      });
      return res.json(reviews);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  static create(req: Request, res: Response) {
    try {
      const parsed = ReviewCreateDto.parse(req.body);
      const review = ReviewService.createReview(parsed);
      return res.status(201).json(review);
    } catch (err: any) {
      return res.status(400).json({ error: err.errors ? err.errors[0].message : err.message });
    }
  }
}
