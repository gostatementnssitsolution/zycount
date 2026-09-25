"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Download } from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { AgingTable } from "@/components/portal/aging-table";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { Button } from "@/components/ui/button";
import { AP_AGING, DEMO_CURRENCY, DEMO_PERIOD } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function ApAgingPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <ApAging />
    </RequirePermission>
  );
}

function ApAging() {
  const total = sumMoney(AP_AGING.map((row) => row.total));
  const late = sumMoney(AP_AGING.map((row) => sumMoney([row.d1to30, row.d31to60, row.d61to90, row.d90plus])));

  const stats: Stat[] = [
    { key: "total", label: "Total payable", value: total, currency: DEMO_CURRENCY, hint: "The payables control account, agreed to the ledger." },
    { key: "late", label: "Past due", value: late, currency: DEMO_CURRENCY, positiveIsGood: false, comparison: "1 supplier" },
    { key: "dpo", label: "Creditor days", value: "31", unit: "DAYS", changePercent: 6.9, comparison: "vs. last quarter", trend: [26, 28, 27, 30, 29, 31] },
    { key: "next", label: "Largest bill falling due", value: "212480.00", currency: DEMO_CURRENCY, comparison: "Techno Components, 16 October" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="AP Aging"
        description={`What falls due and when, as at ${formatDate(DEMO_PERIOD.end)}.`}
        actions={
          <Button variant="outline" size="sm">
            <Download />
            Export CSV
          </Button>
        }
      />

      <PreviewBanner module="Purchases" phase={2} />
      <StatGrid stats={stats} />

      <Section
        title="Aging schedule"
        description="The total agrees to account 2100 in the trial balance, and each row traces to its bills."
        flush
      >
        <AgingTable rows={AP_AGING} currency={DEMO_CURRENCY} partyLabel="Supplier" />
      </Section>
    </div>
  );
}
