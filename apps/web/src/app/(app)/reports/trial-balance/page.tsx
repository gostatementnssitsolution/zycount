"use client";

import { ACCOUNT_TYPE_LABELS, PERMISSIONS, type AccountType } from "@zycount/shared";
import { AlertTriangle, CheckCircle2, Scale } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { useDefaultPeriod } from "@/components/common/period-picker";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { ReportMeta, ReportToolbar } from "@/components/reports/report-toolbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTrialBalance, type ReportParams } from "@/hooks/use-accounting";
import { formatDate } from "@/lib/format";

export default function TrialBalancePage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <TrialBalance />
    </RequirePermission>
  );
}

function TrialBalance() {
  const { periodId } = useDefaultPeriod();
  const [params, setParams] = React.useState<ReportParams>({});

  const effective: ReportParams = {
    ...params,
    fiscalPeriodId: params.fiscalPeriodId ?? periodId,
  };

  const { data, isLoading, error, refetch } = useTrialBalance(effective);

  return (
    <div>
      <PageHeader
        title="Trial Balance"
        description="Every account's opening balance, movement and closing position."
      >
        <ReportToolbar
          params={effective}
          onChange={setParams}
          showCompare={false}
          exportPath="/reports/trial-balance/export"
          exportName="trial-balance.csv"
        />
      </PageHeader>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <Card>
          <CardContent className="pt-5">
            <SkeletonTable rows={12} columns={7} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Invariant 3 reported plainly: if the ledger is out, say so loudly. */}
          {data.balanced ? (
            <Alert variant="success" className="mb-4 print-hidden">
              <CheckCircle2 />
              <AlertTitle>The ledger balances</AlertTitle>
              <AlertDescription>
                Total debits equal total credits across every account.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle />
              <AlertTitle>The ledger does not balance</AlertTitle>
              <AlertDescription>
                Debits and credits differ by <Money value={data.difference} showSymbol />. This
                should never happen — contact support before relying on these figures.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="p-5 pb-0">
                <ReportMeta
                  companyName={data.meta.companyName}
                  title="Trial Balance"
                  label={data.meta.label}
                  from={formatDate(data.meta.from)}
                  to={formatDate(data.meta.to)}
                  currency={data.meta.currency}
                />
              </div>

              {data.rows.length === 0 ? (
                <EmptyState
                  icon={Scale}
                  title="No balances in this period"
                  description="Post an entry to see it appear here."
                  className="m-5 border-0"
                />
              ) : (
                <Table containerClassName="px-1">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Code</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead numeric>Opening Dr</TableHead>
                      <TableHead numeric>Opening Cr</TableHead>
                      <TableHead numeric>Period Dr</TableHead>
                      <TableHead numeric>Period Cr</TableHead>
                      <TableHead numeric>Closing Dr</TableHead>
                      <TableHead numeric className="pr-4">
                        Closing Cr
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.accountId}>
                        <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                          {row.code}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/accounting/general-ledger?accountId=${row.accountId}${
                              effective.fiscalPeriodId
                                ? `&fiscalPeriodId=${effective.fiscalPeriodId}`
                                : ""
                            }`}
                            className="hover:underline"
                          >
                            {row.name}
                          </Link>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {ACCOUNT_TYPE_LABELS[row.type as AccountType]}
                        </TableCell>
                        <TableCell numeric>
                          <Money value={row.openingDebit} dashOnZero />
                        </TableCell>
                        <TableCell numeric>
                          <Money value={row.openingCredit} dashOnZero />
                        </TableCell>
                        <TableCell numeric>
                          <Money value={row.periodDebit} dashOnZero />
                        </TableCell>
                        <TableCell numeric>
                          <Money value={row.periodCredit} dashOnZero />
                        </TableCell>
                        <TableCell numeric className="font-medium">
                          <Money value={row.closingDebit} dashOnZero />
                        </TableCell>
                        <TableCell numeric className="pr-4 font-medium">
                          <Money value={row.closingCredit} dashOnZero />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>

                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="pl-4 font-semibold">
                        Totals
                      </TableCell>
                      <TableCell numeric className="font-semibold">
                        <Money value={data.totals.openingDebit} />
                      </TableCell>
                      <TableCell numeric className="font-semibold">
                        <Money value={data.totals.openingCredit} />
                      </TableCell>
                      <TableCell numeric className="font-semibold">
                        <Money value={data.totals.periodDebit} />
                      </TableCell>
                      <TableCell numeric className="font-semibold">
                        <Money value={data.totals.periodCredit} />
                      </TableCell>
                      <TableCell numeric className="font-semibold">
                        <Money value={data.totals.closingDebit} />
                      </TableCell>
                      <TableCell numeric className="pr-4 font-semibold">
                        <Money value={data.totals.closingCredit} />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
