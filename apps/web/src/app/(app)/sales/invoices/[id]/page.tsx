"use client";

import { PERMISSIONS } from "@zycount/shared";
import {
  ArrowLeft,
  Building2,
  Copy,
  Download,
  Mail,
  MoreHorizontal,
  Printer,
  Receipt,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PostingChain, PostingPreview } from "@/components/portal/posting-preview";
import { Field, FieldGrid, Section, TotalsBlock } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { Timeline } from "@/components/portal/timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CUSTOMERS, findInvoice } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = findInvoice(params.id);
  if (!invoice) notFound();

  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <InvoiceDetail id={params.id} />
    </RequirePermission>
  );
}

function InvoiceDetail({ id }: { id: string }) {
  const invoice = findInvoice(id)!;
  const customer = CUSTOMERS.find((party) => party.id === invoice.partyId)!;
  const settled = Number(invoice.total) === 0 ? 0 : (Number(invoice.paid) / Number(invoice.total)) * 100;
  const posted = Boolean(invoice.posting.journalReference);

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-3 mb-1 text-muted-foreground" asChild>
            <Link href="/sales/invoices">
              <ArrowLeft />
              All invoices
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{invoice.number}</h1>
            <StatusBadge status={invoice.status} />
            {invoice.reference && (
              <Badge variant="outline" className="font-normal">
                {invoice.reference}
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.partyName} · issued {formatDate(invoice.issuedOn)} · due {formatDate(invoice.dueOn)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Mail />
            Send
          </Button>
          <Button size="sm">
            <Wallet />
            Record payment
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="More actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem>
                <Copy />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Receipt />
                Raise a credit note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive>Cancel invoice</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <PreviewBanner module="Sales" phase={2} />

      <PostingChain
        steps={[
          { label: "Source", value: invoice.number, href: `/sales/invoices/${invoice.id}` },
          { label: "Journal", value: invoice.posting.journalReference ?? "Not yet posted", href: posted ? "/accounting/journals" : undefined, done: posted },
          { label: "Ledger", value: "1200 Trade Receivables", href: posted ? "/accounting/general-ledger" : undefined, done: posted },
          { label: "Report", value: "Profit & Loss", href: posted ? "/reports/profit-loss" : undefined, done: posted },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Section title="Invoice" description="What was sold, and the tax on it." flush>
            <div className="grid gap-6 px-5 pb-5 sm:grid-cols-2">
              <div>
                <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Billed to</div>
                <div className="mt-1.5 flex items-start gap-2">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 text-sm">
                    <Link href="/sales/customers" className="font-medium hover:underline">
                      {customer.name}
                    </Link>
                    {customer.address.map((line) => (
                      <div key={line} className="text-muted-foreground">
                        {line}
                      </div>
                    ))}
                    {customer.taxNo && (
                      <div className="mt-1 font-mono text-2xs text-muted-foreground">
                        SST: {customer.taxNo}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <FieldGrid columns={2}>
                <Field label="Invoice date">{formatDate(invoice.issuedOn)}</Field>
                <Field label="Due date">{formatDate(invoice.dueOn)}</Field>
                <Field label="Terms">{customer.terms}</Field>
                <Field label="Currency">{invoice.currency}</Field>
                <Field label="Customer PO">{invoice.reference ?? "—"}</Field>
                <Field label="Prepared by">Nurul Aina</Field>
              </FieldGrid>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Description</TableHead>
                  <TableHead numeric>Qty</TableHead>
                  <TableHead numeric>Unit price</TableHead>
                  <TableHead numeric>Disc.</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead numeric className="pr-5">
                    Amount
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {invoice.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="max-w-sm pl-5">
                      <div className="truncate">{line.description}</div>
                      {line.itemCode && (
                        <div className="mt-0.5 font-mono text-2xs text-muted-foreground">{line.itemCode}</div>
                      )}
                    </TableCell>
                    <TableCell numeric>
                      {line.quantity} <span className="text-2xs text-muted-foreground">{line.unit}</span>
                    </TableCell>
                    <TableCell numeric>
                      <Money value={line.unitPrice} currency={invoice.currency} />
                    </TableCell>
                    <TableCell numeric className="text-muted-foreground">
                      {line.discountPercent ? `${line.discountPercent}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {line.taxCode}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{line.accountCode}</TableCell>
                    <TableCell numeric className="pr-5 font-medium">
                      <Money value={line.total} currency={invoice.currency} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-6 border-t px-5 py-4 sm:flex-row sm:justify-between">
              <div className="max-w-sm text-sm">
                {invoice.notes && (
                  <>
                    <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Notes</div>
                    <p className="mt-1 text-muted-foreground">{invoice.notes}</p>
                  </>
                )}
              </div>

              <TotalsBlock
                className="w-full sm:w-72"
                rows={[
                  { label: "Subtotal", value: <Money value={invoice.subtotal} currency={invoice.currency} /> },
                  ...(Number(invoice.discount) > 0
                    ? [{ label: "Discount", value: <Money value={`-${invoice.discount}`} currency={invoice.currency} />, emphasis: "muted" as const }]
                    : []),
                  { label: "SST", value: <Money value={invoice.tax} currency={invoice.currency} /> },
                  { label: "Total", value: <Money value={invoice.total} currency={invoice.currency} showSymbol />, emphasis: "total" as const },
                  { label: "Paid", value: <Money value={invoice.paid} currency={invoice.currency} dashOnZero />, emphasis: "muted" as const },
                  { label: "Balance due", value: <Money value={invoice.balance} currency={invoice.currency} showSymbol />, emphasis: "due" as const },
                ]}
              />
            </div>
          </Section>

          <Section
            title="What this invoice posted"
            description="The entry the document produced. Nothing reaches the ledger that is not visible here first."
          >
            <PostingPreview posting={invoice.posting} currency={invoice.currency} />
          </Section>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardContent className="p-5">
              <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                Payment status
              </div>
              <div className="mt-1.5 tabular text-2xl font-semibold tracking-tight">
                <Money value={invoice.balance} currency={invoice.currency} showSymbol />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                of <Money value={invoice.total} currency={invoice.currency} showSymbol /> still outstanding
              </p>

              <Progress
                value={settled}
                tone={settled >= 100 ? "success" : invoice.status === "OVERDUE" ? "destructive" : "brand"}
                className="mt-4"
                label="Settled"
                showValue
              />

              {invoice.allocations.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t pt-3">
                  {invoice.allocations.map((allocation) => (
                    <li key={allocation.id} className="flex items-start gap-2 text-sm">
                      <Wallet className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-mono text-xs">{allocation.reference}</span>
                          <Money value={allocation.amount} currency={invoice.currency} className="shrink-0 font-medium" />
                        </div>
                        <div className="text-2xs text-muted-foreground">
                          {formatDate(allocation.date)} · {allocation.method}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
                  Nothing has been received against this invoice yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Section title="Customer" description={`${customer.code} · since ${formatDate(customer.since)}`}>
            <FieldGrid columns={1} className="gap-y-3">
              <Field label="Balance">
                <Money value={customer.balance} currency={invoice.currency} showSymbol />
              </Field>
              <Field label="Overdue">
                <Money value={customer.overdue} currency={invoice.currency} showSymbol dashOnZero colorSign={Number(customer.overdue) > 0} />
              </Field>
              <Field label="Credit limit">
                <div className="flex items-center gap-2">
                  <Money value={customer.creditLimit} currency={invoice.currency} showSymbol />
                  <Progress
                    value={Number(customer.balance)}
                    max={Number(customer.creditLimit)}
                    tone={Number(customer.balance) / Number(customer.creditLimit) > 0.8 ? "warning" : "brand"}
                    ariaLabel="Credit limit used"
                    className="w-20"
                  />
                </div>
              </Field>
              <Field label="Contact">
                <a href={`mailto:${customer.email}`} className="text-brand hover:underline">
                  {customer.email}
                </a>
                <div className="text-muted-foreground">{customer.phone}</div>
              </Field>
            </FieldGrid>
          </Section>

          <Section title="History" description="Everything that happened to this document.">
            <Timeline events={invoice.activity} />
          </Section>
        </div>
      </div>
    </div>
  );
}
