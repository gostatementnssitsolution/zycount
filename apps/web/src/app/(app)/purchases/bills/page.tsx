"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { CheckCircle2, FileText, Plus, Upload } from "lucide-react";
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
import { BILLS, DEMO_CURRENCY } from "@/lib/demo";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["DRAFT", "PENDING", "APPROVED", "PAID", "OVERDUE"] as const;

export default function BillsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Bills />
    </RequirePermission>
  );
}

function Bills() {
  const [search, setSearch] = React.useState("");
  const [statuses, setStatuses] = React.useState<string[]>([]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return BILLS.filter((bill) => {
      const matchesSearch =
        needle === "" ||
        bill.number.toLowerCase().includes(needle) ||
        bill.partyName.toLowerCase().includes(needle) ||
        (bill.reference ?? "").toLowerCase().includes(needle);
      return matchesSearch && (statuses.length === 0 || statuses.includes(bill.status));
    });
  }, [search, statuses]);

  const payable = sumMoney(BILLS.map((bill) => bill.balance));
  const overdue = sumMoney(BILLS.filter((bill) => bill.status === "OVERDUE").map((bill) => bill.balance));
  const awaiting = BILLS.filter((bill) => bill.status === "PENDING" || bill.status === "DRAFT");
  const dueThisWeek = sumMoney(
    BILLS.filter((bill) => bill.status === "APPROVED" || bill.status === "PENDING").map((bill) => bill.balance),
  );

  const stats: Stat[] = [
    { key: "payable", label: "Total payable", value: payable, currency: DEMO_CURRENCY, hint: "Everything approved or awaiting approval that is still unpaid." },
    { key: "overdue", label: "Overdue", value: overdue, currency: DEMO_CURRENCY, positiveIsGood: false, comparison: "1 supplier", href: "/purchases/ap-aging" },
    { key: "due", label: "Falling due", value: dueThisWeek, currency: DEMO_CURRENCY, comparison: "within 30 days" },
    { key: "awaiting", label: "Awaiting approval", value: String(awaiting.length), unit: "COUNT", comparison: "oldest waiting 2 days" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bills"
        description="What suppliers have charged, what it was coded to, and what is still owed."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/purchases/expenses">
                <Upload />
                Capture receipt
              </Link>
            </Button>
            <Button size="sm">
              <Plus />
              New bill
            </Button>
          </>
        }
      />

      <PreviewBanner module="Purchases" phase={2} />
      <StatGrid stats={stats} />

      <Card>
        <CardContent className="space-y-4 p-4">
          <ListToolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by number, supplier or reference…"
            actions={
              <Button variant="outline" size="sm">
                <CheckCircle2 />
                Approve selected
              </Button>
            }
          >
            <FilterBar>
              {STATUS_FILTERS.map((status) => (
                <FilterChip
                  key={status}
                  active={statuses.includes(status)}
                  count={BILLS.filter((bill) => bill.status === status).length}
                  onClick={() =>
                    setStatuses((current) =>
                      current.includes(status) ? current.filter((value) => value !== status) : [...current, status],
                    )
                  }
                >
                  <StatusBadge status={status} showIcon={false} className="border-0 bg-transparent px-0 py-0 text-xs" />
                </FilterChip>
              ))}
            </FilterBar>
          </ListToolbar>

          <ResultSummary showing={filtered.length} total={BILLS.length} noun="bills">
            <span>
              Outstanding{" "}
              <Money
                value={sumMoney(filtered.map((bill) => bill.balance))}
                currency={DEMO_CURRENCY}
                showSymbol
                className="font-medium text-foreground"
              />
            </span>
          </ResultSummary>

          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="No bills match those filters" />
          ) : (
            <div className="-mx-4 -mb-4 overflow-hidden border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Bill</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Coded to</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead numeric>Total</TableHead>
                    <TableHead numeric className="pr-4">
                      Balance
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((bill) => {
                    const accounts = [...new Set(bill.lines.map((line) => line.accountCode))];

                    return (
                      <TableRow key={bill.id} interactive>
                        <TableCell className="pl-4">
                          <Link
                            href={`/purchases/bills/${bill.id}`}
                            className="font-mono text-xs font-medium text-brand hover:underline"
                          >
                            {bill.number}
                          </Link>
                          {bill.reference && (
                            <div className="mt-0.5 max-w-[10rem] truncate text-2xs text-muted-foreground">
                              {bill.reference}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[15rem] truncate">{bill.partyName}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(bill.issuedOn)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "whitespace-nowrap",
                            bill.status === "OVERDUE" ? "font-medium text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {formatDate(bill.dueOn)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {accounts.join(", ")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={bill.status} />
                        </TableCell>
                        <TableCell numeric>
                          <Money value={bill.total} currency={bill.currency} />
                        </TableCell>
                        <TableCell numeric className="pr-4 font-medium">
                          <Money value={bill.balance} currency={bill.currency} dashOnZero />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="pl-4 font-medium">
                      {filtered.length} of {BILLS.length} bills
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={sumMoney(filtered.map((bill) => bill.total))} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric className="pr-4 font-semibold">
                      <Money value={sumMoney(filtered.map((bill) => bill.balance))} currency={DEMO_CURRENCY} />
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
