"use client";

import { formatMoney, toCents, type DashboardKpi } from "@zycount/shared";
import * as React from "react";
import { Delta, Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

/**
 * Dashboard figures.
 *
 * Eight identical tiles give the eye nowhere to land. The result for the period
 * is the number someone opens this page for, so it gets the size; the rest read
 * as a supporting strip. Hierarchy here is the difference between a dashboard
 * and a wall of boxes.
 */
const HEADLINE_KEYS = ["netProfit", "revenue", "cash"];

export function KpiOverview({
  kpis,
  currency,
  comparisonLabel,
}: {
  kpis: DashboardKpi[];
  currency: string;
  comparisonLabel?: string;
}) {
  const byKey = new Map(kpis.map((kpi) => [kpi.key, kpi]));
  const headline = HEADLINE_KEYS.map((key) => byKey.get(key)).filter(Boolean) as DashboardKpi[];
  const rest = kpis.filter((kpi) => !HEADLINE_KEYS.includes(kpi.key));

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {headline.map((kpi, index) => (
          <Headline
            key={kpi.key}
            kpi={kpi}
            currency={currency}
            comparisonLabel={comparisonLabel}
            lead={index === 0}
          />
        ))}
      </div>

      {rest.length > 0 && (
        <dl className="grid grid-cols-2 border-t border-border bg-sunk/50 md:grid-cols-5">
          {rest.map((kpi) => (
            <Secondary key={kpi.key} kpi={kpi} currency={currency} />
          ))}
        </dl>
      )}
    </div>
  );
}

function Headline({
  kpi,
  currency,
  comparisonLabel,
  lead,
}: {
  kpi: DashboardKpi;
  currency: string;
  comparisonLabel?: string;
  lead: boolean;
}) {
  const negative = toCents(kpi.value) < 0;

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {kpi.label}
        </span>
        {kpi.previousValue !== null && (
          <Delta value={kpi.changePercent} positiveIsGood={kpi.positiveIsGood} />
        )}
      </div>

      <div
        className={cn(
          "mt-1.5 font-semibold tracking-tight",
          lead ? "text-[28px] leading-none" : "text-2xl leading-none",
          // The result is the one figure whose sign is worth colouring.
          lead && negative && "text-destructive",
        )}
      >
        <Money value={kpi.value} currency={currency} showSymbol />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {kpi.previousValue !== null && comparisonLabel ? (
          <>
            {comparisonLabel}{" "}
            <span className="tabular">
              {formatMoney(kpi.previousValue, { currency, showSymbol: true })}
            </span>
          </>
        ) : (
          kpi.hint
        )}
      </p>
    </div>
  );
}

function Secondary({ kpi, currency }: { kpi: DashboardKpi; currency: string }) {
  return (
    <div className="border-b border-r border-border/60 px-4 py-3 last:border-r-0">
      <dt className="truncate text-2xs uppercase tracking-[0.06em] text-muted-foreground" title={kpi.hint}>
        {kpi.label}
      </dt>
      <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-semibold">
          <Money value={kpi.value} currency={currency} showSymbol />
        </span>
        {kpi.previousValue !== null && (
          <Delta value={kpi.changePercent} positiveIsGood={kpi.positiveIsGood} />
        )}
      </dd>
    </div>
  );
}
