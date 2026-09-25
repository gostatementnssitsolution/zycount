import { subtractMoney } from "@zycount/shared";
import { buildLines, invoicePosting, totalsOf, type LineSpec } from "./build";
import { ACCOUNT_NAMES, DEMO_CURRENCY } from "./catalog";
import type { AgingRow, DocumentStatus, Party, TradeDocument } from "./types";

/** Preview data for the Sales module. See `./types` for why this exists. */

export const CUSTOMERS: Party[] = [
  {
    id: "cus-1",
    code: "C-1001",
    name: "Sunway Retail Group Sdn Bhd",
    email: "accounts@sunwayretail.com.my",
    phone: "+60 3 7492 1188",
    registrationNo: "201801029344 (1290344-K)",
    taxNo: "W10-1808-31000045",
    address: ["Level 12, Menara Sunway", "Jalan Lagoon Timur, Bandar Sunway", "47500 Subang Jaya, Selangor"],
    terms: "Net 30",
    creditLimit: "250000.00",
    balance: "86420.00",
    overdue: "0.00",
    ytd: "742180.00",
    status: "ACTIVE",
    since: "2023-02-14",
  },
  {
    id: "cus-2",
    code: "C-1002",
    name: "Pantai Logistics Bhd",
    email: "finance@pantailogistics.com",
    phone: "+60 4 398 7720",
    registrationNo: "199601008812 (383012-P)",
    taxNo: "P10-1901-31000112",
    address: ["Lot 44, Kawasan Perindustrian Prai", "13600 Prai, Pulau Pinang"],
    terms: "Net 45",
    creditLimit: "400000.00",
    balance: "154900.00",
    overdue: "39376.80",
    ytd: "1128400.00",
    status: "ACTIVE",
    since: "2021-06-02",
  },
  {
    id: "cus-3",
    code: "C-1003",
    name: "Aurora Digital Sdn Bhd",
    email: "ap@auroradigital.my",
    phone: "+60 3 2141 5566",
    registrationNo: "202001019277 (1372277-A)",
    address: ["Unit 8-3, Wisma UOA II", "Jalan Pinang, 50450 Kuala Lumpur"],
    terms: "Net 14",
    creditLimit: "80000.00",
    balance: "23850.00",
    overdue: "23850.00",
    ytd: "196400.00",
    status: "ON_HOLD",
    since: "2024-01-09",
  },
  {
    id: "cus-4",
    code: "C-1004",
    name: "Kinta Valley Hardware",
    email: "kvhardware@gmail.com",
    phone: "+60 5 254 8890",
    registrationNo: "002918844-T",
    address: ["12 Jalan Sultan Idris Shah", "30000 Ipoh, Perak"],
    terms: "Net 30",
    creditLimit: "60000.00",
    balance: "12480.00",
    overdue: "0.00",
    ytd: "148900.00",
    status: "ACTIVE",
    since: "2022-11-21",
  },
  {
    id: "cus-5",
    code: "C-1005",
    name: "Bayu Hospitality Group",
    email: "procurement@bayuhotels.com",
    phone: "+60 88 246 900",
    registrationNo: "201501004411 (1128411-V)",
    taxNo: "S10-1705-31000988",
    address: ["Jalan Tun Fuad Stephens", "88000 Kota Kinabalu, Sabah"],
    terms: "Net 60",
    creditLimit: "300000.00",
    balance: "198300.00",
    overdue: "0.00",
    ytd: "864200.00",
    status: "ACTIVE",
    since: "2020-08-30",
  },
  {
    id: "cus-6",
    code: "C-1006",
    name: "Meridian Softworks Pte Ltd",
    email: "billing@meridiansoft.sg",
    phone: "+65 6221 4400",
    registrationNo: "201934422R",
    address: ["71 Robinson Road, #14-01", "Singapore 068895"],
    terms: "Net 30",
    creditLimit: "150000.00",
    balance: "0.00",
    overdue: "0.00",
    ytd: "312600.00",
    status: "ACTIVE",
    since: "2023-09-12",
  },
  {
    id: "cus-7",
    code: "C-1007",
    name: "Tanjung Agro Industries",
    email: "accounts@tanjungagro.com.my",
    phone: "+60 7 861 2200",
    registrationNo: "199801016622 (470622-M)",
    address: ["PLO 19, Kawasan Perindustrian Pasir Gudang", "81700 Pasir Gudang, Johor"],
    terms: "Net 30",
    creditLimit: "120000.00",
    balance: "44100.00",
    overdue: "0.00",
    ytd: "402750.00",
    status: "ACTIVE",
    since: "2022-03-18",
  },
  {
    id: "cus-8",
    code: "C-1008",
    name: "Lembah Klang Contractors",
    email: "ar@lembahklang.my",
    phone: "+60 3 5519 7788",
    registrationNo: "201701011900 (1225900-X)",
    address: ["No. 7, Jalan TPP 1/3", "47100 Puchong, Selangor"],
    terms: "Net 30",
    creditLimit: "90000.00",
    balance: "0.00",
    overdue: "0.00",
    ytd: "88400.00",
    status: "ARCHIVED",
    since: "2021-01-25",
  },
];

interface InvoiceSpec {
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

const INVOICE_SPECS: InvoiceSpec[] = [
  {
    id: "inv-1",
    number: "INV-2026-0148",
    partyId: "cus-1",
    issuedOn: "2026-09-18",
    dueOn: "2026-10-18",
    status: "PARTIALLY_PAID",
    reference: "PO-SRG-88421",
    notes: "Delivery to Bandar Sunway distribution centre. Pallet charges waived.",
    paidRatio: 0.4,
    journalReference: "JV-2026-09-0231",
    lines: [
      { itemCode: "SKU-1042", description: "Zycount POS Terminal — Model T3", quantity: 24, unit: "unit", unitPrice: "1850.00", accountCode: "4000", taxCode: "SST-10" },
      { itemCode: "SKU-2210", description: "Thermal receipt printer", quantity: 24, unit: "unit", unitPrice: "420.00", discountPercent: 5, accountCode: "4000", taxCode: "SST-10" },
      { description: "On-site installation and staff training", quantity: 3, unit: "day", unitPrice: "1600.00", accountCode: "4010", taxCode: "SST-6" },
    ],
  },
  {
    id: "inv-2",
    number: "INV-2026-0147",
    partyId: "cus-5",
    issuedOn: "2026-09-15",
    dueOn: "2026-11-14",
    status: "POSTED",
    reference: "BHG-2026-Q3",
    journalReference: "JV-2026-09-0224",
    lines: [
      { itemCode: "SKU-3300", description: "Property management suite — annual licence (40 rooms)", quantity: 1, unit: "licence", unitPrice: "168000.00", accountCode: "4020", taxCode: "SST-6" },
      { description: "Implementation services", quantity: 18, unit: "day", unitPrice: "1450.00", accountCode: "4010", taxCode: "SST-6" },
    ],
  },
  {
    id: "inv-3",
    number: "INV-2026-0146",
    partyId: "cus-2",
    issuedOn: "2026-08-02",
    dueOn: "2026-09-16",
    status: "OVERDUE",
    reference: "PL-OPS-4412",
    journalReference: "JV-2026-08-0188",
    lines: [
      { itemCode: "SKU-4110", description: "Fleet tracking devices", quantity: 60, unit: "unit", unitPrice: "560.00", accountCode: "4000", taxCode: "SST-10" },
      { description: "Monthly telematics subscription — August", quantity: 60, unit: "device", unitPrice: "38.00", accountCode: "4020", taxCode: "SST-6" },
    ],
  },
  {
    id: "inv-4",
    number: "INV-2026-0145",
    partyId: "cus-3",
    issuedOn: "2026-08-20",
    dueOn: "2026-09-03",
    status: "OVERDUE",
    journalReference: "JV-2026-08-0201",
    lines: [
      { description: "Custom integration — accounting API", quantity: 15, unit: "day", unitPrice: "1500.00", accountCode: "4010", taxCode: "SST-6" },
    ],
  },
  {
    id: "inv-5",
    number: "INV-2026-0144",
    partyId: "cus-7",
    issuedOn: "2026-09-09",
    dueOn: "2026-10-09",
    status: "POSTED",
    journalReference: "JV-2026-09-0210",
    lines: [
      { itemCode: "SKU-1042", description: "Zycount POS Terminal — Model T3", quantity: 12, unit: "unit", unitPrice: "1850.00", accountCode: "4000", taxCode: "SST-10" },
      { itemCode: "SKU-5001", description: "Barcode scanner — wireless", quantity: 12, unit: "unit", unitPrice: "310.00", accountCode: "4000", taxCode: "SST-10" },
    ],
  },
  {
    id: "inv-6",
    number: "INV-2026-0143",
    partyId: "cus-4",
    issuedOn: "2026-09-05",
    dueOn: "2026-10-05",
    status: "PAID",
    paidRatio: 1,
    journalReference: "JV-2026-09-0198",
    lines: [
      { itemCode: "SKU-5001", description: "Barcode scanner — wireless", quantity: 8, unit: "unit", unitPrice: "310.00", accountCode: "4000", taxCode: "SST-10" },
      { itemCode: "SKU-2210", description: "Thermal receipt printer", quantity: 20, unit: "unit", unitPrice: "420.00", accountCode: "4000", taxCode: "SST-10" },
    ],
  },
  {
    id: "inv-7",
    number: "INV-2026-0142",
    partyId: "cus-6",
    issuedOn: "2026-08-28",
    dueOn: "2026-09-27",
    status: "PAID",
    paidRatio: 1,
    journalReference: "JV-2026-08-0219",
    lines: [
      { description: "Platform engineering retainer — August", quantity: 1, unit: "month", unitPrice: "42000.00", accountCode: "4010", taxCode: "ZERO" },
    ],
  },
  {
    id: "inv-8",
    number: "INV-2026-0149",
    partyId: "cus-2",
    issuedOn: "2026-09-22",
    dueOn: "2026-11-06",
    status: "DRAFT",
    notes: "Awaiting signed delivery order before issue.",
    lines: [
      { itemCode: "SKU-4110", description: "Fleet tracking devices", quantity: 40, unit: "unit", unitPrice: "560.00", accountCode: "4000", taxCode: "SST-10" },
      { description: "Installation at Prai depot", quantity: 4, unit: "day", unitPrice: "1450.00", accountCode: "4010", taxCode: "SST-6" },
    ],
  },
  {
    id: "inv-9",
    number: "INV-2026-0150",
    partyId: "cus-1",
    issuedOn: "2026-09-24",
    dueOn: "2026-10-24",
    status: "PENDING",
    reference: "PO-SRG-88503",
    notes: "Above RM50,000 — awaiting finance manager approval.",
    lines: [
      { itemCode: "SKU-3300", description: "Retail analytics module — 12 outlets", quantity: 12, unit: "outlet", unitPrice: "4800.00", accountCode: "4020", taxCode: "SST-6" },
    ],
  },
  {
    id: "inv-10",
    number: "INV-2026-0141",
    partyId: "cus-8",
    issuedOn: "2026-07-30",
    dueOn: "2026-08-29",
    status: "CANCELLED",
    notes: "Cancelled at customer request; replacement quotation issued.",
    lines: [
      { description: "Site survey and scoping", quantity: 2, unit: "day", unitPrice: "1200.00", accountCode: "4010", taxCode: "SST-6" },
    ],
  },
];

function buildInvoice(spec: InvoiceSpec): TradeDocument {
  const lines = buildLines(spec.lines);
  const totals = totalsOf(lines);
  const customer = CUSTOMERS.find((party) => party.id === spec.partyId)!;

  const paid =
    spec.paidRatio === 1
      ? totals.total
      : spec.paidRatio
        ? (Number(totals.total) * spec.paidRatio).toFixed(2)
        : "0.00";

  const allocations =
    Number(paid) > 0
      ? [
          {
            id: `${spec.id}-alloc-1`,
            date: spec.issuedOn,
            method: "Bank transfer — Maybank",
            reference: `RCT-2026-${spec.number.slice(-4)}`,
            amount: paid,
          },
        ]
      : [];

  return {
    id: spec.id,
    number: spec.number,
    partyId: spec.partyId,
    partyName: customer.name,
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
    posting: invoicePosting(spec.issuedOn, lines, ACCOUNT_NAMES, spec.journalReference),
    allocations,
    activity: activityFor(spec, paid),
  };
}

function activityFor(spec: InvoiceSpec, paid: string): TradeDocument["activity"] {
  const trail: TradeDocument["activity"] = [
    { at: `${spec.issuedOn}T09:12:00Z`, actor: "Nurul Aina", event: "Invoice created", detail: "From quotation" },
  ];

  if (spec.status !== "DRAFT") {
    trail.push({ at: `${spec.issuedOn}T09:40:00Z`, actor: "Nurul Aina", event: "Sent to customer", detail: "Email + PDF" });
  }
  if (spec.journalReference) {
    trail.push({
      at: `${spec.issuedOn}T09:41:00Z`,
      actor: "System",
      event: "Posted to ledger",
      detail: spec.journalReference,
    });
  }
  if (Number(paid) > 0) {
    trail.push({ at: `${spec.issuedOn}T03:02:00Z`, actor: "Bank feed", event: "Payment received", detail: `RM ${paid}` });
  }
  if (spec.status === "CANCELLED") {
    trail.push({ at: `${spec.dueOn}T11:15:00Z`, actor: "Faizal Rahman", event: "Cancelled", detail: "Reversing journal raised" });
  }

  return trail;
}

export const INVOICES: TradeDocument[] = INVOICE_SPECS.map(buildInvoice);

export function findInvoice(id: string): TradeDocument | undefined {
  return INVOICES.find((invoice) => invoice.id === id || invoice.number === id);
}

export const RECEIPTS = [
  { id: "rct-1", number: "RCT-2026-0148", date: "2026-09-18", customer: "Sunway Retail Group Sdn Bhd", method: "Bank transfer", account: "Maybank Current Account", applied: "INV-2026-0148", amount: "25784.64", status: "POSTED" as const },
  { id: "rct-2", number: "RCT-2026-0143", date: "2026-09-12", customer: "Kinta Valley Hardware", method: "Cheque 447120", account: "CIMB Operating Account", applied: "INV-2026-0143", amount: "11968.00", status: "POSTED" as const },
  { id: "rct-3", number: "RCT-2026-0142", date: "2026-09-08", customer: "Meridian Softworks Pte Ltd", method: "Telegraphic transfer", account: "Maybank Current Account", applied: "INV-2026-0142", amount: "42000.00", status: "POSTED" as const },
  { id: "rct-4", number: "RCT-2026-0151", date: "2026-09-24", customer: "Bayu Hospitality Group", method: "Bank transfer", account: "Maybank Current Account", applied: "Unapplied", amount: "50000.00", status: "PENDING" as const },
  { id: "rct-5", number: "RCT-2026-0139", date: "2026-08-31", customer: "Tanjung Agro Industries", method: "Cash", account: "Cash in Hand", applied: "INV-2026-0138", amount: "6300.00", status: "POSTED" as const },
];

export const QUOTATIONS = [
  { id: "qt-1", number: "QT-2026-0077", date: "2026-09-21", customer: "Pantai Logistics Bhd", expiresOn: "2026-10-21", amount: "104320.00", status: "PENDING" as const, probability: 70 },
  { id: "qt-2", number: "QT-2026-0076", date: "2026-09-17", customer: "Aurora Digital Sdn Bhd", expiresOn: "2026-10-17", amount: "36750.00", status: "DRAFT" as const, probability: 35 },
  { id: "qt-3", number: "QT-2026-0075", date: "2026-09-10", customer: "Bayu Hospitality Group", expiresOn: "2026-10-10", amount: "288400.00", status: "APPROVED" as const, probability: 90 },
  { id: "qt-4", number: "QT-2026-0074", date: "2026-08-29", customer: "Lembah Klang Contractors", expiresOn: "2026-09-28", amount: "18900.00", status: "CANCELLED" as const, probability: 0 },
];

export const AR_AGING: AgingRow[] = [
  { partyId: "cus-5", partyName: "Bayu Hospitality Group", current: "198300.00", d1to30: "0.00", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "198300.00" },
  { partyId: "cus-2", partyName: "Pantai Logistics Bhd", current: "115523.20", d1to30: "39376.80", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "154900.00" },
  { partyId: "cus-1", partyName: "Sunway Retail Group Sdn Bhd", current: "86420.00", d1to30: "0.00", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "86420.00" },
  { partyId: "cus-7", partyName: "Tanjung Agro Industries", current: "44100.00", d1to30: "0.00", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "44100.00" },
  { partyId: "cus-3", partyName: "Aurora Digital Sdn Bhd", current: "0.00", d1to30: "0.00", d31to60: "23850.00", d61to90: "0.00", d90plus: "0.00", total: "23850.00" },
  { partyId: "cus-4", partyName: "Kinta Valley Hardware", current: "12480.00", d1to30: "0.00", d31to60: "0.00", d61to90: "0.00", d90plus: "0.00", total: "12480.00" },
];
