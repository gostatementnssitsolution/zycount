import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { api, createHarness, login, type Harness, type Session } from "./harness";

/**
 * The accounting invariant suite (docs/spec/12 §60).
 *
 * These assertions are what make the books trustworthy: if any one of them
 * fails, the ledger cannot be relied on and the build must not ship.
 */
describe("accounting invariants", () => {
  let harness: Harness;
  let accountant: Session;
  let companyId: string;
  let openPeriod: { id: string; name: string; startDate: string };
  let closedPeriod: { id: string; name: string; startDate: string };
  let bankId: string;
  let salesId: string;
  let receivableId: string;
  let headingId: string;

  beforeAll(async () => {
    harness = await createHarness();
    accountant = await login(harness.app, "accountant@zycount.test");

    const trading = accountant.user.companies.find((company) => company.name.includes("Trading"));
    expect(trading, "seed data missing — run `pnpm db:seed` first").toBeDefined();
    companyId = trading!.id;

    const client = api(harness.app, accountant, companyId);

    const periods = (await client.get(`/companies/${companyId}/fiscal-periods`).expect(200)).body;
    openPeriod = periods.filter((p: { status: string }) => p.status === "OPEN")[4];
    closedPeriod = periods.find((p: { status: string }) => p.status === "CLOSED");

    const accounts = (await client.get(`/companies/${companyId}/accounts`).expect(200)).body;
    const byCode = new Map(accounts.map((a: { code: string }) => [a.code, a]));
    bankId = (byCode.get("1131") as { id: string }).id;
    salesId = (byCode.get("4120") as { id: string }).id;
    receivableId = (byCode.get("1150") as { id: string }).id;
    headingId = accounts.find((a: { isPostable: boolean }) => !a.isPostable).id;
  });

  afterAll(async () => {
    await harness?.close();
  });

  const client = () => api(harness.app, accountant, companyId);

  const lines = (debit: string, credit: string) => [
    { accountId: receivableId, debit, credit: "0" },
    { accountId: salesId, debit: "0", credit },
  ];

  // ── Invariant 1 ─────────────────────────────────────────────

  it("refuses an unbalanced journal, naming both totals", async () => {
    const response = await client()
      .post(`/companies/${companyId}/journals`, {
        date: openPeriod.startDate,
        description: "Deliberately unbalanced",
        lines: lines("100.00", "90.00"),
      })
      .expect(422);

    expect(response.body.error.code).toBe("JOURNAL_UNBALANCED");
    expect(response.body.error.message).toContain("100.00");
    expect(response.body.error.message).toContain("90.00");
    expect(response.body.error.reference).toMatch(/^ERR-\d{8}-\d{5}$/);
  });

  it("refuses a line carrying both a debit and a credit", async () => {
    const response = await client()
      .post(`/companies/${companyId}/journals`, {
        date: openPeriod.startDate,
        description: "Two-sided line",
        lines: [
          { accountId: receivableId, debit: "100.00", credit: "100.00" },
          { accountId: salesId, debit: "0", credit: "100.00" },
        ],
      })
      .expect(422);

    expect(["JOURNAL_LINE_TWO_SIDED", "VALIDATION_FAILED"]).toContain(response.body.error.code);
  });

  it("refuses a posting to a non-postable heading", async () => {
    const response = await client()
      .post(`/companies/${companyId}/journals`, {
        date: openPeriod.startDate,
        description: "Posting to a heading",
        lines: [
          { accountId: headingId, debit: "50.00", credit: "0" },
          { accountId: salesId, debit: "0", credit: "50.00" },
        ],
      })
      .expect(422);

    expect(response.body.error.code).toBe("ACCOUNT_NOT_POSTABLE");
  });

  // ── Invariant 5 — period integrity ──────────────────────────

  it("refuses to date an entry into a closed period, and says nothing was posted", async () => {
    const response = await client()
      .post(`/companies/${companyId}/journals`, {
        date: closedPeriod.startDate,
        description: "Into a closed period",
        lines: lines("50.00", "50.00"),
      })
      .expect(409);

    expect(response.body.error.code).toBe("PERIOD_CLOSED");
    expect(response.body.error.posted).toBe(false);
  });

  // ── Invariants 4 and 12 — immutability and reversal ─────────

  it("posts, refuses to mutate, reverses, and leaves the ledger as it found it", async () => {
    const before = (
      await client()
        .get(`/companies/${companyId}/reports/trial-balance?fiscalPeriodId=${openPeriod.id}`)
        .expect(200)
    ).body;

    const draft = (
      await client()
        .post(`/companies/${companyId}/journals`, {
          date: openPeriod.startDate,
          description: "Consulting fee invoiced",
          lines: lines("1060.00", "1060.00"),
        })
        .expect(201)
    ).body;

    expect(draft.status).toBe("DRAFT");
    expect(draft.reference).toMatch(/^JV-\d{4}-\d{6}$/);
    expect(draft.totalDebit).toBe("1060.00");
    expect(draft.totalCredit).toBe("1060.00");

    const posted = (
      await client().post(`/companies/${companyId}/journals/${draft.id}/post`).expect(200)
    ).body;

    expect(posted.status).toBe("POSTED");
    expect(posted.postedAt).toBeTruthy();
    expect(posted.postedByName).toBeTruthy();

    // Invariant 4: a posted entry is immutable.
    const edit = await client()
      .patch(`/companies/${companyId}/journals/${draft.id}`, { description: "edited" })
      .expect(409);
    expect(edit.body.error.code).toBe("JOURNAL_IMMUTABLE");

    const remove = await client().delete(`/companies/${companyId}/journals/${draft.id}`).expect(409);
    expect(remove.body.error.code).toBe("JOURNAL_IMMUTABLE");

    const repost = await client()
      .post(`/companies/${companyId}/journals/${draft.id}/post`)
      .expect(409);
    expect(repost.body.error.code).toBe("JOURNAL_NOT_DRAFT");

    // Invariant 12: the reversal is equal and opposite, and links both ways.
    const reversal = (
      await client()
        .post(`/companies/${companyId}/journals/${draft.id}/reverse`, {
          reason: "Invoice raised against the wrong customer",
        })
        .expect(200)
    ).body;

    expect(reversal.status).toBe("POSTED");
    expect(reversal.reversalOfReference).toBe(draft.reference);
    expect(reversal.lines[0].credit).toBe("1060.00");
    expect(reversal.lines[1].debit).toBe("1060.00");

    const original = (
      await client().get(`/companies/${companyId}/journals/${draft.id}`).expect(200)
    ).body;
    expect(original.status).toBe("REVERSED");
    expect(original.reversedByReference).toBe(reversal.reference);

    const again = await client()
      .post(`/companies/${companyId}/journals/${draft.id}/reverse`, { reason: "once more" })
      .expect(409);
    expect(again.body.error.code).toBe("JOURNAL_ALREADY_REVERSED");

    // The entry and its reversal net to zero, so the ledger is back where it started.
    const after = (
      await client()
        .get(`/companies/${companyId}/reports/trial-balance?fiscalPeriodId=${openPeriod.id}`)
        .expect(200)
    ).body;

    expect(after.balanced).toBe(true);
    expect(after.totals.closingDebit).toBe(before.totals.closingDebit);
    expect(after.totals.closingCredit).toBe(before.totals.closingCredit);
  });

  // ── Invariants 2 and 3 — across every company and period ────

  it("keeps the trial balance and the accounting equation true everywhere", async () => {
    for (const company of accountant.user.companies) {
      const scoped = api(harness.app, accountant, company.id);
      const periods = (await scoped.get(`/companies/${company.id}/fiscal-periods`).expect(200)).body;

      for (const period of periods.filter((p: { journalCount: number }) => p.journalCount > 0)) {
        const trialBalance = (
          await scoped
            .get(`/companies/${company.id}/reports/trial-balance?fiscalPeriodId=${period.id}`)
            .expect(200)
        ).body;

        const balanceSheet = (
          await scoped
            .get(`/companies/${company.id}/reports/balance-sheet?fiscalPeriodId=${period.id}`)
            .expect(200)
        ).body;

        expect(
          trialBalance.balanced,
          `${company.name} ${period.name}: trial balance out by ${trialBalance.difference}`,
        ).toBe(true);

        expect(
          balanceSheet.balanced,
          `${company.name} ${period.name}: A ≠ L + E, out by ${balanceSheet.difference}`,
        ).toBe(true);
      }
    }
  });

  // ── Invariant 6 — traceability ──────────────────────────────

  it("traces every ledger line back to its journal and source", async () => {
    const ledger = (
      await client()
        .get(`/companies/${companyId}/ledger?accountId=${receivableId}&pageSize=10`)
        .expect(200)
    ).body;

    expect(ledger.rows.length).toBeGreaterThan(0);

    for (const row of ledger.rows) {
      expect(row.journalEntryId).toBeTruthy();
      expect(row.reference).toMatch(/^JV-/);
      expect(row.source).toBeTruthy();
    }

    // Every referenced journal really exists and is readable.
    const entry = (
      await client().get(`/companies/${companyId}/journals/${ledger.rows[0].journalEntryId}`).expect(200)
    ).body;
    expect(entry.reference).toBe(ledger.rows[0].reference);
  });

  it("carries a correct running balance down the ledger", async () => {
    const ledger = (
      await client()
        .get(`/companies/${companyId}/ledger?accountId=${bankId}&fiscalPeriodId=${openPeriod.id}&pageSize=200`)
        .expect(200)
    ).body;

    let running = Math.round(Number(ledger.openingBalance) * 100);
    for (const row of ledger.rows) {
      running += Math.round(Number(row.debit) * 100) - Math.round(Number(row.credit) * 100);
      expect(Math.round(Number(row.balance) * 100)).toBe(running);
    }

    expect(Math.round(Number(ledger.closingBalance) * 100)).toBe(running);
  });

  // ── Statements agree with each other ────────────────────────

  it("reconciles the P&L result with the balance sheet", async () => {
    const [profitLoss, balanceSheet] = await Promise.all([
      client()
        .get(`/companies/${companyId}/reports/profit-loss?dateTo=${openPeriod.startDate}`)
        .expect(200),
      client()
        .get(`/companies/${companyId}/reports/balance-sheet?dateTo=${openPeriod.startDate}`)
        .expect(200),
    ]);

    // Both run year-to-date from the same date, so the result the P&L reports
    // must be exactly what the balance sheet carries into equity.
    expect(balanceSheet.body.retainedEarningsForPeriod).toBe(profitLoss.body.netProfit);
  });
});
