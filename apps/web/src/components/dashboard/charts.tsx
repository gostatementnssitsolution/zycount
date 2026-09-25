"use client";

import { formatMoney, toCents, type DashboardTrendPoint } from "@zycount/shared";
import { Table2 } from "lucide-react";
import * as React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Charts read the same design tokens the rest of the interface uses, so light
 * and dark are two selected palettes rather than one inverted. Series colours
 * are assigned in fixed slot order and never cycled.
 */
const SERIES = {
  revenue: { color: "hsl(var(--chart-1))", label: "Revenue" },
  expenses: { color: "hsl(var(--chart-2))", label: "Expenses" },
  netProfit: { color: "hsl(var(--chart-4))", label: "Net profit" },
  cash: { color: "hsl(var(--chart-5))", label: "Cash" },
} as const;

const AXIS = "hsl(var(--muted-foreground))";
const GRID = "hsl(var(--border))";

function compact(value: number, currency: string): string {
  return formatMoney(String(value), { currency, compact: true, showSymbol: false });
}

/**
 * The chart's own width, observed rather than inferred.
 *
 * Recharts' ResponsiveContainer takes its measurement when it mounts; inside a
 * grid track that has not settled yet it captures a narrower width and never
 * revises it, so the bars end up on a different scale from the axis. Watching
 * the element with a ResizeObserver and handing the chart an explicit width
 * keeps the two in step through every reflow.
 */
function useMeasuredWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width ?? 0;
      // Round to whole pixels so sub-pixel jitter does not re-render the chart.
      setWidth((current) => (Math.abs(current - measured) > 0.5 ? Math.round(measured) : current));
    });

    observer.observe(element);
    setWidth(Math.round(element.clientWidth));

    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/** Shared tooltip. Values are right-aligned and tabular, like the statements. */
function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 font-medium">{label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-3">
            <span
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: entry.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="tabular ml-auto font-medium">
              {formatMoney(String(entry.value), { currency, showSymbol: true })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Legend rendered as markup rather than Recharts' default, for token styling. */
function Legend({ series }: { series: Array<{ label: string; color: string; shape: "bar" | "line" }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {series.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={item.shape === "bar" ? "size-2.5 rounded-[2px]" : "h-0.5 w-4 rounded-full"}
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Revenue, expenses and the resulting profit over time.
 *
 * All three are money on one scale, so they share a single axis — never a
 * second y-axis. Revenue and expenses are bars while profit is a line: the
 * difference in mark shape carries the identity alongside colour, which keeps
 * the amber/green pair readable for colour-vision-deficient readers.
 */
export function TrendChart({
  data,
  currency,
  className,
}: {
  data: DashboardTrendPoint[];
  currency: string;
  className?: string;
}) {
  const [showTable, setShowTable] = React.useState(false);
  const [trendRef, trendWidth] = useMeasuredWidth<HTMLDivElement>();

  const chartData = React.useMemo(
    () =>
      data.map((point) => ({
        label: point.label,
        revenue: toCents(point.revenue) / 100,
        expenses: toCents(point.expenses) / 100,
        netProfit: toCents(point.netProfit) / 100,
      })),
    [data],
  );

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Revenue, expenses and profit</CardTitle>
          <CardDescription>Movement per fiscal period, from posted entries.</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowTable((current) => !current)}
          aria-label={showTable ? "Show chart" : "Show the figures as a table"}
          aria-pressed={showTable}
        >
          <Table2 />
        </Button>
      </CardHeader>

      <CardContent>
        <Legend
          series={[
            { ...SERIES.revenue, shape: "bar" },
            { ...SERIES.expenses, shape: "bar" },
            { ...SERIES.netProfit, shape: "line" },
          ]}
        />

        {showTable ? (
          <TrendTable data={data} currency={currency} />
        ) : chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No posted activity in this company yet.
          </p>
        ) : (
          <div ref={trendRef} className="mt-3 h-64 w-full">
            {trendWidth > 0 && (
            <ComposedChart
              width={trendWidth}
              height={256}
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
            >
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                />
                <YAxis
                  tick={{ fill: AXIS, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(value: number) => compact(value, currency)}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                  content={<ChartTooltip currency={currency} />}
                />

                {/* A 2px surface gap keeps adjacent bars from fusing. */}
                <Bar
                  dataKey="revenue"
                  name={SERIES.revenue.label}
                  fill={SERIES.revenue.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="expenses"
                  name={SERIES.expenses.label}
                  fill={SERIES.expenses.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
                <Line
                  type="monotone"
                  dataKey="netProfit"
                  name={SERIES.netProfit.label}
                  stroke={SERIES.netProfit.color}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--card))" }}
                  activeDot={{ r: 5 }}
                />
            </ComposedChart>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendTable({ data, currency }: { data: DashboardTrendPoint[]; currency: string }) {
  return (
    <div className="mt-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead numeric>Revenue</TableHead>
            <TableHead numeric>Expenses</TableHead>
            <TableHead numeric>Net profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((point) => (
            <TableRow key={point.periodId}>
              <TableCell>{point.label}</TableCell>
              <TableCell numeric>
                <Money value={point.revenue} currency={currency} />
              </TableCell>
              <TableCell numeric>
                <Money value={point.expenses} currency={currency} />
              </TableCell>
              <TableCell numeric>
                <Money value={point.netProfit} currency={currency} colorSign />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * The largest operating expenses, as a ranked bar chart.
 *
 * Ranked magnitude reads far better as sorted bars than as a pie: length is
 * easier to compare than angle, and the labels sit beside the value.
 */
export function ExpenseMixChart({
  data,
  currency,
  className,
}: {
  data: Array<{ name: string; amount: string }>;
  currency: string;
  className?: string;
}) {
  const rows = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => toCents(b.amount) - toCents(a.amount));
    const largest = sorted.length > 0 ? toCents(sorted[0].amount) : 0;

    return sorted.map((row) => ({
      ...row,
      // Bars are scaled against the largest, so the ranking is the message.
      share: largest > 0 ? (toCents(row.amount) / largest) * 100 : 0,
    }));
  }, [data]);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Largest expenses</CardTitle>
        <CardDescription>Operating costs for the selected period.</CardDescription>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No expenses posted in this period.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate" title={row.name}>
                    {row.name}
                  </span>
                  <Money
                    value={row.amount}
                    currency={currency}
                    className="shrink-0 text-xs font-medium"
                  />
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(row.share, 2)}%`,
                      background: SERIES.expenses.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Closing cash across periods — its own chart, never a second axis on the trend. */
export function CashChart({
  data,
  currency,
  className,
}: {
  data: DashboardTrendPoint[];
  currency: string;
  className?: string;
}) {
  const [cashRef, cashWidth] = useMeasuredWidth<HTMLDivElement>();

  const chartData = React.useMemo(
    () => data.map((point) => ({ label: point.label, cash: toCents(point.cash) / 100 })),
    [data],
  );

  if (chartData.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Cash position</CardTitle>
        <CardDescription>Closing cash and bank balances by period.</CardDescription>
      </CardHeader>

      <CardContent>
        <div ref={cashRef} className="h-40 w-full">
          {cashWidth > 0 && (
          <ComposedChart
            width={cashWidth}
            height={160}
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -12 }}
          >
              <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fill: AXIS, fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                tickFormatter={(value: string) => value.slice(0, 3)}
              />
              <YAxis
                tick={{ fill: AXIS, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(value: number) => compact(value, currency)}
              />
              <Tooltip
                cursor={{ stroke: GRID }}
                content={<ChartTooltip currency={currency} />}
              />
              <Line
                type="monotone"
                dataKey="cash"
                name={SERIES.cash.label}
                stroke={SERIES.cash.color}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 2, fill: "hsl(var(--card))" }}
                activeDot={{ r: 5 }}
              />
          </ComposedChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
