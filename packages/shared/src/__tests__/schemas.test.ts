import { describe, expect, it } from "vitest";
import { createAccountSchema } from "../schemas/account";
import { changePasswordSchema, loginSchema, passwordSchema } from "../schemas/auth";
import { isoDateSchema, moneySchema, paginationSchema } from "../schemas/common";
import { createJournalSchema, reverseJournalSchema } from "../schemas/journal";
import { createPeriodSchema, reopenPeriodSchema } from "../schemas/period";
import { reportRangeSchema } from "../schemas/report";

const uuid = (n: number) => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
const A = uuid(1);
const B = uuid(2);

describe("common schemas", () => {
  it("normalises money to two decimals", () => {
    expect(moneySchema.parse("5")).toBe("5.00");
    expect(moneySchema.parse(12.5)).toBe("12.50");
    expect(moneySchema.safeParse("abc").success).toBe(false);
  });

  it("rejects dates that do not exist", () => {
    expect(isoDateSchema.safeParse("2026-01-15").success).toBe(true);
    expect(isoDateSchema.safeParse("2026-02-30").success).toBe(false);
    expect(isoDateSchema.safeParse("15/01/2026").success).toBe(false);
  });

  it("caps the page size so a client cannot ask for the whole ledger", () => {
    expect(paginationSchema.parse({}).pageSize).toBe(50);
    expect(paginationSchema.safeParse({ pageSize: 5000 }).success).toBe(false);
  });
});

describe("password policy", () => {
  it("requires length and a mix of character classes", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase123!").success).toBe(false);
    expect(passwordSchema.safeParse("NoDigitsHere!!!").success).toBe(false);
    expect(passwordSchema.safeParse("NoSymbols12345").success).toBe(false);
    expect(passwordSchema.safeParse("Zycount!Demo2026").success).toBe(true);
  });

  it("requires the confirmation to match and the password to change", () => {
    const base = { currentPassword: "OldPass!2026abc", newPassword: "NewPass!2026abc" };
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: "different" }).success).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "Same!Pass2026ab",
        newPassword: "Same!Pass2026ab",
        confirmPassword: "Same!Pass2026ab",
      }).success,
    ).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, confirmPassword: base.newPassword }).success).toBe(true);
  });

  it("lower-cases and trims the email on the way in", () => {
    expect(loginSchema.parse({ email: "  USER@Example.COM ", password: "x" }).email).toBe("user@example.com");
  });
});

describe("journal schema", () => {
  const valid = {
    date: "2026-03-15",
    description: "Sales invoice",
    lines: [
      { accountId: A, debit: "1060.00", credit: "0" },
      { accountId: B, debit: "0", credit: "1060.00" },
    ],
  };

  it("accepts a balanced entry", () => {
    expect(createJournalSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an unbalanced entry and carries the domain code", () => {
    const result = createJournalSchema.safeParse({
      ...valid,
      lines: [
        { accountId: A, debit: "100.00", credit: "0" },
        { accountId: B, debit: "0", credit: "90.00" },
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const issue = result.error.issues.find(
      (candidate) => (candidate as { params?: { zycountCode?: string } }).params?.zycountCode,
    );
    expect((issue as { params: { zycountCode: string } }).params.zycountCode).toBe("JOURNAL_UNBALANCED");
  });

  it("rejects a single-line entry", () => {
    expect(
      createJournalSchema.safeParse({ ...valid, lines: [valid.lines[0]] }).success,
    ).toBe(false);
  });

  it("requires a reason before reversing anything", () => {
    expect(reverseJournalSchema.safeParse({ reason: "oops" }).success).toBe(false);
    expect(reverseJournalSchema.safeParse({ reason: "Raised against the wrong customer" }).success).toBe(true);
  });
});

describe("account schema", () => {
  it("keeps a statement group with its own account type", () => {
    expect(
      createAccountSchema.safeParse({ code: "1310", name: "Trade Debtors", type: "ASSET", subType: "CURRENT_ASSET" })
        .success,
    ).toBe(true);
    expect(
      createAccountSchema.safeParse({ code: "4110", name: "Sales", type: "REVENUE", subType: "CURRENT_ASSET" })
        .success,
    ).toBe(false);
  });

  it("rejects codes with characters that break sorting and exports", () => {
    expect(createAccountSchema.safeParse({ code: "13 10", name: "Bad", type: "ASSET" }).success).toBe(false);
    expect(createAccountSchema.safeParse({ code: "1310-A", name: "Fine", type: "ASSET" }).success).toBe(true);
  });
});

describe("period schema", () => {
  it("rejects a period that ends before it starts", () => {
    expect(
      createPeriodSchema.safeParse({
        name: "March 2026",
        year: 2026,
        periodNo: 3,
        startDate: "2026-03-31",
        endDate: "2026-03-01",
      }).success,
    ).toBe(false);
  });

  it("demands a substantive reason to reopen a closed period", () => {
    expect(reopenPeriodSchema.safeParse({ reason: "because" }).success).toBe(false);
    expect(
      reopenPeriodSchema.safeParse({ reason: "Auditor found an unrecorded accrual for January" }).success,
    ).toBe(true);
  });
});

describe("report range", () => {
  it("requires a period or an end date", () => {
    expect(reportRangeSchema.safeParse({}).success).toBe(false);
    expect(reportRangeSchema.safeParse({ dateTo: "2026-03-31" }).success).toBe(true);
    expect(reportRangeSchema.safeParse({ fiscalPeriodId: A }).success).toBe(true);
  });

  it("rejects a backwards range", () => {
    expect(
      reportRangeSchema.safeParse({ dateFrom: "2026-03-31", dateTo: "2026-03-01" }).success,
    ).toBe(false);
  });
});
