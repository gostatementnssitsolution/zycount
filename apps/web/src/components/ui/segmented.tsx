"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A segmented control for a small, mutually exclusive set of views — three or
 * four options at most. Anything longer belongs in a select.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "default",
  className,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string; icon?: React.ComponentType<{ className?: string }>; count?: number }>;
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "default";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-0.5",
        size === "sm" ? "h-8" : "h-9",
        className,
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-full shrink-0 items-center gap-1.5 rounded-md px-2.5 font-medium transition-colors",
              size === "sm" ? "text-xs" : "text-sm",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-3.5 shrink-0" />}
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "tabular rounded px-1 text-2xs",
                  active ? "bg-muted text-muted-foreground" : "text-muted-foreground/70",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
