import { describe, expect, it } from "vitest";
import { ERROR_CODES, ZycountError } from "../errors";
import {
  assertJournalValid,
  buildReversalLines,
  checkAccountingEquation,
  checkBalance,
  checkTrialBalance,
  isBalanced,
  reversalNetsToZero,
  signedBalanceForType,
  validateJournalStructure,
  type JournalLineLike,
} from "../invariants";

const AR = "11111111-1111-1111-1111-111111111111";
const SALES = "22222222-2222-2222-2222-222222222222";
const TAX = "33333333-3333-3333-3333-333333333333";

/** The worked example from docs/spec/05 — a sales invoice with SST. */
const invoiceLines: JournalLineLike[] = [
  { accountId: AR, debit: "1060.00", credit: "0" },
  { accountId: SALES, debit: "0", credit: "1000.00" },
  { accountId: TAX, debit: "0", credit: "60.00" },
];

describe("invariant 1 — every journal balances", () => {
  it("accepts a balanced entry", () => {
    expect(isBalanced(invoiceLines)).toBe(true);
    const result = checkBalance(invoiceLines);
    expect(result.totalDebit).toBe("1060.00");
    expect(result.totalCredit).toBe("1060.00");
    expect(result.difference).toBe("0.00");
  });

  it("rejects an entry that is out by a single cent", () => {
    const lines = [
      { accountId: AR, debit: "1060.01", credit: "0" },
      { accountId: SALES, debit: "0", credit: "1060.00" },
    ];
    expect(isBalanced(lines)).toBe(false);
    expect(checkBalance(lines).difference).toBe("0.01");
  });

  it("rejects an entry whose totals are zero", () => {
    const lines = [
      { accountId: AR, debit: "0", credit: "0" },
      { accountId: SALES, debit: "0", credit: "0" },
    ];
    expect(isBalanced(lines)).toBe(false);
    expect(validateJournalStructure(lines).some((i) => i.code === ERROR_CODES.JOURNAL_ZERO_TOTAL)).toBe(true);
  });
});

describe("journal structure validation", () => {
  it("requires at least two lines", () => {
    const issues = validateJournalStructure([{ accountId: AR, debit: "100.00", credit: "0" }]);
    expect(issues.some((i) => i.code === ERROR_CODES.JOURNAL_TOO_FEW_LINES)).toBe(true);
  });

  it("rejects a line carrying both a debit and a credit", () => {
    const issues = validateJournalStructure([
      { accountId: AR, debit: "100.00", credit: "100.00" },
      { accountId: SALES, debit: "0", credit: "100.00" },
    ]);
    expect(issues.some((i) => i.code === ERROR_CODES.JOURNAL_LINE_TWO_SIDED)).toBe(true);
  });

  it("rejects negative amounts, which belong on the other side", () => {
    const issues = validateJournalStructure([
      { accountId: AR, debit: "-100.00", credit: "0" },
      { accountId: SALES, debit: "0", credit: "-100.00" },
    ]);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("requires an account on every line", () => {
    const issues = validateJournalStructure([
      { accountId: "", debit: "100.00", credit: "0" },
      { accountId: SALES, debit: "0", credit: "100.00" },
    ]);
    expect(issues.some((i) => i.path === "lines.0.accountId")).toBe(true);
  });

  it("throws a ZycountError carrying the unbalanced code and both totals", () => {
    const lines = [
      { accountId: AR, debit: "1060.00", credit: "0" },
      { accountId: SALES, debit: "0", credit: "1000.00" },
    ];

    expect(() => assertJournalValid(lines, false)).toThrow(ZycountError);

    try {
      assertJournalValid(lines, true);
    } catch (error) {
      const zycount = error as ZycountError;
      expect(zycount.code).toBe(ERROR_CODES.JOURNAL_UNBALANCED);
      expect(zycount.message).toContain("1,060.00");
      expect(zycount.message).toContain("1,000.00");
      // On a posting action the user must always be told whether it landed.
      expect(zycount.posted).toBe(true);
      expect(zycount.reference).toMatch(/^ERR-\d{8}-\d{5}$/);
    }
  });

  it("passes a valid entry silently", () => {
    expect(() => assertJournalValid(invoiceLines)).not.toThrow();
  });
});

describe("invariant 2 — accounting equation", () => {
  it("holds when assets equal liabilities plus equity", () => {
    const result = checkAccountingEquation({
      assets: "565560.50",
      liabilities: "225666.03",
      equity: "339894.47",
    });
    expect(result.holds).toBe(true);
    expect(result.difference).toBe("0.00");
  });

  it("reports the exact shortfall when it does not", () => {
    const result = checkAccountingEquation({
      assets: "1000.00",
      liabilities: "600.00",
      equity: "399.50",
    });
    expect(result.holds).toBe(false);
    expect(result.difference).toBe("0.50");
  });
});

describe("invariant 3 — trial balance", () => {
  it("balances when debits equal credits", () => {
    expect(checkTrialBalance([{ debit: "500.00", credit: "200.00" }, { debit: "0", credit: "300.00" }]).balanced).toBe(true);
  });

  it("treats an empty ledger as balanced", () => {
    expect(checkTrialBalance([]).balanced).toBe(true);
  });
});

describe("invariant 12 — reversal", () => {
  it("swaps every side", () => {
    const reversal = buildReversalLines(invoiceLines);
    expect(reversal[0]).toMatchObject({ accountId: AR, debit: "0.00", credit: "1060.00" });
    expect(reversal[1]).toMatchObject({ accountId: SALES, debit: "1000.00", credit: "0.00" });
  });

  it("produces a reversal that itself balances", () => {
    expect(isBalanced(buildReversalLines(invoiceLines))).toBe(true);
  });

  it("nets to zero against the original, account by account", () => {
    expect(reversalNetsToZero(invoiceLines, buildReversalLines(invoiceLines))).toBe(true);
  });

  it("detects a reversal that does not cancel the original", () => {
    const wrong = buildReversalLines(invoiceLines).map((line, index) =>
      index === 0 ? { ...line, credit: "1000.00" } : line,
    );
    expect(reversalNetsToZero(invoiceLines, wrong)).toBe(false);
  });
});

describe("normal balances", () => {
  it("shows debit-natured accounts positive when debited", () => {
    expect(signedBalanceForType("1000.00", "250.00", "ASSET")).toBe("750.00");
    expect(signedBalanceForType("500.00", "0", "EXPENSE")).toBe("500.00");
  });

  it("shows credit-natured accounts positive when credited", () => {
    expect(signedBalanceForType("0", "1000.00", "REVENUE")).toBe("1000.00");
    expect(signedBalanceForType("100.00", "1000.00", "LIABILITY")).toBe("900.00");
    expect(signedBalanceForType("0", "50000.00", "EQUITY")).toBe("50000.00");
  });
});
