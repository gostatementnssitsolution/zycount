"use client";

import {
  JOURNAL_SOURCE_LABELS,
  PERMISSIONS,
  type JournalSource,
} from "@zycount/shared";
import { BookOpen, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Pagination } from "@/components/common/pagination";
import { PeriodPicker } from "@/components/common/period-picker";
import { PermissionGate, RequirePermission } from "@/components/common/permission-gate";
import { HeaderMeta, PageHeader } from "@/components/layout/page-header";
import {
  ClearFilters,
  DensityControl,
  ResultCount,
  Toolbar,
  ToolbarDivider,
  ToolbarSpacer,
} from "@/components/layout/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJournals } from "@/hooks/use-accounting";
import { useDebounced } from "@/hooks/use-ui";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";

export default function JournalsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.JOURNAL_VIEW}>
      <Journals />
    </RequirePermission>
  );
}

function Journals() {
  const router = useRouter();
  const { activeCompany } = useAuth();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [periodId, setPeriodId] = React.useState<string | undefined>();

  const debouncedSearch = useDebounced(search, 300);

  // Any filter change invalidates the current page number.
  React.useEffect(() => setPage(1), [debouncedSearch, status, source, periodId, pageSize]);

  const { data, isLoading, error, refetch } = useJournals({
    page,
    pageSize,
    q: debouncedSearch || undefined,
    status: status === "all" ? undefined : status,
    source: source === "all" ? undefined : source,
    fiscalPeriodId: periodId,
    sort: "-date",
  });

  const filterCount =
    (debouncedSearch ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (source !== "all" ? 1 : 0) +
    (periodId ? 1 : 0);
  const hasFilters = filterCount > 0;

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setSource("all");
    setPeriodId(undefined);
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Accounting" }, { label: "Journal Entries" }]}
        title="Journal Entries"
        description="Every accounting event, as a balanced set of debits and credits."
        meta={
          data ? <HeaderMeta label="Total" value={data.total.toLocaleString()} /> : null
        }
        actions={
          <PermissionGate permission={PERMISSIONS.JOURNAL_CREATE}>
            <Button onClick={() => router.push("/accounting/journals/new")}>
              <Plus />
              New journal
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Toolbar>
            <div className="relative min-w-[12rem] flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reference or description…"
                className="h-8 pl-8 text-[13px]"
                aria-label="Search journals"
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-8 w-[8.5rem] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="REVERSED">Reversed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-8 w-[9.5rem] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any source</SelectItem>
                {Object.entries(JOURNAL_SOURCE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <PeriodPicker value={periodId} onChange={setPeriodId} className="h-8 w-[11rem] text-[13px]" includeAll />

            <ClearFilters onClear={clearFilters} count={filterCount} />

            <ToolbarSpacer />
            {data && <ResultCount shown={data.data.length} total={data.total} />}
            <ToolbarDivider />
            <DensityControl />
          </Toolbar>

          {error ? (
            <div className="p-4">
              <ErrorState error={error} onRetry={() => void refetch()} />
            </div>
          ) : isLoading && !data ? (
            <div className="p-4">
              <SkeletonTable rows={10} columns={7} />
            </div>
          ) : (data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={hasFilters ? "No journals match these filters" : "No journal entries yet"}
              description={
                hasFilters
                  ? "Try widening the date range or clearing a filter."
                  : "Every accounting event in Zycount starts as a journal entry."
              }
              action={
                hasFilters ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <PermissionGate permission={PERMISSIONS.JOURNAL_CREATE}>
                    <Button onClick={() => router.push("/accounting/journals/new")}>
                      <Plus />
                      Create the first entry
                    </Button>
                  </PermissionGate>
                )
              }
              className="m-4 border-0"
            />
          ) : (
            <>
              <Table stickyHeader containerClassName="max-h-[68vh]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead numeric className="pr-4">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data?.data.map((entry) => (
                    <TableRow
                      key={entry.id}
                      interactive
                      onClick={() => router.push(`/accounting/journals/${entry.id}`)}
                    >
                      <TableCell className="pl-4">
                        <Link
                          href={`/accounting/journals/${entry.id}`}
                          className="font-mono text-xs font-medium text-brand hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {entry.reference}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell className="max-w-sm truncate">
                        {entry.description ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {entry.fiscalPeriodName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {JOURNAL_SOURCE_LABELS[entry.source as JournalSource] ?? entry.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={entry.status} />
                      </TableCell>
                      <TableCell numeric className="pr-4 font-medium">
                        <Money
                          value={entry.totalDebit}
                          currency={activeCompany?.baseCurrency ?? "MYR"}
                        />
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
