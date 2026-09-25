import { Controller, Get, Query, Res } from "@nestjs/common";
import {
  PERMISSIONS,
  ledgerQuerySchema,
  reportRangeSchema,
  type LedgerQuery,
  type ReportRangeQuery,
} from "@zycount/shared";
import type { Response } from "express";
import { CompanyId, RequireCompany, RequirePermission } from "../../common/decorators";
import { zodQuery } from "../../common/pipes/zod-validation.pipe";
import { DashboardService } from "./dashboard.service";
import { ReportsService } from "./reports.service";
import { toCsv } from "./csv";

@Controller("companies/:companyId")
@RequireCompany()
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly dashboard: DashboardService,
  ) {}

  @Get("reports/trial-balance")
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  trialBalance(
    @CompanyId() companyId: string,
    @Query(zodQuery(reportRangeSchema)) query: ReportRangeQuery,
  ) {
    return this.reports.trialBalance(companyId, query);
  }

  @Get("reports/profit-loss")
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  profitLoss(
    @CompanyId() companyId: string,
    @Query(zodQuery(reportRangeSchema)) query: ReportRangeQuery,
  ) {
    return this.reports.profitLoss(companyId, query);
  }

  @Get("reports/balance-sheet")
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  balanceSheet(
    @CompanyId() companyId: string,
    @Query(zodQuery(reportRangeSchema)) query: ReportRangeQuery,
  ) {
    return this.reports.balanceSheet(companyId, query);
  }

  @Get("ledger")
  @RequirePermission(PERMISSIONS.LEDGER_VIEW)
  ledger(@CompanyId() companyId: string, @Query(zodQuery(ledgerQuerySchema)) query: LedgerQuery) {
    return this.reports.ledger(companyId, query);
  }

  @Get("dashboard")
  @RequirePermission(PERMISSIONS.REPORT_VIEW)
  dashboardReport(
    @CompanyId() companyId: string,
    @Query(zodQuery(reportRangeSchema)) query: ReportRangeQuery,
  ) {
    return this.dashboard.build(companyId, query);
  }

  // ── Exports ────────────────────────────────────────────────

  @Get("reports/trial-balance/export")
  @RequirePermission(PERMISSIONS.REPORT_EXPORT)
  async exportTrialBalance(
    @CompanyId() companyId: string,
    @Query(zodQuery(reportRangeSchema)) query: ReportRangeQuery,
    @Res() response: Response,
  ): Promise<void> {
    const report = await this.reports.trialBalance(companyId, query);

    const csv = toCsv(
      ["Code", "Account", "Type", "Opening Dr", "Opening Cr", "Period Dr", "Period Cr", "Closing Dr", "Closing Cr"],
      report.rows.map((row) => [
        row.code,
        row.name,
        row.type,
        row.openingDebit,
        row.openingCredit,
        row.periodDebit,
        row.periodCredit,
        row.closingDebit,
        row.closingCredit,
      ]),
      [
        ["", "TOTAL", "", report.totals.openingDebit, report.totals.openingCredit, report.totals.periodDebit, report.totals.periodCredit, report.totals.closingDebit, report.totals.closingCredit],
      ],
    );

    send(response, csv, `trial-balance-${report.meta.to}.csv`);
  }

  @Get("ledger/export")
  @RequirePermission(PERMISSIONS.REPORT_EXPORT)
  async exportLedger(
    @CompanyId() companyId: string,
    @Query(zodQuery(ledgerQuerySchema)) query: LedgerQuery,
    @Res() response: Response,
  ): Promise<void> {
    // Exports are not paginated — the whole selection goes into the file.
    const report = await this.reports.ledger(companyId, { ...query, page: 1, pageSize: 200 });

    const csv = toCsv(
      ["Date", "Reference", "Account", "Description", "Source", "Debit", "Credit", "Balance"],
      report.rows.map((row) => [
        row.date,
        row.reference,
        `${row.accountCode} ${row.accountName}`,
        row.description ?? "",
        row.source,
        row.debit,
        row.credit,
        row.balance,
      ]),
    );

    send(response, csv, `general-ledger-${report.meta.to}.csv`);
  }

  @Get("reports/profit-loss/export")
  @RequirePermission(PERMISSIONS.REPORT_EXPORT)
  async exportProfitLoss(
    @CompanyId() companyId: string,
    @Query(zodQuery(reportRangeSchema)) query: ReportRangeQuery,
    @Res() response: Response,
  ): Promise<void> {
    const report = await this.reports.profitLoss(companyId, query);
    const rows: string[][] = [];

    for (const section of [
      report.revenue,
      report.costOfSales,
      report.operatingExpenses,
      report.otherIncome,
      report.otherExpenses,
    ]) {
      rows.push([section.title, "", ""]);
      for (const line of section.lines) rows.push([line.code ?? "", line.name, line.amount]);
      rows.push(["", `Total ${section.title}`, section.total]);
      rows.push(["", "", ""]);
    }

    rows.push(["", "Gross Profit", report.grossProfit]);
    rows.push(["", "Operating Profit", report.operatingProfit]);
    rows.push(["", "Net Profit", report.netProfit]);

    send(response, toCsv(["Code", "Account", "Amount"], rows), `profit-and-loss-${report.meta.to}.csv`);
  }

  @Get("reports/balance-sheet/export")
  @RequirePermission(PERMISSIONS.REPORT_EXPORT)
  async exportBalanceSheet(
    @CompanyId() companyId: string,
    @Query(zodQuery(reportRangeSchema)) query: ReportRangeQuery,
    @Res() response: Response,
  ): Promise<void> {
    const report = await this.reports.balanceSheet(companyId, query);
    const rows: string[][] = [];

    for (const section of [
      report.currentAssets,
      report.nonCurrentAssets,
      report.currentLiabilities,
      report.nonCurrentLiabilities,
      report.equity,
    ]) {
      rows.push([section.title, "", ""]);
      for (const line of section.lines) rows.push([line.code ?? "", line.name, line.amount]);
      rows.push(["", `Total ${section.title}`, section.total]);
      rows.push(["", "", ""]);
    }

    rows.push(["", "Result for the period", report.retainedEarningsForPeriod]);
    rows.push(["", "Total Assets", report.totalAssets]);
    rows.push(["", "Total Liabilities", report.totalLiabilities]);
    rows.push(["", "Total Equity", report.totalEquity]);

    send(response, toCsv(["Code", "Account", "Amount"], rows), `balance-sheet-${report.meta.to}.csv`);
  }
}

function send(response: Response, csv: string, filename: string): void {
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  response.send(csv);
}
