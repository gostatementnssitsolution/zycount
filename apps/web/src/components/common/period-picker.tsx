"use client";

import type { FiscalPeriodDto } from "@zycount/shared";
import { CalendarRange, Lock } from "lucide-react";
import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePeriods } from "@/hooks/use-accounting";

/**
 * Period selector used across every report. Periods are grouped by fiscal year
 * and marked when closed, because a closed period is the usual reason a figure
 * cannot be changed.
 */
export function PeriodPicker({
  value,
  onChange,
  className,
  placeholder = "Select a period",
  includeAll = false,
}: {
  value: string | undefined;
  onChange: (periodId: string | undefined) => void;
  className?: string;
  placeholder?: string;
  includeAll?: boolean;
}) {
  const { data: periods, isLoading } = usePeriods();

  const byYear = React.useMemo(() => {
    const groups = new Map<number, FiscalPeriodDto[]>();
    for (const period of periods ?? []) {
      const list = groups.get(period.year) ?? [];
      list.push(period);
      groups.set(period.year, list);
    }
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [periods]);

  return (
    <Select
      value={value ?? (includeAll ? "__all__" : undefined)}
      onValueChange={(next) => onChange(next === "__all__" ? undefined : next)}
      disabled={isLoading}
    >
      <SelectTrigger className={className}>
        <CalendarRange className="mr-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <SelectValue placeholder={isLoading ? "Loading periods…" : placeholder} />
      </SelectTrigger>

      <SelectContent>
        {includeAll && <SelectItem value="__all__">All periods</SelectItem>}

        {byYear.map(([year, yearPeriods]) => (
          <SelectGroup key={year}>
            <SelectLabel>{year}</SelectLabel>
            {yearPeriods.map((period) => (
              <SelectItem key={period.id} value={period.id}>
                <span className="flex items-center gap-2">
                  {period.name}
                  {period.status === "CLOSED" && (
                    <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="Closed" />
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Picks a sensible default period: the latest open period that already has
 * postings, so a report opens on data rather than on an empty future month.
 */
export function useDefaultPeriod(): { periodId: string | undefined; isLoading: boolean } {
  const { data: periods, isLoading } = usePeriods();

  const periodId = React.useMemo(() => {
    if (!periods || periods.length === 0) return undefined;

    const withActivity = periods.filter((period) => (period.journalCount ?? 0) > 0);
    const candidates = withActivity.length > 0 ? withActivity : periods;

    return candidates[candidates.length - 1]?.id;
  }, [periods]);

  return { periodId, isLoading };
}
