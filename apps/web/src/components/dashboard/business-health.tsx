import type { BusinessHealthMetric } from "@zycount/shared";
import { Activity, CircleAlert, CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Status styling paired with an icon, so meaning never rests on colour alone. */
const STATUS = {
  good: { icon: CircleCheck, className: "text-success", label: "Healthy" },
  watch: { icon: CircleAlert, className: "text-warning", label: "Watch" },
  risk: { icon: TriangleAlert, className: "text-destructive", label: "At risk" },
  unknown: { icon: CircleHelp, className: "text-muted-foreground", label: "Not enough data" },
} as const;

/** Business-health panel (docs/spec/08 §19). */
export function BusinessHealth({ metrics }: { metrics: BusinessHealthMetric[] }) {
  if (metrics.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Business health</CardTitle>
        </div>
        <CardDescription>
          Derived from the posted ledger — each figure traces back to real entries.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((metric) => {
            const style = STATUS[metric.status];
            const Icon = style.icon;

            return (
              <div key={metric.key} className="flex items-start gap-2.5">
                <Icon className={cn("mt-0.5 size-4 shrink-0", style.className)} aria-hidden />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{metric.label}</span>
                    <span className={cn("tabular text-sm font-semibold", style.className)}>
                      {metric.value}
                    </span>
                    <span className="sr-only">{style.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{metric.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
