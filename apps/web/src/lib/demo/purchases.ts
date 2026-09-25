import { subtractMoney } from "@zycount/shared";
import { billPosting, buildLines, totalsOf, type LineSpec } from "./build";
import { ACCOUNT_NAMES, DEMO_CURRENCY } from "./catalog";
import type { AgingRow, DocumentStatus, ExpenseCapture, Party, TradeDocument } from "./types";

/** Preview data for the Purchases module. See `./types`. */

export const SUPPLIERS: Party[] = [
  {
    id: "sup-1",
    code: "S-2001",
    name: "Techno Components (M) Sdn Bhd",
    email: "sales@technocomponents.my",
    phone: "+60 3 8023 4411",
    registrationNo: "201101022881 (952881-U)",
    taxNo: "W10-1506-31000221",
    address: ["Lot 3, Jalan Astaka U8/84", "Seksyen U8, 40150 Shah Alam, Selangor"],
    terms: "Net 30",
    creditLimit: "500000.00",
    balance: "212480.00",
    overdue: "0.00",
    ytd: "1842300.00",
    status: "ACTIVE",
    since: "2020-04-11",
  },
  {
    id: "sup-2",
    code: "S-2002",
    name: "Gemilang Property Management",
    email: "billing@gemilangproperty.com",
    phone: "+60 3 2166 8080",
    registrationNo: "199201007733 (240733-K)",
    address: ["Suite 20-3, Menara Gemilang", "Jalan Ampang, 50450 Kuala Lumpur"],
    terms: "Net 7",
    creditLimit: "0.00",
    balance: "18000.00",
    overdue: "0.00",
    ytd: "162000.00",
    status: "ACTIVE",
    since: "2019-01-03",
  },
  {
    id: "sup-3",
    code: "S-2003",
    name: "Cloudline Services Pte Ltd",
    email: "ar@cloudline.io",
    phone: "+65 6809 1122",
    registrationNo: "202112233K",
    address: ["8 Marina View, #29-04", "Singapore 018960"],
    terms: "Net 14",
    creditLimit: "0.00",
    balance: "9840.00",
    overdue: "3120.00",
    ytd: "118080.00",
    status: "ACTIVE",
    since: "2022-07-19",
  },
  {
    id: "sup-4",
    code: "S-2004",
    name: "Seri Mutiara Logistics",
    email: "accounts@serimutiara.com.my",
    phone: "+60 4 642 3311",
    registrationNo: "200501018844 (692844-H)",
    address: ["Lot 220, Jalan Perusahaan", "13700 Perai, Pulau Pinang"],
    terms: "Net 30",
    creditLimit: "0.00",
    balance: "34200.00",
    overdue: "0.00",
    ytd: "398400.00",
    status: "ACTIVE",
    since: "2021-03-08",
  },
  {
    id: "sup-5",
    code: "S-2005",
    name: "Lim & Partners Chartered Accountants",
    email: "admin@limpartners.my",
    phone: "+60 3 7954 2200",
    registrationNo: "AF-001882",
    address: ["No. 5-2, Jalan SS15/4D", "47500 Subang Jaya, Selangor"],
    terms: "Net 30",
    creditLimit: "0.00",
    balance: "0.00",
    overdue: "0.00",
    ytd: "96000.00",
    status: "ACTIVE",
    since: "2019-05-22",
  },
  {
    id: "sup-6",
    code: "S-2006",
    name: "Bright Media Agency",
    email: "hello@brightmedia.my",
    phone: "+60 3 6205 7788",
    registrationNo: "202201033991 (1459991-D)",
    address: ["12A, Jalan PJU 5/20", "47810 Petaling Jaya, Selangor"],
    terms: "Net 14",
    creditLimit: "0.00",
    balance: "26500.00",
    overdue: "0.00",
    ytd: "212000.00",
    status: "ACTIVE",
    since: "2023-02-01",
  },
];

interface BillSpec {
  id: string;
  number: string;
  partyId: string;
  issuedOn: string;
  dueOn: string;
  status: DocumentStatus;
  reference?: string;
  notes?: string;
  paidRatio?: number;
  journalReference?: string;
  lines: LineSpec[];
}

const BILL_SPECS: BillSpec[] = [
  {
    id: "bil-1",
    number: "BIL-2026-0312",
    partyId: "sup-1",
    issuedOn: "2026-09-16",
    dueOn: "2026-10-16",
    status: "APPROVED",
    reference: "TC-INV-99271",
    journalReference: "JV-2026-09-0226",
    lines: [
      { itemCode: "SKU-1042", description: "POS terminal main boards", quantity: 60, unit: "unit", unitPrice: "980.00", accountCode: "1300", taxCode: "SST-10" },
      { itemCode: "SKU-2210", description: "Thermal print heads", quantity: 80, unit: "unit", unitPrice: "185.00", accountCode: "1300", taxCode: "SST-10" },
    ],
  },
  {
    id: "bil-2",
    number: "BIL-2026-0311",
    partyId: "sup-2",
    issuedOn: "2026-09-01",
    dueOn: "2026-09-08",
    status: "PAID",
    paidRatio: 1,
    reference: "Rental — September 2026",
    journalReference: "JV-2026-09-0190",
    lines: [{ description: "Office rental — Level 8, Menara Gemilang", quantity: 1, unit: "month", unitPrice: "18000.00", accountCode: "6200", taxCode: "ZERO" }],
  },
  {
    id: "bil-3",
    number: "BIL-2026-0310",
    partyId: "sup-3",
    issuedOn: "2026-08-30",
    dueOn: "2026-09-13",
    status: "OVERDUE",
    journalReference: "JV-2026-08-0222",
    lines: [
      { description: "Cloud hosting — August", quantity: 1, unit: "month", unitPrice: "2600.00", accountCode: "6410", taxCode: "ZERO" },
      { description: "Data egress overage", quantity: 1, unit: "month", unitPrice: "520.00", accountCode: "6410", taxCode: "ZERO" },
    ],
  },
  {
    id: "bil-4",
    number: "BIL-2026-0313",
    partyId: "sup-4",
    issuedOn: "2026-09-20",
    dueOn: "2026-10-20",
    status: "PENDING",
    notes: "Awaiting goods-received note for delivery DO-8841.",
    lines: [{ description: "Freight and last-mile delivery — September", quantity: 1, unit: "month", unitPrice: "32264.15", accountCode: "6310", taxCode: "SST-6" }],
  },
  {
    id: "bil-5",
    number: "BIL-2026-0314",
    partyId: "sup-6",
    issuedOn: "2026-09-23",
    dueOn: "2026-10-07",
    status: "DRAFT",
    lines: [
      { description: "Q4 campaign — creative production", quantity: 1, unit: "project", unitPrice: "18000.00", accountCode: "6300", taxCode: "SST-6" },
      { description: "Paid media management fee", quantity: 1, unit: "month", unitPrice: "7000.00", accountCode: "6300", taxCode: "SST-6" },
    ],
  },
  {
    id: "bil-6",
    number: "BIL-2026-0309",
    partyId: "sup-5",
    issuedOn: "2026-08-15",
    dueOn: "2026-09-14",
    status: "PAID",
    paidRatio: 1,
    journalReference: "JV-2026-08-0205",
    lines: [{ description: "Statutory audit — FY2025 final fee", quantity: 1, unit: "engagement", unitPrice: "24000.00", accountCode: "6400", taxCode: "SST-6" }],
  },
];

function buildBill(spec: BillSpec): TradeDocument {
  const lines = buildLines(spec.lines);
  const totals = totalsOf(lines);
  const supplier = SUPPLIERS.find((party) => party.id === spec.partyId)!;
  const paid = spec.paidRatio === 1 ? totals.total : "0.00";

  return {
    id: spec.id,
    number: spec.number,
    partyId: spec.partyId,
    partyName: supplier.name,
    issuedOn: spec.issuedOn,
    dueOn: spec.dueOn,
    status: spec.status,
    currency: DEMO_CURRENCY,
    subtotal: totals.subtotal,
    discount: totals.discount,
    tax: totals.tax,
    total: totals.total,
    paid,
    balance: subtractMoney(totals.total, paid),
    reference: spec.reference,
    notes: spec.notes,
    lines,
    posting: billPosting(spec.issuedOn, lines, ACCOUNT_NAMES, spec.journalReference),
    allocations:
      Number(paid) > 0
        ? [
            {
              id: `${spec.id}-alloc-1`,
              date: spec.dueOn,
              method: "Bank transfer — Maybank",
              reference: `PAY-2026-${spec.number.slice(-4)}`,
              amount: paid,
            },
          ]
        : [],
    activity: [
      { at: `${spec.issuedOn}T10:05:00Z`, actor: "Siti Mariam", event: "Bill captured", detail: "From supplier email" },
      ...(spec.status === "DRAFT"
        ? []
        : [{ at: `${spec.issuedOn}T14:20:00Z`, actor: "Faizal Rahman", event: "Approved", detail: "Within delegated limit" }]),
      ...(spec.journalReference
        ? [{ at: `${spec.issuedOn}T14:21:00Z`, actor: "System", event: "Posted to ledger", detail: spec.journalReference }]
        : []),
    ],
  };
}

export const BILLS: TradeDocument[] = BILL_SPECS.map(buildBill);

export function findBill(id: string): TradeDocument | undefined {
  return BILLS.find((bill) => bill.id === id || bill.number === id);
}

export const PURCHASE_ORDERS = [
  { id: "po-1", number: "PO-2026-0221", date: "2026-09-22", supplier: "Techno Components (M) Sdn Bhd", expected: "2026-10-06", amount: "148500.00", received: 0, status: "APPROVED" as const },
  { id: "po-2", number: "PO-2026-0220", date: "2026-09-15", supplier: "Seri Mutiara Logistics", expected: "2026-09-30", amount: "32264.15", received: 60, status: "PARTIALLY_PAID" as const },
  { id: "po-3", number: "PO-2026-0219", date: "2026-09-08", supplier: "Techno Components (M) Sdn Bhd", expected: "2026-09-19", amount: "76230.00", received: 100, status: "POSTED" as const },
  { id: "po-4", number: "PO-2026-0222", date: "2026-09-24", supplier: "Bright Media Agency", expected: "2026-10-15", amount: "26500.00", received: 0, status: "DRAFT" as const },
];

export const PAYMENTS = [
  { id: "pay-1", number: "PAY-2026-0311", date: "2026-09-08", supplier: "Gemilang Property Management", method: "Bank transfer", account: "Maybank Current Account", applied: "BIL-2026-0311", amount: "18000.00", status: "POSTED" as const },
  { id: "pay-2", number: "PAY-2026-0309", date: "2026-09-12", supplier: "Lim & Partners Chartered Accountants", method: "Bank transfer", account: "CIMB Operating Account", applied: "BIL-2026-0309", amount: "25440.00", status: "POSTED" as const },
  { id: "pay-3", number: "PAY-2026-0315", date: "2026-09-25", supplier: "Cloudline Services Pte Ltd", method: "Credit card", account: "Maybank Corporate Card", applied: "BIL-2026-0310", amount: "3120.00", status: "PENDING" as const },
  { id: "pay-4", number: "PAY-2026-0308", date: "2026-08-29", supplier: "Seri Mutiara Logistics", method: "Bank transfer", account: "Maybank Current Account", applied: "BIL-2026-0305", amount: "29800.00", status: "POSTED" as const },
];

export const AP_AGING: AgingRow[] = [
  { partyId: "sup-1", partyName: "Techno Components (M) Sdn Bhd", current: "212480.00", d1to30: "0.00", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "212480.00" },
  { partyId: "sup-4", partyName: "Seri Mutiara Logistics", current: "34200.00", d1to30: "0.00", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "34200.00" },
  { partyId: "sup-6", partyName: "Bright Media Agency", current: "26500.00", d1to30: "0.00", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "26500.00" },
  { partyId: "sup-2", partyName: "Gemilang Property Management", current: "18000.00", d1to30: "0.00", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "18000.00" },
  { partyId: "sup-3", partyName: "Cloudline Services Pte Ltd", current: "6720.00", d1to30: "3120.00", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "9840.00" },
];

/**
 * Receipt capture. The extraction is a *suggestion*: nothing posts until a
 * person approves it, and the rationale is always shown (docs/spec/11).
 */
export const EXPENSE_CAPTURES: ExpenseCapture[] = [
  {
    id: "exp-1",
    fileName: "shell-station-receipt-2026-09-24.jpg",
    uploadedAt: "2026-09-24T08:41:00Z",
    status: "REVIEW",
    confidence: 0.94,
    vendor: "Shell Malaysia — Jalan Kuching",
    documentNo: "SH-88412290",
    documentDate: "2026-09-24",
    currency: DEMO_CURRENCY,
    subtotal: "184.91",
    tax: "0.00",
    total: "184.91",
    taxCode: "EXEMPT",
    suggestedAccountCode: "6310",
    suggestedAccountName: "Travel & Transport",
    rationale:
      "Merchant matches 14 previous fuel receipts, all coded to 6310. Amount is within the usual RM120–RM220 range for this vehicle.",
    paidFrom: "Maybank Corporate Card",
    fields: [
      { label: "Vendor", value: "Shell Malaysia — Jalan Kuching", confidence: 0.98 },
      { label: "Document no.", value: "SH-88412290", confidence: 0.91 },
      { label: "Date", value: "24 Sep 2026", confidence: 0.99 },
      { label: "Subtotal", value: "184.91", confidence: 0.97 },
      { label: "Tax", value: "0.00", confidence: 0.88 },
      { label: "Total", value: "184.91", confidence: 0.99 },
    ],
    posting: {
      source: "EXPENSE_CLAIM",
      date: "2026-09-24",
      lines: [
        { accountCode: "6310", accountName: "Travel & Transport", debit: "184.91", credit: "0.00" },
        { accountCode: "2110", accountName: "Credit Card Payable", debit: "0.00", credit: "184.91" },
      ],
    },
  },
  {
    id: "exp-2",
    fileName: "cloudline-invoice-sep.pdf",
    uploadedAt: "2026-09-23T16:09:00Z",
    status: "REVIEW",
    confidence: 0.88,
    vendor: "Cloudline Services Pte Ltd",
    documentNo: "CL-2026-09-4471",
    documentDate: "2026-09-23",
    currency: DEMO_CURRENCY,
    subtotal: "3120.00",
    tax: "0.00",
    total: "3120.00",
    taxCode: "ZERO",
    suggestedAccountCode: "6410",
    suggestedAccountName: "Software Subscriptions",
    rationale:
      "Supplier is on file with a standing coding rule to 6410. Foreign supplier, so no input tax is claimed.",
    paidFrom: "Maybank Current Account",
    fields: [
      { label: "Vendor", value: "Cloudline Services Pte Ltd", confidence: 0.96 },
      { label: "Document no.", value: "CL-2026-09-4471", confidence: 0.93 },
      { label: "Date", value: "23 Sep 2026", confidence: 0.97 },
      { label: "Subtotal", value: "3120.00", confidence: 0.94 },
      { label: "Tax", value: "0.00", confidence: 0.72 },
      { label: "Total", value: "3120.00", confidence: 0.98 },
    ],
    posting: {
      source: "SUPPLIER_BILL",
      date: "2026-09-23",
      lines: [
        { accountCode: "6410", accountName: "Software Subscriptions", debit: "3120.00", credit: "0.00" },
        { accountCode: "2100", accountName: "Trade Payables", debit: "0.00", credit: "3120.00" },
      ],
    },
  },
  {
    id: "exp-3",
    fileName: "grab-trip-2026-09-22.png",
    uploadedAt: "2026-09-22T21:14:00Z",
    status: "POSTED",
    confidence: 0.96,
    vendor: "Grab Malaysia",
    documentNo: "GR-772841003",
    documentDate: "2026-09-22",
    currency: DEMO_CURRENCY,
    subtotal: "42.50",
    tax: "2.55",
    total: "45.05",
    taxCode: "SST-6",
    suggestedAccountCode: "6310",
    suggestedAccountName: "Travel & Transport",
    rationale: "Ride-hailing merchant; matched to the standing rule for staff travel.",
    paidFrom: "Maybank Corporate Card",
    fields: [
      { label: "Vendor", value: "Grab Malaysia", confidence: 0.99 },
      { label: "Date", value: "22 Sep 2026", confidence: 0.99 },
      { label: "Total", value: "45.05", confidence: 0.99 },
    ],
    posting: {
      source: "EXPENSE_CLAIM",
      date: "2026-09-22",
      journalReference: "JV-2026-09-0229",
      lines: [
        { accountCode: "6310", accountName: "Travel & Transport", debit: "42.50", credit: "0.00" },
        { accountCode: "1450", accountName: "SST Recoverable", debit: "2.55", credit: "0.00" },
        { accountCode: "2110", accountName: "Credit Card Payable", debit: "0.00", credit: "45.05" },
      ],
    },
  },
  {
    id: "exp-4",
    fileName: "team-lunch-2026-09-19.jpg",
    uploadedAt: "2026-09-19T13:52:00Z",
    status: "EXTRACTING",
    confidence: 0,
    vendor: "—",
    documentNo: "—",
    documentDate: "2026-09-19",
    currency: DEMO_CURRENCY,
    subtotal: "0.00",
    tax: "0.00",
    total: "0.00",
    taxCode: "EXEMPT",
    suggestedAccountCode: "6320",
    suggestedAccountName: "Meals & Entertainment",
    rationale: "Extraction still running.",
    paidFrom: "—",
    fields: [],
    posting: { source: "EXPENSE_CLAIM", date: "2026-09-19", lines: [] },
  },
];
