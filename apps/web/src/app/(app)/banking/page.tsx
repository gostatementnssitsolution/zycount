"use client";

import { PERMISSIONS, subtractMoney, sumMoney } from "@zycount/shared";
import { AlertTriangle, ArrowRight, Landmark, Plus, RefreshCw, Scale } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { BalanceChart } from "@/components/portal/charts";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { BANK_ACCOUNTS, CASH_MOVEMENT, DEMO_CURRENCY } from "@/lib/demo";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const FEED: Record<string, { label: string; variant: "success" | "default" | "destructive" }> = {
  CONNECTED: { label: "Feed connected", variant: "success" },
  MANUAL: { label: "Manual entry", variant: "default" },
  ERROR: { label: "Feed error", variant: "destructive" },
};

export default function BankingPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Banking />
    </RequirePermission>
  );
}

function Banking() {
  const ledger = sumMoney(BANK_ACCOUNTS.map((account) => account.ledgerBalance));
  const statement = sumMoney(BANK_ACCOUNTS.map((account) => account.statementBalance));
  const difference = subtractMoney(statement, ledger);
  const unreconciled = BANK_ACCOUNTS.reduce((sum, account) => sum + account.unreconciledCount, 0);

  const stats: Stat[] = [
    { key: "ledger", label: "Cash per the books", value: ledger, currency: DEMO_CURRENCY, trend: [364, 319, 442, 412, 428, Number(ledger) / 1000], hint: "The sum of the bank and cash accounts in the general ledger." },
    { key: "statement", label: "Cash per the bank", value: statement, currency: DEMO_CURRENCY, hint: "The closing balance on the latest statement or feed." },
    { key: "difference", label: "Unreconciled difference", value: difference, currency: DEMO_CURRENCY, positiveIsGood: false, comparison: `${unreconciled} lines to clear`, href: "/banking/reconciliation" },
    { key: "runway", label: "Cash runway", value: "8.4", unit: "MONTHS", changePercent: 13.5, comparison: "vs. last month", trend: [5.2, 5.8, 6.1, 6.9, 7.4, 8.4] },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Banking"
        description="Where the money sits, and how far the books are from the bank."
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw />
              Refresh feeds
            </Button>
            <Button size="sm">
              <Plus />
              Add account
            </Button>
          </>
        }
      />

      <PreviewBanner module="Banking" phase={2} />
      <StatGrid stats={stats} />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-4">
          {BANK_ACCOUNTS.map((account) => {
            const gap = subtractMoney(account.statementBalance, account.ledgerBalance);
            const feed = FEED[account.feedStatus];

            return (
              <Card key={account.id} className={cn(account.feedStatus === "ERROR" && "border-destructive/40")}>
                <CardContent className="flex flex-wrap items-center gap-4 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
                    <Landmark className="size-5" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{account.name}</span>
                      <Badge variant={feed.variant}>{feed.label}</Badge>
                      {account.unreconciledCount > 0 && (
                        <Badge variant="warning">{account.unreconciledCount} to reconcile</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-muted-foreground">
                      <span>{account.bank}</span>
                      <span aria-hidden>·</span>
                      <span className="font-mono">{account.accountNo}</span>
                      <span aria-hidden>·</span>
                      <span className="font-mono">{account.ledgerAccountCode}</span>
                      <span aria-hidden>·</span>
                      <span>updated {formatRelative(account.lastImport)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xs uppercase tracking-wide text-muted-foreground">Per books</div>
                      <div className="tabular text-sm font-semibold">
                        <Money value={account.ledgerBalance} currency={account.currency} showSymbol />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xs uppercase tracking-wide text-muted-foreground">Per bank</div>
                      <div className="tabular text-sm font-semibold">
                        <Money value={account.statementBalance} currency={account.currency} showSymbol />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xs uppercase tracking-wide text-muted-foreground">Difference</div>
                      <div
                        className={cn(
                          "tabular text-sm font-semibold",
                          Number(gap) !== 0 ? "text-warning" : "text-success",
                        )}
                      >
                        <Money value={gap} currency={account.currency} dashOnZero />
                      </div>
                    </div>

                    <Button variant="outline" size="sm" asChild>
                      <Link href="/banking/reconciliation">
                        Reconcile
                        <ArrowRight />
                      </Link>
                    </Button>
                  </div>

                  {account.feedStatus === "ERROR" && (
                    <p className="flex w-full items-center gap-2 border-t pt-3 text-xs text-destructive">
                      <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                      The feed stopped returning data on 24 September. Reconnect it, or import a statement in the
                      meantime.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="min-w-0 space-y-5">
          <BalanceChart
            title="Cash this month"
            description="Closing balance week by week."
            data={CASH_MOVEMENT}
            currency={DEMO_CURRENCY}
            dataKey="closing"
            label="Closing cash"
            height={180}
          />

          <Section title="What reconciliation proves" description="Two independent records, agreed to the cent.">
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Scale className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Every statement line is either matched to an entry in the books or explained.
              </li>
              <li className="flex gap-2">
                <Scale className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                A match posts nothing on its own — where an entry is missing, Zycount proposes one and a person
                approves it.
              </li>
              <li className="flex gap-2">
                <Scale className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Once the difference is nil, the cash figure in the balance sheet is evidence, not an assertion.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
