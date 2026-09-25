import type { BankAccount, BankTransaction } from "./types";

/** Preview data for the Banking module. See `./types`. */

export const BANK_ACCOUNTS: BankAccount[] = [
  { id: "bank-1", name: "Maybank Current Account", bank: "Maybank", accountNo: "•••• 4821", currency: "MYR", ledgerAccountCode: "1010", ledgerBalance: "347029.80", statementBalance: "417340.29", unreconciledCount: 5, lastImport: "2026-09-25T06:00:00Z", feedStatus: "CONNECTED" },
  { id: "bank-2", name: "CIMB Operating Account", bank: "CIMB Bank", accountNo: "•••• 7733", currency: "MYR", ledgerAccountCode: "1020", ledgerBalance: "128410.00", statementBalance: "128410.00", unreconciledCount: 0, lastImport: "2026-09-25T06:00:00Z", feedStatus: "CONNECTED" },
  { id: "bank-3", name: "Stripe Settlement Account", bank: "Stripe", accountNo: "acct_••••9920", currency: "MYR", ledgerBalance: "24188.20", statementBalance: "26630.20", ledgerAccountCode: "1030", unreconciledCount: 3, lastImport: "2026-09-24T22:10:00Z", feedStatus: "ERROR" },
  { id: "bank-4", name: "Petty Cash — HQ", bank: "—", accountNo: "Cash float", currency: "MYR", ledgerAccountCode: "1000", ledgerBalance: "2560.00", statementBalance: "2560.00", unreconciledCount: 0, lastImport: "2026-09-20T09:00:00Z", feedStatus: "MANUAL" },
];

export const BANK_TRANSACTIONS: BankTransaction[] = [
  {
    id: "btx-1",
    accountId: "bank-1",
    date: "2026-09-24",
    description: "IBG TRANSFER SUNWAY RETAIL GRP",
    reference: "FT26267A8842",
    amount: "25784.64",
    balance: "417340.29",
    status: "SUGGESTED",
    match: { kind: "INVOICE", reference: "INV-2026-0148", party: "Sunway Retail Group Sdn Bhd", confidence: 0.97, rationale: "Amount matches the part payment recorded on the invoice to the cent, and the payer name matches the customer on file.", accountCode: "1200", accountName: "Trade Receivables" },
  },
  {
    id: "btx-2",
    accountId: "bank-1",
    date: "2026-09-23",
    description: "DUITNOW BAYU HOSPITALITY",
    reference: "DN26266B1120",
    amount: "50000.00",
    balance: "391555.65",
    status: "SUGGESTED",
    match: { kind: "INVOICE", reference: "INV-2026-0147", party: "Bayu Hospitality Group", confidence: 0.72, rationale: "Payer matches, but the amount is a part payment against a RM 205,746 invoice — confirm the allocation before posting.", accountCode: "1200", accountName: "Trade Receivables" },
  },
  {
    id: "btx-3",
    accountId: "bank-1",
    date: "2026-09-22",
    description: "GEMILANG PROPERTY MGMT RENTAL",
    reference: "FT26264C7781",
    amount: "-18000.00",
    balance: "341555.65",
    status: "MATCHED",
    match: { kind: "BILL", reference: "BIL-2026-0311", party: "Gemilang Property Management", confidence: 1, rationale: "Matched to the September rental bill and posted.", accountCode: "2100", accountName: "Trade Payables", journalReference: "JV-2026-09-0221" },
  },
  {
    id: "btx-4",
    accountId: "bank-1",
    date: "2026-09-21",
    description: "MB CARD AUTOPAY 4412",
    reference: "CC26263D2210",
    amount: "-8842.15",
    balance: "359555.65",
    status: "UNMATCHED",
  },
  {
    id: "btx-5",
    accountId: "bank-1",
    date: "2026-09-20",
    description: "SERVICE CHARGE",
    reference: "SC26262E0001",
    amount: "-32.00",
    balance: "368397.80",
    status: "SUGGESTED",
    match: { kind: "JOURNAL", reference: "Bank charges — 6900", party: "Maybank", confidence: 0.99, rationale: "Recurring bank charge; a standing rule codes this description to 6900 Bank Charges.", accountCode: "6900", accountName: "Bank Charges" },
  },
  {
    id: "btx-6",
    accountId: "bank-1",
    date: "2026-09-19",
    description: "TT MERIDIAN SOFTWORKS PTE",
    reference: "TT26261F9002",
    amount: "42000.00",
    balance: "368429.80",
    status: "MATCHED",
    match: { kind: "INVOICE", reference: "INV-2026-0142", party: "Meridian Softworks Pte Ltd", confidence: 1, rationale: "Matched on reference and amount.", accountCode: "1200", accountName: "Trade Receivables", journalReference: "JV-2026-09-0215" },
  },
  {
    id: "btx-7",
    accountId: "bank-1",
    date: "2026-09-18",
    description: "PAYROLL BATCH 2026-08",
    reference: "PR26260G4410",
    amount: "-186420.00",
    balance: "326429.80",
    status: "MATCHED",
    match: { kind: "JOURNAL", reference: "JV-2026-08-0240", party: "Payroll — August 2026", confidence: 1, rationale: "Matched to the posted payroll journal.", accountCode: "2240", accountName: "Net Salaries Payable", journalReference: "JV-2026-08-0240" },
  },
  {
    id: "btx-8",
    accountId: "bank-1",
    date: "2026-09-17",
    description: "CASH DEPOSIT MACHINE JLN KUCHING",
    reference: "CD26259H0088",
    amount: "3400.00",
    balance: "512849.80",
    status: "UNMATCHED",
  },
  {
    id: "btx-9",
    accountId: "bank-3",
    date: "2026-09-24",
    description: "STRIPE PAYOUT 2026-09-24",
    reference: "po_1P9xY2",
    amount: "2442.00",
    balance: "26630.20",
    status: "UNMATCHED",
  },
];

/**
 * The difference is exactly the net of the lines still to be cleared, which is
 * what makes the reconciliation provable: clear them all and it falls to nil.
 */
export const RECONCILIATION_SUMMARY = {
  accountId: "bank-1",
  statementDate: "2026-09-24",
  openingBalance: "509449.80",
  closingBalance: "417340.29",
  matchedCount: 3,
  suggestedCount: 3,
  unmatchedCount: 2,
  difference: "70310.49",
};
