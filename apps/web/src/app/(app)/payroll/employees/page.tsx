"use client";

import { PERMISSIONS, sumMoney } from "@zycount/shared";
import { Plus, Users } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_CURRENCY, EMPLOYEES } from "@/lib/demo";
import { formatDate } from "@/lib/format";

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  ON_LEAVE: { label: "On leave", variant: "warning" },
  RESIGNED: { label: "Resigned", variant: "default" },
};

export default function EmployeesPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Employees />
    </RequirePermission>
  );
}

function Employees() {
  const [search, setSearch] = React.useState("");
  const [departments, setDepartments] = React.useState<string[]>([]);

  const allDepartments = [...new Set(EMPLOYEES.map((employee) => employee.department))];

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return EMPLOYEES.filter((employee) => {
      const matchesSearch =
        needle === "" ||
        employee.name.toLowerCase().includes(needle) ||
        employee.code.toLowerCase().includes(needle) ||
        employee.role.toLowerCase().includes(needle);
      return matchesSearch && (departments.length === 0 || departments.includes(employee.department));
    });
  }, [search, departments]);

  const gross = sumMoney(EMPLOYEES.map((employee) => employee.grossMonthly));
  const employerCost = sumMoney(
    EMPLOYEES.map((employee) => sumMoney([employee.grossMonthly, employee.epfEmployer, employee.socso, employee.eis])),
  );

  const stats: Stat[] = [
    { key: "headcount", label: "Headcount", value: String(EMPLOYEES.filter((e) => e.status !== "RESIGNED").length), unit: "COUNT", comparison: `${allDepartments.length} departments` },
    { key: "gross", label: "Monthly gross", value: gross, currency: DEMO_CURRENCY, hint: "Before statutory deductions. This is what posts to 6100 Salaries & Wages." },
    { key: "cost", label: "Monthly employer cost", value: employerCost, currency: DEMO_CURRENCY, hint: "Gross plus the employer's share of EPF, SOCSO and EIS." },
    { key: "average", label: "Average gross", value: (Number(gross) / EMPLOYEES.length).toFixed(2), currency: DEMO_CURRENCY },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        description="People, pay and the statutory particulars each pay run depends on."
        actions={
          <Button size="sm">
            <Plus />
            Add employee
          </Button>
        }
      />

      <PreviewBanner module="Payroll" phase={4} />
      <StatGrid stats={stats} />

      <Card>
        <CardContent className="space-y-4 p-4">
          <ListToolbar search={search} onSearchChange={setSearch} placeholder="Search by name, code or role…">
            <FilterBar>
              {allDepartments.map((department) => (
                <FilterChip
                  key={department}
                  active={departments.includes(department)}
                  count={EMPLOYEES.filter((employee) => employee.department === department).length}
                  onClick={() =>
                    setDepartments((current) =>
                      current.includes(department)
                        ? current.filter((value) => value !== department)
                        : [...current, department],
                    )
                  }
                >
                  {department}
                </FilterChip>
              ))}
            </FilterBar>
          </ListToolbar>

          <ResultSummary showing={filtered.length} total={EMPLOYEES.length} noun="employees" />

          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No employees match those filters" />
          ) : (
            <div className="-mx-4 -mb-4 overflow-hidden border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead numeric>Gross</TableHead>
                    <TableHead numeric>EPF</TableHead>
                    <TableHead numeric>SOCSO / EIS</TableHead>
                    <TableHead numeric>PCB</TableHead>
                    <TableHead numeric className="pr-4">
                      Net
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((employee) => (
                    <TableRow key={employee.id} interactive>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={employee.name} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{employee.name}</div>
                            <div className="truncate text-2xs text-muted-foreground">
                              {employee.code} · {employee.role} · joined {formatDate(employee.joinedOn)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{employee.department}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS[employee.status].variant}>{STATUS[employee.status].label}</Badge>
                      </TableCell>
                      <TableCell numeric className="font-medium">
                        <Money value={employee.grossMonthly} currency={DEMO_CURRENCY} />
                      </TableCell>
                      <TableCell numeric className="text-muted-foreground">
                        <Money value={employee.epfEmployee} currency={DEMO_CURRENCY} />
                      </TableCell>
                      <TableCell numeric className="text-muted-foreground">
                        <Money value={sumMoney([employee.socso, employee.eis])} currency={DEMO_CURRENCY} />
                      </TableCell>
                      <TableCell numeric className="text-muted-foreground">
                        <Money value={employee.pcb} currency={DEMO_CURRENCY} dashOnZero />
                      </TableCell>
                      <TableCell numeric className="pr-4 font-medium">
                        <Money value={employee.netMonthly} currency={DEMO_CURRENCY} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="pl-4 font-medium">
                      {filtered.length} employees
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={sumMoney(filtered.map((e) => e.grossMonthly))} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={sumMoney(filtered.map((e) => e.epfEmployee))} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={sumMoney(filtered.flatMap((e) => [e.socso, e.eis]))} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric className="font-semibold">
                      <Money value={sumMoney(filtered.map((e) => e.pcb))} currency={DEMO_CURRENCY} />
                    </TableCell>
                    <TableCell numeric className="pr-4 font-semibold">
                      <Money value={sumMoney(filtered.map((e) => e.netMonthly))} currency={DEMO_CURRENCY} />
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
