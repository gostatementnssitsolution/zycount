"use client";

import { PERMISSIONS } from "@zycount/shared";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import * as React from "react";
import { ErrorState } from "@/components/common/error-state";
import { useDefaultPeriod } from "@/components/common/period-picker";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { ReportMeta, ReportToolbar } from "@/components/reports/report-toolbar";
import { SectionRows, TotalRow } from "@/components/reports/statement";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBalanceSheet, type ReportParams } from "@/hooks/use-accounting";
import { formatDate } from "@/lib/format";

export default function BalanceSheetPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <BalanceSheet />
    </RequirePermission>
  );
}

function BalanceSheet() {
  const { periodId } = useDefaultPeriod();
  const [params, setParams] = React.useState<ReportParams>({ comparePrevious: true });

  const effective: ReportParams = {
    ...params,
    fiscalPeriodId: params.fiscalPeriodId ?? periodId,
  };

  const { data, isLoading, error, refetch } = useBalanceSheet(effective);
  const showComparison = Boolean(data?.comparison);
  const currency = data?.meta.currency ?? "MYR";

  return (
    <div>
      <PageHeader
        title="Balance Sheet"
        description="What the business owns, what it owes, and what is left for its owners."
      >
        <ReportToolbar
          params={effective}
          onChange={setParams}
          exportPath="/reports/balance-sheet/export"
          exportName="balance-sheet.csv"
        />
      </PageHeader>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <Card>
          <CardContent className="pt-5">
            <SkeletonTable rows={14} columns={3} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Invariant 2: Assets = Liabilities + Equity. */}
          {data.balanced ? (
            <Alert variant="success" className="mb-4 print-hidden">
              <CheckCircle2 />
              <AlertTitle>The balance sheet balances</AlertTitle>
              <AlertDescription>
                Assets equal liabilities plus equity, to the cent.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle />
              <AlertTitle>The balance sheet does not balance</AlertTitle>
              <AlertDescription>
                Assets differ from liabilities plus equity by{" "}
                <Money value={data.difference} showSymbol />. Contact support before relying on
                these figures.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="p-5 pb-0">
                <ReportMeta
                  companyName={data.meta.companyName}
                  title="Statement of Financial Position"
                  label={data.meta.label}
                  from={formatDate(data.meta.from)}
                  to={formatDate(data.meta.to)}
                  currency={data.meta.currency}
                  asAt
                />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Account</TableHead>
                    <TableHead numeric className={showComparison ? "" : "pr-4"}>
                      {formatDate(data.meta.to)}
                    </TableHead>
                    {showComparison && (
                      <TableHead numeric className="pr-4">
                        {data.comparison!.label}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  <SectionRows
                    section={data.currentAssets}
                    currency={currency}
                    periodId={effective.fiscalPeriodId}
                    showComparison={showComparison}
                  />
                  <SectionRows
                    section={data.nonCurrentAssets}
                    currency={currency}
                    periodId={effective.fiscalPeriodId}
                    showComparison={showComparison}
                  />
                  <TotalRow
                    label="Total assets"
                    value={data.totalAssets}
                    previousValue={data.previousTotalAssets}
                    currency={currency}
                    showComparison={showComparison}
                    strong
                  />

                  <SectionRows
                    section={data.currentLiabilities}
                    currency={currency}
                    periodId={effective.fiscalPeriodId}
                    showComparison={showComparison}
                  />
                  <SectionRows
                    section={data.nonCurrentLiabilities}
                    currency={currency}
                    periodId={effective.fiscalPeriodId}
                    showComparison={showComparison}
                  />
                  <TotalRow
                    label="Total liabilities"
                    value={data.totalLiabilities}
                    previousValue={data.previousTotalLiabilities}
                    currency={currency}
                    showComparison={showComparison}
                  />

                  <SectionRows
                    section={data.equity}
                    currency={currency}
                    periodId={effective.fiscalPeriodId}
                    showComparison={showComparison}
                    hideTotal
                  />

                  {/* Revenue and expenses close to equity only at year end, so
                      the period's result is carried onto the face of the sheet. */}
                  <TableRow className="border-0">
                    <TableCell className="py-1 pl-8">
                      <span className="ml-8">Result for the period</span>
                    </TableCell>
                    <TableCell numeric className={showComparison ? "py-1" : "py-1 pr-4"}>
                      <Money value={data.retainedEarningsForPeriod} currency={currency} colorSign />
                    </TableCell>
                    {showComparison && (
                      <TableCell numeric className="py-1 pr-4 text-muted-foreground">
                        <Money
                          value={data.previousRetainedEarningsForPeriod ?? "0.00"}
                          currency={currency}
                        />
                      </TableCell>
                    )}
                  </TableRow>

                  <TotalRow
                    label="Total equity"
                    value={data.totalEquity}
                    previousValue={data.previousTotalEquity}
                    currency={currency}
                    showComparison={showComparison}
                  />

                  <TotalRow
                    label="Total liabilities and equity"
                    value={data.totalLiabilitiesAndEquity}
                    previousValue={data.previousTotalLiabilitiesAndEquity}
                    currency={currency}
                    showComparison={showComparison}
                    strong
                  />
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
