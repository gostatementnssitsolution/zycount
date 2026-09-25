"use client";

import { PERMISSIONS, formatMoney } from "@zycount/shared";
import { ArrowRight, CheckCircle2, CircleAlert, Minus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { MovementChart, RatioChart } from "@/components/portal/charts";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { PageBadge } from "@/components/portal/page-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DEMO_CURRENCY,
  HEALTH_METRICS,
  MARGIN_TREND,
  REVENUE_MOVEMENT,
  type HealthMetric,
} from "@/lib/demo";
import { cn } from "@/lib/utils";

const SIGNAL = {
  1: { label: "On track", icon: CheckCircle2, tone: "text-success", ring: "border-success/30 bg-success/5" },
  0: { label: "Watch", icon: CircleAlert, tone: "text-warning", ring: "border-warning/30 bg-warning/5" },
  [-1]: { label: "Act", icon: TriangleAlert, tone: "text-destructive", ring: "border-destructive/30 bg-destructive/5" },
} as const;

function formatMetric(metric: Pick<HealthMetric, "value" | "unit">): string {
  switch (metric.unit) {
    case "MONEY":
      return formatMoney(metric.value, { currency: DEMO_CURRENCY, showSymbol: true });
    case "PERCENT":
      return `${metric.value}%`;
    case "DAYS":
      return `${metric.value} days`;
    case "MONTHS":
      return `${metric.value} months`;
    default:
      return metric.value;
  }
}

export default function BusinessHealthPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <BusinessHealth />
    </RequirePermission>
  );
}

function BusinessHealth() {
  const acting = HEALTH_METRICS.filter((metric) => metric.signal === -1);
  const watching = HEALTH_METRICS.filter((metric) => metric.signal === 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Business health"
        description="The eight measures that say whether the business is sound, each traced to the ledger it came from."
        actions={<PageBadge>September 2026</PageBadge>}
      />

      <PreviewBanner module="Business health" phase={5} />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-4 p-5">
          <div>
            <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Overall</div>
            <div className="mt-1 flex items-center gap-2">
              <CheckCircle2 className="size-5 text-success" aria-hidden />
              <span className="text-xl font-semibold">Sound</span>
            </div>
          </div>

          <p className="min-w-[16rem] flex-1 text-sm text-muted-foreground">
            Six of eight measures are at or better than target. Cash runway has lengthened for six straight
            months and margin is improving. The one to act on is inventory: stock is sitting 19 days longer
            than the 45-day target, and two SKUs account for most of it.
          </p>

          <div className="flex gap-6">
            <div className="text-center">
              <div className="tabular text-2xl font-semibold text-success">
                {HEALTH_METRICS.filter((metric) => metric.signal === 1).length}
              </div>
              <div className="text-2xs uppercase tracking-wide text-muted-foreground">On track</div>
            </div>
            <div className="text-center">
              <div className="tabular text-2xl font-semibold text-warning">{watching.length}</div>
              <div className="text-2xs uppercase tracking-wide text-muted-foreground">Watch</div>
            </div>
            <div className="text-center">
              <div className="tabular text-2xl font-semibold text-destructive">{acting.length}</div>
              <div className="text-2xs uppercase tracking-wide text-muted-foreground">Act</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <TooltipProvider delayDuration={200}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HEALTH_METRICS.map((metric) => {
            const signal = SIGNAL[metric.signal];
            const Icon = signal.icon;

            return (
              <Tooltip key={metric.key}>
                <TooltipTrigger asChild>
                  <Card className={cn("cursor-help p-4 transition-colors", signal.ring)}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {metric.label}
                      </span>
                      <Icon className={cn("size-4 shrink-0", signal.tone)} aria-label={signal.label} />
                    </div>

                    <div className="tabular mt-1.5 text-2xl font-semibold tracking-tight">
                      {formatMetric(metric)}
                    </div>

                    <div className="mt-2 flex items-end justify-between gap-2">
                      <span className="text-2xs text-muted-foreground">
                        {metric.target
                          ? `Target ${formatMetric({ value: metric.target, unit: metric.unit })}`
                          : "No target set"}
                      </span>
                      <Sparkline
                        data={metric.trend}
                        tone={metric.signal === 1 ? "success" : metric.signal === 0 ? "warning" : "destructive"}
                        label={`${metric.label} over six months`}
                        width={72}
                        height={24}
                      />
                    </div>
                  </Card>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{metric.hint}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      <div className="grid gap-5 lg:grid-cols-2">
        <RatioChart
          title="Margin"
          description="Gross and operating margin across six months."
          data={MARGIN_TREND}
          lines={[
            { key: "grossMargin", label: "Gross margin" },
            { key: "operatingMargin", label: "Operating margin" },
          ]}
        />

        <MovementChart
          title="Revenue, expenses and profit"
          description="The twelve months behind the ratios above."
          data={REVENUE_MOVEMENT.slice(-6)}
          currency={DEMO_CURRENCY}
          bars={[
            { key: "revenue", label: "Revenue" },
            { key: "expenses", label: "Expenses" },
          ]}
          line={{ key: "netProfit", label: "Net profit" }}
        />
      </div>

      <Section
        title="What to do about it"
        description="Each item names the measure it moves and the screen where the work happens."
      >
        <ul className="divide-y">
          {[
            {
              metric: "Inventory days",
              signal: -1 as const,
              action: "Two SKUs hold 64% of the excess stock value. Clearing them would bring inventory days back under 50.",
              href: "/inventory",
              cta: "Open inventory",
            },
            {
              metric: "Debtor days",
              signal: 0 as const,
              action: "RM 63,226.80 is past due across two customers, one of them 22 days late. Statements have not gone out this month.",
              href: "/sales/ar-aging",
              cta: "Review AR aging",
            },
            {
              metric: "Cash runway",
              signal: 1 as const,
              action: "Runway has lengthened for six months. Nothing to do — but the RM 148,500 order raised on 22 September is not yet in the forecast.",
              href: "/purchases/orders",
              cta: "See committed spend",
            },
          ].map((item) => {
            const signal = SIGNAL[item.signal];
            const Icon = signal.icon;

            return (
              <li key={item.metric} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
                <Icon className={cn("mt-0.5 size-4 shrink-0", signal.tone)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{item.metric}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{item.action}</p>
                </div>
                <Link
                  href={item.href}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
                >
                  {item.cta}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Minus className="size-3" aria-hidden />
        Every measure here is computed from posted entries only. Drafts, quotations and purchase orders are
        excluded, because none of them has happened yet.
      </p>
    </div>
  );
}
