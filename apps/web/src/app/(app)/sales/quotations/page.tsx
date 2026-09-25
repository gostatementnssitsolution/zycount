"use client";

import { PERMISSIONS, multiplyMoney, sumMoney } from "@zycount/shared";
import { FileText, Plus } from "lucide-react";
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
import { DEMO_CURRENCY, QUOTATIONS } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function QuotationsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Quotations />
    </RequirePermission>
  );
}

function Quotations() {
  const open = QUOTATIONS.filter((quotation) => quotation.status !== "CANCELLED");
  const pipeline = sumMoney(open.map((quotation) => quotation.amount));
  const weighted = sumMoney(open.map((quotation) => multiplyMoney(quotation.amount, quotation.probability / 100)));

  const stats: Stat[] = [
    { key: "pipeline", label: "Open pipeline", value: pipeline, currency: DEMO_CURRENCY, hint: "The face value of every quotation not yet won or lost." },
    { key: "weighted", label: "Weighted pipeline", value: weighted, currency: DEMO_CURRENCY, hint: "Each quotation multiplied by its probability. Nothing here has touched the ledger — a quotation is not revenue." },
    { key: "count", label: "Open quotations", value: String(open.length), unit: "COUNT" },
    { key: "conversion", label: "Conversion rate", value: "62.4", unit: "PERCENT", changePercent: 4.8, comparison: "vs. last quarter", trend: [54, 56, 58, 57, 60, 62] },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quotations"
        description="Offers out to customers. Accepting one raises the invoice — and only then does anything post."
        actions={
          <Button size="sm">
            <Plus />
            New quotation
          </Button>
        }
      />

      <PreviewBanner module="Sales" phase={2} />
      <StatGrid stats={stats} />

      <Section title="Quotations" description="A quotation carries no accounting impact until it is converted." flush>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Quotation</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Probability</TableHead>
              <TableHead numeric className="pr-5">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {QUOTATIONS.map((quotation) => (
              <TableRow key={quotation.id} interactive>
                <TableCell className="pl-5">
                  <span className="font-mono text-xs font-medium text-brand">{quotation.number}</span>
                </TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(quotation.date)}</TableCell>
                <TableCell className="max-w-[16rem] truncate">{quotation.customer}</TableCell>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(quotation.expiresOn)}</TableCell>
                <TableCell>
                  <StatusBadge status={quotation.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={quotation.probability}
                      tone={quotation.probability >= 70 ? "success" : quotation.probability >= 40 ? "brand" : "muted"}
                      ariaLabel={`${quotation.number} probability`}
                      className="w-16"
                    />
                    <span className="tabular text-2xs text-muted-foreground">{quotation.probability}%</span>
                  </div>
                </TableCell>
                <TableCell numeric className="pr-5 font-medium">
                  <Money value={quotation.amount} currency={DEMO_CURRENCY} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TableCell colSpan={6} className="pl-5 font-medium">
                <FileText className="mr-1.5 inline size-3.5" aria-hidden />
                {QUOTATIONS.length} quotations
              </TableCell>
              <TableCell numeric className="pr-5 font-semibold">
                <Money value={sumMoney(QUOTATIONS.map((q) => q.amount))} currency={DEMO_CURRENCY} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Section>
    </div>
  );
}
