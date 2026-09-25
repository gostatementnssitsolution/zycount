import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A bar for a ratio that has a natural maximum — stock against its reorder
 * level, an aging bucket against the total, a target against actual.
 * It is never used for a value whose maximum is unknown.
 */
export function Progress({
  value,
  max = 100,
  tone = "brand",
  className,
  label,
  ariaLabel,
  showValue = false,
}: {
  value: number;
  max?: number;
  tone?: "brand" | "success" | "warning" | "destructive" | "info" | "muted";
  className?: string;
  /** Rendered above the bar; also names it for assistive technology. */
  label?: string;
  /** Names the bar without rendering anything — for use inside a table cell. */
  ariaLabel?: string;
  showValue?: boolean;
}) {
  const percent = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));

  const fill = {
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    info: "bg-info",
    muted: "bg-muted-foreground/40",
  }[tone];

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between text-2xs text-muted-foreground">
          {label && <span>{label}</span>}
          {showValue && <span className="tabular">{percent.toFixed(0)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? ariaLabel}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500", fill)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** Several tones in one bar — an aging profile or a status mix. */
export function StackedBar({
  segments,
  className,
}: {
  segments: Array<{ label: string; value: number; tone: "brand" | "success" | "warning" | "destructive" | "info" | "muted" }>;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  if (total <= 0) return <div className={cn("h-2 rounded-full bg-muted", className)} />;

  const fills: Record<string, string> = {
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
    info: "bg-info",
    muted: "bg-muted-foreground/40",
  };

  return (
    <div className={cn("flex h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          <div
            key={segment.label}
            className={fills[segment.tone]}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.label}: ${((segment.value / total) * 100).toFixed(1)}%`}
          />
        ))}
    </div>
  );
}
