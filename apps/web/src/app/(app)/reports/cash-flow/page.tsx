"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Download, Printer } from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { BalanceChart } from "@/components/portal/charts";
import { Section } from "@/components/portal/detail";
import { PageBadge } from "@/components/portal/page-badge";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CASH_MOVEMENT, DEMO_CURRENCY, DEMO_PERIOD } from "@/lib/demo";
import { cn } from "@/lib/utils";

/**
 * The indirect method: start at profit, undo what did not move cash, then add
 * the movements in working capital that did.
 */
const SECTIONS = [
  {
    title: "Operating activities",
    rows: [
      { label: "Net profit for the period", amount: "357821.00", note: "From the profit and loss account" },
      { label: "Depreciation", amount: "11551.25", note: "Charged to profit; no cash left the business" },
      { label: "Increase in receivables", amount: "-62480.00", note: "Invoiced but not yet collected" },
      { label: "Increase in inventory", amount: "-8096.00", note: "Cash converted into stock" },
      { label: "Increase in payables", amount: "42310.00", note: "Billed but not yet paid" },
    ],
    subtotal: "341106.25",
  },
  {
    title: "Investing activities",
    rows: [{ label: "Purchase of equipment", amount: "-62500.00", note: "Server hardware, capitalised to 1500" }],
    subtotal: "-62500.00",
  },
  {
    title: "Financing activities",
    rows: [
      { label: "Term loan repayments", amount: "-18000.00", note: "Principal only; interest sits in operating" },
      { label: "Dividends paid", amount: "-120000.00", note: "Declared and settled in September" },
    ],
    subtotal: "-138000.00",
  },
];

export default function CashFlowPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <CashFlow />
    </RequirePermission>
  );
}

function CashFlow() {
  const net = sumMoney(SECTIONS.map((section) => section.subtotal));
  const opening = "272254.40";
  const closing = sumMoney([opening, net]);

  const stats: Stat[] = [
    { key: "operating", label: "From operations", value: SECTIONS[0].subtotal, currency: DEMO_CURRENCY, hint: "Cash the trading of the business generated, before investing and financing." },
    { key: "investing", label: "Investing", value: SECTIONS[1].subtotal, currency: DEMO_CURRENCY },
    { key: "financing", label: "Financing", value: SECTIONS[2].subtotal, currency: DEMO_CURRENCY },
    { key: "net", label: "Net movement", value: net, currency: DEMO_CURRENCY, comparison: `closing cash ${closing}` },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Cash Flow"
        description="Where the cash came from and where it went, reconciling opening cash to closing."
        actions={
          <>
            <PageBadge>{DEMO_PERIOD.label}</PageBadge>
            <Button variant="outline" size="sm">
              <Printer />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Download />
              Export CSV
            </Button>
          </>
        }
      />

      <PreviewBanner module="Cash Flow" phase={5} />
      <StatGrid stats={stats} />

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <Section
          title="Statement of cash flows"
          description="Indirect method. Profit is where it starts, not where it ends."
          flush
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Line</TableHead>
                <TableHead numeric className="pr-5">
                  Amount
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {SECTIONS.map((section) => (
                <React.Fragment key={section.title}>
                  <TableRow className="bg-muted/40">
                    <TableCell colSpan={2} className="pl-5 text-xs font-semibold uppercase tracking-wide">
                      {section.title}
                    </TableCell>
                  </TableRow>

                  {section.rows.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell className="pl-8">
                        <div>{row.label}</div>
                        <div className="mt-0.5 text-2xs text-muted-foreground">{row.note}</div>
                      </TableCell>
                      <TableCell numeric className={cn("pr-5", Number(row.amount) < 0 && "text-destructive")}>
                        <Money value={row.amount} currency={DEMO_CURRENCY} />
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow className="border-b-2">
                    <TableCell className="pl-5 font-medium">Net cash from {section.title.toLowerCase()}</TableCell>
                    <TableCell numeric className="pr-5 font-semibold">
                      <Money value={section.subtotal} currency={DEMO_CURRENCY} />
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}

              <TableRow>
                <TableCell className="pl-5 font-medium">Net movement in cash</TableCell>
                <TableCell numeric className="pr-5 font-semibold">
                  <Money value={net} currency={DEMO_CURRENCY} />
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="pl-5 text-muted-foreground">Cash at the start of the period</TableCell>
                <TableCell numeric className="pr-5">
                  <Money value={opening} currency={DEMO_CURRENCY} />
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/40">
                <TableCell className="pl-5 font-semibold">Cash at the end of the period</TableCell>
                <TableCell numeric className="pr-5 text-base font-semibold">
                  <Money value={closing} currency={DEMO_CURRENCY} showSymbol />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Section>

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

          <Section title="Profit is not cash" description="The two diverge for reasons this statement makes explicit.">
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Depreciation</span> reduced profit by RM 11,551
                without any money leaving the business.
              </li>
              <li>
                <span className="font-medium text-foreground">Receivables grew RM 62,480</span> — revenue was
                earned and recognised, but the cash is still with customers.
              </li>
              <li>
                <span className="font-medium text-foreground">The dividend and the server</span> cost RM 182,500
                in cash and nothing in profit.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
