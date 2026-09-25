import { z } from "zod";
import type { AccountType } from "../accounting";
import { isoDateSchema, paginationSchema, sortSchema, uuidSchema } from "./common";

/**
 * Reports are always bounded by an explicit date range or a fiscal period, so
 * every figure on screen can be traced back to the exact ledger rows behind it.
 */
export const reportRangeSchema = z
  .object({
    fiscalPeriodId: uuidSchema.optional(),
    dateFrom: isoDateSchema.optional(),
    dateTo: isoDateSchema.optional(),
    /** Compare against the immediately preceding range of equal length. */
    comparePrevious: z.coerce.boolean().optional().default(false),
    includeZeroBalances: z.coerce.boolean().optional().default(false),
  })
  .refine((value) => Boolean(value.fiscalPeriodId) || Boolean(value.dateTo), {
    message: "Choose a period or a date range.",
    path: ["fiscalPeriodId"],
  })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateTo >= value.dateFrom, {
    message: "The end date must fall on or after the start date.",
    path: ["dateTo"],
  });
export type ReportRangeQuery = z.infer<typeof reportRangeSchema>;

export const ledgerQuerySchema = paginationSchema.extend({
  accountId: uuidSchema.optional(),
  fiscalPeriodId: uuidSchema.optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  source: z.string().trim().max(30).optional(),
  q: z.string().trim().max(100).optional(),
  sort: sortSchema,
});
export type LedgerQuery = z.infer<typeof ledgerQuerySchema>;

export interface ReportPeriodMeta {
  from: string;
  to: string;
  label: string;
  currency: string;
  companyName: string;
  generatedAt: string;
}

// ── Trial balance ────────────────────────────────────────────

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  /** Balance carried into the range. */
  openingDebit: string;
  openingCredit: string;
  /** Movement inside the range. */
  periodDebit: string;
  periodCredit: string;
  /** Net closing position, shown on its natural side. */
  closingDebit: string;
  closingCredit: string;
}

export interface TrialBalanceReport {
  meta: ReportPeriodMeta;
  rows: TrialBalanceRow[];
  totals: {
    openingDebit: string;
    openingCredit: string;
    periodDebit: string;
    periodCredit: string;
    closingDebit: string;
    closingCredit: string;
  };
  /** Invariant 3 — surfaced so the UI can flag an out-of-balance ledger loudly. */
  balanced: boolean;
  difference: string;
}

// ── General ledger ───────────────────────────────────────────

export interface LedgerRow {
  journalLineId: string;
  journalEntryId: string;
  reference: string;
  date: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string | null;
  source: string;
  sourceId: string | null;
  debit: string;
  credit: string;
  /** Running balance in the account's normal direction. */
  balance: string;
}

export interface LedgerReport {
  meta: ReportPeriodMeta;
  account: { id: string; code: string; name: string; type: AccountType } | null;
  openingBalance: string;
  closingBalance: string;
  totalDebit: string;
  totalCredit: string;
  rows: LedgerRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ── Profit & loss ────────────────────────────────────────────

export interface StatementLine {
  accountId: string | null;
  code: string | null;
  name: string;
  amount: string;
  /** Prior-range figure when `comparePrevious` is set. */
  previousAmount?: string;
  depth: number;
  isTotal?: boolean;
  isSubtotal?: boolean;
}

export interface StatementSection {
  key: string;
  title: string;
  lines: StatementLine[];
  total: string;
  previousTotal?: string;
}

export interface ProfitLossReport {
  meta: ReportPeriodMeta;
  comparison: { from: string; to: string; label: string } | null;
  revenue: StatementSection;
  costOfSales: StatementSection;
  grossProfit: string;
  previousGrossProfit?: string;
  operatingExpenses: StatementSection;
  otherIncome: StatementSection;
  otherExpenses: StatementSection;
  operatingProfit: string;
  previousOperatingProfit?: string;
  netProfit: string;
  previousNetProfit?: string;
  /** Gross profit ÷ revenue, as a percentage with one decimal. */
  grossMarginPercent: string;
  netMarginPercent: string;
}

// ── Balance sheet ────────────────────────────────────────────

export interface BalanceSheetReport {
  meta: ReportPeriodMeta;
  comparison: { from: string; to: string; label: string } | null;
  currentAssets: StatementSection;
  nonCurrentAssets: StatementSection;
  totalAssets: string;
  previousTotalAssets?: string;
  currentLiabilities: StatementSection;
  nonCurrentLiabilities: StatementSection;
  totalLiabilities: string;
  previousTotalLiabilities?: string;
  equity: StatementSection;
  /** Profit for the period, closed into equity only at year end. */
  retainedEarningsForPeriod: string;
  previousRetainedEarningsForPeriod?: string;
  totalEquity: string;
  previousTotalEquity?: string;
  totalLiabilitiesAndEquity: string;
  previousTotalLiabilitiesAndEquity?: string;
  /** Invariant 2 — `Assets = Liabilities + Equity`. */
  balanced: boolean;
  difference: string;
}

// ── Dashboard ────────────────────────────────────────────────

export interface DashboardKpi {
  key: string;
  label: string;
  value: string;
  previousValue: string | null;
  /** Percentage change vs. the previous period, or `null` when undefined. */
  changePercent: string | null;
  /** Whether an increase is a good thing — drives the colour of the delta. */
  positiveIsGood: boolean;
  hint: string;
}

export interface DashboardTrendPoint {
  label: string;
  periodId: string;
  revenue: string;
  expenses: string;
  netProfit: string;
  cash: string;
}

export interface BusinessHealthMetric {
  key: string;
  label: string;
  value: string;
  detail: string;
  status: "good" | "watch" | "risk" | "unknown";
}

export interface DashboardReport {
  meta: ReportPeriodMeta;
  kpis: DashboardKpi[];
  trend: DashboardTrendPoint[];
  health: BusinessHealthMetric[];
  recentJournals: Array<{
    id: string;
    reference: string;
    date: string;
    description: string | null;
    status: string;
    source: string;
    amount: string;
  }>;
  accountMix: Array<{ name: string; amount: string; type: AccountType }>;
}

export const exportFormatSchema = z.enum(["csv", "json"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;
