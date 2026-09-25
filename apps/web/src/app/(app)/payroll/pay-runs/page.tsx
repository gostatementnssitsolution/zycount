"use client";

import { PERMISSIONS } from "@zycount/shared";
import { CalendarCheck, Play } from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { Field, FieldGrid, Section } from "@/components/portal/detail";
import { PostingPreview } from "@/components/portal/posting-preview";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_CURRENCY, PAY_RUNS } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function PayRunsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <PayRuns />
    </RequirePermission>
  );
}

function PayRuns() {
  const current = PAY_RUNS[0];

  const stats: Stat[] = [
    { key: "gross", label: "Gross pay", value: current.gross, currency: DEMO_CURRENCY, comparison: `${current.headcount} employees` },
    { key: "statutory", label: "Statutory deductions", value: current.statutory, currency: DEMO_CURRENCY, hint: "EPF, SOCSO, EIS and PCB withheld from employees, payable to the agencies by the 15th." },
    { key: "net", label: "Net to pay", value: current.net, currency: DEMO_CURRENCY, comparison: `on ${formatDate(current.payDate)}` },
    { key: "cost", label: "Total employer cost", value: current.employerCost, currency: DEMO_CURRENCY, changePercent: 0, comparison: "unchanged from August" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pay runs"
        description="Run the month, check it against last month, then post it — the entry is visible first."
        actions={
          <Button size="sm">
            <Play />
            Run September payroll
          </Button>
        }
      />

      <PreviewBanner module="Payroll" phase={4} />
      <StatGrid stats={stats} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title={`${current.period} — ready to post`}
          description="Nothing has reached the ledger yet. Posting writes the entry below and creates the payment file."
          actions={<StatusBadge status={current.status} />}
        >
          <FieldGrid columns={2} className="mb-4">
            <Field label="Pay date">{formatDate(current.payDate)}</Field>
            <Field label="Headcount">{current.headcount}</Field>
            <Field label="Gross">
              <Money value={current.gross} currency={DEMO_CURRENCY} showSymbol />
            </Field>
            <Field label="Net">
              <Money value={current.net} currency={DEMO_CURRENCY} showSymbol />
            </Field>
          </FieldGrid>

          <PostingPreview
            posting={current.posting}
            currency={DEMO_CURRENCY}
            title="Entry on posting"
            description="Wages and the employer's own contributions are the cost; what is withheld from employees is a liability until it is paid over."
          />
        </Section>

        <Section title="Previous runs" description="Each one posted, and reversible only by a reversing entry." flush>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Period</TableHead>
                <TableHead>Pay date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead numeric>Headcount</TableHead>
                <TableHead numeric>Gross</TableHead>
                <TableHead numeric className="pr-5">
                  Net
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PAY_RUNS.map((run) => (
                <TableRow key={run.id} interactive>
                  <TableCell className="pl-5 font-medium">{run.period}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(run.payDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status={run.status} />
                  </TableCell>
                  <TableCell numeric>{run.headcount}</TableCell>
                  <TableCell numeric>
                    <Money value={run.gross} currency={DEMO_CURRENCY} />
                  </TableCell>
                  <TableCell numeric className="pr-5 font-medium">
                    <Money value={run.net} currency={DEMO_CURRENCY} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-start gap-2 border-t px-5 py-4 text-xs text-muted-foreground">
            <CalendarCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p>
              A posted pay run cannot be edited. Correcting one raises a reversing entry and a new run, so the
              history of what was paid stays intact.
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
