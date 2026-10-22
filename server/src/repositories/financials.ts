import { getDb, getSettings, PaymentRecord } from "./db.js";

export const isRevenuePayment = (payment: PaymentRecord) =>
  ["RENTAL", "BUYOUT", "REPAIR", "OUTFIT_SALE", "RETAIL_SALE", "FINE"].includes(payment.type);

export function calculateFinancials() {
  const db = getDb();
  const settings = getSettings();
  const sum = (type: PaymentRecord["type"]) => db.payments.filter((p) => p.type === type).reduce((total, p) => total + p.amount, 0);
  const rentalPayments = sum("RENTAL");
  const buyoutPayments = sum("BUYOUT");
  const repairPayments = sum("REPAIR");
  const outfitSales = sum("OUTFIT_SALE");
  const retailSales = sum("RETAIL_SALE");
  const fines = sum("FINE");
  const totalRevenue = rentalPayments + buyoutPayments + repairPayments + outfitSales + retailSales + fines;
  const salaryExpenses = sum("SALARY_PAYMENT");
  const partPurchaseExpenses = sum("PART_PURCHASE");
  const totalPartsCost = db.repairs.filter((repair) => repair.status === "COMPLETED").reduce((total, repair) => total + repair.parts.reduce((cost, usage) => {
    const unitCost = usage.purchasePrice ?? db.parts.find((part) => part.id === usage.partId)?.purchasePrice ?? 0;
    return cost + usage.quantity * unitCost;
  }, 0), 0);
  const retailCogs = db.retailOrders.reduce((total, order) => total + order.totalCost, 0);
  const monthlyFixedExpenses = settings.monthlyFixedExpenses ?? 0;
  const fixedExpenses = monthlyFixedExpenses + salaryExpenses;
  // Procurement changes cash and stock. COGS becomes an expense when goods
  // are actually sold or consumed; subtracting both would count it twice.
  const netMargin = totalRevenue - totalPartsCost - retailCogs - fixedExpenses;
  const depositsCollected = sum("DEPOSIT");
  const depositsRefunded = sum("DEPOSIT_REFUND");
  const activeDepositsHeld = db.rentals.filter((rental) => !rental.depositRefunded).reduce((total, rental) => {
    const collected = db.payments.filter((p) => p.rentalId === rental.id && p.type === "DEPOSIT").reduce((value, p) => value + p.amount, 0);
    const refunded = db.payments.filter((p) => p.rentalId === rental.id && p.type === "DEPOSIT_REFUND").reduce((value, p) => value + p.amount, 0);
    return total + Math.max(0, collected - refunded);
  }, 0);
  return { totalRevenue, rentalPayments, buyoutPayments, repairPayments, outfitSales, retailSales, fines, salaryExpenses, partPurchaseExpenses, totalPartsCost, retailCogs, monthlyFixedExpenses, fixedExpenses, netMargin, depositsCollected, depositsRefunded, activeDepositsHeld, fixedExpensesDescription: settings.fixedExpensesDescription || "Аренда сервисного хаба и накладные расходы", fixedExpenseItems: settings.fixedExpenseItems || [] };
}
