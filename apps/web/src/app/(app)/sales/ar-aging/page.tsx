"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Download, Mail } from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { AgingTable } from "@/components/portal/aging-table";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { Button } from "@/components/ui/button";
import { AR_AGING, DEMO_CURRENCY, DEMO_PERIOD } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function ArAgingPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <ArAging />
    </RequirePermission>
  );
}

function ArAging() {
  const total = sumMoney(AR_AGING.map((row) => row.total));
  const late = sumMoney(AR_AGING.map((row) => sumMoney([row.d1to30, row.d31to60, row.d61to90, row.d90plus])));

  const stats: Stat[] = [
    { key: "total", label: "Total receivable", value: total, currency: DEMO_CURRENCY, hint: "The receivables control account, agreed to the ledger." },
    { key: "late", label: "Past due", value: late, currency: DEMO_CURRENCY, positiveIsGood: false, changePercent: -12.1, comparison: "vs. last month" },
    { key: "dso", label: "Debtor days", value: "38", unit: "DAYS", positiveIsGood: false, changePercent: -5.0, comparison: "vs. last quarter", trend: [44, 42, 41, 39, 40, 38], hint: "Your standard term is 30 days." },
    { key: "worst", label: "Oldest debt", value: "22", unit: "DAYS", positiveIsGood: false, comparison: "Aurora Digital Sdn Bhd" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="AR Aging"
        description={`How late each customer is, as at ${formatDate(DEMO_PERIOD.end)}.`}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download />
              Export CSV
            </Button>
            <Button size="sm">
              <Mail />
              Send statements
            </Button>
          </>
        }
      />

      <PreviewBanner module="Sales" phase={2} />
      <StatGrid stats={stats} />

      <Section
        title="Aging schedule"
        description="Each figure traces to the invoices behind it, and the total agrees to account 1200 in the trial balance."
        flush
      >
        <AgingTable rows={AR_AGING} currency={DEMO_CURRENCY} partyLabel="Customer" />
      </Section>
    </div>
  );
}
