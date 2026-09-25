"use client";

import type { DashboardKpi } from "@zycount/shared";
import { Info } from "lucide-react";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Delta, Money } from "@/components/ui/money";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * KPI tiles (docs/spec/08 §18).
 *
 * The figure leads; the comparison is secondary and explicitly labelled, so a
 * green arrow can never be mistaken for the number itself.
 */
export function KpiGrid({
  kpis,
  currency,
  comparisonLabel,
}: {
  kpis: DashboardKpi[];
  currency: string;
  comparisonLabel?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiTile key={kpi.key} kpi={kpi} currency={currency} comparisonLabel={comparisonLabel} />
        ))}
      </div>
    </TooltipProvider>
  );
}

function KpiTile({
  kpi,
  currency,
  comparisonLabel,
}: {
  kpi: DashboardKpi;
  currency: string;
  comparisonLabel?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {kpi.label}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground/60 hover:text-muted-foreground">
              <Info className="size-3.5" aria-label={`What ${kpi.label} means`} />
            </button>
          </TooltipTrigger>
          <TooltipContent>{kpi.hint}</TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-1.5 text-2xl font-semibold tracking-tight">
        <Money value={kpi.value} currency={currency} showSymbol />
      </div>

      {kpi.previousValue !== null && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <Delta value={kpi.changePercent} positiveIsGood={kpi.positiveIsGood} />
          {comparisonLabel && (
            <span className="text-2xs text-muted-foreground">{comparisonLabel}</span>
          )}
        </div>
      )}
    </Card>
  );
}
