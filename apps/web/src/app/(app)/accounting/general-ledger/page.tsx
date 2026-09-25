"use client";

import { PERMISSIONS } from "@zycount/shared";
import { Download, ScrollText, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { AccountPicker } from "@/components/common/account-picker";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Pagination } from "@/components/common/pagination";
import { PeriodPicker } from "@/components/common/period-picker";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useLedger } from "@/hooks/use-accounting";
import { useDebounced } from "@/hooks/use-ui";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";

export default function GeneralLedgerPage() {
  return (
    <RequirePermission permission={PERMISSIONS.LEDGER_VIEW}>
      <React.Suspense fallback={<LedgerSkeleton />}>
        <GeneralLedger />
      </React.Suspense>
    </RequirePermission>
  );
}

function GeneralLedger() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeCompany } = useAuth();

  // Deep links from the statements arrive with an account and period already
  // chosen, which is what makes a figure traceable in one click.
  const [accountId, setAccountId] = React.useState<string | undefined>(
    searchParams.get("accountId") ?? undefined,
  );
  const [periodId, setPeriodId] = React.useState<string | undefined>(
    searchParams.get("fiscalPeriodId") ?? undefined,
  );
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);

  const debouncedSearch = useDebounced(search, 300);
  React.useEffect(() => setPage(1), [accountId, periodId, debouncedSearch, pageSize]);

  const { data, isLoading, error, refetch } = useLedger({
    accountId,
    fiscalPeriodId: periodId,
    q: debouncedSearch || undefined,
    page,
    pageSize,
  });

  const currency = activeCompany?.baseCurrency ?? "MYR";

  return (
    <div>
      <PageHeader
        title="General Ledger"
        description="Every posted line, with a running balance. Click any row to open its journal."
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="min-w-[18rem] flex-1">
              <AccountPicker
                value={accountId}
                onChange={setAccountId}
                placeholder="All accounts"
              />
            </div>

            <PeriodPicker value={periodId} onChange={setPeriodId} className="w-[13rem]" includeAll />

            <div className="relative min-w-[12rem] flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference or description…"
                className="pl-8"
                aria-label="Search the ledger"
              />
            </div>

            {accountId && (
              <Button variant="ghost" size="sm" onClick={() => setAccountId(undefined)}>
                Clear account
              </Button>
            )}
          </div>

          {data?.account && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
              <div>
                <span className="font-mono text-xs text-muted-foreground">
                  {data.account.code}
                </span>
                <span className="ml-2 font-medium">{data.account.name}</span>
                <Badge variant="outline" className="ml-2 font-normal">
                  {data.account.type.replace("_", " ").toLowerCase()}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span>
                  <span className="text-muted-foreground">Opening</span>{" "}
                  <Money value={data.openingBalance} currency={currency} className="font-medium" />
                </span>
                <span>
                  <span className="text-muted-foreground">Closing</span>{" "}
                  <Money value={data.closingBalance} currency={currency} className="font-semibold" />
                </span>
              </div>
            </div>
          )}

          {error ? (
            <div className="p-4">
              <ErrorState error={error} onRetry={() => void refetch()} />
            </div>
          ) : isLoading && !data ? (
            <div className="p-4">
              <SkeletonTable rows={12} columns={7} />
            </div>
          ) : (data?.rows.length ?? 0) === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No ledger entries"
              description={
                accountId
                  ? "Nothing has been posted to this account in the selected range."
                  : "Post a journal entry to see it appear in the ledger."
              }
              className="m-4 border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Date</TableHead>
                    <TableHead>Reference</TableHead>
                    {!accountId && <TableHead>Account</TableHead>}
                    <TableHead>Description</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead numeric>Debit</TableHead>
                    <TableHead numeric>Credit</TableHead>
                    <TableHead numeric className="pr-4">
                      Balance
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data?.rows.map((row) => (
                    <TableRow
                      key={row.journalLineId}
                      interactive
                      onClick={() => router.push(`/accounting/journals/${row.journalEntryId}`)}
                    >
                      <TableCell className="whitespace-nowrap pl-4 text-muted-foreground">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/accounting/journals/${row.journalEntryId}`}
                          className="font-mono text-xs font-medium text-brand hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.reference}
                        </Link>
                      </TableCell>
                      {!accountId && (
                        <TableCell className="whitespace-nowrap">
                          <span className="font-mono text-xs text-muted-foreground">
                            {row.accountCode}
                          </span>
                          <span className="ml-2">{row.accountName}</span>
                        </TableCell>
                      )}
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {row.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {row.source}
                        </Badge>
                      </TableCell>
                      <TableCell numeric>
                        <Money value={row.debit} currency={currency} dashOnZero />
                      </TableCell>
                      <TableCell numeric>
                        <Money value={row.credit} currency={currency} dashOnZero />
                      </TableCell>
                      <TableCell numeric className="pr-4 font-medium">
                        <Money value={row.balance} currency={currency} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-4 pt-0">
                <Pagination
                  page={data!.page}
                  pageSize={data!.pageSize}
                  total={data!.total}
                  totalPages={data!.totalPages}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5">
        <SkeletonTable rows={12} columns={7} />
      </CardContent>
    </Card>
  );
}
