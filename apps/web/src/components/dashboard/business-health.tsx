import type { BusinessHealthMetric } from "@zycount/shared";
import { CircleAlert, CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Business-health panel.
 *
 * Each metric carries a status stripe as well as an icon and a word, so what
 * needs attention is visible in a glance down the left edge — and still
 * readable in greyscale or to a colour-blind reader.
 */
const STATUS = {
  good: { icon: CircleCheck, tone: "text-success", stripe: "bg-success", label: "Healthy" },
  watch: { icon: CircleAlert, tone: "text-warning", stripe: "bg-warning", label: "Watch" },
  risk: { icon: TriangleAlert, tone: "text-destructive", stripe: "bg-destructive", label: "At risk" },
  unknown: { icon: CircleHelp, tone: "text-muted-foreground", stripe: "bg-border-strong", label: "No data" },
} as const;

export function BusinessHealth({ metrics }: { metrics: BusinessHealthMetric[] }) {
  if (metrics.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Business health</h2>
        <p className="text-xs text-muted-foreground">Derived from the posted ledger</p>
      </header>

      <dl className="grid sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const style = STATUS[metric.status];
          const Icon = style.icon;

          return (
            <div
              key={metric.key}
              className="relative border-b border-r border-border/60 py-3 pl-5 pr-4 last:border-r-0"
            >
              <span
                className={cn("absolute inset-y-3 left-0 w-0.5 rounded-r", style.stripe)}
                aria-hidden
              />

              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className={cn("size-3.5 shrink-0", style.tone)} aria-hidden />
                {metric.label}
                <span className="sr-only">— {style.label}</span>
              </dt>

              <dd className={cn("tabular mt-0.5 text-lg font-semibold", style.tone)}>
                {metric.value}
              </dd>

              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{metric.detail}</p>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
