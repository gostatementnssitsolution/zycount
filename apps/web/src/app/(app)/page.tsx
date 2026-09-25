"use client";

import { PERMISSIONS } from "@zycount/shared";
import { ArrowRight, BookOpen, TrendingUp } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { ErrorState } from "@/components/common/error-state";
import { PeriodPicker, useDefaultPeriod } from "@/components/common/period-picker";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { BusinessHealth } from "@/components/dashboard/business-health";
import { CashChart, ExpenseMixChart, TrendChart } from "@/components/dashboard/charts";
import { KpiGrid } from "@/components/dashboard/kpi-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDashboard } from "@/hooks/use-accounting";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Dashboard />
    </RequirePermission>
  );
}

function Dashboard() {
  const { user, activeCompany } = useAuth();
  const { periodId: defaultPeriodId, isLoading: periodsLoading } = useDefaultPeriod();
  const [periodId, setPeriodId] = React.useState<string | undefined>();

  const effectivePeriodId = periodId ?? defaultPeriodId;

  const { data, isLoading, error, refetch } = useDashboard({
    fiscalPeriodId: effectivePeriodId,
    comparePrevious: true,
  });

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good day, ${firstName}`}
        description={
          activeCompany
            ? `${activeCompany.name} · figures in ${activeCompany.baseCurrency}`
            : "Select a company to begin."
        }
        actions={
          <PeriodPicker value={effectivePeriodId} onChange={setPeriodId} className="w-[13rem]" />
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || periodsLoading ? (
        <DashboardSkeleton />
      ) : !data ? (
        <EmptyBooks />
      ) : (
        <>
          <KpiGrid
            kpis={data.kpis}
            currency={data.meta.currency}
            comparisonLabel={data.trend.length > 1 ? "vs. previous period" : undefined}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <TrendChart data={data.trend} currency={data.meta.currency} className="lg:col-span-2" />
            <ExpenseMixChart data={data.accountMix} currency={data.meta.currency} />
          </div>

          <CashChart data={data.trend} currency={data.meta.currency} />

          <BusinessHealth metrics={data.health} />

          <RecentActivity journals={data.recentJournals} currency={data.meta.currency} />
        </>
      )}
    </div>
  );
}

function RecentActivity({
  journals,
  currency,
}: {
  journals: Array<{
    id: string;
    reference: string;
    date: string;
    description: string | null;
    status: string;
    source: string;
    amount: string;
  }>;
  currency: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Recent postings</CardTitle>
          <CardDescription>The latest entries to reach the ledger.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/accounting/journals">
            View all
            <ArrowRight />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {journals.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            Nothing has been posted in this company yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead numeric className="pr-5">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {journals.map((journal) => (
                <TableRow key={journal.id} interactive>
                  <TableCell className="pl-5">
                    <Link
                      href={`/accounting/journals/${journal.id}`}
                      className="font-mono text-xs font-medium text-brand hover:underline"
                    >
                      {journal.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(journal.date)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {journal.description ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {journal.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={journal.status} />
                  </TableCell>
                  <TableCell numeric className="pr-5 font-medium">
                    <Money value={journal.amount} currency={currency} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyBooks() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center py-14 text-center">
        <div className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
          <TrendingUp className="size-5" aria-hidden />
        </div>
        <h3 className="mt-3 font-medium">No figures to show yet</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Once entries are posted to the ledger, your revenue, expenses, cash position and business
          health appear here.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/accounting/journals/new">
            <BookOpen />
            Post your first journal
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-[6.5rem]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-36" />
    </div>
  );
}
