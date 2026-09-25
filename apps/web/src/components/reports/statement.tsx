"use client";

import type { StatementSection } from "@zycount/shared";
import Link from "next/link";
import * as React from "react";
import { Money } from "@/components/ui/money";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Statement rendering shared by the P&L and the balance sheet.
 *
 * Every account line links through to its ledger, which is what makes the
 * statements traceable: a figure on screen is one click from the entries
 * behind it (docs/spec/01 — invariant 6).
 */
export function SectionRows({
  section,
  currency,
  periodId,
  showComparison,
  /** Negate on display — contra and expense sections read better positive. */
  emphasis = false,
  /**
   * Suppress the section's own subtotal. The balance sheet's equity block uses
   * this because the real total comes after the period's result is added.
   */
  hideTotal = false,
}: {
  section: StatementSection;
  currency: string;
  periodId?: string;
  showComparison?: boolean;
  emphasis?: boolean;
  hideTotal?: boolean;
}) {
  if (section.lines.length === 0 && section.total === "0.00") return null;

  return (
    <>
      <TableRow className="border-0">
        <TableCell colSpan={showComparison ? 3 : 2} className="pb-1 pl-4 pt-5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </span>
        </TableCell>
      </TableRow>

      {section.lines.map((line) => (
        <TableRow key={line.accountId ?? line.name} className="border-0">
          <TableCell className="py-1 pl-8">
            {line.accountId ? (
              <Link
                href={`/accounting/general-ledger?accountId=${line.accountId}${
                  periodId ? `&fiscalPeriodId=${periodId}` : ""
                }`}
                className="hover:underline"
              >
                <span className="font-mono text-xs text-muted-foreground">{line.code}</span>
                <span className="ml-2">{line.name}</span>
              </Link>
            ) : (
              <span className="ml-8">{line.name}</span>
            )}
          </TableCell>

          <TableCell numeric className={cn("py-1", !showComparison && "pr-4")}>
            <Money value={line.amount} currency={currency} dashOnZero />
          </TableCell>

          {showComparison && (
            <TableCell numeric className="py-1 pr-4 text-muted-foreground">
              <Money value={line.previousAmount ?? "0.00"} currency={currency} dashOnZero />
            </TableCell>
          )}
        </TableRow>
      ))}

      {hideTotal ? null : (
      <TableRow className="border-0">
        <TableCell className="py-1.5 pl-8">
          <span className={cn("text-sm", emphasis ? "font-semibold" : "font-medium")}>
            Total {section.title.toLowerCase()}
          </span>
        </TableCell>
        <TableCell
          numeric
          className={cn(
            "border-t py-1.5 font-medium",
            !showComparison && "pr-4",
            emphasis && "font-semibold",
          )}
        >
          <Money value={section.total} currency={currency} />
        </TableCell>
        {showComparison && (
          <TableCell numeric className="border-t py-1.5 pr-4 font-medium text-muted-foreground">
            <Money value={section.previousTotal ?? "0.00"} currency={currency} />
          </TableCell>
        )}
      </TableRow>
      )}
    </>
  );
}

/** A bold subtotal or result line — gross profit, net profit, total assets. */
export function TotalRow({
  label,
  value,
  previousValue,
  currency,
  showComparison,
  strong = false,
  colorSign = false,
}: {
  label: string;
  value: string;
  previousValue?: string;
  currency: string;
  showComparison?: boolean;
  strong?: boolean;
  colorSign?: boolean;
}) {
  return (
    <TableRow className={cn("border-0", strong && "bg-muted/40")}>
      <TableCell className={cn("py-2.5 pl-4", strong ? "text-base font-semibold" : "font-semibold")}>
        {label}
      </TableCell>

      <TableCell
        numeric
        className={cn(
          "border-y py-2.5",
          !showComparison && "pr-4",
          strong ? "text-base font-semibold" : "font-semibold",
        )}
      >
        <Money value={value} currency={currency} colorSign={colorSign} />
      </TableCell>

      {showComparison && (
        <TableCell numeric className="border-y py-2.5 pr-4 font-medium text-muted-foreground">
          <Money value={previousValue ?? "0.00"} currency={currency} />
        </TableCell>
      )}
    </TableRow>
  );
}
