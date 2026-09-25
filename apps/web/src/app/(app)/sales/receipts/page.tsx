"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Plus, Wallet } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { Button } from "@/components/ui/button";
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
import { DEMO_CURRENCY, RECEIPTS } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function ReceiptsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Receipts />
    </RequirePermission>
  );
}

function Receipts() {
  const total = sumMoney(RECEIPTS.map((receipt) => receipt.amount));
  const unapplied = sumMoney(RECEIPTS.filter((r) => r.applied === "Unapplied").map((r) => r.amount));

  const stats: Stat[] = [
    { key: "received", label: "Received this period", value: total, currency: DEMO_CURRENCY, changePercent: 18.2, comparison: "vs. last month", trend: [86, 94, 102, 118, 124, 137] },
    { key: "unapplied", label: "Not yet applied", value: unapplied, currency: DEMO_CURRENCY, positiveIsGood: false, hint: "Money received that has not been matched to an invoice. Until it is, the customer still shows as owing." },
    { key: "count", label: "Receipts", value: String(RECEIPTS.length), unit: "COUNT", comparison: "in the current period" },
    { key: "dso", label: "Average days to pay", value: "38", unit: "DAYS", positiveIsGood: false, changePercent: -5.0, comparison: "vs. last quarter", trend: [44, 42, 41, 39, 40, 38] },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Receipts"
        description="Money in, and the invoice each payment settles."
        actions={
          <Button size="sm">
            <Plus />
            Record receipt
          </Button>
        }
      />

      <PreviewBanner module="Sales" phase={2} />
      <StatGrid stats={stats} />

      <Section
        title="Receipts"
        description="A receipt debits the bank and clears the receivable — never revenue, which was recognised on the invoice."
        flush
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/banking/reconciliation">
              <Wallet />
              Reconcile bank
            </Link>
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Receipt</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Into</TableHead>
              <TableHead>Applied to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead numeric className="pr-5">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {RECEIPTS.map((receipt) => (
              <TableRow key={receipt.id} interactive>
                <TableCell className="pl-5 font-mono text-xs font-medium text-brand">{receipt.number}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(receipt.date)}</TableCell>
                <TableCell className="max-w-[14rem] truncate">{receipt.customer}</TableCell>
                <TableCell className="text-muted-foreground">{receipt.method}</TableCell>
                <TableCell className="text-muted-foreground">{receipt.account}</TableCell>
                <TableCell>
                  {receipt.applied === "Unapplied" ? (
                    <span className="text-warning">Unapplied</span>
                  ) : (
                    <span className="font-mono text-xs">{receipt.applied}</span>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={receipt.status} />
                </TableCell>
                <TableCell numeric className="pr-5 font-medium">
                  <Money value={receipt.amount} currency={DEMO_CURRENCY} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="pl-5 font-medium">
                {RECEIPTS.length} receipts
              </TableCell>
              <TableCell numeric className="pr-5 font-semibold">
                <Money value={total} currency={DEMO_CURRENCY} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Section>
    </div>
  );
}
