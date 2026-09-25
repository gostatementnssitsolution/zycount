"use client";

import { PERMISSIONS, type FiscalPeriodDto } from "@zycount/shared";
import { CalendarPlus, CalendarRange, Lock, LockOpen } from "lucide-react";
import * as React from "react";
import { ClosePeriodDialog, ReopenPeriodDialog } from "@/components/accounting/period-dialogs";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PermissionGate, RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PeriodStatusBadge } from "@/components/ui/status-badge";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGeneratePeriods, usePeriods } from "@/hooks/use-accounting";
import { formatDate, formatDateTime, pluralise } from "@/lib/format";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";

export default function PeriodsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.PERIOD_VIEW}>
      <Periods />
    </RequirePermission>
  );
}

function Periods() {
  const { data: periods, isLoading, error, refetch } = usePeriods();
  const generate = useGeneratePeriods();

  const [closing, setClosing] = React.useState<FiscalPeriodDto | null>(null);
  const [reopening, setReopening] = React.useState<FiscalPeriodDto | null>(null);

  const byYear = React.useMemo(() => {
    const groups = new Map<number, FiscalPeriodDto[]>();
    for (const period of periods ?? []) {
      const list = groups.get(period.year) ?? [];
      list.push(period);
      groups.set(period.year, list);
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [periods]);

  const onGenerate = async () => {
    const year = new Date().getUTCFullYear();

    try {
      const created = await generate.mutateAsync({ year, periodsPerYear: 12 });
      toast.success(`${created.length} monthly periods ready for ${year}.`);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not create those periods.");
    }
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Fiscal Periods" }]}
        title="Fiscal Periods"
        description="Nothing can be posted into a closed period without an audited reopening."
        actions={
          <PermissionGate permission={PERMISSIONS.PERIOD_CREATE}>
            <Button variant="outline" onClick={() => void onGenerate()} loading={generate.isPending}>
              <CalendarPlus />
              Generate this year
            </Button>
          </PermissionGate>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Card>
          <CardContent className="pt-5">
            <SkeletonTable rows={8} columns={5} />
          </CardContent>
        </Card>
      ) : byYear.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CalendarRange}
              title="No fiscal periods yet"
              description="Entries can only be dated into a period that exists. Generate a year to begin."
              action={
                <PermissionGate permission={PERMISSIONS.PERIOD_CREATE}>
                  <Button onClick={() => void onGenerate()} loading={generate.isPending}>
                    <CalendarPlus />
                    Generate this year
                  </Button>
                </PermissionGate>
              }
              className="border-0"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {byYear.map(([year, yearPeriods]) => {
            const closed = yearPeriods.filter((period) => period.status === "CLOSED").length;

            return (
              <Card key={year}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <h2 className="font-semibold">{year}</h2>
                    <span className="text-sm text-muted-foreground">
                      {closed} of {yearPeriods.length} closed
                    </span>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Period</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead numeric>Journals</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Closed</TableHead>
                        <TableHead className="pr-4" />
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {yearPeriods.map((period) => (
                        <TableRow key={period.id}>
                          <TableCell className="pl-4 font-medium">{period.name}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(period.startDate)} – {formatDate(period.endDate)}
                          </TableCell>
                          <TableCell numeric className="text-muted-foreground">
                            {period.journalCount ?? 0}
                          </TableCell>
                          <TableCell>
                            <PeriodStatusBadge status={period.status} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {period.closedAt ? formatDateTime(period.closedAt) : "—"}
                          </TableCell>
                          <TableCell className="pr-4 text-right">
                            {period.status === "OPEN" ? (
                              <PermissionGate permission={PERMISSIONS.PERIOD_CLOSE}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setClosing(period)}
                                >
                                  <Lock />
                                  Close
                                </Button>
                              </PermissionGate>
                            ) : (
                              <PermissionGate permission={PERMISSIONS.PERIOD_REOPEN}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setReopening(period)}
                                >
                                  <LockOpen />
                                  Reopen
                                </Button>
                              </PermissionGate>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ClosePeriodDialog
        period={closing}
        open={Boolean(closing)}
        onOpenChange={(open) => !open && setClosing(null)}
      />
      <ReopenPeriodDialog
        period={reopening}
        open={Boolean(reopening)}
        onOpenChange={(open) => !open && setReopening(null)}
      />
    </div>
  );
}
