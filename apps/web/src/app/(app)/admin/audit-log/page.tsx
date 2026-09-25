"use client";

import { PERMISSIONS } from "@zycount/shared";
import { ScrollText, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Pagination } from "@/components/common/pagination";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonTable } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditActions, useAuditLog } from "@/hooks/use-admin";
import { useDebounced } from "@/hooks/use-ui";
import { formatDateTime, humaniseAction, initials } from "@/lib/format";

export default function AuditLogPage() {
  return (
    <RequirePermission permission={PERMISSIONS.AUDIT_VIEW}>
      <AuditLog />
    </RequirePermission>
  );
}

function AuditLog() {
  const [search, setSearch] = React.useState("");
  const [action, setAction] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);

  const debouncedSearch = useDebounced(search, 300);
  React.useEffect(() => setPage(1), [debouncedSearch, action, pageSize]);

  const { data: actions } = useAuditActions();
  const { data, isLoading, error, refetch } = useAuditLog({
    page,
    pageSize,
    q: debouncedSearch || undefined,
    action: action === "all" ? undefined : action,
  });

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every privileged action, appended and never edited."
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative min-w-[14rem] flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search action, record type or person…"
                className="pl-8"
                aria-label="Search the audit log"
              />
            </div>

            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[14rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every action</SelectItem>
                {(actions ?? []).map((candidate) => (
                  <SelectItem key={candidate} value={candidate}>
                    {humaniseAction(candidate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <div className="p-4">
              <ErrorState error={error} onRetry={() => void refetch()} />
            </div>
          ) : isLoading && !data ? (
            <div className="p-4">
              <SkeletonTable rows={12} columns={5} />
            </div>
          ) : (data?.data.length ?? 0) === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="Nothing recorded yet"
              description="Privileged actions such as posting, closing a period or changing a user appear here."
              className="m-4 border-0"
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">When</TableHead>
                    <TableHead>Who</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="pr-4">From</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data?.data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap pl-4 text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </TableCell>

                      <TableCell>
                        {entry.userName ? (
                          <div className="flex items-center gap-2">
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-2xs font-medium">
                              {initials(entry.userName)}
                            </span>
                            <span className="truncate">{entry.userName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap font-normal">
                          {humaniseAction(entry.action)}
                        </Badge>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {entry.entityType === "JournalEntry" && entry.entityId ? (
                          <Link
                            href={`/accounting/journals/${entry.entityId}`}
                            className="text-brand hover:underline"
                          >
                            {(entry.metadata?.reference as string) ?? "Journal entry"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {(entry.metadata?.name as string) ??
                              (entry.metadata?.reference as string) ??
                              entry.entityType}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="max-w-sm truncate text-sm text-muted-foreground">
                        {summarise(entry.metadata)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap pr-4 font-mono text-2xs text-muted-foreground">
                        {entry.ipAddress ?? "—"}
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

/** One readable line from whatever the action recorded. */
function summarise(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "—";

  if (typeof metadata.reason === "string") return metadata.reason;
  if (typeof metadata.totalDebit === "string") return `Amount ${metadata.totalDebit}`;
  if (typeof metadata.amount === "string") return `Amount ${metadata.amount}`;
  if (metadata.override === true) return "Closed with an override";
  if (Array.isArray(metadata.fields)) return `Changed: ${metadata.fields.join(", ")}`;
  if (typeof metadata.method === "string") return `Method: ${metadata.method}`;
  if (typeof metadata.email === "string") return metadata.email;

  return "—";
}
