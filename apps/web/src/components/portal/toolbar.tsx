"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The control strip above a list: search, a few filters, and the actions that
 * apply to the list as a whole. Filters read as chips so the state of the list
 * is legible without opening anything.
 */
export function ListToolbar({
  search,
  onSearchChange,
  placeholder = "Search…",
  children,
  actions,
  className,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {children}

      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A filter rendered as a toggle chip rather than hidden inside a menu. */
export function FilterChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        active
          ? "border-brand/40 bg-brand/10 text-brand"
          : "border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && <span className="tabular opacity-70">{count}</span>}
    </button>
  );
}

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <SlidersHorizontal className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {children}
    </div>
  );
}

/** Totals for exactly what the list is showing, restated when a filter changes. */
export function ResultSummary({
  showing,
  total,
  noun,
  children,
  className,
}: {
  showing: number;
  total: number;
  noun: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground", className)}>
      <span>
        Showing <span className="tabular font-medium text-foreground">{showing}</span>
        {showing !== total && (
          <>
            {" "}of <span className="tabular">{total}</span>
          </>
        )}{" "}
        {noun}
      </span>
      {children && <div className="flex flex-wrap items-center gap-4">{children}</div>}
    </div>
  );
}
