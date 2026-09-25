"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Plus } from "lucide-react";
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
import { DEMO_CURRENCY, PAYMENTS } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function PaymentsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Payments />
    </RequirePermission>
  );
}

function Payments() {
  const total = sumMoney(PAYMENTS.map((payment) => payment.amount));
  const pending = sumMoney(PAYMENTS.filter((p) => p.status === "PENDING").map((p) => p.amount));

  const stats: Stat[] = [
    { key: "paid", label: "Paid this period", value: total, currency: DEMO_CURRENCY, changePercent: 4.2, comparison: "vs. last month", trend: [64, 68, 71, 69, 74, 76] },
    { key: "pending", label: "Awaiting release", value: pending, currency: DEMO_CURRENCY, hint: "Prepared but not yet sent to the bank." },
    { key: "count", label: "Payments", value: String(PAYMENTS.length), unit: "COUNT" },
    { key: "dpo", label: "Creditor days", value: "31", unit: "DAYS", changePercent: 6.9, comparison: "vs. last quarter", trend: [26, 28, 27, 30, 29, 31], hint: "Taking the full term without going late is working capital earned for free." },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        description="Money out, and the bill each payment settles."
        actions={
          <Button size="sm">
            <Plus />
            New payment
          </Button>
        }
      />

      <PreviewBanner module="Purchases" phase={2} />
      <StatGrid stats={stats} />

      <Section
        title="Payments"
        description="A payment clears the payable and credits the bank — the expense was recognised when the bill was posted."
        flush
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Payment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Applied to</TableHead>
              <TableHead>Status</TableHead>
              <TableHead numeric className="pr-5">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {PAYMENTS.map((payment) => (
              <TableRow key={payment.id} interactive>
                <TableCell className="pl-5 font-mono text-xs font-medium text-brand">{payment.number}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(payment.date)}</TableCell>
                <TableCell className="max-w-[14rem] truncate">{payment.supplier}</TableCell>
                <TableCell className="text-muted-foreground">{payment.method}</TableCell>
                <TableCell className="text-muted-foreground">{payment.account}</TableCell>
                <TableCell className="font-mono text-xs">{payment.applied}</TableCell>
                <TableCell>
                  <StatusBadge status={payment.status} />
                </TableCell>
                <TableCell numeric className="pr-5 font-medium">
                  <Money value={payment.amount} currency={DEMO_CURRENCY} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="pl-5 font-medium">
                {PAYMENTS.length} payments
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
