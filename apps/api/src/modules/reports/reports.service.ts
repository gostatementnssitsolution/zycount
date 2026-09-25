import { Injectable } from "@nestjs/common";
import {
  ERROR_CODES,
  NORMAL_BALANCE,
  ZycountError,
  addMoney,
  checkAccountingEquation,
  checkTrialBalance,
  fromCents,
  subtractMoney,
  toCents,
  type AccountType,
  type BalanceSheetReport,
  type LedgerQuery,
  type LedgerReport,
  type LedgerRow,
  type ProfitLossReport,
  type ReportPeriodMeta,
  type ReportRangeQuery,
  type StatementLine,
  type StatementSection,
  type TrialBalanceReport,
  type TrialBalanceRow,
} from "@zycount/shared";
import type { JournalSource, Prisma } from "@zycount/db";
import { PrismaService } from "../../common/prisma/prisma.service";
import { formatIsoDate, parseIsoDate } from "../../common/util/dates";
import { paginate } from "../../common/util/pagination";
import { resolveRange, type ResolvedRange } from "./reports.range";

/** One account's movement, as returned by the aggregation queries. */
interface AccountMovement {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  subType: string | null;
  debit: string;
  credit: string;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Shared plumbing ────────────────────────────────────────

  private async meta(companyId: string, range: ResolvedRange): Promise<ReportPeriodMeta> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true, baseCurrency: true },
    });

    return {
      from: formatIsoDate(range.from),
      to: formatIsoDate(range.to),
      label: range.label,
      currency: company.baseCurrency,
      companyName: company.name,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Sum posted movement per account between two dates.
   *
   * Only `POSTED` and `REVERSED` entries count: a reversed entry stays in the
   * ledger alongside its reversal, and the two net to zero, exactly as the
   * books should read. Drafts are invisible to every report.
   */
  private async movements(
    companyId: string,
    from: Date | null,
    to: Date,
  ): Promise<AccountMovement[]> {
    const [grouped, accounts] = await Promise.all([
      this.prisma.journalLine.groupBy({
        by: ["accountId"],
        where: {
          journalEntry: {
            companyId,
            status: { in: ["POSTED", "REVERSED"] },
            date: { ...(from ? { gte: from } : {}), lte: to },
          },
        },
        _sum: { debit: true, credit: true },
      }),
      this.prisma.account.findMany({
        where: { companyId },
        select: { id: true, code: true, name: true, type: true, subType: true },
        orderBy: { code: "asc" },
      }),
    ]);

    const sums = new Map(grouped.map((row) => [row.accountId, row._sum]));

    // Every account is returned, movement or not, so `includeZeroBalances` and
    // the balance-sheet sections can decide for themselves what to show.
    return accounts.map((account) => {
      const sum = sums.get(account.id);
      return {
        accountId: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        subType: account.subType,
        debit: sum?.debit?.toString() ?? "0",
        credit: sum?.credit?.toString() ?? "0",
      };
    });
  }

  // ── Trial balance ──────────────────────────────────────────

  async trialBalance(companyId: string, query: ReportRangeQuery): Promise<TrialBalanceReport> {
    const range = await resolveRange(this.prisma, companyId, query);

    const [opening, period] = await Promise.all([
      this.movements(companyId, null, new Date(range.from.getTime() - 86_400_000)),
      this.movements(companyId, range.from, range.to),
    ]);

    const openingByAccount = new Map(opening.map((row) => [row.accountId, row]));

    const rows: TrialBalanceRow[] = [];

    for (const movement of period) {
      const open = openingByAccount.get(movement.accountId);
      const openingNet = toCents(open?.debit ?? "0") - toCents(open?.credit ?? "0");
      const periodNet = toCents(movement.debit) - toCents(movement.credit);
      const closingNet = openingNet + periodNet;

      const row: TrialBalanceRow = {
        accountId: movement.accountId,
        code: movement.code,
        name: movement.name,
        type: movement.type,
        // A trial balance shows each net balance on its natural side, never a
        // negative figure in both columns.
        openingDebit: fromCents(Math.max(openingNet, 0)),
        openingCredit: fromCents(Math.max(-openingNet, 0)),
        periodDebit: movement.debit === "0" ? "0.00" : fromCents(toCents(movement.debit)),
        periodCredit: movement.credit === "0" ? "0.00" : fromCents(toCents(movement.credit)),
        closingDebit: fromCents(Math.max(closingNet, 0)),
        closingCredit: fromCents(Math.max(-closingNet, 0)),
      };

      const hasActivity =
        openingNet !== 0 || periodNet !== 0 || toCents(movement.debit) !== 0 || toCents(movement.credit) !== 0;

      if (hasActivity || query.includeZeroBalances) rows.push(row);
    }

    const totals = rows.reduce(
      (acc, row) => ({
        openingDebit: addMoney(acc.openingDebit, row.openingDebit),
        openingCredit: addMoney(acc.openingCredit, row.openingCredit),
        periodDebit: addMoney(acc.periodDebit, row.periodDebit),
        periodCredit: addMoney(acc.periodCredit, row.periodCredit),
        closingDebit: addMoney(acc.closingDebit, row.closingDebit),
        closingCredit: addMoney(acc.closingCredit, row.closingCredit),
      }),
      {
        openingDebit: "0.00",
        openingCredit: "0.00",
        periodDebit: "0.00",
        periodCredit: "0.00",
        closingDebit: "0.00",
        closingCredit: "0.00",
      },
    );

    // Invariant 3, reported rather than assumed: if the ledger is ever out of
    // balance the report says so instead of quietly rendering wrong numbers.
    const check = checkTrialBalance([
      { debit: totals.closingDebit, credit: totals.closingCredit },
    ]);

    return {
      meta: await this.meta(companyId, range),
      rows,
      totals,
      balanced: check.balanced,
      difference: check.difference,
    };
  }

  // ── Profit & loss ──────────────────────────────────────────

  async profitLoss(companyId: string, query: ReportRangeQuery): Promise<ProfitLossReport> {
    const range = await resolveRange(this.prisma, companyId, query);

    const [current, previous] = await Promise.all([
      this.movements(companyId, range.from, range.to),
      range.previous
        ? this.movements(companyId, range.previous.from, range.previous.to)
        : Promise.resolve([] as AccountMovement[]),
    ]);

    const previousByAccount = new Map(previous.map((row) => [row.accountId, row]));

    const section = (
      key: string,
      title: string,
      filter: (row: AccountMovement) => boolean,
      /** Revenue is credit-natured; expenses are debit-natured. */
      direction: "credit" | "debit",
    ): StatementSection => {
      const lines: StatementLine[] = [];
      let total = "0.00";
      let previousTotal = "0.00";

      for (const row of current.filter(filter)) {
        const net =
          direction === "credit"
            ? toCents(row.credit) - toCents(row.debit)
            : toCents(row.debit) - toCents(row.credit);

        const prior = previousByAccount.get(row.accountId);
        const previousNet = prior
          ? direction === "credit"
            ? toCents(prior.credit) - toCents(prior.debit)
            : toCents(prior.debit) - toCents(prior.credit)
          : 0;

        if (net === 0 && previousNet === 0 && !query.includeZeroBalances) continue;

        lines.push({
          accountId: row.accountId,
          code: row.code,
          name: row.name,
          amount: fromCents(net),
          ...(range.previous ? { previousAmount: fromCents(previousNet) } : {}),
          depth: 0,
        });

        total = addMoney(total, fromCents(net));
        previousTotal = addMoney(previousTotal, fromCents(previousNet));
      }

      return {
        key,
        title,
        lines,
        total,
        ...(range.previous ? { previousTotal } : {}),
      };
    };

    const revenue = section(
      "revenue",
      "Revenue",
      (row) => row.type === "REVENUE" && row.subType !== "OTHER_INCOME",
      "credit",
    );
    const costOfSales = section("costOfSales", "Cost of Sales", (row) => row.type === "COST_OF_SALES", "debit");
    const operatingExpenses = section(
      "operatingExpenses",
      "Operating Expenses",
      (row) => row.type === "EXPENSE" && row.subType !== "OTHER_EXPENSE",
      "debit",
    );
    const otherIncome = section(
      "otherIncome",
      "Other Income",
      (row) => row.type === "REVENUE" && row.subType === "OTHER_INCOME",
      "credit",
    );
    const otherExpenses = section(
      "otherExpenses",
      "Other Expenses",
      (row) => row.type === "EXPENSE" && row.subType === "OTHER_EXPENSE",
      "debit",
    );

    const grossProfit = subtractMoney(revenue.total, costOfSales.total);
    const operatingProfit = subtractMoney(grossProfit, operatingExpenses.total);
    const netProfit = subtractMoney(
      addMoney(operatingProfit, otherIncome.total),
      otherExpenses.total,
    );

    const previousGrossProfit = subtractMoney(
      revenue.previousTotal ?? "0.00",
      costOfSales.previousTotal ?? "0.00",
    );
    const previousOperatingProfit = subtractMoney(
      previousGrossProfit,
      operatingExpenses.previousTotal ?? "0.00",
    );
    const previousNetProfit = subtractMoney(
      addMoney(previousOperatingProfit, otherIncome.previousTotal ?? "0.00"),
      otherExpenses.previousTotal ?? "0.00",
    );

    return {
      meta: await this.meta(companyId, range),
      comparison: range.previous
        ? {
            from: formatIsoDate(range.previous.from),
            to: formatIsoDate(range.previous.to),
            label: range.previous.label,
          }
        : null,
      revenue,
      costOfSales,
      grossProfit,
      operatingExpenses,
      otherIncome,
      otherExpenses,
      operatingProfit,
      netProfit,
      grossMarginPercent: percentOf(grossProfit, revenue.total),
      netMarginPercent: percentOf(netProfit, revenue.total),
      ...(range.previous
        ? {
            previousGrossProfit,
            previousOperatingProfit,
            previousNetProfit,
          }
        : {}),
    };
  }

  // ── Balance sheet ──────────────────────────────────────────

  async balanceSheet(companyId: string, query: ReportRangeQuery): Promise<BalanceSheetReport> {
    const range = await resolveRange(this.prisma, companyId, query);

    // A balance sheet is cumulative: every posting from the beginning of the
    // books up to the "as at" date, not just the period's movement.
    const [current, previous] = await Promise.all([
      this.movements(companyId, null, range.to),
      range.previous
        ? this.movements(companyId, null, range.previous.to)
        : Promise.resolve([] as AccountMovement[]),
    ]);

    const previousByAccount = new Map(previous.map((row) => [row.accountId, row]));

    const section = (
      key: string,
      title: string,
      filter: (row: AccountMovement) => boolean,
      direction: "debit" | "credit",
    ): StatementSection => {
      const lines: StatementLine[] = [];
      let total = "0.00";
      let previousTotal = "0.00";

      for (const row of current.filter(filter)) {
        const net =
          direction === "debit"
            ? toCents(row.debit) - toCents(row.credit)
            : toCents(row.credit) - toCents(row.debit);

        const prior = previousByAccount.get(row.accountId);
        const previousNet = prior
          ? direction === "debit"
            ? toCents(prior.debit) - toCents(prior.credit)
            : toCents(prior.credit) - toCents(prior.debit)
          : 0;

        if (net === 0 && previousNet === 0 && !query.includeZeroBalances) continue;

        lines.push({
          accountId: row.accountId,
          code: row.code,
          name: row.name,
          amount: fromCents(net),
          ...(range.previous ? { previousAmount: fromCents(previousNet) } : {}),
          depth: 0,
        });

        total = addMoney(total, fromCents(net));
        previousTotal = addMoney(previousTotal, fromCents(previousNet));
      }

      return { key, title, lines, total, ...(range.previous ? { previousTotal } : {}) };
    };

    const currentAssets = section(
      "currentAssets",
      "Current Assets",
      (row) => row.type === "ASSET" && row.subType !== "NON_CURRENT_ASSET",
      "debit",
    );
    const nonCurrentAssets = section(
      "nonCurrentAssets",
      "Non-Current Assets",
      (row) => row.type === "ASSET" && row.subType === "NON_CURRENT_ASSET",
      "debit",
    );
    const currentLiabilities = section(
      "currentLiabilities",
      "Current Liabilities",
      (row) => row.type === "LIABILITY" && row.subType !== "NON_CURRENT_LIABILITY",
      "credit",
    );
    const nonCurrentLiabilities = section(
      "nonCurrentLiabilities",
      "Non-Current Liabilities",
      (row) => row.type === "LIABILITY" && row.subType === "NON_CURRENT_LIABILITY",
      "credit",
    );
    const equity = section("equity", "Equity", (row) => row.type === "EQUITY", "credit");

    // Revenue and expenses are not closed to equity until year end, so the
    // result for the year has to be carried onto the face of the statement for
    // the sheet to balance (docs/spec/04 §32).
    let resultCents = 0;
    let previousResultCents = 0;

    for (const row of current) {
      if (row.type === "REVENUE") resultCents += toCents(row.credit) - toCents(row.debit);
      if (row.type === "EXPENSE" || row.type === "COST_OF_SALES") {
        resultCents -= toCents(row.debit) - toCents(row.credit);
      }
    }
    for (const row of previous) {
      if (row.type === "REVENUE") previousResultCents += toCents(row.credit) - toCents(row.debit);
      if (row.type === "EXPENSE" || row.type === "COST_OF_SALES") {
        previousResultCents -= toCents(row.debit) - toCents(row.credit);
      }
    }

    const retainedEarningsForPeriod = fromCents(resultCents);

    const totalAssets = addMoney(currentAssets.total, nonCurrentAssets.total);
    const totalLiabilities = addMoney(currentLiabilities.total, nonCurrentLiabilities.total);
    const totalEquity = addMoney(equity.total, retainedEarningsForPeriod);
    const totalLiabilitiesAndEquity = addMoney(totalLiabilities, totalEquity);

    const equation = checkAccountingEquation({
      assets: totalAssets,
      liabilities: totalLiabilities,
      equity: totalEquity,
    });

    const previousTotalAssets = addMoney(
      currentAssets.previousTotal ?? "0.00",
      nonCurrentAssets.previousTotal ?? "0.00",
    );
    const previousTotalLiabilities = addMoney(
      currentLiabilities.previousTotal ?? "0.00",
      nonCurrentLiabilities.previousTotal ?? "0.00",
    );
    const previousTotalEquity = addMoney(
      equity.previousTotal ?? "0.00",
      fromCents(previousResultCents),
    );

    return {
      meta: await this.meta(companyId, range),
      comparison: range.previous
        ? {
            from: formatIsoDate(range.previous.from),
            to: formatIsoDate(range.previous.to),
            label: range.previous.label,
          }
        : null,
      currentAssets,
      nonCurrentAssets,
      totalAssets,
      currentLiabilities,
      nonCurrentLiabilities,
      totalLiabilities,
      equity,
      retainedEarningsForPeriod,
      previousRetainedEarningsForPeriod: fromCents(previousResultCents),
      totalEquity,
      totalLiabilitiesAndEquity,
      previousTotalLiabilitiesAndEquity: addMoney(previousTotalLiabilities, previousTotalEquity),
      balanced: equation.holds,
      difference: equation.difference,
      ...(range.previous
        ? { previousTotalAssets, previousTotalLiabilities, previousTotalEquity }
        : {}),
    };
  }

  // ── General ledger ─────────────────────────────────────────

  /**
   * The drill-down view: every posted line for an account, with a running
   * balance, each row traceable to its journal and source document.
   */
  async ledger(companyId: string, query: LedgerQuery): Promise<LedgerReport> {
    const to = query.dateTo ? parseIsoDate(query.dateTo) : new Date();
    let from = query.dateFrom ? parseIsoDate(query.dateFrom) : null;
    let label = "All dates";

    if (query.fiscalPeriodId) {
      const period = await this.prisma.fiscalPeriod.findFirst({
        where: { id: query.fiscalPeriodId, companyId },
      });
      if (!period) {
        throw new ZycountError(ERROR_CODES.NOT_FOUND, "That fiscal period does not exist in this company.");
      }
      from = period.startDate;
      label = period.name;
    } else if (query.dateFrom || query.dateTo) {
      label = `${from ? formatIsoDate(from) : "Start"} – ${formatIsoDate(to)}`;
    }

    const account = query.accountId
      ? await this.prisma.account.findFirst({
          where: { id: query.accountId, companyId },
          select: { id: true, code: true, name: true, type: true },
        })
      : null;

    if (query.accountId && !account) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That account does not exist in this company.");
    }

    const where: Prisma.JournalLineWhereInput = {
      journalEntry: {
        companyId,
        status: { in: ["POSTED", "REVERSED"] },
        date: { ...(from ? { gte: from } : {}), lte: to },
        ...(query.source ? { source: query.source as JournalSource } : {}),
        ...(query.q
          ? {
              OR: [
                { reference: { contains: query.q, mode: "insensitive" } },
                { description: { contains: query.q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      ...(query.accountId ? { accountId: query.accountId } : {}),
    };

    // The opening balance is everything posted before the window — without it
    // the running balance on the first row would be wrong.
    const openingAggregate = from
      ? await this.prisma.journalLine.aggregate({
          where: {
            ...(query.accountId ? { accountId: query.accountId } : {}),
            journalEntry: {
              companyId,
              status: { in: ["POSTED", "REVERSED"] },
              date: { lt: from },
            },
          },
          _sum: { debit: true, credit: true },
        })
      : null;

    const normalBalance = account ? NORMAL_BALANCE[account.type] : "DEBIT";
    const openingNet =
      toCents(openingAggregate?._sum.debit?.toString() ?? "0") -
      toCents(openingAggregate?._sum.credit?.toString() ?? "0");
    const openingBalance = fromCents(normalBalance === "DEBIT" ? openingNet : -openingNet);

    const [lines, total, totals] = await Promise.all([
      this.prisma.journalLine.findMany({
        where,
        include: {
          account: { select: { code: true, name: true } },
          journalEntry: {
            select: { id: true, reference: true, date: true, source: true, sourceId: true },
          },
        },
        orderBy: [
          { journalEntry: { date: "asc" } },
          { journalEntry: { reference: "asc" } },
          { lineNo: "asc" },
        ],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.journalLine.count({ where }),
      this.prisma.journalLine.aggregate({ where, _sum: { debit: true, credit: true } }),
    ]);

    // The running balance continues from where the previous page ended, so
    // paging through a long ledger stays coherent. The preceding rows are read
    // back in the *same* order as the page itself — anything else would drift
    // whenever several lines share a date and reference.
    let priorNetCents = 0;

    if (query.page > 1) {
      const priorLines = await this.prisma.journalLine.findMany({
        where,
        select: { debit: true, credit: true },
        orderBy: [
          { journalEntry: { date: "asc" } },
          { journalEntry: { reference: "asc" } },
          { lineNo: "asc" },
        ],
        take: (query.page - 1) * query.pageSize,
      });

      for (const line of priorLines) {
        priorNetCents += toCents(line.debit.toString()) - toCents(line.credit.toString());
      }
    }

    let runningCents = openingNet + priorNetCents;

    const rows: LedgerRow[] = lines.map((line) => {
      runningCents += toCents(line.debit.toString()) - toCents(line.credit.toString());
      return {
        journalLineId: line.id,
        journalEntryId: line.journalEntry.id,
        reference: line.journalEntry.reference,
        date: formatIsoDate(line.journalEntry.date),
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        description: line.description,
        source: line.journalEntry.source,
        sourceId: line.journalEntry.sourceId,
        debit: fromCents(toCents(line.debit.toString())),
        credit: fromCents(toCents(line.credit.toString())),
        balance: fromCents(normalBalance === "DEBIT" ? runningCents : -runningCents),
      };
    });

    const totalDebit = totals._sum.debit?.toString() ?? "0.00";
    const totalCredit = totals._sum.credit?.toString() ?? "0.00";
    const closingNet = openingNet + (toCents(totalDebit) - toCents(totalCredit));

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true, baseCurrency: true },
    });

    const page = paginate(rows, total, query.page, query.pageSize);

    return {
      meta: {
        from: from ? formatIsoDate(from) : "",
        to: formatIsoDate(to),
        label,
        currency: company.baseCurrency,
        companyName: company.name,
        generatedAt: new Date().toISOString(),
      },
      account: account
        ? { id: account.id, code: account.code, name: account.name, type: account.type }
        : null,
      openingBalance,
      closingBalance: fromCents(normalBalance === "DEBIT" ? closingNet : -closingNet),
      totalDebit: fromCents(toCents(totalDebit)),
      totalCredit: fromCents(toCents(totalCredit)),
      rows: page.data,
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }
}

/** `x ÷ y` as a percentage string with one decimal; `"0.0"` when undefined. */
function percentOf(value: string, base: string): string {
  const baseCents = toCents(base);
  if (baseCents === 0) return "0.0";
  return ((toCents(value) / baseCents) * 100).toFixed(1);
}
