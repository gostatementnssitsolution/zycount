"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import {
  Check,
  FileImage,
  Loader2,
  ScanLine,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { Field, FieldGrid, Section } from "@/components/portal/detail";
import { PostingPreview } from "@/components/portal/posting-preview";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { DEMO_CURRENCY, EXPENSE_CAPTURES, type ExpenseCapture } from "@/lib/demo";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<ExpenseCapture["status"], { label: string; variant: "default" | "warning" | "success" | "info" | "destructive" }> = {
  EXTRACTING: { label: "Extracting", variant: "info" },
  REVIEW: { label: "Needs review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "info" },
  POSTED: { label: "Posted", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export default function ExpensesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Expenses />
    </RequirePermission>
  );
}

function Expenses() {
  const [selectedId, setSelectedId] = React.useState(EXPENSE_CAPTURES[0].id);
  const selected = EXPENSE_CAPTURES.find((capture) => capture.id === selectedId)!;

  const inReview = EXPENSE_CAPTURES.filter((capture) => capture.status === "REVIEW");
  const posted = EXPENSE_CAPTURES.filter((capture) => capture.status === "POSTED");
  const scored = EXPENSE_CAPTURES.filter((capture) => capture.confidence > 0);
  const averageConfidence = scored.reduce((sum, capture) => sum + capture.confidence, 0) / scored.length;

  const stats: Stat[] = [
    { key: "review", label: "Waiting on review", value: String(inReview.length), unit: "COUNT", comparison: "nothing posts until a person approves it" },
    { key: "value", label: "Value in review", value: sumMoney(inReview.map((capture) => capture.total)), currency: DEMO_CURRENCY },
    { key: "posted", label: "Posted this month", value: String(posted.length), unit: "COUNT", changePercent: 32.0, comparison: "vs. last month" },
    { key: "confidence", label: "Average confidence", value: (averageConfidence * 100).toFixed(0), unit: "PERCENT", hint: "How sure the extraction is of the fields it read. Anything below 85% is flagged for a closer look." },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Expenses & receipt capture"
        description="Photograph a receipt, check what was read from it, and post it — with the entry visible before it goes anywhere."
        actions={
          <Button size="sm">
            <Upload />
            Upload receipts
          </Button>
        }
      />

      <PreviewBanner module="Receipt capture" phase={3} />
      <StatGrid stats={stats} />

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center rounded-lg border border-dashed px-4 py-8 text-center">
                <div className="grid size-10 place-items-center rounded-full bg-brand/10 text-brand">
                  <Upload className="size-5" aria-hidden />
                </div>
                <p className="mt-3 text-sm font-medium">Drop receipts here</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG, PNG or PDF. Or forward them to{" "}
                  <span className="font-mono">receipts@zycount.my</span>.
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  Choose files
                </Button>
              </div>
            </CardContent>
          </Card>

          <Section title="Capture queue" description={`${EXPENSE_CAPTURES.length} documents`} flush>
            <ul className="divide-y">
              {EXPENSE_CAPTURES.map((capture) => {
                const tone = STATUS_TONE[capture.status];
                const active = capture.id === selectedId;

                return (
                  <li key={capture.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(capture.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "flex w-full items-start gap-3 px-5 py-3 text-left transition-colors",
                        active ? "bg-brand/5" : "hover:bg-muted/50",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md",
                          active ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {capture.status === "EXTRACTING" ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <FileImage className="size-4" aria-hidden />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{capture.vendor}</span>
                        <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
                          {capture.fileName}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <Badge variant={tone.variant}>{tone.label}</Badge>
                          <span className="text-2xs text-muted-foreground">
                            {formatRelative(capture.uploadedAt)}
                          </span>
                        </span>
                      </span>

                      <Money
                        value={capture.total}
                        currency={DEMO_CURRENCY}
                        dashOnZero
                        className="shrink-0 text-sm font-medium"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>

        <div className="min-w-0 space-y-5">
          <Section
            title={selected.vendor === "—" ? selected.fileName : selected.vendor}
            description={`${selected.fileName} · uploaded ${formatRelative(selected.uploadedAt)}`}
            actions={
              selected.status === "REVIEW" ? (
                <>
                  <Button variant="outline" size="sm">
                    <X />
                    Reject
                  </Button>
                  <Button size="sm">
                    <Check />
                    Approve & post
                  </Button>
                </>
              ) : (
                <Badge variant={STATUS_TONE[selected.status].variant}>{STATUS_TONE[selected.status].label}</Badge>
              )
            }
          >
            {selected.status === "EXTRACTING" ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Reading the document. Fields appear here as they are recognised.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <ScanLine className="size-4 text-muted-foreground" aria-hidden />
                    <span className="text-sm font-medium">What was read</span>
                  </div>

                  <ul className="space-y-3">
                    {selected.fields.map((field) => (
                      <li key={field.label}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-xs text-muted-foreground">{field.label}</span>
                          <span className="tabular truncate text-sm font-medium">{field.value}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Progress
                            value={field.confidence * 100}
                            tone={field.confidence >= 0.9 ? "success" : field.confidence >= 0.8 ? "brand" : "warning"}
                            ariaLabel={`${field.label} confidence`}
                          />
                          <span className="tabular w-8 shrink-0 text-right text-2xs text-muted-foreground">
                            {(field.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <FieldGrid columns={2} className="mt-5 border-t pt-4">
                    <Field label="Document no." mono>
                      {selected.documentNo}
                    </Field>
                    <Field label="Tax code">{selected.taxCode}</Field>
                    <Field label="Paid from">{selected.paidFrom}</Field>
                    <Field label="Total">
                      <Money value={selected.total} currency={selected.currency} showSymbol />
                    </Field>
                  </FieldGrid>
                </div>

                <div>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-brand" aria-hidden />
                      <span className="text-sm font-medium">Suggested coding</span>
                      <Badge variant="brand" className="ml-auto">
                        {(selected.confidence * 100).toFixed(0)}% confident
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-mono text-sm font-medium">{selected.suggestedAccountCode}</span>
                      <span className="text-sm">{selected.suggestedAccountName}</span>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">{selected.rationale}</p>

                    <p className="mt-3 border-t pt-3 text-2xs text-muted-foreground">
                      A suggestion is never a posting. Approve it and a person&rsquo;s name goes on the entry;
                      change the account and the suggestion is recorded as overridden.
                    </p>
                  </div>

                  <PostingPreview
                    posting={selected.posting}
                    currency={selected.currency}
                    className="mt-4"
                    title="Entry on approval"
                  />
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
