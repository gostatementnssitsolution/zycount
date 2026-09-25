"use client";

import { PERMISSIONS } from "@zycount/shared";
import {
  ArrowRight,
  Download,
  FileBarChart,
  FileSpreadsheet,
  Printer,
  Scale,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/portal/detail";
import { PageBadge } from "@/components/portal/page-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ReportCard {
  title: string;
  href: string;
  icon: LucideIcon;
  question: string;
  detail: string;
  live: boolean;
}

const STATEMENTS: ReportCard[] = [
  {
    title: "Profit & Loss",
    href: "/reports/profit-loss",
    icon: TrendingUp,
    question: "Did we make money, and on what?",
    detail: "Revenue less cost of sales and overheads, for any period, against the one before it.",
    live: true,
  },
  {
    title: "Balance Sheet",
    href: "/reports/balance-sheet",
    icon: FileBarChart,
    question: "What do we own and owe today?",
    detail: "Assets, liabilities and equity at a date. Proved to balance before it renders.",
    live: true,
  },
  {
    title: "Cash Flow",
    href: "/reports/cash-flow",
    icon: Wallet,
    question: "Where did the cash actually go?",
    detail: "Operating, investing and financing movement, reconciling opening cash to closing.",
    live: false,
  },
  {
    title: "Trial Balance",
    href: "/reports/trial-balance",
    icon: Scale,
    question: "Do the books add up?",
    detail: "Every account with its debit and credit balance, and the proof that the two agree.",
    live: true,
  },
];

const SCHEDULES: ReportCard[] = [
  {
    title: "AR Aging",
    href: "/sales/ar-aging",
    icon: FileSpreadsheet,
    question: "Who owes us, and how late are they?",
    detail: "Receivables by customer across the aging buckets, agreed to account 1200.",
    live: false,
  },
  {
    title: "AP Aging",
    href: "/purchases/ap-aging",
    icon: FileSpreadsheet,
    question: "What falls due, and when?",
    detail: "Payables by supplier across the aging buckets, agreed to account 2100.",
    live: false,
  },
  {
    title: "General Ledger",
    href: "/accounting/general-ledger",
    icon: Scale,
    question: "What is behind this figure?",
    detail: "Every posted line with a running balance, filterable by account and period.",
    live: true,
  },
  {
    title: "Business Health",
    href: "/insights/business-health",
    icon: TrendingUp,
    question: "Is the business sound?",
    detail: "Runway, margin, working capital and the ratios behind them, with targets.",
    live: false,
  },
];

export default function ReportsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Reports />
    </RequirePermission>
  );
}

function Reports() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Financial reports"
        description="Every statement the business runs on, each one drilling back to the journal behind it."
        actions={
          <>
            <PageBadge>Financial year 2026</PageBadge>
            <Button variant="outline" size="sm">
              <Printer />
              Print pack
            </Button>
            <Button variant="outline" size="sm">
              <Download />
              Export all
            </Button>
          </>
        }
      />

      <Section title="Statements" description="The four that make up a set of accounts.">
        <div className="grid gap-4 sm:grid-cols-2">
          {STATEMENTS.map((report) => (
            <ReportTile key={report.href} report={report} />
          ))}
        </div>
      </Section>

      <Section title="Schedules and analysis" description="What sits behind the statements.">
        <div className="grid gap-4 sm:grid-cols-2">
          {SCHEDULES.map((report) => (
            <ReportTile key={report.href} report={report} />
          ))}
        </div>
      </Section>

      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-medium">Why every figure here can be trusted</h3>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>A report is built from posted entries only — drafts never appear in one.</li>
            <li>Assets always equal liabilities plus equity, and the report refuses to render if they do not.</li>
            <li>Every line drills through to the ledger, the journal and the audit trail behind it.</li>
            <li>Nothing is rounded on the way: money is held in whole cents from source to statement.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportTile({ report }: { report: ReportCard }) {
  const Icon = report.icon;

  return (
    <Link
      href={report.href}
      className="group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-brand/40"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
        <Icon className="size-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{report.title}</span>
          {!report.live && (
            <Badge variant="warning" className="text-2xs">
              Preview
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{report.question}</p>
        <p className="mt-1.5 text-xs text-muted-foreground">{report.detail}</p>
      </div>

      <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
