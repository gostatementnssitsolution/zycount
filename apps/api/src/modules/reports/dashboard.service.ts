import { Injectable } from "@nestjs/common";
import {
  addMoney,
  divideSafe,
  formatMoney,
  fromCents,
  subtractMoney,
  toCents,
  type BusinessHealthMetric,
  type DashboardKpi,
  type DashboardReport,
  type DashboardTrendPoint,
  type ReportRangeQuery,
} from "@zycount/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { formatIsoDate } from "../../common/util/dates";
import { ReportsService } from "./reports.service";

/** Account codes the dashboard reads directly (see packages/db/prisma/seed/coa.ts). */
const CASH_CODES = ["1110", "1120", "1131", "1132", "1140"];
const RECEIVABLE_CODES = ["1150", "1160"];
const PAYABLE_CODES = ["2110", "2120"];

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  /**
   * The dashboard reuses the same P&L and balance-sheet code paths the
   * statements use, so a KPI tile can never disagree with the report behind it.
   */
  async build(companyId: string, query: ReportRangeQuery): Promise<DashboardReport> {
    const withComparison: ReportRangeQuery = { ...query, comparePrevious: true };

    const [profitLoss, balanceSheet, periods] = await Promise.all([
      this.reports.profitLoss(companyId, withComparison),
      this.reports.balanceSheet(companyId, withComparison),
      this.prisma.fiscalPeriod.findMany({
        where: { companyId },
        orderBy: [{ year: "asc" }, { periodNo: "asc" }],
      }),
    ]);

    const balanceFor = (codes: string[]): string => {
      const lines = [
        ...balanceSheet.currentAssets.lines,
        ...balanceSheet.nonCurrentAssets.lines,
        ...balanceSheet.currentLiabilities.lines,
        ...balanceSheet.nonCurrentLiabilities.lines,
      ];
      return lines
        .filter((line) => line.code && codes.includes(line.code))
        .reduce((total, line) => addMoney(total, line.amount), "0.00");
    };

    const previousBalanceFor = (codes: string[]): string => {
      const lines = [
        ...balanceSheet.currentAssets.lines,
        ...balanceSheet.nonCurrentAssets.lines,
        ...balanceSheet.currentLiabilities.lines,
        ...balanceSheet.nonCurrentLiabilities.lines,
      ];
      return lines
        .filter((line) => line.code && codes.includes(line.code))
        .reduce((total, line) => addMoney(total, line.previousAmount ?? "0.00"), "0.00");
    };

    const cash = balanceFor(CASH_CODES);
    const receivables = balanceFor(RECEIVABLE_CODES);
    const payables = balanceFor(PAYABLE_CODES);

    const kpis: DashboardKpi[] = [
      kpi("revenue", "Revenue", profitLoss.revenue.total, profitLoss.revenue.previousTotal ?? null, true, "Operating revenue for the period."),
      kpi("expenses", "Expenses", addMoney(profitLoss.operatingExpenses.total, profitLoss.costOfSales.total), addMoney(profitLoss.operatingExpenses.previousTotal ?? "0.00", profitLoss.costOfSales.previousTotal ?? "0.00"), false, "Cost of sales plus operating expenses."),
      kpi("grossProfit", "Gross Profit", profitLoss.grossProfit, profitLoss.previousGrossProfit ?? null, true, "Revenue less cost of sales."),
      kpi("netProfit", "Net Profit", profitLoss.netProfit, profitLoss.previousNetProfit ?? null, true, "Result after every income and expense."),
      kpi("cash", "Cash & Bank", cash, previousBalanceFor(CASH_CODES), true, "Cash in hand plus bank balances."),
      kpi("receivables", "Receivables", receivables, previousBalanceFor(RECEIVABLE_CODES), false, "Money owed to the business."),
      kpi("payables", "Payables", payables, previousBalanceFor(PAYABLE_CODES), false, "Money the business owes."),
      kpi("workingCapital", "Working Capital", subtractMoney(balanceSheet.currentAssets.total, balanceSheet.currentLiabilities.total), null, true, "Current assets less current liabilities."),
    ];

    const trend = await this.buildTrend(companyId, periods);
    const health = this.buildHealth(
      profitLoss,
      balanceSheet,
      cash,
      receivables,
      payables,
      trend,
      profitLoss.meta.currency,
    );

    const recentJournals = await this.prisma.journalEntry.findMany({
      where: { companyId, status: { in: ["POSTED", "REVERSED"] } },
      orderBy: [{ date: "desc" }, { reference: "desc" }],
      take: 8,
      select: {
        id: true,
        reference: true,
        date: true,
        description: true,
        status: true,
        source: true,
        totalDebit: true,
      },
    });

    const accountMix = profitLoss.operatingExpenses.lines
      .slice()
      .sort((a, b) => toCents(b.amount) - toCents(a.amount))
      .slice(0, 6)
      .map((line) => ({ name: line.name, amount: line.amount, type: "EXPENSE" as const }));

    return {
      meta: profitLoss.meta,
      kpis,
      trend,
      health,
      recentJournals: recentJournals.map((entry) => ({
        id: entry.id,
        reference: entry.reference,
        date: formatIsoDate(entry.date),
        description: entry.description,
        status: entry.status,
        source: entry.source,
        amount: entry.totalDebit.toString(),
      })),
      accountMix,
    };
  }

  /** Revenue, expenses, profit and cash per period — the trend charts. */
  private async buildTrend(
    companyId: string,
    periods: Array<{ id: string; name: string; startDate: Date; endDate: Date }>,
  ): Promise<DashboardTrendPoint[]> {
    const balances = await this.prisma.accountBalance.findMany({
      where: { companyId },
      include: { account: { select: { code: true, type: true, subType: true } } },
    });

    const byPeriod = new Map<string, typeof balances>();
    for (const balance of balances) {
      const list = byPeriod.get(balance.fiscalPeriodId) ?? [];
      list.push(balance);
      byPeriod.set(balance.fiscalPeriodId, list);
    }

    const points: DashboardTrendPoint[] = [];
    let cumulativeCashCents = 0;

    for (const period of periods) {
      const rows = byPeriod.get(period.id) ?? [];

      let revenueCents = 0;
      let expenseCents = 0;
      let cashMovementCents = 0;

      for (const row of rows) {
        const debit = toCents(row.debit.toString());
        const credit = toCents(row.credit.toString());

        if (row.account.type === "REVENUE") revenueCents += credit - debit;
        if (row.account.type === "EXPENSE" || row.account.type === "COST_OF_SALES") {
          expenseCents += debit - credit;
        }
        if (CASH_CODES.includes(row.account.code)) cashMovementCents += debit - credit;
      }

      cumulativeCashCents += cashMovementCents;

      // Periods with no activity are skipped so the chart does not trail off
      // into a flat line for months that have not happened yet.
      if (revenueCents === 0 && expenseCents === 0 && cashMovementCents === 0) continue;

      points.push({
        label: period.name.replace(/ \d{4}$/, ""),
        periodId: period.id,
        revenue: fromCents(revenueCents),
        expenses: fromCents(expenseCents),
        netProfit: fromCents(revenueCents - expenseCents),
        cash: fromCents(cumulativeCashCents),
      });
    }

    return points;
  }

  /** Business-health panel (docs/spec/08 §19). */
  private buildHealth(
    profitLoss: Awaited<ReturnType<ReportsService["profitLoss"]>>,
    balanceSheet: Awaited<ReturnType<ReportsService["balanceSheet"]>>,
    cash: string,
    receivables: string,
    payables: string,
    trend: DashboardTrendPoint[],
    currency: string,
  ): BusinessHealthMetric[] {
    const metrics: BusinessHealthMetric[] = [];

    // Cash runway only means something for a business that is consuming cash.
    // Measuring it against total expenses would flag any trading company as
    // "at risk", because cost of sales is funded by the revenue beside it —
    // so the burn here is the *net* monthly result, not gross spend.
    const recentMonths = trend.slice(-3);
    const averageNetCents =
      recentMonths.length > 0
        ? recentMonths.reduce((total, point) => total + toCents(point.netProfit), 0) /
          recentMonths.length
        : 0;

    if (recentMonths.length === 0) {
      metrics.push({
        key: "runway",
        label: "Cash runway",
        value: "—",
        detail: "Not enough posted activity yet to measure cash flow.",
        status: "unknown",
      });
    } else if (averageNetCents >= 0) {
      metrics.push({
        key: "runway",
        label: "Cash runway",
        value: "Profitable",
        detail: `Trading at an average profit over the last ${recentMonths.length} period${
          recentMonths.length === 1 ? "" : "s"
        }, so cash is not being consumed.`,
        status: "good",
      });
    } else {
      const months = toCents(cash) / Math.abs(averageNetCents);
      metrics.push({
        key: "runway",
        label: "Cash runway",
        value: `${months.toFixed(1)} months`,
        detail: "Cash and bank balances divided by the average monthly loss.",
        status: months >= 12 ? "good" : months >= 6 ? "watch" : "risk",
      });
    }

    const grossMargin = Number(profitLoss.grossMarginPercent);
    metrics.push({
      key: "grossMargin",
      label: "Gross margin",
      value: `${profitLoss.grossMarginPercent}%`,
      detail: "Gross profit as a share of revenue.",
      status: grossMargin >= 35 ? "good" : grossMargin >= 20 ? "watch" : grossMargin > 0 ? "risk" : "unknown",
    });

    const netMargin = Number(profitLoss.netMarginPercent);
    metrics.push({
      key: "netMargin",
      label: "Net margin",
      value: `${profitLoss.netMarginPercent}%`,
      detail: "Net profit as a share of revenue.",
      status: netMargin >= 15 ? "good" : netMargin >= 5 ? "watch" : netMargin > 0 ? "watch" : "risk",
    });

    // Days sales outstanding: how long revenue sits in receivables.
    const revenueCents = toCents(profitLoss.revenue.total);
    if (revenueCents > 0) {
      const days = (toCents(receivables) / revenueCents) * 30;
      metrics.push({
        key: "dso",
        label: "Collection period",
        value: `${days.toFixed(0)} days`,
        detail: "Average time customers take to pay, based on this period's revenue.",
        status: days <= 30 ? "good" : days <= 60 ? "watch" : "risk",
      });
    }

    // Current ratio: can short-term assets cover short-term obligations?
    const currentLiabilities = toCents(balanceSheet.currentLiabilities.total);
    if (currentLiabilities > 0) {
      const ratio = toCents(balanceSheet.currentAssets.total) / currentLiabilities;
      metrics.push({
        key: "currentRatio",
        label: "Current ratio",
        value: ratio.toFixed(2),
        detail: "Current assets for every 1.00 of current liabilities.",
        status: ratio >= 1.5 ? "good" : ratio >= 1 ? "watch" : "risk",
      });
    }

    metrics.push({
      key: "netPosition",
      label: "Receivables vs payables",
      // Every other metric returns a display string, so this one does too.
      value: formatMoney(subtractMoney(receivables, payables), { currency, showSymbol: true }),
      detail: "Positive means customers owe more than the business owes suppliers.",
      status: toCents(receivables) >= toCents(payables) ? "good" : "watch",
    });

    return metrics;
  }
}

function kpi(
  key: string,
  label: string,
  value: string,
  previousValue: string | null,
  positiveIsGood: boolean,
  hint: string,
): DashboardKpi {
  const changePercent = divideSafe(subtractMoney(value, previousValue ?? "0.00"), previousValue);

  return { key, label, value, previousValue, changePercent, positiveIsGood, hint };
}
