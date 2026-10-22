import { getDb, RentalRecord } from "./db.js";

export const isOpenRental = (rental: RentalRecord): boolean =>
  rental.status === "ACTIVE" || rental.status === "OVERDUE" || rental.status === "PROBLEM";

export const activeRentalForBike = (bikeId: string) =>
  getDb().rentals.find((rental) => rental.bikeId === bikeId && isOpenRental(rental));

export const activeRentalForBattery = (batteryId: string) => {
  const db = getDb();
  const battery = db.batteries.find((item) => item.id === batteryId);
  return db.rentals.find((rental) => isOpenRental(rental) && (
    rental.batteryIds?.includes(batteryId) ||
    rental.bikeId === battery?.installedBikeId || rental.bikeId === battery?.issuedBikeId ||
    db.bikes.some((bike) => bike.id === rental.bikeId && bike.batteryId === batteryId)
  ));
};

export function normalizePhone(phone?: string | null): string {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
}

export function nextNumber(prefix: string, existing: string[]): string {
  const max = existing.reduce((value, number) => {
    if (!number.startsWith(`${prefix}-`)) return value;
    const suffix = Number(number.slice(prefix.length + 1));
    return Number.isInteger(suffix) ? Math.max(value, suffix) : value;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}
