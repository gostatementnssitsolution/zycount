"use client";

import { Rows2, Rows3, Rows4, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-ui";
import { cn } from "@/lib/utils";

/**
 * The filter bar above a table.
 *
 * It sits directly on the page rather than inside a card of its own: a toolbar
 * is part of the table it controls, and boxing it separately reads as two
 * unrelated things stacked up.
 */
export function Toolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "print-hidden flex flex-wrap items-center gap-2 border-b border-border px-3 py-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Pushes whatever follows it to the right-hand end of the toolbar. */
export function ToolbarSpacer() {
  return <div className="ml-auto" />;
}

export function ToolbarDivider() {
  return <div className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />;
}

/** Shown only when a filter is set, so the control never nags. */
export function ClearFilters({ onClear, count }: { onClear: () => void; count: number }) {
  if (count === 0) return null;

  return (
    <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
      <X />
      Clear {count === 1 ? "filter" : `${count} filters`}
    </Button>
  );
}

const DENSITIES = [
  { key: "compact", label: "Compact", icon: Rows4 },
  { key: "default", label: "Default", icon: Rows3 },
  { key: "relaxed", label: "Relaxed", icon: Rows2 },
] as const;

type Density = (typeof DENSITIES)[number]["key"];

/**
 * Row density, applied to the document so every table follows at once and the
 * choice survives a reload. Someone reconciling a long ledger wants compact;
 * someone reviewing a handful of entries does not.
 */
export function DensityControl() {
  const [density, setDensity] = useLocalStorage<Density>("zycount.density", "default");

  React.useEffect(() => {
    const root = document.documentElement;
    if (density === "default") root.removeAttribute("data-density");
    else root.setAttribute("data-density", density);
  }, [density]);

  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
      role="group"
      aria-label="Row density"
    >
      {DENSITIES.map((option) => {
        const Icon = option.icon;
        const active = density === option.key;

        return (
          <button
            key={option.key}
            type="button"
            onClick={() => setDensity(option.key)}
            aria-pressed={active}
            title={`${option.label} rows`}
            className={cn(
              "grid size-6 place-items-center rounded transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span className="sr-only">{option.label} rows</span>
          </button>
        );
      })}
    </div>
  );
}

/** A count that tells the user what the table below is currently showing. */
export function ResultCount({ shown, total }: { shown: number; total: number }) {
  return (
    <span className="tabular text-xs text-muted-foreground">
      {shown === total
        ? `${total.toLocaleString()} ${total === 1 ? "row" : "rows"}`
        : `${shown.toLocaleString()} of ${total.toLocaleString()}`}
    </span>
  );
}
