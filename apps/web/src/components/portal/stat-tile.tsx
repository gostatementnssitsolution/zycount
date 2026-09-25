"use client";

import { formatMoney } from "@zycount/shared";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info, type LucideIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface Stat {
  key: string;
  label: string;
  /** Money as a decimal string, or an already-formatted value with its own unit. */
  value: string;
  unit?: "MONEY" | "PERCENT" | "DAYS" | "MONTHS" | "RATIO" | "COUNT";
  currency?: string;
  changePercent?: number;
  /** `false` where a rise is bad — debtor days, burn, overdue balances. */
  positiveIsGood?: boolean;
  comparison?: string;
  trend?: number[];
  hint?: string;
  href?: string;
  icon?: LucideIcon;
}

export function formatStat(stat: Stat): string {
  switch (stat.unit ?? "MONEY") {
    case "MONEY":
      return formatMoney(stat.value, { currency: stat.currency ?? "MYR", showSymbol: true });
    case "PERCENT":
      return `${stat.value}%`;
    case "DAYS":
      return `${stat.value} days`;
    case "MONTHS":
      return `${stat.value} months`;
    case "RATIO":
    case "COUNT":
    default:
      return stat.value;
  }
}

/**
 * The figure leads, the comparison follows and is labelled, and the trend sits
 * behind both as shape only. A tile never shows a delta without saying what it
 * is measured against.
 */
export function StatTile({ stat, className }: { stat: Stat; className?: string }) {
  const positiveIsGood = stat.positiveIsGood ?? true;
  const change = stat.changePercent;
  const flat = change !== undefined && Math.abs(change) < 0.05;
  const good = change !== undefined && (positiveIsGood ? change > 0 : change < 0);
  const Icon = stat.icon;

  const tone = change === undefined || flat ? "muted" : good ? "success" : "destructive";
  const DeltaIcon = flat ? ArrowRight : (change ?? 0) > 0 ? ArrowUpRight : ArrowDownRight;

  const body = (
    <Card
      className={cn(
        "relative flex h-full flex-col gap-1.5 overflow-hidden p-4 transition-colors",
        stat.href && "hover:border-brand/40",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {Icon && <Icon className="size-3.5" aria-hidden />}
          {stat.label}
        </span>

        {stat.hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground">
                <Info className="size-3.5" aria-label={`What ${stat.label} means`} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{stat.hint}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="tabular text-2xl font-semibold tracking-tight">{formatStat(stat)}</div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-1">
        <div className="min-w-0">
          {change !== undefined && (
            <span
              className={cn(
                "tabular inline-flex items-center gap-0.5 text-xs font-medium",
                tone === "muted" ? "text-muted-foreground" : tone === "success" ? "text-success" : "text-destructive",
              )}
            >
              <DeltaIcon className="size-3.5" aria-hidden />
              {flat ? "No change" : `${Math.abs(change).toFixed(1)}%`}
            </span>
          )}
          {stat.comparison && (
            <div className="truncate text-2xs text-muted-foreground">{stat.comparison}</div>
          )}
        </div>

        {stat.trend && stat.trend.length > 1 && (
          <Sparkline
            data={stat.trend}
            tone={tone === "muted" ? "muted" : tone}
            label={`${stat.label} trend`}
            className="shrink-0"
          />
        )}
      </div>
    </Card>
  );

  if (!stat.href) return body;

  return (
    <Link href={stat.href} className="block h-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  );
}

export function StatGrid({
  stats,
  columns = 4,
  className,
}: {
  stats: Stat[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          "grid gap-3 sm:grid-cols-2",
          { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" }[columns],
          className,
        )}
      >
        {stats.map((stat) => (
          <StatTile key={stat.key} stat={stat} />
        ))}
      </div>
    </TooltipProvider>
  );
}
