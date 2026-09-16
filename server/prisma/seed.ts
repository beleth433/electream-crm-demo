import { PrismaClient } from "@prisma/client";
import {
  INITIAL_USERS,
  INITIAL_MODELS,
  INITIAL_BIKES,
  INITIAL_OUTFITS,
  INITIAL_CLIENTS,
  INITIAL_TARIFFS,
  INITIAL_PARTS,
  INITIAL_RENTALS,
  INITIAL_REPAIRS,
  INITIAL_PAYMENTS,
  INITIAL_REVIEWS,
  INITIAL_ARTICLES,
} from "../src/data/initialData.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Courier EBike CRM database with Prisma...");

  // 1. Users
  for (const user of INITIAL_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  // 2. Bike Models
  for (const model of INITIAL_MODELS) {
    await prisma.bikeModel.upsert({
      where: { id: model.id },
      update: {},
      create: model,
    });
  }

  // 3. Bikes
  for (const bike of INITIAL_BIKES) {
    await prisma.bike.upsert({
      where: { inventoryNumber: bike.inventoryNumber },
      update: {},
      create: bike,
    });
  }

  // 4. Outfits
  for (const outfit of INITIAL_OUTFITS) {
    await prisma.outfit.upsert({
      where: { id: outfit.id },
      update: {},
      create: {
        ...outfit,
        depositValue: outfit.depositValue,
      },
    });
  }

  // 5. Clients
  for (const client of INITIAL_CLIENTS) {
    await prisma.client.upsert({
      where: { phone: client.phone },
      update: {},
      create: client,
    });
  }

  // 6. Tariffs
  for (const tariff of INITIAL_TARIFFS) {
    await prisma.tariff.upsert({
      where: { id: tariff.id },
      update: {},
      create: tariff,
    });
  }

  // 7. Parts
  for (const part of INITIAL_PARTS) {
    await prisma.part.upsert({
      where: { sku: part.sku },
      update: {},
      create: part,
    });
  }

  // 8. Rentals
  for (const rental of INITIAL_RENTALS) {
    const { outfitIds, ...rentalData } = rental;
    await prisma.rental.upsert({
      where: { rentalNumber: rental.rentalNumber },
      update: {},
      create: {
        ...rentalData,
        outfitItems: {
          create: outfitIds.map((outfitId) => ({
            outfitId,
            isReturned: false,
          })),
        },
      },
    });
  }

  // 9. Repairs
  for (const repair of INITIAL_REPAIRS) {
    const { parts, ...repairData } = repair;
    await prisma.repairOrder.upsert({
      where: { orderNumber: repair.orderNumber },
      update: {},
      create: {
        ...repairData,
        partsUsed: {
          create: parts.map((p) => ({
            partId: p.partId,
            quantity: p.quantity,
            priceCharged: p.priceCharged,
          })),
        },
      },
    });
  }

  // 10. Payments
  for (const payment of INITIAL_PAYMENTS) {
    await prisma.payment.upsert({
      where: { id: payment.id },
      update: {},
      create: payment,
    });
  }

  // 11. Reviews
  for (const review of INITIAL_REVIEWS) {
    await prisma.review.upsert({
      where: { id: review.id },
      update: {},
      create: review,
    });
  }

  // 12. Articles
  for (const article of INITIAL_ARTICLES) {
    await prisma.article.upsert({
      where: { id: article.id },
      update: {},
      create: article,
    });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
