"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { CalendarClock, Download } from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_CURRENCY, STATUTORY_SUBMISSIONS } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function StatutoryPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Statutory />
    </RequirePermission>
  );
}

function Statutory() {
  const pending = STATUTORY_SUBMISSIONS.filter((item) => item.status === "PENDING");
  const due = sumMoney(pending.map((item) => item.amount));

  const stats: Stat[] = [
    { key: "due", label: "Due this cycle", value: due, currency: DEMO_CURRENCY, comparison: "by 15 October 2026" },
    { key: "count", label: "Submissions outstanding", value: String(pending.length), unit: "COUNT" },
    { key: "epf", label: "EPF payable", value: "16951.00", currency: DEMO_CURRENCY, hint: "Employee and employer shares together, carried in account 2210." },
    { key: "pcb", label: "PCB payable", value: "7052.00", currency: DEMO_CURRENCY, hint: "Monthly tax deduction withheld from employees, in account 2230." },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Statutory submissions"
        description="What is owed to EPF, SOCSO, EIS and LHDN, and the date each falls due."
        actions={
          <Button variant="outline" size="sm">
            <Download />
            Download submission files
          </Button>
        }
      />

      <PreviewBanner module="Payroll" phase={4} />
      <StatGrid stats={stats} />

      <Section
        title="Submissions"
        description="Each amount is the balance of its liability account — pay it and the account clears."
        flush
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Submission</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead numeric className="pr-5">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {STATUTORY_SUBMISSIONS.map((item) => (
              <TableRow key={item.id} interactive>
                <TableCell className="pl-5 font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.period}</TableCell>
                <TableCell className="text-muted-foreground">{item.channel}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    {item.status === "PENDING" && (
                      <CalendarClock className="size-3.5 shrink-0 text-warning" aria-hidden />
                    )}
                    {formatDate(item.dueOn)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={item.status === "PAID" ? "success" : "warning"}>
                    {item.status === "PAID" ? "Submitted" : "Outstanding"}
                  </Badge>
                </TableCell>
                <TableCell numeric className="pr-5 font-medium">
                  <Money value={item.amount} currency={DEMO_CURRENCY} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TableCell colSpan={5} className="pl-5 font-medium">
                Outstanding
              </TableCell>
              <TableCell numeric className="pr-5 font-semibold">
                <Money value={due} currency={DEMO_CURRENCY} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Section>
    </div>
  );
}
