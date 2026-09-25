"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * The page header every screen shares: where you are, what this is, and what
 * you can do here — in that order, in the same place, every time. Consistency
 * is what lets someone stop reading the chrome and start reading the data.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  meta,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  breadcrumbs?: Crumb[];
  actions?: React.ReactNode;
  /** Small facts that belong beside the title, not in a card below it. */
  meta?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-5", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="print-hidden mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="size-3 opacity-50" aria-hidden />}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-foreground">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
        {/* The actions must be allowed to shrink: `shrink-0` would hold the
            row at the combined width of every control and push the page wider
            than the phone it is being read on. */}
        {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/** One fact in the header's meta line, e.g. "216 journals". */
export function HeaderMeta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span>{label}</span>
      <span className="tabular font-medium text-foreground">{value}</span>
    </span>
  );
}
