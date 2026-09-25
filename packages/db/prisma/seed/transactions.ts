/**
 * Deterministic demo transactions (docs/spec/13 §52).
 *
 * Every entry here is a real, balanced application of the posting rules in
 * docs/spec/04, so the seeded books exercise the trial balance, P&L and balance
 * sheet with figures that actually tie out. The generator is seeded with a fixed
 * value so re-seeding produces byte-identical books.
 */
import { SYSTEM_ACCOUNT_CODES as A } from "../../src/coa";

export interface SeedLine {
  code: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface SeedJournal {
  /** Day of the month the entry falls on. */
  day: number;
  description: string;
  source:
    | "MANUAL"
    | "OPENING_BALANCE"
    | "INVOICE"
    | "BILL"
    | "PAYMENT"
    | "PAYROLL"
    | "ASSET"
    | "BANK"
    | "SYSTEM";
  lines: SeedLine[];
}

/** Mulberry32 — small, fast, and identical across runs. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export interface DemoProfile {
  key: "trading" | "services" | "retail";
  /** Opening balance sheet, in base currency. */
  opening: {
    bank: number;
    cash: number;
    receivables: number;
    inventory: number;
    officeEquipment: number;
    computerEquipment: number;
    payables: number;
    accruals: number;
    termLoan: number;
    shareCapital: number;
  };
  monthlySales: { min: number; max: number; goodsShare: number };
  grossMargin: number;
  payroll: { gross: number; epfEmployeePct: number; epfEmployerPct: number; socso: number; eis: number; pcb: number };
  rent: number;
  utilities: { min: number; max: number };
  depreciation: { office: number; computer: number };
  /** Number of sales invoices raised per month. */
  invoicesPerMonth: number;
  seed: number;
}

export const DEMO_PROFILES: Record<DemoProfile["key"], DemoProfile> = {
  trading: {
    key: "trading",
    opening: {
      bank: 185_000,
      cash: 5_000,
      receivables: 96_400,
      inventory: 142_000,
      officeEquipment: 48_000,
      computerEquipment: 36_000,
      payables: 78_300,
      accruals: 9_200,
      termLoan: 120_000,
      shareCapital: 250_000,
    },
    monthlySales: { min: 128_000, max: 196_000, goodsShare: 0.88 },
    grossMargin: 0.34,
    payroll: { gross: 34_000, epfEmployeePct: 0.11, epfEmployerPct: 0.13, socso: 510, eis: 136, pcb: 1_700 },
    rent: 8_500,
    utilities: { min: 2_100, max: 3_400 },
    depreciation: { office: 800, computer: 1_000 },
    invoicesPerMonth: 6,
    seed: 20260101,
  },
  services: {
    key: "services",
    opening: {
      bank: 96_000,
      cash: 2_000,
      receivables: 64_800,
      inventory: 0,
      officeEquipment: 22_000,
      computerEquipment: 54_000,
      payables: 18_400,
      accruals: 6_500,
      termLoan: 0,
      shareCapital: 150_000,
    },
    monthlySales: { min: 72_000, max: 108_000, goodsShare: 0 },
    grossMargin: 0.62,
    payroll: { gross: 44_000, epfEmployeePct: 0.11, epfEmployerPct: 0.13, socso: 660, eis: 176, pcb: 2_450 },
    rent: 5_200,
    utilities: { min: 900, max: 1_600 },
    depreciation: { office: 367, computer: 1_500 },
    invoicesPerMonth: 4,
    seed: 20260202,
  },
  retail: {
    key: "retail",
    opening: {
      bank: 240_000,
      cash: 18_000,
      receivables: 32_500,
      inventory: 288_000,
      officeEquipment: 64_000,
      computerEquipment: 42_000,
      payables: 154_600,
      accruals: 14_800,
      termLoan: 180_000,
      shareCapital: 300_000,
    },
    monthlySales: { min: 214_000, max: 312_000, goodsShare: 0.97 },
    grossMargin: 0.33,
    payroll: { gross: 38_000, epfEmployeePct: 0.11, epfEmployerPct: 0.13, socso: 570, eis: 152, pcb: 1_900 },
    rent: 16_000,
    utilities: { min: 4_200, max: 6_800 },
    depreciation: { office: 1_067, computer: 1_167 },
    invoicesPerMonth: 8,
    seed: 20260303,
  },
};

/** SST standard rate on goods, per docs/spec/00 (Malaysia-first). */
const SST_RATE = 0.06;

/** Opening balances post as one dated, balanced journal (docs/spec/13 §51 step 9). */
export function buildOpeningJournal(profile: DemoProfile): SeedJournal {
  const o = profile.opening;
  const debits =
    o.bank + o.cash + o.receivables + o.inventory + o.officeEquipment + o.computerEquipment;
  const creditsKnown = o.payables + o.accruals + o.termLoan + o.shareCapital;
  // Whatever the opening balance sheet does not explain sits in retained
  // earnings — exactly how a real migration balances its opening entry.
  const retainedEarnings = round2(debits - creditsKnown);

  const lines: SeedLine[] = [
    { code: A.bank, debit: o.bank, description: "Opening bank balance" },
    { code: A.cash, debit: o.cash, description: "Opening cash in hand" },
    { code: A.accountsReceivable, debit: o.receivables, description: "Opening trade debtors" },
  ];

  if (o.inventory > 0) lines.push({ code: A.inventory, debit: o.inventory, description: "Opening stock" });

  lines.push(
    { code: "1540", debit: o.officeEquipment, description: "Opening office equipment at cost" },
    { code: "1560", debit: o.computerEquipment, description: "Opening computer equipment at cost" },
    { code: A.accountsPayable, credit: o.payables, description: "Opening trade creditors" },
    { code: A.accruedExpenses, credit: o.accruals, description: "Opening accruals" },
  );

  if (o.termLoan > 0) lines.push({ code: "2510", credit: o.termLoan, description: "Opening term loan" });

  lines.push({ code: A.shareCapital, credit: o.shareCapital, description: "Issued share capital" });

  if (retainedEarnings >= 0) {
    lines.push({ code: A.retainedEarnings, credit: retainedEarnings, description: "Accumulated retained earnings brought forward" });
  } else {
    lines.push({ code: A.retainedEarnings, debit: -retainedEarnings, description: "Accumulated losses brought forward" });
  }

  return {
    day: 1,
    description: "Opening balances brought forward",
    source: "OPENING_BALANCE",
    lines,
  };
}

/**
 * One month of trading for a demo company: sales invoices, the matching cost of
 * sales, customer receipts, supplier bills and payments, payroll, overheads,
 * depreciation and loan servicing.
 */
export interface MonthResult {
  journals: SeedJournal[];
  /** Invoiced but uncollected at month end; collected early next month. */
  carriedReceivables: number;
}

export function buildMonthJournals(
  profile: DemoProfile,
  monthIndex: number,
  daysInMonth: number,
  /** Arrears brought forward from the previous month. */
  carryIn = 0,
): MonthResult {
  const random = createRandom(profile.seed + monthIndex * 977);
  const journals: SeedJournal[] = [];
  let uncollected = 0;

  // Last month's arrears are settled early this month, which is what keeps
  // days-sales-outstanding at a realistic level instead of compounding.
  if (carryIn > 0.005) {
    journals.push({
      day: 4,
      description: "Customer receipts — prior month invoices",
      source: "PAYMENT",
      lines: [
        { code: A.bank, debit: round2(carryIn), description: "Funds received" },
        { code: A.accountsReceivable, credit: round2(carryIn), description: "Debtors settled" },
      ],
    });
  }

  const { min, max, goodsShare } = profile.monthlySales;
  // A gentle upward trend plus month-to-month noise keeps the charts readable
  // without making the figures look synthetic.
  const trend = 1 + monthIndex * 0.018;
  const monthlyNet = round2((min + random() * (max - min)) * trend);

  const invoiceCount = profile.invoicesPerMonth;
  let remaining = monthlyNet;

  for (let i = 0; i < invoiceCount; i += 1) {
    const isLast = i === invoiceCount - 1;
    const share = isLast ? remaining : round2((monthlyNet / invoiceCount) * (0.75 + random() * 0.5));
    const net = round2(Math.max(isLast ? remaining : 500, Math.min(share, remaining)));
    remaining = round2(remaining - net);
    if (net <= 0) continue;

    const goodsNet = round2(net * goodsShare);
    const servicesNet = round2(net - goodsNet);
    // SST applies to goods only in this demo; services here are exempt.
    const tax = round2(goodsNet * SST_RATE);
    const total = round2(net + tax);
    const day = Math.min(daysInMonth, 2 + Math.floor(random() * (daysInMonth - 4)));

    const lines: SeedLine[] = [
      { code: A.accountsReceivable, debit: total, description: "Trade debtor" },
    ];
    if (goodsNet > 0) lines.push({ code: A.salesGoods, credit: goodsNet, description: "Sale of goods" });
    if (servicesNet > 0) lines.push({ code: A.salesServices, credit: servicesNet, description: "Services rendered" });
    if (tax > 0) lines.push({ code: A.outputTax, credit: tax, description: "SST output tax at 6%" });

    journals.push({
      day,
      description: `Sales invoice — customer ${String.fromCharCode(65 + i)}`,
      source: "INVOICE",
      lines,
    });

    // Perpetual inventory: recognise cost of sales alongside the revenue.
    if (goodsNet > 0) {
      const cost = round2(goodsNet * (1 - profile.grossMargin));
      journals.push({
        day,
        description: `Cost of goods sold — customer ${String.fromCharCode(65 + i)}`,
        source: "INVENTORY" as SeedJournal["source"],
        lines: [
          { code: A.costOfGoodsSold, debit: cost, description: "Cost of goods shipped" },
          { code: A.inventory, credit: cost, description: "Stock relieved" },
        ],
      });
    }

    // Most invoices settle inside the month; the remainder ages into
    // receivables and is collected at the start of the next month.
    if (random() > 0.3) {
      const receiptDay = Math.min(daysInMonth, day + 5 + Math.floor(random() * 12));
      journals.push({
        day: receiptDay,
        description: `Customer receipt — customer ${String.fromCharCode(65 + i)}`,
        source: "PAYMENT",
        lines: [
          { code: A.bank, debit: total, description: "Funds received" },
          { code: A.accountsReceivable, credit: total, description: "Debtor settled" },
        ],
      });
    } else {
      uncollected = round2(uncollected + total);
    }
  }

  // ── Stock replenishment (trading and retail only) ─────────
  if (goodsShare > 0) {
    const purchaseNet = round2(monthlyNet * goodsShare * (1 - profile.grossMargin) * (0.9 + random() * 0.3));
    const purchaseTax = round2(purchaseNet * SST_RATE);
    journals.push({
      day: 8,
      description: "Supplier bill — stock replenishment",
      source: "BILL",
      lines: [
        { code: A.inventory, debit: purchaseNet, description: "Stock received" },
        { code: A.inputTax, debit: purchaseTax, description: "SST input tax at 6%" },
        { code: A.accountsPayable, credit: round2(purchaseNet + purchaseTax), description: "Trade creditor" },
      ],
    });
    journals.push({
      day: 24,
      description: "Supplier payment — stock replenishment",
      source: "PAYMENT",
      lines: [
        { code: A.accountsPayable, debit: round2(purchaseNet + purchaseTax), description: "Creditor settled" },
        { code: A.bank, credit: round2(purchaseNet + purchaseTax), description: "Payment made" },
      ],
    });
  }

  // ── Payroll (docs/spec/04 §14) ────────────────────────────
  const p = profile.payroll;
  const epfEmployee = round2(p.gross * p.epfEmployeePct);
  const epfEmployer = round2(p.gross * p.epfEmployerPct);
  const socsoEmployee = round2(p.socso * 0.4);
  const socsoEmployer = round2(p.socso - socsoEmployee);
  const eisEmployee = round2(p.eis / 2);
  const eisEmployer = round2(p.eis - eisEmployee);
  const netPay = round2(p.gross - epfEmployee - socsoEmployee - eisEmployee - p.pcb);

  journals.push({
    day: Math.min(daysInMonth, 25),
    description: "Payroll run",
    source: "PAYROLL",
    lines: [
      { code: A.salariesExpense, debit: p.gross, description: "Gross salaries" },
      { code: A.epfEmployer, debit: epfEmployer, description: "EPF employer contribution" },
      { code: A.socsoEmployer, debit: socsoEmployer, description: "SOCSO employer contribution" },
      { code: A.eisEmployer, debit: eisEmployer, description: "EIS employer contribution" },
      { code: A.epfPayable, credit: round2(epfEmployee + epfEmployer), description: "EPF payable" },
      { code: A.socsoPayable, credit: p.socso, description: "SOCSO payable" },
      { code: A.eisPayable, credit: p.eis, description: "EIS payable" },
      { code: A.pcbPayable, credit: p.pcb, description: "PCB/MTD withheld" },
      { code: A.bank, credit: netPay, description: "Net pay to employees" },
    ],
  });

  // Statutory remittance of the prior month's deductions.
  journals.push({
    day: Math.min(daysInMonth, 15),
    description: "Statutory remittance — EPF, SOCSO, EIS, PCB",
    source: "PAYMENT",
    lines: [
      { code: A.epfPayable, debit: round2(epfEmployee + epfEmployer), description: "EPF remitted" },
      { code: A.socsoPayable, debit: p.socso, description: "SOCSO remitted" },
      { code: A.eisPayable, debit: p.eis, description: "EIS remitted" },
      { code: A.pcbPayable, debit: p.pcb, description: "PCB remitted" },
      {
        code: A.bank,
        credit: round2(epfEmployee + epfEmployer + p.socso + p.eis + p.pcb),
        description: "Paid to statutory bodies",
      },
    ],
  });

  // ── Overheads ─────────────────────────────────────────────
  journals.push({
    day: 3,
    description: "Monthly premises rental",
    source: "BILL",
    lines: [
      { code: A.rental, debit: profile.rent, description: "Rental of premises" },
      { code: A.bank, credit: profile.rent, description: "Paid by bank transfer" },
    ],
  });

  const utilities = round2(
    profile.utilities.min + random() * (profile.utilities.max - profile.utilities.min),
  );
  journals.push({
    day: 12,
    description: "Utilities — electricity and water",
    source: "BILL",
    lines: [
      { code: A.utilities, debit: utilities, description: "TNB and Air Selangor" },
      { code: A.bank, credit: utilities, description: "Paid by direct debit" },
    ],
  });

  const bankCharges = round2(45 + random() * 85);
  journals.push({
    day: Math.min(daysInMonth, 28),
    description: "Bank charges",
    source: "BANK",
    lines: [
      { code: A.bankCharges, debit: bankCharges, description: "Monthly service charges" },
      { code: A.bank, credit: bankCharges, description: "Debited by the bank" },
    ],
  });

  // ── Depreciation (docs/spec/04 §10) ───────────────────────
  journals.push({
    day: daysInMonth,
    description: "Monthly depreciation charge",
    source: "ASSET",
    lines: [
      { code: A.depreciationOfficeEquipment, debit: profile.depreciation.office, description: "Office equipment" },
      { code: A.depreciationComputerEquipment, debit: profile.depreciation.computer, description: "Computer equipment" },
      { code: "1545", credit: profile.depreciation.office, description: "Accumulated depreciation" },
      { code: "1565", credit: profile.depreciation.computer, description: "Accumulated depreciation" },
    ],
  });

  // ── Loan servicing (docs/spec/04 §13) ─────────────────────
  if (profile.opening.termLoan > 0) {
    const interest = round2((profile.opening.termLoan * 0.062) / 12);
    const principal = round2(profile.opening.termLoan / 60);
    journals.push({
      day: Math.min(daysInMonth, 20),
      description: "Term loan instalment",
      source: "BANK",
      lines: [
        { code: "2510", debit: principal, description: "Principal repayment" },
        { code: A.interestExpense, debit: interest, description: "Interest charged" },
        { code: A.bank, credit: round2(principal + interest), description: "Instalment paid" },
      ],
    });
  }

  return {
    journals: journals.sort((a, b) => a.day - b.day),
    carriedReceivables: uncollected,
  };
}
