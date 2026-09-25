"use client";

import { PERMISSIONS } from "@zycount/shared";
import { ArrowLeft, Building2, CheckCircle2, CreditCard, Paperclip, Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { Field, FieldGrid, Section, TotalsBlock } from "@/components/portal/detail";
import { PostingChain, PostingPreview } from "@/components/portal/posting-preview";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { Timeline } from "@/components/portal/timeline";
import { Badge } from "@/components/ui/badge";
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
import { SUPPLIERS, findBill } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function BillDetailPage({ params }: { params: { id: string } }) {
  const bill = findBill(params.id);
  if (!bill) notFound();

  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <BillDetail id={params.id} />
    </RequirePermission>
  );
}

function BillDetail({ id }: { id: string }) {
  const bill = findBill(id)!;
  const supplier = SUPPLIERS.find((party) => party.id === bill.partyId)!;
  const posted = Boolean(bill.posting.journalReference);
  const needsApproval = bill.status === "DRAFT" || bill.status === "PENDING";

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-3 mb-1 text-muted-foreground" asChild>
            <Link href="/purchases/bills">
              <ArrowLeft />
              All bills
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{bill.number}</h1>
            <StatusBadge status={bill.status} />
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {bill.partyName} · received {formatDate(bill.issuedOn)} · due {formatDate(bill.dueOn)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Paperclip />
            Attachment
          </Button>
          <Button variant="outline" size="sm">
            <Printer />
            Print
          </Button>
          {needsApproval ? (
            <Button size="sm">
              <CheckCircle2 />
              Approve
            </Button>
          ) : (
            <Button size="sm">
              <CreditCard />
              Pay bill
            </Button>
          )}
        </div>
      </div>

      <PreviewBanner module="Purchases" phase={2} />

      <PostingChain
        steps={[
          { label: "Source", value: bill.number },
          { label: "Journal", value: bill.posting.journalReference ?? "Not yet posted", href: posted ? "/accounting/journals" : undefined, done: posted },
          { label: "Ledger", value: "2100 Trade Payables", href: posted ? "/accounting/general-ledger" : undefined, done: posted },
          { label: "Report", value: "Profit & Loss", href: posted ? "/reports/profit-loss" : undefined, done: posted },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Section title="Bill" description="What the supplier charged, and where each line was coded." flush>
            <div className="grid gap-6 px-5 pb-5 sm:grid-cols-2">
              <div>
                <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">From</div>
                <div className="mt-1.5 flex items-start gap-2">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 text-sm">
                    <Link href="/purchases/suppliers" className="font-medium hover:underline">
                      {supplier.name}
                    </Link>
                    {supplier.address.map((line) => (
                      <div key={line} className="text-muted-foreground">
                        {line}
                      </div>
                    ))}
                    <div className="mt-1 font-mono text-2xs text-muted-foreground">{supplier.registrationNo}</div>
                  </div>
                </div>
              </div>

              <FieldGrid columns={2}>
                <Field label="Bill date">{formatDate(bill.issuedOn)}</Field>
                <Field label="Due date">{formatDate(bill.dueOn)}</Field>
                <Field label="Terms">{supplier.terms}</Field>
                <Field label="Currency">{bill.currency}</Field>
                <Field label="Supplier reference">{bill.reference ?? "—"}</Field>
                <Field label="Captured by">Siti Mariam</Field>
              </FieldGrid>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Description</TableHead>
                  <TableHead numeric>Qty</TableHead>
                  <TableHead numeric>Unit price</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead numeric className="pr-5">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {bill.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="max-w-sm pl-5">{line.description}</TableCell>
                    <TableCell numeric>
                      {line.quantity} <span className="text-2xs text-muted-foreground">{line.unit}</span>
                    </TableCell>
                    <TableCell numeric>
                      <Money value={line.unitPrice} currency={bill.currency} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {line.taxCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{line.accountCode}</TableCell>
                    <TableCell numeric className="pr-5 font-medium">
                      <Money value={line.total} currency={bill.currency} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-6 border-t px-5 py-4 sm:flex-row sm:justify-between">
              <div className="max-w-sm text-sm">
                {bill.notes && (
                  <>
                    <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
                    <p className="mt-1 text-muted-foreground">{bill.notes}</p>
                  </>
                )}
              </div>

              <TotalsBlock
                className="w-full sm:w-72"
                rows={[
                  { label: "Subtotal", value: <Money value={bill.subtotal} currency={bill.currency} /> },
                  { label: "SST recoverable", value: <Money value={bill.tax} currency={bill.currency} dashOnZero /> },
                  { label: "Total", value: <Money value={bill.total} currency={bill.currency} showSymbol />, emphasis: "total" as const },
                  { label: "Paid", value: <Money value={bill.paid} currency={bill.currency} dashOnZero />, emphasis: "muted" as const },
                  { label: "Balance due", value: <Money value={bill.balance} currency={bill.currency} showSymbol />, emphasis: "due" as const },
                ]}
              />
            </div>
          </Section>

          <Section
            title="What this bill posts"
            description="Charges and recoverable tax on the left, the liability to the supplier on the right."
          >
            <PostingPreview posting={bill.posting} currency={bill.currency} />
          </Section>
        </div>

        <div className="min-w-0 space-y-5">
          <Section title="Supplier" description={`${supplier.code} · since ${formatDate(supplier.since)}`}>
            <FieldGrid columns={1} className="gap-y-3">
              <Field label="Balance owed">
                <Money value={supplier.balance} currency={bill.currency} showSymbol />
              </Field>
              <Field label="Overdue">
                <Money value={supplier.overdue} currency={bill.currency} showSymbol dashOnZero />
              </Field>
              <Field label="Spend year to date">
                <Money value={supplier.ytd} currency={bill.currency} showSymbol />
              </Field>
              <Field label="Contact">
                <a href={`mailto:${supplier.email}`} className="text-brand hover:underline">
                  {supplier.email}
                </a>
                <div className="text-muted-foreground">{supplier.phone}</div>
              </Field>
            </FieldGrid>
          </Section>

          <Section title="History">
            <Timeline events={bill.activity} />
          </Section>
        </div>
      </div>
    </div>
  );
}
