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
import { DEMO_CURRENCY, PURCHASE_ORDERS } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function PurchaseOrdersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <PurchaseOrders />
    </RequirePermission>
  );
}

function PurchaseOrders() {
  const committed = sumMoney(PURCHASE_ORDERS.filter((order) => order.status !== "DRAFT").map((order) => order.amount));

  const stats: Stat[] = [
    { key: "committed", label: "Committed spend", value: committed, currency: DEMO_CURRENCY, hint: "Ordered but not yet billed. A purchase order is a commitment, not a liability — nothing posts until the goods and the bill arrive." },
    { key: "open", label: "Open orders", value: String(PURCHASE_ORDERS.filter((o) => o.received < 100).length), unit: "COUNT" },
    { key: "awaiting", label: "Awaiting delivery", value: sumMoney(PURCHASE_ORDERS.filter((o) => o.received === 0 && o.status !== "DRAFT").map((o) => o.amount)), currency: DEMO_CURRENCY },
    { key: "late", label: "Past expected date", value: "0", unit: "COUNT", comparison: "all on schedule" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        description="What has been ordered, what has arrived, and what it will cost."
        actions={
          <Button size="sm">
            <Plus />
            New order
          </Button>
        }
      />

      <PreviewBanner module="Purchases" phase={3} />
      <StatGrid stats={stats} />

      <Section title="Orders" description="Receiving against an order raises the goods-received note; the bill follows." flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Order</TableHead>
              <TableHead>Raised</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-36">Received</TableHead>
              <TableHead numeric className="pr-5">
                Value
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {PURCHASE_ORDERS.map((order) => (
              <TableRow key={order.id} interactive>
                <TableCell className="pl-5 font-mono text-xs font-medium text-brand">{order.number}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(order.date)}</TableCell>
                <TableCell className="max-w-[16rem] truncate">{order.supplier}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(order.expected)}</TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={order.received}
                      tone={order.received === 100 ? "success" : order.received > 0 ? "brand" : "muted"}
                      ariaLabel={`${order.number} received`}
                      className="w-20"
                    />
                    <span className="tabular text-2xs text-muted-foreground">{order.received}%</span>
                  </div>
                </TableCell>
                <TableCell numeric className="pr-5 font-medium">
                  <Money value={order.amount} currency={DEMO_CURRENCY} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TableCell colSpan={6} className="pl-5 font-medium">
                {PURCHASE_ORDERS.length} orders
              </TableCell>
              <TableCell numeric className="pr-5 font-semibold">
                <Money value={sumMoney(PURCHASE_ORDERS.map((o) => o.amount))} currency={DEMO_CURRENCY} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Section>
    </div>
  );
}
