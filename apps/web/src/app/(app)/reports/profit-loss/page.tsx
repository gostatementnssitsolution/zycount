"use client";

import { PERMISSIONS } from "@zycount/shared";
import * as React from "react";
import { ErrorState } from "@/components/common/error-state";
import { useDefaultPeriod } from "@/components/common/period-picker";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { ReportMeta, ReportToolbar } from "@/components/reports/report-toolbar";
import { SectionRows, TotalRow } from "@/components/reports/statement";
import { Card, CardContent } from "@/components/ui/card";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProfitLoss, type ReportParams } from "@/hooks/use-accounting";
import { formatDate } from "@/lib/format";

export default function ProfitLossPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <ProfitLoss />
    </RequirePermission>
  );
}

function ProfitLoss() {
  const { periodId } = useDefaultPeriod();
  const [params, setParams] = React.useState<ReportParams>({ comparePrevious: true });

  const effective: ReportParams = {
    ...params,
    fiscalPeriodId: params.fiscalPeriodId ?? periodId,
  };

  const { data, isLoading, error, refetch } = useProfitLoss(effective);
  const showComparison = Boolean(data?.comparison);
  const currency = data?.meta.currency ?? "MYR";

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Reports" }, { label: "Profit & Loss" }]}
        title="Profit & Loss"
        description="Revenue less the cost of earning it, down to the result for the period."
      >
        <ReportToolbar
          params={effective}
          onChange={setParams}
          exportPath="/reports/profit-loss/export"
          exportName="profit-and-loss.csv"
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
        <Card className="mx-auto max-w-4xl">
          <CardContent className="p-0">
            <div className="px-5 pt-5">
              <ReportMeta
                companyName={data.meta.companyName}
                title="Statement of Profit or Loss"
                label={data.meta.label}
                from={formatDate(data.meta.from)}
                to={formatDate(data.meta.to)}
                currency={data.meta.currency}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Account</TableHead>
                  <TableHead numeric className={showComparison ? "" : "pr-4"}>
                    {data.meta.label}
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
                  section={data.revenue}
                  currency={currency}
                  periodId={effective.fiscalPeriodId}
                  showComparison={showComparison}
                />

                <SectionRows
                  section={data.costOfSales}
                  currency={currency}
                  periodId={effective.fiscalPeriodId}
                  showComparison={showComparison}
                />

                <TotalRow
                  label="Gross profit"
                  value={data.grossProfit}
                  previousValue={data.previousGrossProfit}
                  currency={currency}
                  showComparison={showComparison}
                />

                <SectionRows
                  section={data.operatingExpenses}
                  currency={currency}
                  periodId={effective.fiscalPeriodId}
                  showComparison={showComparison}
                />

                <TotalRow
                  label="Operating profit"
                  value={data.operatingProfit}
                  previousValue={data.previousOperatingProfit}
                  currency={currency}
                  showComparison={showComparison}
                />

                <SectionRows
                  section={data.otherIncome}
                  currency={currency}
                  periodId={effective.fiscalPeriodId}
                  showComparison={showComparison}
                />

                <SectionRows
                  section={data.otherExpenses}
                  currency={currency}
                  periodId={effective.fiscalPeriodId}
                  showComparison={showComparison}
                />

                <TotalRow
                  label="Net profit for the period"
                  value={data.netProfit}
                  previousValue={data.previousNetProfit}
                  currency={currency}
                  showComparison={showComparison}
                  strong
                  colorSign
                />
              </TableBody>
            </Table>

            <div className="flex flex-wrap gap-x-8 gap-y-2 border-t px-4 py-3 text-sm">
              <div>
                <span className="text-muted-foreground">Gross margin</span>{" "}
                <span className="tabular font-semibold">{data.grossMarginPercent}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Net margin</span>{" "}
                <span className="tabular font-semibold">{data.netMarginPercent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
