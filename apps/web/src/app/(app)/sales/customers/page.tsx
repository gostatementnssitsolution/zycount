"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Download, Plus, Users } from "lucide-react";
import * as React from "react";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { FilterBar, FilterChip, ListToolbar, ResultSummary } from "@/components/portal/toolbar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CUSTOMERS, DEMO_CURRENCY } from "@/lib/demo";
import { formatDate } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", ON_HOLD: "On hold", ARCHIVED: "Archived" };

export default function CustomersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Customers />
    </RequirePermission>
  );
}

function Customers() {
  const [search, setSearch] = React.useState("");
  const [statuses, setStatuses] = React.useState<string[]>([]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return CUSTOMERS.filter((customer) => {
      const matchesSearch =
        needle === "" ||
        customer.name.toLowerCase().includes(needle) ||
        customer.code.toLowerCase().includes(needle) ||
        customer.email.toLowerCase().includes(needle);
      return matchesSearch && (statuses.length === 0 || statuses.includes(customer.status));
    });
  }, [search, statuses]);

  const receivable = sumMoney(CUSTOMERS.map((customer) => customer.balance));
  const overdue = sumMoney(CUSTOMERS.map((customer) => customer.overdue));
  const ytd = sumMoney(CUSTOMERS.map((customer) => customer.ytd));

  const stats: Stat[] = [
    { key: "receivable", label: "Total receivable", value: receivable, currency: DEMO_CURRENCY, hint: "The sum of every customer balance on file." },
    { key: "overdue", label: "Of which overdue", value: overdue, currency: DEMO_CURRENCY, positiveIsGood: false, changePercent: -12.1, comparison: "vs. last month", href: "/sales/ar-aging" },
    { key: "ytd", label: "Revenue year to date", value: ytd, currency: DEMO_CURRENCY, changePercent: 14.6, comparison: "vs. the same point last year" },
    { key: "active", label: "Active customers", value: String(CUSTOMERS.filter((c) => c.status === "ACTIVE").length), unit: "COUNT", comparison: `${CUSTOMERS.length} on file` },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Who owes you, on what terms, and how close each is to their limit."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download />
              Export
            </Button>
            <Button size="sm">
              <Plus />
              New customer
            </Button>
          </>
        }
      />

      <PreviewBanner module="Sales" phase={2} />
      <StatGrid stats={stats} />

      <Card>
        <CardContent className="space-y-4 p-4">
          <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search by name, code or email…">
            <FilterBar>
              {(["ACTIVE", "ON_HOLD", "ARCHIVED"] as const).map((status) => (
                <FilterChip
                  key={status}
                  active={statuses.includes(status)}
                  count={CUSTOMERS.filter((customer) => customer.status === status).length}
                  onClick={() =>
                    setStatuses((current) =>
                      current.includes(status) ? current.filter((value) => value !== status) : [...current, status],
                    )
                  }
                >
                  {STATUS_LABELS[status]}
                </FilterChip>
              ))}
            </FilterBar>
          </ListToolbar>

          <ResultSummary showing={filtered.length} total={CUSTOMERS.length} noun="customers" />

          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No customers match those filters" />
          ) : (
            <div className="-mx-4 -mb-4 overflow-hidden border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Customer</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36">Credit used</TableHead>
                    <TableHead numeric>Overdue</TableHead>
                    <TableHead numeric>Balance</TableHead>
                    <TableHead numeric className="pr-4">
                      Revenue YTD
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((customer) => {
                    const limit = Number(customer.creditLimit);
                    const used = limit > 0 ? (Number(customer.balance) / limit) * 100 : 0;

                    return (
                      <TableRow key={customer.id} interactive>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={customer.name} size="sm" />
                            <div className="min-w-0">
                              <div className="truncate font-medium">{customer.name}</div>
                              <div className="truncate text-2xs text-muted-foreground">
                                {customer.code} · since {formatDate(customer.since)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{customer.terms}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.status === "ACTIVE" ? "success" : customer.status === "ON_HOLD" ? "warning" : "default"
                            }
                          >
                            {STATUS_LABELS[customer.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {limit > 0 ? (
                            <div className="flex items-center gap-2">
                              <Progress
                                value={used}
                                tone={used > 80 ? "warning" : "brand"}
                                ariaLabel={`${customer.name} credit used`}
                                className="w-20"
                              />
                              <span className="tabular text-2xs text-muted-foreground">{used.toFixed(0)}%</span>
                            </div>
                          ) : (
                            <span className="text-2xs text-muted-foreground">No limit</span>
                          )}
                        </TableCell>
                        <TableCell numeric>
                          <Money
                            value={customer.overdue}
                            currency={DEMO_CURRENCY}
                            dashOnZero
                            className={Number(customer.overdue) > 0 ? "font-medium text-destructive" : undefined}
                          />
                        </TableCell>
                        <TableCell numeric className="font-medium">
                          <Money value={customer.balance} currency={DEMO_CURRENCY} dashOnZero />
                        </TableCell>
                        <TableCell numeric className="pr-4 text-muted-foreground">
                          <Money value={customer.ytd} currency={DEMO_CURRENCY} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="pl-4 font-medium">
                      {filtered.length} customers
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={sumMoney(filtered.map((c) => c.overdue))} currency={DEMO_CURRENCY} dashOnZero />
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={sumMoney(filtered.map((c) => c.balance))} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric className="pr-4 font-semibold">
                      <Money value={sumMoney(filtered.map((c) => c.ytd))} currency={DEMO_CURRENCY} />
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
