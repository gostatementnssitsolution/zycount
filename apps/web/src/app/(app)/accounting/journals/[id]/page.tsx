"use client";

import { JOURNAL_SOURCE_LABELS, PERMISSIONS, type JournalSource } from "@zycount/shared";
import {
  ArrowLeft,
  Copy,
  Link2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { ReverseJournalDialog } from "@/components/accounting/reverse-dialog";
import { ErrorState } from "@/components/common/error-state";
import { PermissionGate, RequirePermission } from "@/components/common/permission-gate";
import { AuditTrail } from "@/components/common/audit-trail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDeleteJournal,
  useDuplicateJournal,
  useJournal,
  usePostJournal,
} from "@/hooks/use-accounting";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";

export default function JournalDetailPage() {
  return (
    <RequirePermission permission={PERMISSIONS.JOURNAL_VIEW}>
      <JournalDetail />
    </RequirePermission>
  );
}

function JournalDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { activeCompany } = useAuth();

  const [reverseOpen, setReverseOpen] = React.useState(false);

  const { data: journal, isLoading, error, refetch } = useJournal(params.id);
  const post = usePostJournal();
  const remove = useDeleteJournal();
  const duplicate = useDuplicateJournal();

  const currency = activeCompany?.baseCurrency ?? "MYR";

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (isLoading || !journal) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const onPost = async () => {
    try {
      await post.mutateAsync({ id: journal.id, version: journal.version });
      toast.success(`${journal.reference} posted to the ledger.`);
    } catch (caught) {
      toast.error(
        caught instanceof ApiError
          ? `${caught.message}${caught.posted === false ? " Nothing was posted." : ""}`
          : "Could not post this entry.",
      );
    }
  };

  const onDelete = async () => {
    try {
      await remove.mutateAsync(journal.id);
      toast.success(`${journal.reference} deleted.`);
      router.push("/accounting/journals");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not delete this entry.");
    }
  };

  const onDuplicate = async () => {
    try {
      const copy = await duplicate.mutateAsync(journal.id);
      toast.success(`Copied into ${copy.reference} as a draft.`);
      router.push(`/accounting/journals/${copy.id}/edit`);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not copy this entry.");
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/accounting/journals">
          <ArrowLeft />
          All journals
        </Link>
      </Button>

      {/* Detail header (docs/spec/08 §48): identity, amount, status, actions. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-xl font-semibold tracking-tight">{journal.reference}</h1>
            <StatusBadge status={journal.status} />
            <Badge variant="outline" className="font-normal">
              {JOURNAL_SOURCE_LABELS[journal.source as JournalSource] ?? journal.source}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {journal.description ?? "No description"} · {formatDate(journal.date)} ·{" "}
            {journal.fiscalPeriodName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {journal.status === "DRAFT" && (
            <>
              <PermissionGate permission={PERMISSIONS.JOURNAL_EDIT}>
                <Button variant="outline" asChild>
                  <Link href={`/accounting/journals/${journal.id}/edit`}>
                    <Pencil />
                    Edit
                  </Link>
                </Button>
              </PermissionGate>

              <PermissionGate permission={PERMISSIONS.JOURNAL_POST}>
                <Button onClick={() => void onPost()} loading={post.isPending}>
                  <Send />
                  Post to ledger
                </Button>
              </PermissionGate>
            </>
          )}

          {journal.status === "POSTED" && (
            <PermissionGate permission={PERMISSIONS.JOURNAL_REVERSE}>
              <Button variant="outline" onClick={() => setReverseOpen(true)}>
                <RotateCcw />
                Reverse
              </Button>
            </PermissionGate>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <PermissionGate permission={PERMISSIONS.JOURNAL_CREATE}>
                <DropdownMenuItem onSelect={() => void onDuplicate()}>
                  <Copy />
                  Duplicate as draft
                </DropdownMenuItem>
              </PermissionGate>

              {journal.status === "DRAFT" && (
                <PermissionGate permission={PERMISSIONS.JOURNAL_DELETE}>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={() => void onDelete()}>
                    <Trash2 />
                    Delete draft
                  </DropdownMenuItem>
                </PermissionGate>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {journal.status === "REVERSED" && journal.reversedById && (
        <Alert variant="warning">
          <RotateCcw />
          <AlertTitle>This entry has been reversed</AlertTitle>
          <AlertDescription>
            Reversed by{" "}
            <Link
              href={`/accounting/journals/${journal.reversedById}`}
              className="font-mono font-medium underline underline-offset-2"
            >
              {journal.reversedByReference}
            </Link>
            . Both entries remain in the ledger and net to zero.
          </AlertDescription>
        </Alert>
      )}

      {journal.reversalOfId && (
        <Alert variant="info">
          <Link2 />
          <AlertTitle>This is a reversal</AlertTitle>
          <AlertDescription>
            It reverses{" "}
            <Link
              href={`/accounting/journals/${journal.reversalOfId}`}
              className="font-mono font-medium underline underline-offset-2"
            >
              {journal.reversalOfReference}
            </Link>
            .{journal.memo ? ` Reason given: ${journal.memo}` : ""}
          </AlertDescription>
        </Alert>
      )}

      {journal.status === "DRAFT" && (
        <Alert>
          <Pencil />
          <AlertTitle>This entry is a draft</AlertTitle>
          <AlertDescription>
            It is not in the general ledger and does not appear on any report until it is posted.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-4">
          <Tabs defaultValue="lines">
            <TabsList>
              <TabsTrigger value="lines">Lines</TabsTrigger>
              <TabsTrigger value="audit">Audit trail</TabsTrigger>
            </TabsList>

            <TabsContent value="lines">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 pl-4">#</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead numeric>Debit</TableHead>
                        <TableHead numeric className="pr-4">
                          Credit
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {journal.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="pl-4 text-xs text-muted-foreground">
                            {line.lineNo}
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/accounting/general-ledger?accountId=${line.accountId}`}
                              className="hover:underline"
                            >
                              <span className="font-mono text-xs text-muted-foreground">
                                {line.accountCode}
                              </span>
                              <span className="ml-2">{line.accountName}</span>
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {line.description ?? "—"}
                          </TableCell>
                          <TableCell numeric>
                            <Money value={line.debit} currency={currency} dashOnZero />
                          </TableCell>
                          <TableCell numeric className="pr-4">
                            <Money value={line.credit} currency={currency} dashOnZero />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>

                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={3} className="pl-4 font-medium">
                          Total
                        </TableCell>
                        <TableCell numeric className="font-semibold">
                          <Money value={journal.totalDebit} currency={currency} />
                        </TableCell>
                        <TableCell numeric className="pr-4 font-semibold">
                          <Money value={journal.totalCredit} currency={currency} />
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <PermissionGate
                permission={PERMISSIONS.AUDIT_VIEW}
                fallback={
                  <Card>
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      Your role does not include access to the audit trail.
                    </CardContent>
                  </Card>
                }
              >
                <AuditTrail entityType="JournalEntry" entityId={journal.id} />
              </PermissionGate>
            </TabsContent>
          </Tabs>
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Detail label="Created by" value={journal.createdByName ?? "—"} />
            <Detail label="Created" value={formatDateTime(journal.createdAt)} />
            {journal.status !== "DRAFT" && (
              <>
                <Detail label="Posted by" value={journal.postedByName ?? "—"} />
                <Detail label="Posted" value={formatDateTime(journal.postedAt)} />
              </>
            )}
            <Detail label="Period" value={journal.fiscalPeriodName} />
            <Detail
              label="Period status"
              value={journal.periodStatus === "OPEN" ? "Open" : "Closed"}
            />
            <Detail label="Lines" value={String(journal.lines.length)} />
            {journal.memo && <Detail label="Note" value={journal.memo} />}
          </CardContent>
        </Card>
      </div>

      <ReverseJournalDialog
        open={reverseOpen}
        onOpenChange={setReverseOpen}
        journal={journal}
        currency={currency}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{value}</dd>
    </div>
  );
}
