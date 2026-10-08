import { getDb, getSystemTime, isTimeSimulated } from "./db.js";

export class StatsRepository {
  static getDashboardStats() {
    const db = getDb();
    const now = getSystemTime();

    // 1. Fleet counts
    const totalBikes = db.bikes.length;
    const activeParkBikes = db.bikes.filter((b) => b.status !== "DECOMMISSIONED" && b.status !== "SOLD").length;
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

    // 5. Financial metrics
    // Revenue = sum(RENTAL) + sum(BUYOUT) + sum(REPAIR for client fault) + sum(OUTFIT_SALE) + sum(RETAIL_SALE)
    const rentalRevenue = db.payments
      .filter((p) => p.type === "RENTAL")
      .reduce((sum, p) => sum + p.amount, 0);

    const buyoutRevenue = db.payments
      .filter((p) => p.type === "BUYOUT")
      .reduce((sum, p) => sum + p.amount, 0);

    const clientRepairRevenue = db.payments
      .filter((p) => p.type === "REPAIR")
      .reduce((sum, p) => sum + p.amount, 0);

    const outfitRevenue = db.payments
      .filter((p) => p.type === "OUTFIT_SALE")
      .reduce((sum, p) => sum + p.amount, 0);

    const retailRevenue = db.payments
      .filter((p) => p.type === "RETAIL_SALE")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalRevenue = rentalRevenue + buyoutRevenue + clientRepairRevenue + outfitRevenue + retailRevenue;

    // Parts cost = sum(quantity used * purchasePrice of part) across completed/in-progress repairs + retail cost
    let totalPartsCost = 0;
    db.repairs.forEach((rp) => {
      rp.parts.forEach((pu) => {
        const part = db.parts.find((p) => p.id === pu.partId);
        const unitCost = part ? part.purchasePrice : 0;
        totalPartsCost += pu.quantity * unitCost;
      });
    });

    // Retail orders cost of goods sold (COGS)
    let retailCogs = 0;
    db.retailOrders.forEach((o) => {
      retailCogs += o.totalCost;
    });

    // Salary payouts from payments
    const salaryExpenses = db.payments
      .filter((p) => p.type === "SALARY_PAYMENT")
      .reduce((sum, p) => sum + p.amount, 0);

    // Fixed overhead costs (Rent of service hub, base overhead + salary payouts)
    const settings = db.settings || { monthlyFixedExpenses: 0, fixedExpensesDescription: "" };
    const monthlyFixedExpenses = settings.monthlyFixedExpenses ?? 0;
    const fixedExpenses = monthlyFixedExpenses + salaryExpenses;

    // Net margin = Revenue - Parts Cost - Retail COGS - Fixed Expenses
    const netMargin = totalRevenue - totalPartsCost - retailCogs - fixedExpenses;

    // Active deposits held
    const totalDepositsCollected = db.payments
      .filter((p) => p.type === "DEPOSIT")
      .reduce((sum, p) => sum + p.amount, 0);
    const totalDepositsRefunded = db.payments
      .filter((p) => p.type === "DEPOSIT_REFUND")
      .reduce((sum, p) => sum + p.amount, 0);
    const activeDepositsHeld = totalDepositsCollected - totalDepositsRefunded;

    // Real models breakdown
    const modelsBreakdown = db.models.map((m) => {
      const modelBikes = db.bikes.filter(
        (b) => b.modelId === m.id && b.status !== "DECOMMISSIONED" && b.status !== "SOLD"
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
      recentPayments: db.payments.slice(0, 10),
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
