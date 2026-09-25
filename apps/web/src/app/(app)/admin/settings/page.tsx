"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  PERMISSIONS,
  updateCompanySchema,
  type UpdateCompanyInput,
} from "@zycount/shared";
import { Building2, Save } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ErrorState, FormError } from "@/components/common/error-state";
import { PermissionGate, RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCompany, useCompanyStats } from "@/hooks/use-accounting";
import { apiClient } from "@/lib/api-client";
import { ApiError } from "@/lib/api-client";
import { MONTHS } from "@/lib/constants";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { useAuth, useCompanyId } from "@/providers/auth-provider";

export default function SettingsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.COMPANY_VIEW}>
      <CompanySettings />
    </RequirePermission>
  );
}

function CompanySettings() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();
  const { refreshUser, can } = useAuth();

  const { data: company, isLoading, error, refetch } = useCompany(companyId);
  const { data: stats } = useCompanyStats(companyId);

  const [saveError, setSaveError] = React.useState<unknown>(null);
  const canEdit = can(PERMISSIONS.COMPANY_EDIT);

  const form = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
  });

  React.useEffect(() => {
    if (!company) return;
    form.reset({
      name: company.name,
      registrationNo: company.registrationNo ?? "",
      taxNo: company.taxNo ?? "",
      baseCurrency: company.baseCurrency,
      address: company.address ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      fiscalYearStartMonth: company.fiscalYearStartMonth,
      timezone: company.timezone,
    });
  }, [company, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSaveError(null);

    try {
      await apiClient.patch(`/companies/${companyId}`, values);
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      await refreshUser();
      toast.success("Company settings saved.");
    } catch (caught) {
      setSaveError(caught);

      if (caught instanceof ApiError && caught.fields) {
        for (const [field, message] of Object.entries(caught.fields)) {
          form.setError(field as keyof UpdateCompanyInput, { message });
        }
      }
    }
  });

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (isLoading || !company) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-60" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Company Settings"
        description="The profile behind every report and document this company produces."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
        <form onSubmit={onSubmit} className="min-w-0 space-y-4" noValidate>
          {saveError != null && <FormError error={saveError} />}

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Company profile</CardTitle>
              <CardDescription>Appears on the statements and exports.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" required>
                  Registered name
                </Label>
                <Input id="name" disabled={!canEdit} {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="registrationNo">Registration number</Label>
                <Input
                  id="registrationNo"
                  placeholder="202301000123 (1494821-K)"
                  disabled={!canEdit}
                  {...form.register("registrationNo")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="taxNo">Tax number</Label>
                <Input id="taxNo" disabled={!canEdit} {...form.register("taxNo")} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Registered address</Label>
                <Textarea
                  id="address"
                  rows={2}
                  disabled={!canEdit}
                  {...form.register("address")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" disabled={!canEdit} {...form.register("phone")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  disabled={!canEdit}
                  invalid={Boolean(form.formState.errors.email)}
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Accounting</CardTitle>
              <CardDescription>
                These settings shape how periods are generated and how figures are reported.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Base currency</Label>
                <Input
                  value={company.baseCurrency}
                  disabled
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Fixed once entries have been posted — changing it would restate every figure.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Financial year starts</Label>
                <Select
                  value={String(form.watch("fiscalYearStartMonth") ?? 1)}
                  onValueChange={(value) =>
                    form.setValue("fiscalYearStartMonth", Number(value))
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month, index) => (
                      <SelectItem key={month} value={String(index + 1)}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" disabled={!canEdit} {...form.register("timezone")} />
              </div>
            </CardContent>
          </Card>

          <PermissionGate permission={PERMISSIONS.COMPANY_EDIT}>
            <div className="flex justify-end">
              <Button type="submit" loading={form.formState.isSubmitting}>
                <Save />
                Save settings
              </Button>
            </div>
          </PermissionGate>
        </form>

        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" aria-hidden />
                <CardTitle className="text-sm">This company</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              {company.isDemo && (
                <Badge variant="warning" className="mb-1">
                  Demo company
                </Badge>
              )}
              <Stat label="Ledger accounts" value={stats?.accounts} />
              <Stat label="Fiscal periods" value={stats?.periods} />
              <Stat label="Posted journals" value={stats?.postedJournals} />
              <Stat label="Draft journals" value={stats?.draftJournals} />
              <Stat label="Users with access" value={stats?.users} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium">
        {value === undefined ? "—" : value.toLocaleString()}
      </span>
    </div>
  );
}
