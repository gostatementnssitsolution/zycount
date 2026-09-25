/**
 * Accounting domain constants (docs/spec/01-glossary-and-accounting-principles.md).
 */

export const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE",
  "COST_OF_SALES",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_SUB_TYPES = [
  "CURRENT_ASSET",
  "NON_CURRENT_ASSET",
  "CURRENT_LIABILITY",
  "NON_CURRENT_LIABILITY",
  "EQUITY",
  "OPERATING_REVENUE",
  "OTHER_INCOME",
  "COST_OF_SALES",
  "OPERATING_EXPENSE",
  "OTHER_EXPENSE",
] as const;
export type AccountSubType = (typeof ACCOUNT_SUB_TYPES)[number];

export type NormalBalance = "DEBIT" | "CREDIT";

/** Which side increases each account type (docs/spec/01 — Normal balances). */
export const NORMAL_BALANCE: Record<AccountType, NormalBalance> = {
  ASSET: "DEBIT",
  EXPENSE: "DEBIT",
  COST_OF_SALES: "DEBIT",
  LIABILITY: "CREDIT",
  EQUITY: "CREDIT",
  REVENUE: "CREDIT",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expense",
  COST_OF_SALES: "Cost of Sales",
};

export const ACCOUNT_SUB_TYPE_LABELS: Record<AccountSubType, string> = {
  CURRENT_ASSET: "Current Asset",
  NON_CURRENT_ASSET: "Non-Current Asset",
  CURRENT_LIABILITY: "Current Liability",
  NON_CURRENT_LIABILITY: "Non-Current Liability",
  EQUITY: "Equity",
  OPERATING_REVENUE: "Operating Revenue",
  OTHER_INCOME: "Other Income",
  COST_OF_SALES: "Cost of Sales",
  OPERATING_EXPENSE: "Operating Expense",
  OTHER_EXPENSE: "Other Expense",
};

/** Sub-types valid for each type — enforced by the account validator. */
export const SUB_TYPES_BY_TYPE: Record<AccountType, AccountSubType[]> = {
  ASSET: ["CURRENT_ASSET", "NON_CURRENT_ASSET"],
  LIABILITY: ["CURRENT_LIABILITY", "NON_CURRENT_LIABILITY"],
  EQUITY: ["EQUITY"],
  REVENUE: ["OPERATING_REVENUE", "OTHER_INCOME"],
  EXPENSE: ["OPERATING_EXPENSE", "OTHER_EXPENSE"],
  COST_OF_SALES: ["COST_OF_SALES"],
};

/** Balance-sheet types vs. P&L types. */
export const BALANCE_SHEET_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY"];
export const PROFIT_LOSS_TYPES: AccountType[] = ["REVENUE", "COST_OF_SALES", "EXPENSE"];

export function isBalanceSheetAccount(type: AccountType): boolean {
  return BALANCE_SHEET_TYPES.includes(type);
}

export function isProfitLossAccount(type: AccountType): boolean {
  return PROFIT_LOSS_TYPES.includes(type);
}

export const JOURNAL_STATUSES = ["DRAFT", "POSTED", "REVERSED"] as const;
export type JournalStatus = (typeof JOURNAL_STATUSES)[number];

export const JOURNAL_SOURCES = [
  "MANUAL",
  "OPENING_BALANCE",
  "INVOICE",
  "BILL",
  "PAYMENT",
  "PAYROLL",
  "ASSET",
  "INVENTORY",
  "BANK",
  "SYSTEM",
] as const;
export type JournalSource = (typeof JOURNAL_SOURCES)[number];

export const JOURNAL_SOURCE_LABELS: Record<JournalSource, string> = {
  MANUAL: "Manual",
  OPENING_BALANCE: "Opening Balance",
  INVOICE: "Invoice",
  BILL: "Bill",
  PAYMENT: "Payment",
  PAYROLL: "Payroll",
  ASSET: "Fixed Asset",
  INVENTORY: "Inventory",
  BANK: "Bank",
  SYSTEM: "System",
};

export const PERIOD_STATUSES = ["OPEN", "CLOSED"] as const;
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

/**
 * Product-wide status vocabulary (docs/spec/09 §49). Phase 1 uses the
 * Draft/Posted/Reversed subset; commercial documents use the rest from Phase 2.
 */
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

export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
  POSTED: "Posted",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  REVERSED: "Reversed",
  ARCHIVED: "Archived",
};

/** Which statuses remain editable, and which sit in the ledger (docs/spec/09). */
export const RECORD_STATUS_RULES: Record<RecordStatus, { editable: boolean; inLedger: boolean }> = {
  DRAFT: { editable: true, inLedger: false },
  PENDING: { editable: true, inLedger: false },
  APPROVED: { editable: false, inLedger: false },
  POSTED: { editable: false, inLedger: true },
  PARTIALLY_PAID: { editable: false, inLedger: true },
  PAID: { editable: false, inLedger: true },
  OVERDUE: { editable: false, inLedger: true },
  CANCELLED: { editable: false, inLedger: false },
  REVERSED: { editable: false, inLedger: true },
  ARCHIVED: { editable: false, inLedger: true },
};

/** Legal journal status transitions; anything else is rejected server-side. */
export const JOURNAL_TRANSITIONS: Record<JournalStatus, JournalStatus[]> = {
  DRAFT: ["POSTED"],
  POSTED: ["REVERSED"],
  REVERSED: [],
};

export function canTransitionJournal(from: JournalStatus, to: JournalStatus): boolean {
  return JOURNAL_TRANSITIONS[from].includes(to);
}
