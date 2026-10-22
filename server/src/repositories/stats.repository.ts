import { getDb, getSystemTime, isTimeSimulated } from "./db.js";

import { calculateFinancials } from "./financials.js";
import { isRevenuePayment } from "./financials.js";

export class StatsRepository {
  static getDashboardStats() {
    const db = getDb();
    const now = getSystemTime();

    // 1. Fleet counts
    const totalBikes = db.bikes.length;
    const activeParkBikes = db.bikes.filter((b) => b.status !== "DECOMMISSIONED" && b.status !== "SOLD" && b.status !== "BOUGHT_OUT").length;
    const rentedBikes = db.bikes.filter((b) => b.status === "RENTED").length;
    const availableBikes = db.bikes.filter((b) => b.status === "AVAILABLE").length;
    const maintenanceBikes = db.bikes.filter((b) => b.status === "IN_MAINTENANCE").length;
    const forSaleBikes = db.bikes.filter((b) => b.status === "FOR_SALE").length;
    const decommissionedBikes = db.bikes.filter((b) => b.status === "DECOMMISSIONED").length;
    const soldBikes = db.bikes.filter((b) => b.status === "SOLD").length;

    // Fleet Utilization % = (Rented / ActivePark) * 100
    const fleetUtilization = activeParkBikes > 0 ? Math.round((rentedBikes / activeParkBikes) * 1000) / 10 : 0;

    // 2. Rentals counts & Overdue
    let overdueCount = 0;
    let activeRentalsCount = 0;
    const urgentOverdueRentals: any[] = [];

    db.rentals.forEach((r) => {
      const isPastDue = new Date(r.nextPaymentDue) < now;
      if (r.status === "ACTIVE" && isPastDue) {
        r.status = "OVERDUE";
      }

      if (r.status === "ACTIVE" || r.status === "OVERDUE") activeRentalsCount++;
      if (r.status === "OVERDUE") {
        overdueCount++;
        const client = db.clients.find((c) => c.id === r.clientId);
        const bike = db.bikes.find((b) => b.id === r.bikeId);
        const diffDays = Math.ceil((now.getTime() - new Date(r.nextPaymentDue).getTime()) / 86400000);

        urgentOverdueRentals.push({
          rentalId: r.id,
          rentalNumber: r.rentalNumber,
          clientId: r.clientId,
          clientName: client?.fullName,
          clientPhone: client?.phone,
          clientTelegram: client?.telegram,
          courierService: client?.courierService,
          bikeInventoryNumber: bike?.inventoryNumber,
          daysOverdue: Math.max(1, diffDays),
          nextPaymentDue: r.nextPaymentDue,
          depositAmount: r.depositAmount,
        });
      }
    });

    // 3. Repairs count
    const openRepairsCount = db.repairs.filter(
      (rp) => rp.status !== "COMPLETED" && rp.status !== "CANCELLED"
    ).length;

    // 4. Low stock parts count
    const lowStockParts = db.parts.filter((p) => p.quantity <= p.minQuantity);
    const lowStockPartsCount = lowStockParts.length;

    const financialSummary = calculateFinancials();
    const { totalRevenue, salaryExpenses, totalPartsCost, retailCogs, fixedExpenses, monthlyFixedExpenses, netMargin, activeDepositsHeld } = financialSummary;
    const { rentalPayments: rentalRevenue, buyoutPayments: buyoutRevenue, repairPayments: clientRepairRevenue, outfitSales: outfitRevenue, retailSales: retailRevenue } = financialSummary;
    const settings = getDb().settings!;

    const revenueByMonth = Array.from({ length: 12 }, (_, index) => {
      const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1));
      const key = monthDate.toISOString().slice(0, 7);
      const payments = db.payments.filter((payment) => payment.createdAt.slice(0, 7) === key && isRevenuePayment(payment));
      const sum = (type: string) => payments.filter((payment) => payment.type === type).reduce((total, payment) => total + payment.amount, 0);
      return { key, month: monthDate.toLocaleDateString("ru-RU", { month: "short", timeZone: "UTC" }), rental: sum("RENTAL"), buyout: sum("BUYOUT"), repair: sum("REPAIR"), retail: sum("RETAIL_SALE"), outfit: sum("OUTFIT_SALE"), fines: sum("FINE"), total: payments.reduce((total, payment) => total + payment.amount, 0) };
    });

    // Real models breakdown
    const modelsBreakdown = db.models.map((m) => {
      const modelBikes = db.bikes.filter(
        (b) => b.modelId === m.id && b.status !== "DECOMMISSIONED" && b.status !== "SOLD" && b.status !== "BOUGHT_OUT"
      );
      const rented = modelBikes.filter((b) => b.status === "RENTED").length;
      const available = modelBikes.filter((b) => b.status === "AVAILABLE").length;
      const maintenance = modelBikes.filter((b) => b.status === "IN_MAINTENANCE").length;
      const total = modelBikes.length;
      const utilization = total > 0 ? Math.round((rented / total) * 100) : 0;
      return {
        modelId: m.id,
        name: m.name,
        powerWatts: m.powerWatts,
        total,
        rented,
        available,
        maintenance,
        utilization,
      };
    }).filter((m) => m.total > 0 || db.models.length <= 6);

    return {
      revenueByMonth,
      fleet: {
        totalBikes,
        activeParkBikes,
        rentedBikes,
        availableBikes,
        maintenanceBikes,
        forSaleBikes,
        decommissionedBikes,
        soldBikes,
        fleetUtilization,
      },
      modelsBreakdown,
      rentals: {
        activeRentalsCount,
        overdueCount,
        urgentOverdueRentals,
      },
      repairs: {
        openRepairsCount,
      },
      inventory: {
        lowStockPartsCount,
        lowStockParts,
      },
      financials: {
        fines: financialSummary.fines,
        partPurchaseExpenses: financialSummary.partPurchaseExpenses,
        totalRevenue,
        rentalRevenue,
        buyoutRevenue,
        clientRepairRevenue,
        outfitRevenue,
        retailRevenue,
        salaryExpenses,
        totalPartsCost,
        retailCogs,
        fixedExpenses,
        monthlyFixedExpenses,
        fixedExpensesDescription: settings.fixedExpensesDescription || "Аренда сервисного хаба и накладные расходы",
        fixedExpenseItems: settings.fixedExpenseItems || [],
        netMargin,
        activeDepositsHeld,
      },
      recentPayments: [...db.payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
      totalClients: db.clients.length,
      employeesCount: db.employees.length,
      retailOrdersCount: db.retailOrders.length,
      systemTime: {
        currentDate: now.toISOString(),
        isSimulated: isTimeSimulated(),
      },
    };
  }
}
