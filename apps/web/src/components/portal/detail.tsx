import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A labelled figure or fact. Labels are quiet; the value carries the weight. */
export function Field({
  label,
  children,
  className,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-sm", mono && "font-mono text-xs")}>{children}</dd>
    </div>
  );
}

export function FieldGrid({
  children,
  columns = 2,
  className,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-4",
        { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" }[columns],
        className,
      )}
    >
      {children}
    </dl>
  );
}

/** A card whose header is one line — the default container for a page section. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  flush = false,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Let a table run edge to edge inside the card. */
  flush?: boolean;
}) {
  return (
    <Card className={className}>
      {/* The actions sit beside the title only where there is room for them;
          below `sm` they stack, so neither the heading nor a control is
          squeezed into a column of its own. */}
      <CardHeader
        className={cn(
          "space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
          flush ? "pb-3" : "pb-4",
        )}
      >
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && (
          <div className="mt-3 flex max-w-full flex-wrap items-center gap-2 sm:mt-0 sm:shrink-0">
            {actions}
          </div>
        )}
      </CardHeader>
      <CardContent className={cn(flush && "px-0 pb-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

/** The totals block on a document: subtotal, tax, total, and what is still due. */
export function TotalsBlock({
  rows,
  className,
}: {
  rows: Array<{ label: string; value: React.ReactNode; emphasis?: "total" | "due" | "muted" }>;
  className?: string;
}) {
  return (
    <dl className={cn("space-y-2 text-sm", className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            "flex items-baseline justify-between gap-6",
            row.emphasis === "total" && "border-t pt-2 text-base font-semibold",
            row.emphasis === "due" && "border-t pt-2 font-semibold text-brand",
            row.emphasis === "muted" && "text-muted-foreground",
          )}
        >
          <dt className={cn(row.emphasis ? undefined : "text-muted-foreground")}>{row.label}</dt>
          <dd className="tabular">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
