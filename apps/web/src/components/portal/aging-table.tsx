"use client";

import { sumMoney } from "@zycount/shared";
import * as React from "react";
import { Money } from "@/components/ui/money";
import { StackedBar } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AgingRow } from "@/lib/demo";
import { cn } from "@/lib/utils";

const BUCKETS = [
  { key: "current", label: "Current", tone: "success" as const },
  { key: "d1to30", label: "1–30 days", tone: "info" as const },
  { key: "d31to60", label: "31–60 days", tone: "warning" as const },
  { key: "d61to90", label: "61–90 days", tone: "destructive" as const },
  { key: "d90plus", label: "90+ days", tone: "destructive" as const },
] as const;

/**
 * An aging schedule. The lateness is carried by position in the columns and by
 * the bar's tone together, so the profile is readable without relying on colour
 * alone; the figures remain the authority.
 */
export function AgingTable({
  rows,
  currency,
  partyLabel,
  className,
}: {
  rows: AgingRow[];
  currency: string;
  partyLabel: string;
  className?: string;
}) {
  const totals = React.useMemo(() => {
    const sum = (key: (typeof BUCKETS)[number]["key"] | "total") =>
      sumMoney(rows.map((row) => row[key]));
    return {
      current: sum("current"),
      d1to30: sum("d1to30"),
      d31to60: sum("d31to60"),
      d61to90: sum("d61to90"),
      d90plus: sum("d90plus"),
      total: sum("total"),
    };
  }, [rows]);

  return (
    <div className={className}>
      <div className="px-5 pb-4">
        <StackedBar
          segments={BUCKETS.map((bucket) => ({
            label: bucket.label,
            value: Number(totals[bucket.key]),
            tone: bucket.tone,
          }))}
        />
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
          {BUCKETS.map((bucket) => (
            <span key={bucket.key} className="flex items-baseline gap-1.5 text-xs">
              <span
                className={cn(
                  "size-2 shrink-0 translate-y-px rounded-[2px]",
                  { success: "bg-success", info: "bg-info", warning: "bg-warning", destructive: "bg-destructive" }[
                    bucket.tone
                  ],
                )}
                aria-hidden
              />
              <span className="text-muted-foreground">{bucket.label}</span>
              <Money value={totals[bucket.key]} currency={currency} className="font-medium" dashOnZero />
            </span>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">{partyLabel}</TableHead>
            {BUCKETS.map((bucket) => (
              <TableHead key={bucket.key} numeric>
                {bucket.label}
              </TableHead>
            ))}
            <TableHead numeric className="pr-5">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.partyId} interactive>
              <TableCell className="max-w-[18rem] truncate pl-5 font-medium">{row.partyName}</TableCell>
              {BUCKETS.map((bucket) => (
                <TableCell
                  key={bucket.key}
                  numeric
                  className={cn(
                    Number(row[bucket.key]) > 0 && (bucket.tone === "destructive" || bucket.tone === "warning")
                      ? "font-medium text-destructive"
                      : undefined,
                  )}
                >
                  <Money value={row[bucket.key]} currency={currency} dashOnZero />
                </TableCell>
              ))}
              <TableCell numeric className="pr-5 font-semibold">
                <Money value={row.total} currency={currency} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        <TableFooter>
          <TableRow>
            <TableCell className="pl-5 font-medium">Total</TableCell>
            {BUCKETS.map((bucket) => (
              <TableCell key={bucket.key} numeric className="font-semibold">
                <Money value={totals[bucket.key]} currency={currency} dashOnZero />
              </TableCell>
            ))}
            <TableCell numeric className="pr-5 font-semibold">
              <Money value={totals.total} currency={currency} />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
