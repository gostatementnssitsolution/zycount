"use client";

import { PERMISSIONS, absMoney, subtractMoney, sumMoney } from "@zycount/shared";
import {
  Check,
  CheckCircle2,
  HelpCircle,
  Link2,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { Field, FieldGrid, Section } from "@/components/portal/detail";
import { PostingPreview } from "@/components/portal/posting-preview";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BANK_ACCOUNTS,
  BANK_TRANSACTIONS,
  DEMO_CURRENCY,
  type BankAccount,
  type BankTransaction,
  type PostingPreview as Posting,
} from "@/lib/demo";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type View = "ALL" | "SUGGESTED" | "UNMATCHED" | "MATCHED";

const STATUS: Record<BankTransaction["status"], { label: string; variant: "success" | "warning" | "default" | "info" }> = {
  MATCHED: { label: "Matched", variant: "success" },
  SUGGESTED: { label: "Suggested", variant: "warning" },
  UNMATCHED: { label: "No match", variant: "default" },
  EXCLUDED: { label: "Excluded", variant: "default" },
};

export default function ReconciliationPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Reconciliation />
    </RequirePermission>
  );
}

function Reconciliation() {
  const [accountId, setAccountId] = React.useState(BANK_ACCOUNTS[0].id);
  const [view, setView] = React.useState<View>("ALL");
  /** Lines the user has accepted in this session, so the workbench moves. */
  const [accepted, setAccepted] = React.useState<string[]>([]);

  const account = BANK_ACCOUNTS.find((item) => item.id === accountId)!;

  const lines = React.useMemo(
    () =>
      BANK_TRANSACTIONS.filter((line) => line.accountId === accountId).map((line) =>
        accepted.includes(line.id) ? { ...line, status: "MATCHED" as const } : line,
      ),
    [accountId, accepted],
  );

  const counts = {
    MATCHED: lines.filter((line) => line.status === "MATCHED").length,
    SUGGESTED: lines.filter((line) => line.status === "SUGGESTED").length,
    UNMATCHED: lines.filter((line) => line.status === "UNMATCHED").length,
  };

  const visible = view === "ALL" ? lines : lines.filter((line) => line.status === view);

  const outstanding = sumMoney(lines.filter((line) => line.status !== "MATCHED").map((line) => line.amount));
  const difference = subtractMoney(account.statementBalance, account.ledgerBalance);
  const progress = lines.length === 0 ? 100 : (counts.MATCHED / lines.length) * 100;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bank reconciliation"
        description="Agree the statement to the books, line by line, until the difference is nil."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Upload />
              Import statement
            </Button>
            <Button size="sm" disabled={counts.SUGGESTED === 0} onClick={() =>
              setAccepted((current) => [
                ...current,
                ...lines.filter((line) => line.status === "SUGGESTED").map((line) => line.id),
              ])
            }>
              <Check />
              Accept {counts.SUGGESTED} suggestion{counts.SUGGESTED === 1 ? "" : "s"}
            </Button>
          </>
        }
      />

      <PreviewBanner module="Banking" phase={2} />

      <Card>
        <CardContent className="grid gap-5 p-5 md:grid-cols-[18rem_1fr]">
          <div>
            <label htmlFor="bank-account" className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
              Account
            </label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="bank-account" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANK_ACCOUNTS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="mt-2 text-2xs text-muted-foreground">
              Posts to <span className="font-mono">{account.ledgerAccountCode}</span> · {account.accountNo}
            </p>
          </div>

          <div>
            <FieldGrid columns={4}>
              <Field label="Per the bank">
                <Money value={account.statementBalance} currency={DEMO_CURRENCY} showSymbol />
              </Field>
              <Field label="Per the books">
                <Money value={account.ledgerBalance} currency={DEMO_CURRENCY} showSymbol />
              </Field>
              <Field label="Unreconciled lines">
                <Money value={outstanding} currency={DEMO_CURRENCY} showSymbol dashOnZero />
              </Field>
              <Field label="Difference">
                <span className={cn("font-medium", Number(difference) === 0 ? "text-success" : "text-warning")}>
                  <Money value={difference} currency={DEMO_CURRENCY} showSymbol dashOnZero />
                </span>
              </Field>
            </FieldGrid>

            <Progress
              value={progress}
              tone={progress === 100 ? "success" : "brand"}
              className="mt-4"
              label={`${counts.MATCHED} of ${lines.length} lines cleared`}
              showValue
            />
          </div>
        </CardContent>
      </Card>

      <Section
        title="Statement lines"
        description="A suggestion is a proposal, not a posting. Accepting one is what writes the entry, under your name."
        flush
        actions={
          <Segmented<View>
            size="sm"
            ariaLabel="Filter statement lines"
            value={view}
            onChange={setView}
            options={[
              { value: "ALL", label: "All", count: lines.length },
              { value: "SUGGESTED", label: "Suggested", count: counts.SUGGESTED },
              { value: "UNMATCHED", label: "No match", count: counts.UNMATCHED },
              { value: "MATCHED", label: "Cleared", count: counts.MATCHED },
            ]}
          />
        }
      >
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <CheckCircle2 className="size-6 text-success" aria-hidden />
            <p className="text-sm font-medium">Nothing left in this view</p>
            <p className="text-sm text-muted-foreground">Every line here has been dealt with.</p>
          </div>
        ) : (
          <ul className="divide-y border-t">
            {visible.map((line) => (
              <StatementLine
                key={line.id}
                line={line}
                account={account}
                onAccept={() => setAccepted((current) => [...current, line.id])}
              />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function StatementLine({
  line,
  account,
  onAccept,
}: {
  line: BankTransaction;
  account: BankAccount;
  onAccept: () => void;
}) {
  const inflow = Number(line.amount) > 0;
  const status = STATUS[line.status];

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{line.description}</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-2xs text-muted-foreground">
            <span>{formatDate(line.date)}</span>
            <span aria-hidden>·</span>
            <span className="font-mono">{line.reference}</span>
          </div>
        </div>

        <div className="text-right">
          <div className={cn("tabular text-sm font-semibold", inflow ? "text-success" : undefined)}>
            <Money value={line.amount} currency={DEMO_CURRENCY} showSymbol />
          </div>
          <div className="tabular text-2xs text-muted-foreground">
            bal. <Money value={line.balance} currency={DEMO_CURRENCY} />
          </div>
        </div>
      </div>

      {line.match && line.status !== "MATCHED" && (
        <div className="mt-3 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-start gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Matches</span>
                <span className="font-mono font-medium">{line.match.reference}</span>
                <span className="text-muted-foreground">·</span>
                <span className="truncate">{line.match.party}</span>
                <Badge variant={line.match.confidence >= 0.9 ? "success" : "warning"}>
                  {(line.match.confidence * 100).toFixed(0)}% confident
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{line.match.rationale}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Button variant="outline" size="sm">
                <Search />
                Find another
              </Button>
              <Button size="sm" onClick={onAccept}>
                <Check />
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}

      {line.status === "UNMATCHED" && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3">
          <HelpCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            Nothing in the books corresponds to this line. Match it to an existing entry, code it to an account,
            or exclude it with a reason.
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <Button variant="ghost" size="sm">
              <X />
              Exclude
            </Button>
            <Button variant="outline" size="sm">
              <Link2 />
              Match manually
            </Button>
            <Button size="sm">Code to account</Button>
          </div>
        </div>
      )}

      {line.status === "MATCHED" && line.match && (
        <div className="mt-3">
          <PostingPreview
            title="Entry behind this match"
            currency={DEMO_CURRENCY}
            posting={entryFor(line, account)}
          />
        </div>
      )}
    </li>
  );
}

/**
 * Money in debits the bank and clears whatever it settles; money out is the
 * mirror. The account on the other side comes from the match, so a payroll
 * line never lands in trade payables.
 */
function entryFor(line: BankTransaction, account: BankAccount): Posting {
  const match = line.match!;
  const amount = absMoney(line.amount);
  const bank = { accountCode: account.ledgerAccountCode, accountName: account.name };
  const other = { accountCode: match.accountCode, accountName: match.accountName };
  const inflow = Number(line.amount) > 0;

  return {
    source: "BANK_MATCH",
    date: line.date,
    journalReference: match.journalReference,
    lines: inflow
      ? [
          { ...bank, debit: amount, credit: "0.00" },
          { ...other, debit: "0.00", credit: amount },
        ]
      : [
          { ...other, debit: amount, credit: "0.00" },
          { ...bank, debit: "0.00", credit: amount },
        ],
  };
}
