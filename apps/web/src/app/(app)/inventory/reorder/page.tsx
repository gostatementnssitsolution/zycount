"use client";

import { PERMISSIONS, multiplyMoney, sumMoney } from "@zycount/shared";
import { ShoppingCart, Truck } from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { StatGrid, type Stat } from "@/components/portal/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { DEMO_CURRENCY, INVENTORY_ITEMS } from "@/lib/demo";

export default function ReorderPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Reorder />
    </RequirePermission>
  );
}

function Reorder() {
  const candidates = React.useMemo(
    () => INVENTORY_ITEMS.filter((item) => item.reorderLevel > 0 && item.available <= item.reorderLevel),
    [],
  );

  const [selected, setSelected] = React.useState<string[]>(() => candidates.map((item) => item.id));

  const chosen = candidates.filter((item) => selected.includes(item.id));
  const cost = sumMoney(chosen.map((item) => multiplyMoney(item.unitCost, item.reorderQuantity)));

  const stats: Stat[] = [
    { key: "items", label: "Items to reorder", value: String(candidates.length), unit: "COUNT", comparison: "at or below reorder level" },
    { key: "cost", label: "Cost to replenish", value: cost, currency: DEMO_CURRENCY, hint: "Suggested quantity at current cost. Raising the orders commits the spend; nothing posts until the goods and the bill arrive." },
    { key: "out", label: "Out of stock", value: String(INVENTORY_ITEMS.filter((item) => item.status === "OUT").length), unit: "COUNT", positiveIsGood: false },
    { key: "incoming", label: "Already on order", value: String(INVENTORY_ITEMS.filter((item) => item.incoming > 0).length), unit: "COUNT", comparison: "arriving within 14 days" },
  ];

  const toggle = (id: string) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reorder planner"
        description="What to buy before it runs out, and what it will cost to do it."
        actions={
          <Button size="sm" disabled={chosen.length === 0}>
            <ShoppingCart />
            Raise {chosen.length} purchase order{chosen.length === 1 ? "" : "s"}
          </Button>
        }
      />

      <PreviewBanner module="Inventory" phase={3} />
      <StatGrid stats={stats} />

      <Section
        title="Suggested orders"
        description="Available stock is on-hand less what is already promised to customers — the figure that matters when deciding what to buy."
        flush
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-5">
                <span className="sr-only">Include</span>
              </TableHead>
              <TableHead>Item</TableHead>
              <TableHead numeric>Available</TableHead>
              <TableHead numeric>Reorder at</TableHead>
              <TableHead className="w-28">Cover</TableHead>
              <TableHead numeric>Incoming</TableHead>
              <TableHead numeric>Suggested qty</TableHead>
              <TableHead numeric className="pr-5">
                Cost
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {candidates.map((item) => {
              const lineCost = multiplyMoney(item.unitCost, item.reorderQuantity);
              const cover = (item.available / item.reorderLevel) * 100;

              return (
                <TableRow key={item.id}>
                  <TableCell className="pl-5">
                    <Checkbox
                      checked={selected.includes(item.id)}
                      onCheckedChange={() => toggle(item.id)}
                      aria-label={`Include ${item.name}`}
                    />
                  </TableCell>
                  <TableCell className="max-w-[18rem]">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-2xs text-muted-foreground">
                      <span className="font-mono">{item.sku}</span>
                      <span aria-hidden>·</span>
                      <span>{item.location}</span>
                    </div>
                  </TableCell>
                  <TableCell numeric className={item.available === 0 ? "font-medium text-destructive" : undefined}>
                    {item.available}
                  </TableCell>
                  <TableCell numeric className="text-muted-foreground">
                    {item.reorderLevel}
                  </TableCell>
                  <TableCell>
                    <Progress
                      value={cover}
                      tone={cover === 0 ? "destructive" : cover < 50 ? "warning" : "brand"}
                      ariaLabel={`${item.sku} cover against reorder level`}
                    />
                  </TableCell>
                  <TableCell numeric>
                    {item.incoming > 0 ? (
                      <Badge variant="info" className="font-normal">
                        <Truck className="size-3" aria-hidden />
                        {item.incoming}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell numeric className="font-medium">
                    {item.reorderQuantity}
                  </TableCell>
                  <TableCell numeric className="pr-5">
                    <Money value={lineCost} currency={DEMO_CURRENCY} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="pl-5 font-medium">
                {chosen.length} of {candidates.length} items selected
              </TableCell>
              <TableCell numeric className="pr-5 font-semibold">
                <Money value={cost} currency={DEMO_CURRENCY} />
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Section>
    </div>
  );
}
