import { getDb } from "./db.js";

export class ReviewRepository {
  static getAll(filters?: { bikeId?: string; clientId?: string }) {
    const db = getDb();
    let list = db.reviews.map((r) => {
      const client = db.clients.find((c) => c.id === r.clientId);
      const bike = db.bikes.find((b) => b.id === r.bikeId);
      const bikeModel = bike ? db.models.find((m) => m.id === bike.modelId) : null;

      return {
        ...r,
        client: client
          ? {
              id: client.id,
              fullName: client.fullName,
              courierService: client.courierService,
            }
          : null,
        bike: bike
          ? {
              id: bike.id,
              inventoryNumber: bike.inventoryNumber,
              modelName: bikeModel?.name,
            }
          : null,
      };
    });

    if (filters?.bikeId) {
      list = list.filter((r) => r.bikeId === filters.bikeId);
    }
    if (filters?.clientId) {
      list = list.filter((r) => r.clientId === filters.clientId);
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static create(data: { clientId: string; bikeId: string; rating: number; comment?: string }) {
    const db = getDb();
    if (!db.clients.some((client) => client.id === data.clientId)) throw new Error("Клиент не найден");
    if (!db.bikes.some((bike) => bike.id === data.bikeId)) throw new Error("Байк не найден");
    if (data.rating < 1 || data.rating > 5) {
      throw new Error("Рейтинг должен быть от 1 до 5 звезд");
    }

    const newReview = {
      id: `rev-${Date.now()}`,
      clientId: data.clientId,
      bikeId: data.bikeId,
      rating: data.rating,
      comment: data.comment || null,
      createdAt: new Date().toISOString(),
    };

    db.reviews.push(newReview);
    return newReview;
  }
}
