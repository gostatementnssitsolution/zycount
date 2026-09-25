"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Gauge, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { EmptyState } from "@/components/common/empty-state";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { MixChart } from "@/components/portal/charts";
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
import { DEMO_CURRENCY, FIXED_ASSETS } from "@/lib/demo";
import { formatDate } from "@/lib/format";

const STATUS: Record<string, { label: string; variant: "success" | "default" | "warning" }> = {
  IN_USE: { label: "In use", variant: "success" },
  FULLY_DEPRECIATED: { label: "Fully depreciated", variant: "warning" },
  DISPOSED: { label: "Disposed", variant: "default" },
};

export default function FixedAssetsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <FixedAssets />
    </RequirePermission>
  );
}

function FixedAssets() {
  const [search, setSearch] = React.useState("");
  const [categories, setCategories] = React.useState<string[]>([]);

  const allCategories = [...new Set(FIXED_ASSETS.map((asset) => asset.category))];

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return FIXED_ASSETS.filter((asset) => {
      const matchesSearch =
        needle === "" ||
        asset.name.toLowerCase().includes(needle) ||
        asset.code.toLowerCase().includes(needle) ||
        asset.location.toLowerCase().includes(needle);
      return matchesSearch && (categories.length === 0 || categories.includes(asset.category));
    });
  }, [search, categories]);

  const inUse = FIXED_ASSETS.filter((asset) => asset.status !== "DISPOSED");
  const cost = sumMoney(inUse.map((asset) => asset.cost));
  const accumulated = sumMoney(inUse.map((asset) => asset.accumulated));
  const nbv = sumMoney(inUse.map((asset) => asset.netBookValue));
  const monthly = sumMoney(inUse.filter((a) => a.status === "IN_USE").map((asset) => asset.monthlyCharge));

  const byCategory = allCategories.map((category) => ({
    name: category,
    value: Number(sumMoney(inUse.filter((asset) => asset.category === category).map((asset) => asset.netBookValue))),
  }));

  const stats: Stat[] = [
    { key: "cost", label: "Cost", value: cost, currency: DEMO_CURRENCY, hint: "What the assets cost when they were acquired." },
    { key: "accumulated", label: "Accumulated depreciation", value: accumulated, currency: DEMO_CURRENCY, hint: "Charged to date, carried in account 1590." },
    { key: "nbv", label: "Net book value", value: nbv, currency: DEMO_CURRENCY, hint: "Cost less depreciation — the figure the balance sheet carries." },
    { key: "monthly", label: "Monthly charge", value: monthly, currency: DEMO_CURRENCY, comparison: `${inUse.filter((a) => a.status === "IN_USE").length} assets still depreciating`, href: "/fixed-assets/depreciation" },
  ];

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Asset register"
        description="What the business owns, what it has been written down to, and what it charges each month."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/fixed-assets/depreciation">Run depreciation</Link>
            </Button>
            <Button size="sm">
              <Plus />
              Add asset
            </Button>
          </>
        }
      />

      <PreviewBanner module="Fixed assets" phase={4} />
      <StatGrid stats={stats} />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card className="order-2 lg:order-1">
          <CardContent className="space-y-4 p-4">
            <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search by name, code or location…">
              <FilterBar>
                {allCategories.map((category) => (
                  <FilterChip
                    key={category}
                    active={categories.includes(category)}
                    count={FIXED_ASSETS.filter((asset) => asset.category === category).length}
                    onClick={() =>
                      setCategories((current) =>
                        current.includes(category)
                          ? current.filter((value) => value !== category)
                          : [...current, category],
                      )
                    }
                  >
                    {category}
                  </FilterChip>
                ))}
              </FilterBar>
            </ListToolbar>

            <ResultSummary showing={filtered.length} total={FIXED_ASSETS.length} noun="assets" />

            {filtered.length === 0 ? (
              <EmptyState icon={Gauge} title="No assets match those filters" />
            ) : (
              <div className="-mx-4 -mb-4 overflow-hidden border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Asset</TableHead>
                      <TableHead>Acquired</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="w-28">Depreciated</TableHead>
                      <TableHead numeric>Cost</TableHead>
                      <TableHead numeric>Monthly</TableHead>
                      <TableHead numeric className="pr-4">
                        Net book value
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((asset) => {
                      const depreciated =
                        Number(asset.cost) === 0 ? 0 : (Number(asset.accumulated) / Number(asset.cost)) * 100;

                      return (
                        <TableRow key={asset.id} interactive>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                              <span className="max-w-[16rem] truncate font-medium">{asset.name}</span>
                              <Badge variant={STATUS[asset.status].variant}>{STATUS[asset.status].label}</Badge>
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
                              <span className="font-mono">{asset.code}</span>
                              <span aria-hidden>·</span>
                              <span>{asset.category}</span>
                              <span aria-hidden>·</span>
                              <span>{asset.location}</span>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(asset.acquiredOn)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {asset.method === "STRAIGHT_LINE" ? "Straight line" : "Reducing balance"}
                            <div className="text-2xs">{asset.usefulLifeMonths} months</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={depreciated}
                                tone={depreciated >= 100 ? "warning" : "brand"}
                                ariaLabel={`${asset.code} depreciated`}
                                className="w-14"
                              />
                              <span className="tabular text-2xs text-muted-foreground">
                                {depreciated.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell numeric>
                            <Money value={asset.cost} currency={DEMO_CURRENCY} />
                          </TableCell>
                          <TableCell numeric className="text-muted-foreground">
                            <Money
                              value={asset.status === "IN_USE" ? asset.monthlyCharge : "0.00"}
                              currency={DEMO_CURRENCY}
                              dashOnZero
                            />
                          </TableCell>
                          <TableCell numeric className="pr-4 font-medium">
                            <Money value={asset.netBookValue} currency={DEMO_CURRENCY} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>

                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="pl-4 font-medium">
                        {filtered.length} assets
                      </TableCell>
                      <TableCell numeric className="font-semibold">
                        <Money value={sumMoney(filtered.map((a) => a.cost))} currency={DEMO_CURRENCY} />
                      </TableCell>
                      <TableCell numeric className="font-semibold">
                        <Money
                          value={sumMoney(filtered.filter((a) => a.status === "IN_USE").map((a) => a.monthlyCharge))}
                          currency={DEMO_CURRENCY}
                        />
                      </TableCell>
                      <TableCell numeric className="pr-4 font-semibold">
                        <Money value={sumMoney(filtered.map((a) => a.netBookValue))} currency={DEMO_CURRENCY} />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="order-1 min-w-0 lg:order-2">
          <MixChart
            title="Net book value by category"
            description="What the balance sheet figure is made of."
            data={byCategory}
            currency={DEMO_CURRENCY}
            totalLabel="Net book value"
          />
        </div>
      </div>
    </div>
  );
}
