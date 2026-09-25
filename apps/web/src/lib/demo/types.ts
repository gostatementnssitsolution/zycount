/**
 * Types for the portal preview data set.
 *
 * Phase 1 modules (accounting, ledger, reports, admin) read the real API. The
 * modules on this side of the product — sales, purchases, inventory, banking,
 * payroll, fixed assets, insights and the copilot — arrive in later phases, so
 * their screens render from the fixture in `./data`. The shapes here are the
 * ones those endpoints will return, so wiring them up later is a swap of the
 * data source, not a rewrite of the screen.
 *
 * Money is a decimal string everywhere, exactly as it crosses the wire.
 */

export type Money = string;

export type DocumentStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "POSTED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "REVERSED"
  | "ARCHIVED";

/** One side of the entry a source document will produce when it posts. */
export interface PostingLine {
  accountCode: string;
  accountName: string;
  debit: Money;
  credit: Money;
}

/** The entry a document produces — the spine of the whole product. */
export interface PostingPreview {
  /** `SALES_INVOICE`, `BILL`, `PAYROLL_RUN`, … */
  source: string;
  date: string;
  lines: PostingLine[];
  /** Set once the document has posted and the journal exists. */
  journalReference?: string;
}

export interface Party {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  /** Registration number — SSM for Malaysian entities. */
  registrationNo: string;
  taxNo?: string;
  address: string[];
  terms: string;
  creditLimit: Money;
  balance: Money;
  overdue: Money;
  ytd: Money;
  status: "ACTIVE" | "ON_HOLD" | "ARCHIVED";
  since: string;
}

export interface DocumentLine {
  id: string;
  itemCode?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: Money;
  discountPercent?: number;
  taxCode: string;
  taxAmount: Money;
  accountCode: string;
  total: Money;
}

export interface TradeDocument {
  id: string;
  number: string;
  partyId: string;
  partyName: string;
  issuedOn: string;
  dueOn: string;
  status: DocumentStatus;
  currency: string;
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
  paid: Money;
  balance: Money;
  reference?: string;
  notes?: string;
  lines: DocumentLine[];
  posting: PostingPreview;
  /** Payments and credits already applied against this document. */
  allocations: Array<{
    id: string;
    date: string;
    method: string;
    reference: string;
    amount: Money;
  }>;
  activity: Array<{ at: string; actor: string; event: string; detail?: string }>;
}

export interface AgingBucket {
  label: string;
  amount: Money;
  count: number;
}

export interface AgingRow {
  partyId: string;
  partyName: string;
  current: Money;
  d1to30: Money;
  d31to60: Money;
  d61to90: Money;
  d90plus: Money;
  total: Money;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costMethod: "FIFO" | "WEIGHTED_AVERAGE";
  unitCost: Money;
  sellingPrice: Money;
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  reorderLevel: number;
  reorderQuantity: number;
  location: string;
  value: Money;
  lastMovement: string;
  status: "IN_STOCK" | "LOW" | "OUT" | "OVERSTOCKED";
}

export interface StockMovement {
  id: string;
  date: string;
  sku: string;
  itemName: string;
  type: "PURCHASE" | "SALE" | "ADJUSTMENT" | "TRANSFER" | "RETURN";
  reference: string;
  quantity: number;
  unitCost: Money;
  value: Money;
  balanceAfter: number;
  location: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bank: string;
  accountNo: string;
  currency: string;
  ledgerAccountCode: string;
  ledgerBalance: Money;
  statementBalance: Money;
  unreconciledCount: number;
  lastImport: string;
  feedStatus: "CONNECTED" | "MANUAL" | "ERROR";
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  reference: string;
  amount: Money;
  /** Running statement balance after this line. */
  balance: Money;
  status: "MATCHED" | "SUGGESTED" | "UNMATCHED" | "EXCLUDED";
  /** Populated when Zycount has found or made a match. */
  match?: {
    kind: "INVOICE" | "BILL" | "JOURNAL" | "EXPENSE" | "TRANSFER";
    reference: string;
    party: string;
    confidence: number;
    rationale: string;
    /** The account on the other side of the entry this match produces. */
    accountCode: string;
    accountName: string;
    /** Set once the match has been accepted and the journal exists. */
    journalReference?: string;
  };
}

export interface ExpenseCapture {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: "EXTRACTING" | "REVIEW" | "APPROVED" | "POSTED" | "REJECTED";
  confidence: number;
  vendor: string;
  documentNo: string;
  documentDate: string;
  currency: string;
  subtotal: Money;
  tax: Money;
  total: Money;
  taxCode: string;
  suggestedAccountCode: string;
  suggestedAccountName: string;
  /** Why the account was suggested — never a bare guess. */
  rationale: string;
  paidFrom: string;
  fields: Array<{ label: string; value: string; confidence: number }>;
  posting: PostingPreview;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  role: string;
  department: string;
  joinedOn: string;
  status: "ACTIVE" | "ON_LEAVE" | "RESIGNED";
  grossMonthly: Money;
  epfEmployee: Money;
  epfEmployer: Money;
  socso: Money;
  eis: Money;
  pcb: Money;
  netMonthly: Money;
  bankAccount: string;
}

export interface PayRun {
  id: string;
  period: string;
  payDate: string;
  status: DocumentStatus;
  headcount: number;
  gross: Money;
  statutory: Money;
  net: Money;
  employerCost: Money;
  posting: PostingPreview;
}

export interface FixedAsset {
  id: string;
  code: string;
  name: string;
  category: string;
  acquiredOn: string;
  cost: Money;
  residual: Money;
  method: "STRAIGHT_LINE" | "REDUCING_BALANCE";
  usefulLifeMonths: number;
  monthlyCharge: Money;
  accumulated: Money;
  netBookValue: Money;
  status: "IN_USE" | "FULLY_DEPRECIATED" | "DISPOSED";
  location: string;
}

export interface SeriesPoint {
  label: string;
  [series: string]: string | number;
}

export interface HealthMetric {
  key: string;
  label: string;
  value: string;
  unit: "MONEY" | "PERCENT" | "MONTHS" | "DAYS" | "RATIO";
  target?: string;
  trend: number[];
  /** `1` good, `0` watch, `-1` act. */
  signal: 1 | 0 | -1;
  hint: string;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Every figure the assistant states cites the record it came from. */
  citations?: Array<{ label: string; href: string }>;
  followUps?: string[];
}
