"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Download, Plus, Receipt, Send } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { FilterBar, FilterChip, ListToolbar, ResultSummary } from "@/components/portal/toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_CURRENCY, INVOICES } from "@/lib/demo";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["POSTED", "PARTIALLY_PAID", "OVERDUE", "PAID", "DRAFT", "PENDING", "CANCELLED"] as const;

export default function InvoicesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Invoices />
    </RequirePermission>
  );
}

function Invoices() {
  const [search, setSearch] = React.useState("");
  const [statuses, setStatuses] = React.useState<string[]>([]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return INVOICES.filter((invoice) => {
      const matchesSearch =
        needle === "" ||
        invoice.number.toLowerCase().includes(needle) ||
        invoice.partyName.toLowerCase().includes(needle) ||
        (invoice.reference ?? "").toLowerCase().includes(needle);
      const matchesStatus = statuses.length === 0 || statuses.includes(invoice.status);
      return matchesSearch && matchesStatus;
    });
  }, [search, statuses]);

  const outstanding = sumMoney(INVOICES.filter((i) => i.status !== "CANCELLED").map((i) => i.balance));
  const overdue = sumMoney(INVOICES.filter((i) => i.status === "OVERDUE").map((i) => i.balance));
  const awaitingApproval = INVOICES.filter((i) => i.status === "PENDING");
  const collected = sumMoney(INVOICES.map((i) => i.paid));

  const stats: Stat[] = [
    { key: "outstanding", label: "Outstanding", value: outstanding, currency: DEMO_CURRENCY, changePercent: 6.4, comparison: "vs. last month", trend: [402, 418, 441, 468, 492, Number(outstanding) / 1000], hint: "Every issued invoice not yet settled in full." },
    { key: "overdue", label: "Overdue", value: overdue, currency: DEMO_CURRENCY, changePercent: -12.1, positiveIsGood: false, comparison: "vs. last month", trend: [96, 88, 84, 79, 74, Number(overdue) / 1000], hint: "Past its due date and still unpaid.", href: "/sales/ar-aging" },
    { key: "collected", label: "Collected", value: collected, currency: DEMO_CURRENCY, changePercent: 18.2, comparison: "this period", trend: [286, 301, 318, 342, 368, Number(collected) / 1000], hint: "Receipts applied against invoices in the current period." },
    { key: "approval", label: "Awaiting approval", value: String(awaitingApproval.length), unit: "COUNT", comparison: "above the RM 50,000 limit", hint: "Invoices that need a finance manager before they can be issued." },
  ];

  const filteredTotal = sumMoney(filtered.map((invoice) => invoice.total));
  const filteredBalance = sumMoney(filtered.map((invoice) => invoice.balance));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description="Every sales invoice, what it posted, and what is still owed on it."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download />
              Export
            </Button>
            <Button size="sm">
              <Plus />
              New invoice
            </Button>
          </>
        }
      />

      <PreviewBanner module="Sales" phase={2} />

      <StatGrid stats={stats} />

      <Card>
        <CardContent className="space-y-4 p-4">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by number, customer or PO…"
            actions={
              <Button variant="outline" size="sm">
                <Send />
                Send reminders
              </Button>
            }
          >
            <FilterBar>
              {STATUS_FILTERS.map((status) => (
                <FilterChip
                  key={status}
                  active={statuses.includes(status)}
                  count={INVOICES.filter((invoice) => invoice.status === status).length}
                  onClick={() =>
                    setStatuses((current) =>
                      current.includes(status)
                        ? current.filter((value) => value !== status)
                        : [...current, status],
                    )
                  }
                >
                  <StatusBadge status={status} showIcon={false} className="border-0 bg-transparent px-0 py-0 text-xs" />
                </FilterChip>
              ))}
            </FilterBar>
          </ListToolbar>

          <ResultSummary showing={filtered.length} total={INVOICES.length} noun="invoices">
            <span>
              Total <Money value={filteredTotal} currency={DEMO_CURRENCY} showSymbol className="font-medium text-foreground" />
            </span>
            <span>
              Outstanding <Money value={filteredBalance} currency={DEMO_CURRENCY} showSymbol className="font-medium text-foreground" />
            </span>
          </ResultSummary>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices match those filters"
              description="Clear a filter, or search for a different customer or invoice number."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatuses([]);
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="-mx-4 -mb-4 overflow-hidden border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28">Settled</TableHead>
                    <TableHead numeric>Total</TableHead>
                    <TableHead numeric className="pr-4">
                      Balance
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((invoice) => {
                    const settled = Number(invoice.total) === 0 ? 0 : (Number(invoice.paid) / Number(invoice.total)) * 100;
                    const late = invoice.status === "OVERDUE";

                    return (
                      <TableRow key={invoice.id} interactive>
                        <TableCell className="pl-4">
                          <Link
                            href={`/sales/invoices/${invoice.id}`}
                            className="font-mono text-xs font-medium text-brand hover:underline"
                          >
                            {invoice.number}
                          </Link>
                          {invoice.reference && (
                            <div className="mt-0.5 text-2xs text-muted-foreground">{invoice.reference}</div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[16rem] truncate">{invoice.partyName}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(invoice.issuedOn)}
                        </TableCell>
                        <TableCell className={cn("whitespace-nowrap", late ? "font-medium text-destructive" : "text-muted-foreground")}>
                          {formatDate(invoice.dueOn)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={invoice.status} />
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={settled}
                            tone={settled >= 100 ? "success" : late ? "destructive" : "brand"}
                            ariaLabel={`${invoice.number} settled`}
                          />
                        </TableCell>
                        <TableCell numeric>
                          <Money value={invoice.total} currency={invoice.currency} />
                        </TableCell>
                        <TableCell numeric className="pr-4 font-medium">
                          <Money value={invoice.balance} currency={invoice.currency} dashOnZero />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="pl-4 font-medium">
                      {filtered.length} of {INVOICES.length} invoices
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={filteredTotal} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric className="pr-4 font-semibold">
                      <Money value={filteredBalance} currency={DEMO_CURRENCY} />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
