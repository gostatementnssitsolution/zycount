import { formatMoney, isNegativeMoney, type MoneyInput } from "@zycount/shared";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Renders a monetary figure the way an accountant expects to read one:
 * right-aligned, tabular so columns line up, negatives in parentheses, and a
 * dash for zero so the eye skips it.
 */
export function Money({
  value,
  currency = "MYR",
  showSymbol = false,
  compact = false,
  dashOnZero = false,
  colorSign = false,
  className,
}: {
  value: MoneyInput | null | undefined;
  currency?: string;
  showSymbol?: boolean;
  compact?: boolean;
  /** Show an em-dash instead of `0.00`, which is how ledgers are printed. */
  dashOnZero?: boolean;
  /** Tint gains green and losses red — only where the sign carries meaning. */
  colorSign?: boolean;
  className?: string;
}) {
  if (value === null || value === undefined) {
    return <span className={cn("tabular text-muted-foreground", className)}>—</span>;
  }

  const negative = isNegativeMoney(value);
  const isZero = String(value).replace(/[^0-9]/g, "").replace(/^0+/, "") === "";

  if (dashOnZero && isZero) {
    return <span className={cn("tabular text-muted-foreground", className)}>—</span>;
  }

  // The parentheses carry the sign, so the minus itself is dropped.
  const magnitude = negative ? String(value).replace("-", "") : value;
  const formatted = formatMoney(magnitude, { currency, showSymbol, compact });

  return (
    <span
      className={cn(
        "tabular",
        negative && "figure-negative",
        colorSign && (negative ? "text-destructive" : "text-success"),
        className,
      )}
      title={formatMoney(value, { currency, showSymbol: true })}
    >
      {formatted}
    </span>
  );
}

/** A percentage with its sign and an arrow, for period-on-period deltas. */
export function Delta({
  value,
  positiveIsGood = true,
  className,
}: {
  value: string | null;
  positiveIsGood?: boolean;
  className?: string;
}) {
  if (value === null) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }

  const numeric = Number(value);
  const flat = Math.abs(numeric) < 0.05;
  const good = positiveIsGood ? numeric > 0 : numeric < 0;

  return (
    <span
      className={cn(
        "tabular text-xs font-medium",
        flat ? "text-muted-foreground" : good ? "text-success" : "text-destructive",
        className,
      )}
    >
      {flat ? "No change" : `${numeric > 0 ? "▲" : "▼"} ${Math.abs(numeric).toFixed(1)}%`}
    </span>
  );
}
