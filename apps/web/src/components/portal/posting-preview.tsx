"use client";

import { sumMoney } from "@zycount/shared";
import { ArrowRight, CheckCircle2, Scale } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { postingDifference, type PostingPreview as Posting } from "@/lib/demo";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  SALES_INVOICE: "Sales invoice",
  SUPPLIER_BILL: "Supplier bill",
  EXPENSE_CLAIM: "Expense claim",
  PAYROLL_RUN: "Payroll run",
  DEPRECIATION_RUN: "Depreciation run",
  BANK_MATCH: "Bank reconciliation",
  STOCK_MOVEMENT: "Stock movement",
};

/**
 * The entry a document produces, shown on the document itself.
 *
 * This is the whole thesis of the product made visible: a source document is
 * never just a piece of paper, it is the accounting it will cause. The figures
 * are visible before anything posts, they are proved to balance on screen, and
 * once posted the journal reference is a link into the ledger.
 */
export function PostingPreview({
  posting,
  currency = "MYR",
  className,
  title = "Accounting entry",
  description,
}: {
  posting: Posting;
  currency?: string;
  className?: string;
  title?: string;
  description?: string;
}) {
  if (posting.lines.length === 0) {
    return (
      <div className={cn("rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground", className)}>
        The entry appears here once the document has been coded.
      </div>
    );
  }

  const debits = sumMoney(posting.lines.map((line) => line.debit));
  const credits = sumMoney(posting.lines.map((line) => line.credit));
  const difference = postingDifference(posting);
  const balanced = Number(difference) === 0;
  const posted = Boolean(posting.journalReference);

  return (
    <div className={cn("overflow-hidden rounded-lg border", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Scale className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm font-medium">{title}</span>
          <Badge variant="outline" className="font-normal">
            {SOURCE_LABELS[posting.source] ?? posting.source}
          </Badge>
        </div>

        {posted ? (
          <Link
            href="/accounting/journals"
            className="inline-flex items-center gap-1 font-mono text-xs font-medium text-brand hover:underline"
          >
            {posting.journalReference}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <span className="text-2xs uppercase tracking-wide text-muted-foreground">
            Not yet posted
          </span>
        )}
      </div>

      {description && (
        <p className="border-b px-4 py-2 text-xs text-muted-foreground">{description}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Account</TableHead>
            <TableHead numeric>Debit</TableHead>
            <TableHead numeric className="pr-4">
              Credit
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {posting.lines.map((line, index) => (
            <TableRow key={`${line.accountCode}-${index}`}>
              <TableCell className="pl-4">
                <span className="font-mono text-xs text-muted-foreground">{line.accountCode}</span>{" "}
                <span>{line.accountName}</span>
              </TableCell>
              <TableCell numeric>
                <Money value={line.debit} currency={currency} dashOnZero />
              </TableCell>
              <TableCell numeric className="pr-4">
                <Money value={line.credit} currency={currency} dashOnZero />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

        <TableFooter>
          <TableRow>
            <TableCell className="pl-4 font-medium">
              {balanced ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  Balanced
                </span>
              ) : (
                <span className="text-destructive">
                  Out of balance by <Money value={difference} currency={currency} />
                </span>
              )}
            </TableCell>
            <TableCell numeric className="font-semibold">
              <Money value={debits} currency={currency} />
            </TableCell>
            <TableCell numeric className="pr-4 font-semibold">
              <Money value={credits} currency={currency} />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

/**
 * The chain a figure travels, rendered as a trail. It appears on documents and
 * on the ledger so the route between them is never a guess.
 */
export function PostingChain({
  steps,
  className,
}: {
  steps: Array<{ label: string; value: string; href?: string; done?: boolean }>;
  className?: string;
}) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs", className)}>
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-1.5">
          {index > 0 && <ArrowRight className="size-3 shrink-0 text-muted-foreground/60" aria-hidden />}
          <span
            className={cn(
              "rounded-md border px-2 py-1",
              step.done === false ? "border-dashed text-muted-foreground" : "bg-card",
            )}
          >
            <span className="text-muted-foreground">{step.label}</span>{" "}
            {step.href ? (
              <Link href={step.href} className="font-medium text-brand hover:underline">
                {step.value}
              </Link>
            ) : (
              <span className="font-medium">{step.value}</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
