"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Download } from "lucide-react";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { MovementChart } from "@/components/portal/charts";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { FilterBar, FilterChip, ListToolbar, ResultSummary } from "@/components/portal/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_CURRENCY, INVENTORY_MOVEMENT, STOCK_MOVEMENTS } from "@/lib/demo";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPES = ["PURCHASE", "SALE", "ADJUSTMENT", "TRANSFER", "RETURN"] as const;
const TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Purchase",
  SALE: "Sale",
  ADJUSTMENT: "Adjustment",
  TRANSFER: "Transfer",
  RETURN: "Return",
};

export default function StockMovementsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <StockMovements />
    </RequirePermission>
  );
}

function StockMovements() {
  const [search, setSearch] = React.useState("");
  const [types, setTypes] = React.useState<string[]>([]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return STOCK_MOVEMENTS.filter((movement) => {
      const matchesSearch =
        needle === "" ||
        movement.itemName.toLowerCase().includes(needle) ||
        movement.sku.toLowerCase().includes(needle) ||
        movement.reference.toLowerCase().includes(needle);
      return matchesSearch && (types.length === 0 || types.includes(movement.type));
    });
  }, [search, types]);

  const inbound = sumMoney(filtered.filter((m) => Number(m.value) > 0).map((m) => m.value));
  const outbound = sumMoney(filtered.filter((m) => Number(m.value) < 0).map((m) => m.value));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock movements"
        description="Every in and out, with the value that moved with it."
        actions={
          <Button variant="outline" size="sm">
            <Download />
            Export
          </Button>
        }
      />

      <PreviewBanner module="Inventory" phase={3} />

      <MovementChart
        title="Stock movement by month"
        description="Value received against value issued, and the closing stock figure."
        data={INVENTORY_MOVEMENT}
        currency={DEMO_CURRENCY}
        bars={[
          { key: "inbound", label: "Received" },
          { key: "outbound", label: "Issued" },
        ]}
        line={{ key: "closing", label: "Closing value" }}
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search by item, SKU or reference…">
            <FilterBar>
              {TYPES.map((type) => (
                <FilterChip
                  key={type}
                  active={types.includes(type)}
                  count={STOCK_MOVEMENTS.filter((movement) => movement.type === type).length}
                  onClick={() =>
                    setTypes((current) =>
                      current.includes(type) ? current.filter((value) => value !== type) : [...current, type],
                    )
                  }
                >
                  {TYPE_LABELS[type]}
                </FilterChip>
              ))}
            </FilterBar>
          </ListToolbar>

          <ResultSummary showing={filtered.length} total={STOCK_MOVEMENTS.length} noun="movements">
            <span>
              In <Money value={inbound} currency={DEMO_CURRENCY} showSymbol className="font-medium text-foreground" />
            </span>
            <span>
              Out <Money value={outbound} currency={DEMO_CURRENCY} showSymbol className="font-medium text-foreground" />
            </span>
          </ResultSummary>

          <div className="-mx-4 -mb-4 overflow-hidden border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead numeric>Quantity</TableHead>
                  <TableHead numeric>Unit cost</TableHead>
                  <TableHead numeric>Value</TableHead>
                  <TableHead numeric className="pr-4">
                    Balance
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((movement) => (
                  <TableRow key={movement.id} interactive>
                    <TableCell className="whitespace-nowrap pl-4 text-muted-foreground">
                      {formatDate(movement.date)}
                    </TableCell>
                    <TableCell className="max-w-[16rem]">
                      <div className="truncate">{movement.itemName}</div>
                      <div className="font-mono text-2xs text-muted-foreground">{movement.sku}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {TYPE_LABELS[movement.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-brand">{movement.reference}</TableCell>
                    <TableCell className="text-muted-foreground">{movement.location}</TableCell>
                    <TableCell numeric className={cn("font-medium", movement.quantity < 0 && "text-destructive")}>
                      {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                    </TableCell>
                    <TableCell numeric>
                      <Money value={movement.unitCost} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric>
                      <Money value={movement.value} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric className="pr-4 text-muted-foreground">
                      {movement.balanceAfter}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Section
        title="How a movement reaches the ledger"
        description="Stock is an asset until it is sold; the moment it is, its cost becomes an expense."
      >
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Receiving</span> debits 1300 Inventory and credits
            2100 Trade Payables — the value sits on the balance sheet.
          </li>
          <li>
            <span className="font-medium text-foreground">Issuing against a sale</span> debits 5000 Cost of
            Goods Sold and credits 1300 Inventory, so the cost lands in the same period as the revenue it earned.
          </li>
          <li>
            <span className="font-medium text-foreground">An adjustment</span> is written off to the variance
            account with a reason, never silently absorbed.
          </li>
        </ul>
      </Section>
    </div>
  );
}
