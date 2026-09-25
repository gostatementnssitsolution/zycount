// Shared types & constants used by both web and api.

/** Standard record statuses used across the product (blueprint §49). */
export const RECORD_STATUSES = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "POSTED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED",
  "REVERSED",
  "ARCHIVED",
] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

/** Account types (mirror of the Prisma enum, safe for the browser). */
export const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
  "COST_OF_SALES",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** A single balanced journal line for API payloads. */
export interface JournalLineInput {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntryInput {
  companyId: string;
  date: string; // ISO date
  description?: string;
  lines: JournalLineInput[];
}

/** Core invariant: every journal must balance to the cent. */
export function isBalanced(lines: JournalLineInput[]): boolean {
  const totalDebit = lines.reduce((s, l) => s + Math.round(l.debit * 100), 0);
  const totalCredit = lines.reduce((s, l) => s + Math.round(l.credit * 100), 0);
  return totalDebit === totalCredit && totalDebit > 0;
}
