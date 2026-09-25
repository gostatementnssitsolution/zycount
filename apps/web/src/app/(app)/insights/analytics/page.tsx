"use client";

import { PERMISSIONS, formatMoney } from "@zycount/shared";
import { Download } from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { BalanceChart, MixChart, MovementChart } from "@/components/portal/charts";
import { Section } from "@/components/portal/detail";
import { PageBadge } from "@/components/portal/page-badge";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { Progress, StackedBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import {
  CASH_MOVEMENT,
  DEMO_CURRENCY,
  EXPENSE_MIX,
  INVENTORY_MOVEMENT,
  PAYMENT_STATUS_MIX,
  REVENUE_MOVEMENT,
  TOP_CUSTOMERS,
  TOP_ITEMS,
} from "@/lib/demo";
import { cn } from "@/lib/utils";

type Range = "6M" | "12M";

export default function AnalyticsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Analytics />
    </RequirePermission>
  );
}

function Analytics() {
  const [range, setRange] = React.useState<Range>("12M");
  const movement = range === "6M" ? REVENUE_MOVEMENT.slice(-6) : REVENUE_MOVEMENT;

  const latest = REVENUE_MOVEMENT[REVENUE_MOVEMENT.length - 1];
  const previous = REVENUE_MOVEMENT[REVENUE_MOVEMENT.length - 2];

  const change = (key: "revenue" | "expenses" | "netProfit" | "cash") =>
    ((Number(latest[key]) - Number(previous[key])) / Number(previous[key])) * 100;

  const stats: Stat[] = [
    { key: "revenue", label: "Revenue", value: String(latest.revenue), currency: DEMO_CURRENCY, changePercent: change("revenue"), comparison: "vs. August", trend: REVENUE_MOVEMENT.slice(-6).map((point) => Number(point.revenue)) },
    { key: "expenses", label: "Expenses", value: String(latest.expenses), currency: DEMO_CURRENCY, changePercent: change("expenses"), positiveIsGood: false, comparison: "vs. August", trend: REVENUE_MOVEMENT.slice(-6).map((point) => Number(point.expenses)) },
    { key: "profit", label: "Net profit", value: String(latest.netProfit), currency: DEMO_CURRENCY, changePercent: change("netProfit"), comparison: "vs. August", trend: REVENUE_MOVEMENT.slice(-6).map((point) => Number(point.netProfit)) },
    { key: "cash", label: "Closing cash", value: String(latest.cash), currency: DEMO_CURRENCY, changePercent: change("cash"), comparison: "vs. August", trend: REVENUE_MOVEMENT.slice(-6).map((point) => Number(point.cash)) },
  ];

  const paymentTotal = PAYMENT_STATUS_MIX.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        description="Movement in what the business earns, spends, holds and is owed."
        actions={
          <>
            <PageBadge>Financial year 2026</PageBadge>
            <Segmented<Range>
              value={range}
              onChange={setRange}
              ariaLabel="Time range"
              options={[
                { value: "6M", label: "6 months" },
                { value: "12M", label: "12 months" },
              ]}
            />
            <Button variant="outline" size="sm">
              <Download />
              Export
            </Button>
          </>
        }
      />

      <PreviewBanner module="Analytics" phase={5} />
      <StatGrid stats={stats} />

      <MovementChart
        title="Revenue movement"
        description="Revenue and expenses side by side, with the profit they leave."
        data={movement}
        currency={DEMO_CURRENCY}
        bars={[
          { key: "revenue", label: "Revenue" },
          { key: "expenses", label: "Expenses" },
        ]}
        line={{ key: "netProfit", label: "Net profit" }}
        height={300}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <MixChart
          title="Expense mix"
          description="Where the September ringgit went."
          data={EXPENSE_MIX.map((row) => ({ name: row.name, value: row.value }))}
          currency={DEMO_CURRENCY}
          totalLabel="Expenses"
        />

        <BalanceChart
          title="Cash movement"
          description="Closing cash week by week this month."
          data={CASH_MOVEMENT}
          currency={DEMO_CURRENCY}
          dataKey="closing"
          label="Closing cash"
          className="lg:col-span-2"
          height={264}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MovementChart
          title="Inventory movement"
          description="Value received against value issued, with closing stock."
          data={INVENTORY_MOVEMENT}
          currency={DEMO_CURRENCY}
          bars={[
            { key: "inbound", label: "Received" },
            { key: "outbound", label: "Issued" },
          ]}
          line={{ key: "closing", label: "Closing value" }}
        />

        <Section
          title="Payment status"
          description="Every invoice issued this year, by how it stands today."
        >
          <div className="tabular text-2xl font-semibold tracking-tight">
            {formatMoney(String(paymentTotal), { currency: DEMO_CURRENCY, showSymbol: true })}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">invoiced year to date</p>

          <StackedBar
            className="mt-4 h-2.5"
            segments={PAYMENT_STATUS_MIX.map((slice) => ({
              label: slice.name,
              value: slice.value,
              tone: slice.tone === "success" ? "success" : slice.tone === "info" ? "info" : "destructive",
            }))}
          />

          <ul className="mt-4 space-y-3">
            {PAYMENT_STATUS_MIX.map((slice) => (
              <li key={slice.name} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-[2px]",
                    { success: "bg-success", info: "bg-info", destructive: "bg-destructive" }[slice.tone],
                  )}
                  aria-hidden
                />
                <span className="flex-1 text-muted-foreground">{slice.name}</span>
                <span className="tabular text-2xs text-muted-foreground">
                  {((slice.value / paymentTotal) * 100).toFixed(1)}%
                </span>
                <Money
                  value={String(slice.value)}
                  currency={DEMO_CURRENCY}
                  className="w-28 shrink-0 text-right font-medium"
                />
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Customers by revenue" description="Year to date, and how each has moved.">
          <ul className="space-y-3.5">
            {TOP_CUSTOMERS.map((customer) => (
              <li key={customer.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-medium">{customer.name}</span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span
                      className={cn(
                        "tabular text-2xs font-medium",
                        customer.change >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {customer.change >= 0 ? "▲" : "▼"} {Math.abs(customer.change).toFixed(1)}%
                    </span>
                    <Money value={customer.revenue} currency={DEMO_CURRENCY} className="text-sm font-medium" />
                  </span>
                </div>
                <Progress
                  value={Number(customer.revenue)}
                  max={Number(TOP_CUSTOMERS[0].revenue)}
                  tone="brand"
                  className="mt-1.5"
                  ariaLabel={`${customer.name} revenue against the largest customer`}
                />
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Items by revenue" description="Units sold, revenue earned and the margin on each." flush>
          <ul className="divide-y">
            {TOP_ITEMS.map((item) => (
              <li key={item.sku} className="flex items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{item.name}</div>
                  <div className="mt-0.5 font-mono text-2xs text-muted-foreground">
                    {item.sku} · {item.units} units
                  </div>
                </div>
                <div className="text-right">
                  <Money value={item.revenue} currency={DEMO_CURRENCY} className="text-sm font-medium" />
                  <div className="tabular text-2xs text-muted-foreground">{item.margin.toFixed(1)}% margin</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  );
}
