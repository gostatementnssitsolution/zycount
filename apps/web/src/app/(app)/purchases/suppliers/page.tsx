"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Building2, Plus } from "lucide-react";
import * as React from "react";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { ListToolbar, ResultSummary } from "@/components/portal/toolbar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { DEMO_CURRENCY, SUPPLIERS } from "@/lib/demo";
import { formatDate } from "@/lib/format";

export default function SuppliersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Suppliers />
    </RequirePermission>
  );
}

function Suppliers() {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return SUPPLIERS.filter(
      (supplier) =>
        needle === "" ||
        supplier.name.toLowerCase().includes(needle) ||
        supplier.code.toLowerCase().includes(needle) ||
        supplier.email.toLowerCase().includes(needle),
    );
  }, [search]);

  const payable = sumMoney(SUPPLIERS.map((supplier) => supplier.balance));
  const spend = sumMoney(SUPPLIERS.map((supplier) => supplier.ytd));

  const stats: Stat[] = [
    { key: "payable", label: "Total payable", value: payable, currency: DEMO_CURRENCY },
    { key: "overdue", label: "Overdue", value: sumMoney(SUPPLIERS.map((s) => s.overdue)), currency: DEMO_CURRENCY, positiveIsGood: false },
    { key: "spend", label: "Spend year to date", value: spend, currency: DEMO_CURRENCY, changePercent: 9.1, comparison: "vs. the same point last year" },
    { key: "count", label: "Suppliers", value: String(SUPPLIERS.length), unit: "COUNT", comparison: "all active" },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        description="Who you buy from, what you owe them, and on what terms."
        actions={
          <Button size="sm">
            <Plus />
            New supplier
          </Button>
        }
      />

      <PreviewBanner module="Purchases" phase={2} />
      <StatGrid stats={stats} />

      <Card>
        <CardContent className="space-y-4 p-4">
          <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search suppliers…" />
          <ResultSummary showing={filtered.length} total={SUPPLIERS.length} noun="suppliers" />

          {filtered.length === 0 ? (
            <EmptyState icon={Building2} title="No suppliers match that search" />
          ) : (
            <div className="-mx-4 -mb-4 overflow-hidden border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Supplier</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead numeric>Overdue</TableHead>
                    <TableHead numeric>Balance</TableHead>
                    <TableHead numeric className="pr-4">
                      Spend YTD
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((supplier) => (
                    <TableRow key={supplier.id} interactive>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={supplier.name} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{supplier.name}</div>
                            <div className="truncate text-2xs text-muted-foreground">
                              {supplier.code} · since {formatDate(supplier.since)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {supplier.registrationNo}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{supplier.terms}</TableCell>
                      <TableCell numeric>
                        <Money
                          value={supplier.overdue}
                          currency={DEMO_CURRENCY}
                          dashOnZero
                          className={Number(supplier.overdue) > 0 ? "font-medium text-destructive" : undefined}
                        />
                      </TableCell>
                      <TableCell numeric className="font-medium">
                        <Money value={supplier.balance} currency={DEMO_CURRENCY} dashOnZero />
                      </TableCell>
                      <TableCell numeric className="pr-4 text-muted-foreground">
                        <Money value={supplier.ytd} currency={DEMO_CURRENCY} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="pl-4 font-medium">
                      {filtered.length} suppliers
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={sumMoney(filtered.map((s) => s.overdue))} currency={DEMO_CURRENCY} dashOnZero />
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={sumMoney(filtered.map((s) => s.balance))} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric className="pr-4 font-semibold">
                      <Money value={sumMoney(filtered.map((s) => s.ytd))} currency={DEMO_CURRENCY} />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
