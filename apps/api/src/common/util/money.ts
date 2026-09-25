import { Prisma } from "@zycount/db";
import { fromCents, money, toCents, type MoneyInput } from "@zycount/shared";

/**
 * Bridges Prisma's `Decimal` and the decimal **strings** the API speaks.
 * Nothing in the accounting path ever becomes a JavaScript number.
 */

export function toDecimal(value: MoneyInput): Prisma.Decimal {
  return new Prisma.Decimal(money(value));
}

export function decimalToString(value: Prisma.Decimal | null | undefined): string {
  if (value === null || value === undefined) return "0.00";
  return money(value.toString());
}

export function decimalToCents(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return toCents(value.toString());
}

export function centsToString(cents: number): string {
  return fromCents(cents);
}
