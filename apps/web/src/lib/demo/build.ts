import { addMoney, money, multiplyMoney, subtractMoney, sumMoney } from "@zycount/shared";
import type { DocumentLine, Money, PostingLine, PostingPreview } from "./types";

/**
 * Helpers that derive the fixture's figures instead of hard-coding them.
 *
 * A demo whose totals do not foot would undermine the one thing this product
 * claims, so every total, tax line and posting in the preview data is computed
 * from its lines with the same money maths the engine uses.
 */

export interface LineSpec {
  itemCode?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: Money;
  /** Percent off the line before tax. */
  discountPercent?: number;
  /** Malaysian SST rates: 6% service, 10% sales, 0% exempt. */
  taxCode?: "SST-6" | "SST-10" | "EXEMPT" | "ZERO";
  accountCode: string;
}

const TAX_RATES: Record<string, number> = {
  "SST-6": 0.06,
  "SST-10": 0.1,
  EXEMPT: 0,
  ZERO: 0,
};

export function buildLines(specs: LineSpec[]): DocumentLine[] {
  return specs.map((spec, index) => {
    const taxCode = spec.taxCode ?? "SST-6";
    const gross = multiplyMoney(spec.unitPrice, spec.quantity);
    const discount = spec.discountPercent
      ? multiplyMoney(gross, spec.discountPercent / 100)
      : "0.00";
    const net = subtractMoney(gross, discount);
    const taxAmount = multiplyMoney(net, TAX_RATES[taxCode] ?? 0);

    return {
      id: `line-${index + 1}`,
      itemCode: spec.itemCode,
      description: spec.description,
      quantity: spec.quantity,
      unit: spec.unit ?? "unit",
      unitPrice: money(spec.unitPrice),
      discountPercent: spec.discountPercent,
      taxCode,
      taxAmount,
      accountCode: spec.accountCode,
      total: net,
    };
  });
}

export interface DocumentTotals {
  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;
}

export function totalsOf(lines: DocumentLine[]): DocumentTotals {
  const subtotal = sumMoney(lines.map((line) => line.total));
  const discount = sumMoney(
    lines.map((line) =>
      line.discountPercent
        ? multiplyMoney(
            multiplyMoney(line.unitPrice, line.quantity),
            line.discountPercent / 100,
          )
        : "0.00",
    ),
  );
  const tax = sumMoney(lines.map((line) => line.taxAmount));

  return { subtotal, discount, tax, total: addMoney(subtotal, tax) };
}

/**
 * The entry a sales invoice produces: debit the customer, credit the revenue
 * accounts line by line, credit the tax collected.
 */
export function invoicePosting(
  date: string,
  lines: DocumentLine[],
  accountNames: Record<string, string>,
  journalReference?: string,
): PostingPreview {
  const { tax, total } = totalsOf(lines);

  const revenue = groupByAccount(lines).map<PostingLine>(([code, amount]) => ({
    accountCode: code,
    accountName: accountNames[code] ?? code,
    debit: "0.00",
    credit: amount,
  }));

  const postingLines: PostingLine[] = [
    {
      accountCode: "1200",
      accountName: "Trade Receivables",
      debit: total,
      credit: "0.00",
    },
    ...revenue,
  ];

  if (Number(tax) !== 0) {
    postingLines.push({
      accountCode: "2310",
      accountName: "SST Payable",
      debit: "0.00",
      credit: tax,
    });
  }

  return { source: "SALES_INVOICE", date, lines: postingLines, journalReference };
}

/** The mirror of the above: debit the expense/asset accounts, credit the supplier. */
export function billPosting(
  date: string,
  lines: DocumentLine[],
  accountNames: Record<string, string>,
  journalReference?: string,
): PostingPreview {
  const { tax, total } = totalsOf(lines);

  const charges = groupByAccount(lines).map<PostingLine>(([code, amount]) => ({
    accountCode: code,
    accountName: accountNames[code] ?? code,
    debit: amount,
    credit: "0.00",
  }));

  const postingLines: PostingLine[] = [...charges];

  if (Number(tax) !== 0) {
    postingLines.push({
      accountCode: "1450",
      accountName: "SST Recoverable",
      debit: tax,
      credit: "0.00",
    });
  }

  postingLines.push({
    accountCode: "2100",
    accountName: "Trade Payables",
    debit: "0.00",
    credit: total,
  });

  return { source: "SUPPLIER_BILL", date, lines: postingLines, journalReference };
}

function groupByAccount(lines: DocumentLine[]): Array<[string, Money]> {
  const totals = new Map<string, Money>();
  for (const line of lines) {
    totals.set(line.accountCode, addMoney(totals.get(line.accountCode) ?? "0.00", line.total));
  }
  return [...totals.entries()];
}

/** `Σ debit − Σ credit`, so a preview can prove itself balanced on screen. */
export function postingDifference(posting: PostingPreview): Money {
  return subtractMoney(
    sumMoney(posting.lines.map((line) => line.debit)),
    sumMoney(posting.lines.map((line) => line.credit)),
  );
}
