"use client";

import { formatMoney } from "@zycount/shared";
import { Table2 } from "lucide-react";
import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SeriesPoint } from "@/lib/demo";
import { cn } from "@/lib/utils";

/**
 * The insight charts.
 *
 * Series colours are the six categorical slots from the design tokens, in
 * fixed assignment order, and are never cycled past slot six. Where two series
 * sit side by side the mark shape differs as well as the colour, so the pairs
 * stay separable without relying on hue. Every chart can be read as a table.
 */
const SLOT = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-6))"];
const AXIS = "hsl(var(--muted-foreground))";
const GRID = "hsl(var(--border))";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
  shape: "bar" | "line" | "area";
}

function money(value: number, currency: string, compact = false): string {
  return formatMoney(value.toFixed(2), { currency, compact, showSymbol: !compact });
}

function SeriesLegend({ series }: { series: SeriesDef[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {series.map((item) => (
        <span key={item.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
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

function ValueTooltip({
  active,
  payload,
  label,
  currency,
  percent,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; name: string }>;
  label?: string;
  currency: string;
  percent?: boolean;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 font-medium">{label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-3">
            <span className="size-2 shrink-0 rounded-[2px]" style={{ background: entry.color }} aria-hidden />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="tabular ml-auto font-medium">
              {percent ? `${entry.value}%` : money(entry.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card chrome shared by every chart, including the chart/table switch. */
function ChartCard({
  title,
  description,
  series,
  data,
  currency,
  percent,
  chart,
  className,
  actions,
  height = 256,
}: {
  title: string;
  description?: string;
  series: SeriesDef[];
  data: SeriesPoint[];
  currency: string;
  percent?: boolean;
  chart: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  height?: number;
}) {
  const [asTable, setAsTable] = React.useState(false);

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setAsTable((current) => !current)}
            aria-pressed={asTable}
            aria-label={asTable ? "Show the chart" : "Show the figures as a table"}
          >
            <Table2 />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <SeriesLegend series={series} />

        {asTable ? (
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                {series.map((item) => (
                  <TableHead key={item.key} numeric>
                    {item.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((point) => (
                <TableRow key={point.label}>
                  <TableCell>{point.label}</TableCell>
                  {series.map((item) => (
                    <TableCell key={item.key} numeric>
                      {percent
                        ? `${Number(point[item.key])}%`
                        : money(Number(point[item.key] ?? 0), currency)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="mt-3" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              {chart as React.ReactElement}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Two money series as bars with a third as a line — revenue, expenses, profit. */
export function MovementChart({
  title,
  description,
  data,
  currency,
  bars,
  line,
  className,
  height,
}: {
  title: string;
  description?: string;
  data: SeriesPoint[];
  currency: string;
  bars: Array<{ key: string; label: string }>;
  line?: { key: string; label: string };
  className?: string;
  height?: number;
}) {
  const series: SeriesDef[] = [
    ...bars.map((bar, index) => ({ ...bar, color: SLOT[index], shape: "bar" as const })),
    ...(line ? [{ ...line, color: SLOT[3], shape: "line" as const }] : []),
  ];

  return (
    <ChartCard
      title={title}
      description={description}
      series={series}
      data={data}
      currency={currency}
      className={className}
      height={height}
      chart={
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis
            tick={{ fill: AXIS, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => money(value, currency, true)}
          />
          <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} content={<ValueTooltip currency={currency} />} />
          {bars.map((bar, index) => (
            <Bar key={bar.key} dataKey={bar.key} name={bar.label} fill={SLOT[index]} radius={[4, 4, 0, 0]} maxBarSize={18} />
          ))}
          {line && (
            <Line
              dataKey={line.key}
              name={line.label}
              type="monotone"
              stroke={SLOT[3]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </ComposedChart>
      }
    />
  );
}

/** One money series as a filled area — a balance over time. */
export function BalanceChart({
  title,
  description,
  data,
  currency,
  dataKey,
  label,
  className,
  height,
}: {
  title: string;
  description?: string;
  data: SeriesPoint[];
  currency: string;
  dataKey: string;
  label: string;
  className?: string;
  height?: number;
}) {
  const id = React.useId();
  const series: SeriesDef[] = [{ key: dataKey, label, color: SLOT[4], shape: "area" }];

  return (
    <ChartCard
      title={title}
      description={description}
      series={series}
      data={data}
      currency={currency}
      className={className}
      height={height}
      chart={
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SLOT[4]} stopOpacity="0.28" />
              <stop offset="100%" stopColor={SLOT[4]} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis
            tick={{ fill: AXIS, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(value: number) => money(value, currency, true)}
          />
          <Tooltip cursor={{ stroke: GRID }} content={<ValueTooltip currency={currency} />} />
          <Area
            dataKey={dataKey}
            name={label}
            type="monotone"
            stroke={SLOT[4]}
            strokeWidth={2}
            fill={`url(#area-${id})`}
          />
        </AreaChart>
      }
    />
  );
}

/** Percentages over time — margins, which share one 0–100 axis. */
export function RatioChart({
  title,
  description,
  data,
  lines,
  className,
  height,
}: {
  title: string;
  description?: string;
  data: SeriesPoint[];
  lines: Array<{ key: string; label: string }>;
  className?: string;
  height?: number;
}) {
  const series: SeriesDef[] = lines.map((line, index) => ({
    ...line,
    color: SLOT[index === 0 ? 0 : 2],
    shape: "line" as const,
  }));

  return (
    <ChartCard
      title={title}
      description={description}
      series={series}
      data={data}
      currency="MYR"
      percent
      className={className}
      height={height}
      chart={
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis
            tick={{ fill: AXIS, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={46}
            domain={[0, 60]}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip cursor={{ stroke: GRID }} content={<ValueTooltip currency="MYR" percent />} />
          {series.map((line) => (
            <Line
              key={line.key}
              dataKey={line.key}
              name={line.label}
              type="monotone"
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 2.5, fill: line.color, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      }
    />
  );
}

/**
 * A composition — where the expense ringgit went.
 *
 * The ring is paired with a labelled list carrying the figures, because a ring
 * alone cannot be read to the cent, and a seventh slice would fold into "Other"
 * rather than reaching for a seventh colour.
 */
export function MixChart({
  title,
  description,
  data,
  currency,
  className,
  totalLabel = "Total",
}: {
  title: string;
  description?: string;
  data: Array<{ name: string; value: number }>;
  currency: string;
  className?: string;
  totalLabel?: string;
}) {
  const ordered = React.useMemo(
    () => data.filter((slice) => slice.value > 0).sort((a, b) => b.value - a.value),
    [data],
  );
  const folded = React.useMemo(() => {
    if (ordered.length <= 6) return ordered;
    const head = ordered.slice(0, 5);
    const tail = ordered.slice(5).reduce((sum, slice) => sum + slice.value, 0);
    return [...head, { name: "Other", value: tail }];
  }, [ordered]);

  const total = folded.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </CardHeader>

      <CardContent>
        <div className="relative h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={folded}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {folded.map((slice, index) => (
                  <Cell key={slice.name} fill={SLOT[index % SLOT.length]} />
                ))}
              </Pie>
              <Tooltip content={<ValueTooltip currency={currency} />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
            <div className="text-2xs uppercase tracking-wide text-muted-foreground">{totalLabel}</div>
            <div className="tabular text-lg font-semibold">{money(total, currency, true)}</div>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {folded.map((slice, index) => (
            <li key={slice.name} className="flex items-center gap-2 text-sm">
              <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: SLOT[index % SLOT.length] }} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{slice.name}</span>
              <span className="tabular shrink-0 text-2xs text-muted-foreground">
                {total > 0 ? `${((slice.value / total) * 100).toFixed(1)}%` : "—"}
              </span>
              <span className="tabular w-24 shrink-0 text-right font-medium">{money(slice.value, currency)}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
