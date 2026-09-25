"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Play } from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { Field, FieldGrid, Section } from "@/components/portal/detail";
import { PostingPreview } from "@/components/portal/posting-preview";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
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
import { DEMO_CURRENCY, DEPRECIATION_RUN, FIXED_ASSETS } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function DepreciationPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Depreciation />
    </RequirePermission>
  );
}

function Depreciation() {
  const charging = FIXED_ASSETS.filter((asset) => asset.status === "IN_USE");
  const charge = sumMoney(charging.map((asset) => asset.monthlyCharge));

  const stats: Stat[] = [
    { key: "charge", label: "Charge for the month", value: charge, currency: DEMO_CURRENCY, comparison: `${charging.length} assets`, hint: "One entry covers every asset — debit 6600 Depreciation, credit 1590 Accumulated Depreciation." },
    { key: "ytd", label: "Charged year to date", value: "103961.25", currency: DEMO_CURRENCY },
    { key: "assets", label: "Assets depreciating", value: String(charging.length), unit: "COUNT", comparison: `${FIXED_ASSETS.length} in the register` },
    { key: "nbv", label: "Net book value after", value: sumMoney([sumMoney(charging.map((a) => a.netBookValue)), `-${charge}`]), currency: DEMO_CURRENCY },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Depreciation"
        description={`The charge for ${DEPRECIATION_RUN.period}, asset by asset, before anything posts.`}
        actions={
          <Button size="sm">
            <Play />
            Post the run
          </Button>
        }
      />

      <PreviewBanner module="Fixed assets" phase={4} />
      <StatGrid stats={stats} />

      <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
        <Section
          title={`${DEPRECIATION_RUN.period} run`}
          description="Each asset's charge follows its own method and remaining life."
          flush
          actions={<StatusBadge status={DEPRECIATION_RUN.status} />}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Asset</TableHead>
                <TableHead>Method</TableHead>
                <TableHead numeric>Cost</TableHead>
                <TableHead numeric>Accumulated</TableHead>
                <TableHead numeric>Charge</TableHead>
                <TableHead numeric className="pr-5">
                  NBV after
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {charging.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="pl-5">
                    <div className="max-w-[16rem] truncate font-medium">{asset.name}</div>
                    <div className="mt-0.5 font-mono text-2xs text-muted-foreground">
                      {asset.code} · acquired {formatDate(asset.acquiredOn)}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {asset.method === "STRAIGHT_LINE" ? "Straight line" : "Reducing balance"}
                  </TableCell>
                  <TableCell numeric>
                    <Money value={asset.cost} currency={DEMO_CURRENCY} />
                  </TableCell>
                  <TableCell numeric className="text-muted-foreground">
                    <Money value={asset.accumulated} currency={DEMO_CURRENCY} />
                  </TableCell>
                  <TableCell numeric className="font-medium">
                    <Money value={asset.monthlyCharge} currency={DEMO_CURRENCY} />
                  </TableCell>
                  <TableCell numeric className="pr-5">
                    <Money
                      value={sumMoney([asset.netBookValue, `-${asset.monthlyCharge}`])}
                      currency={DEMO_CURRENCY}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="pl-5 font-medium">
                  {charging.length} assets
                </TableCell>
                <TableCell numeric className="font-semibold">
                  <Money value={charge} currency={DEMO_CURRENCY} />
                </TableCell>
                <TableCell numeric className="pr-5 font-semibold">
                  <Money
                    value={sumMoney([sumMoney(charging.map((a) => a.netBookValue)), `-${charge}`])}
                    currency={DEMO_CURRENCY}
                  />
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Section>

        <div className="min-w-0 space-y-5">
          <Section title="Entry on posting" description="One entry for the whole run.">
            <FieldGrid columns={2} className="mb-4">
              <Field label="Period">{DEPRECIATION_RUN.period}</Field>
              <Field label="Posting date">{formatDate(DEPRECIATION_RUN.posting.date)}</Field>
            </FieldGrid>

            <PostingPreview posting={DEPRECIATION_RUN.posting} currency={DEMO_CURRENCY} />

            <p className="mt-4 text-xs text-muted-foreground">
              Depreciation moves value from the balance sheet to the profit and loss account. It never touches
              cash, which is why profit and cash flow diverge in any month with a large charge.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
