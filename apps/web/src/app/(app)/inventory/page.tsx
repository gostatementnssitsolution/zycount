"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Boxes, Download, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { MixChart } from "@/components/portal/charts";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { FilterBar, FilterChip, ListToolbar, ResultSummary } from "@/components/portal/toolbar";
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
import { DEMO_CURRENCY, INVENTORY_ITEMS, INVENTORY_VALUATION } from "@/lib/demo";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "info" }> = {
  IN_STOCK: { label: "In stock", variant: "success" },
  LOW: { label: "Low", variant: "warning" },
  OUT: { label: "Out of stock", variant: "destructive" },
  OVERSTOCKED: { label: "Overstocked", variant: "info" },
};

export default function InventoryPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Inventory />
    </RequirePermission>
  );
}

function Inventory() {
  const [search, setSearch] = React.useState("");
  const [statuses, setStatuses] = React.useState<string[]>([]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return INVENTORY_ITEMS.filter((item) => {
      const matchesSearch =
        needle === "" ||
        item.name.toLowerCase().includes(needle) ||
        item.sku.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle);
      return matchesSearch && (statuses.length === 0 || statuses.includes(item.status));
    });
  }, [search, statuses]);

  const value = sumMoney(INVENTORY_ITEMS.map((item) => item.value));
  const belowReorder = INVENTORY_ITEMS.filter((item) => item.available <= item.reorderLevel && item.reorderLevel > 0);

  const stats: Stat[] = [
    { key: "value", label: "Stock value", value, currency: DEMO_CURRENCY, changePercent: 3.7, comparison: "vs. last month", trend: [228, 202, 227, 201, 216, 224], hint: "At cost, on the company's costing method. This is the figure account 1300 carries." },
    { key: "low", label: "At or below reorder", value: String(belowReorder.length), unit: "COUNT", positiveIsGood: false, comparison: "across 2 locations", href: "/inventory/reorder" },
    { key: "days", label: "Inventory days", value: "64", unit: "DAYS", positiveIsGood: false, changePercent: -5.9, comparison: "vs. last month", trend: [58, 61, 63, 66, 68, 64], hint: "How long stock sits before it sells." },
    { key: "skus", label: "Items tracked", value: String(INVENTORY_ITEMS.length), unit: "COUNT", comparison: `${new Set(INVENTORY_ITEMS.map((i) => i.category)).size} categories` },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Inventory"
        description="What is on hand, what is already promised, and what it is worth in the books."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download />
              Export
            </Button>
            <Button size="sm">
              <Plus />
              New item
            </Button>
          </>
        }
      />

      <PreviewBanner module="Inventory" phase={3} />
      <StatGrid stats={stats} />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card className="order-2 lg:order-1">
          <CardContent className="space-y-4 p-4">
            <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search by SKU, name or category…">
              <FilterBar>
                {Object.keys(STATUS).map((status) => (
                  <FilterChip
                    key={status}
                    active={statuses.includes(status)}
                    count={INVENTORY_ITEMS.filter((item) => item.status === status).length}
                    onClick={() =>
                      setStatuses((current) =>
                        current.includes(status) ? current.filter((value) => value !== status) : [...current, status],
                      )
                    }
                  >
                    {STATUS[status].label}
                  </FilterChip>
                ))}
              </FilterBar>
            </ListToolbar>

            <ResultSummary showing={filtered.length} total={INVENTORY_ITEMS.length} noun="items">
              <span>
                Value{" "}
                <Money
                  value={sumMoney(filtered.map((item) => item.value))}
                  currency={DEMO_CURRENCY}
                  showSymbol
                  className="font-medium text-foreground"
                />
              </span>
            </ResultSummary>

            {filtered.length === 0 ? (
              <EmptyState icon={Boxes} title="No items match those filters" />
            ) : (
              <div className="-mx-4 -mb-4 overflow-hidden border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Item</TableHead>
                      <TableHead numeric>On hand</TableHead>
                      <TableHead numeric>Reserved</TableHead>
                      <TableHead numeric>Available</TableHead>
                      <TableHead numeric>Incoming</TableHead>
                      <TableHead className="w-32">Against reorder</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead numeric className="pr-4">
                        Value
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((item) => {
                      const status = STATUS[item.status];
                      const ratio = item.reorderLevel > 0 ? (item.available / item.reorderLevel) * 100 : 100;

                      return (
                        <TableRow key={item.id} interactive>
                          <TableCell className="pl-4">
                            <div className="max-w-[16rem] truncate font-medium">{item.name}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
                              <span className="font-mono">{item.sku}</span>
                              <span aria-hidden>·</span>
                              <span>{item.category}</span>
                              <span aria-hidden>·</span>
                              <span>{item.location}</span>
                            </div>
                          </TableCell>
                          <TableCell numeric>{item.onHand}</TableCell>
                          <TableCell numeric className="text-muted-foreground">
                            {item.reserved || "—"}
                          </TableCell>
                          <TableCell
                            numeric
                            className={cn(
                              "font-medium",
                              item.available === 0 && item.reorderLevel > 0 && "text-destructive",
                            )}
                          >
                            {item.available}
                          </TableCell>
                          <TableCell numeric className="text-muted-foreground">
                            {item.incoming || "—"}
                          </TableCell>
                          <TableCell>
                            {item.reorderLevel > 0 ? (
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={Math.min(ratio, 200)}
                                  max={200}
                                  tone={ratio <= 100 ? "destructive" : ratio <= 150 ? "warning" : "success"}
                                  ariaLabel={`${item.sku} against reorder level`}
                                  className="w-16"
                                />
                                <span className="tabular text-2xs text-muted-foreground">{item.reorderLevel}</span>
                              </div>
                            ) : (
                              <span className="text-2xs text-muted-foreground">Not stocked</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell numeric className="pr-4 font-medium">
                            <Money value={item.value} currency={DEMO_CURRENCY} dashOnZero />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>

                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={7} className="pl-4 font-medium">
                        {filtered.length} of {INVENTORY_ITEMS.length} items
                      </TableCell>
                      <TableCell numeric className="pr-4 font-semibold">
                        <Money value={sumMoney(filtered.map((item) => item.value))} currency={DEMO_CURRENCY} />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="order-1 min-w-0 space-y-5 lg:order-2">
          <MixChart
            title="Value by category"
            description="What the stock figure is made of."
            data={INVENTORY_VALUATION.map((row) => ({ name: row.category, value: Number(row.value) }))}
            currency={DEMO_CURRENCY}
            totalLabel="At cost"
          />

          <Section title="Needs attention" description="Items at or below their reorder level.">
            {belowReorder.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing is below its reorder level.</p>
            ) : (
              <ul className="space-y-3">
                {belowReorder.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{item.name}</div>
                      <div className="text-2xs text-muted-foreground">
                        {item.available} available · reorder at {item.reorderLevel} · last moved{" "}
                        {formatDate(item.lastMovement)}
                      </div>
                    </div>
                    <Badge variant={STATUS[item.status].variant} className="shrink-0">
                      {STATUS[item.status].label}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
              <Link href="/inventory/reorder">Open the reorder planner</Link>
            </Button>
          </Section>
        </div>
      </div>
    </div>
  );
}
