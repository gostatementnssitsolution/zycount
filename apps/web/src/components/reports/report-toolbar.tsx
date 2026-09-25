"use client";

import { Download, Printer } from "lucide-react";
import * as React from "react";
import { PeriodPicker } from "@/components/common/period-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ReportParams } from "@/hooks/use-accounting";
import { API_URL, getAccessToken } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";

/**
 * Shared report controls: period, comparison, zero balances, and export.
 *
 * Export goes through fetch rather than a plain link, because the download
 * needs the bearer token and the company header that a link cannot carry.
 */
export function ReportToolbar({
  params,
  onChange,
  exportPath,
  exportName,
  showCompare = true,
}: {
  params: ReportParams;
  onChange: (params: ReportParams) => void;
  exportPath?: string;
  exportName?: string;
  showCompare?: boolean;
}) {
  const { activeCompanyId, can } = useAuth();
  const [exporting, setExporting] = React.useState(false);

  const download = async () => {
    if (!exportPath || !activeCompanyId) return;
    setExporting(true);

    try {
      const url = new URL(`${API_URL}/api/companies/${activeCompanyId}${exportPath}`);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.set(key, String(value));
        }
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${getAccessToken() ?? ""}`,
          "X-Company-Id": activeCompanyId,
        },
        credentials: "include",
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = exportName ?? "report.csv";
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="print-hidden flex flex-wrap items-center gap-3">
      <PeriodPicker
        value={params.fiscalPeriodId}
        onChange={(fiscalPeriodId) => onChange({ ...params, fiscalPeriodId })}
        className="w-[13rem]"
      />

      {showCompare && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch
            checked={Boolean(params.comparePrevious)}
            onCheckedChange={(comparePrevious) => onChange({ ...params, comparePrevious })}
          />
          Compare
        </label>
      )}

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch
          checked={Boolean(params.includeZeroBalances)}
          onCheckedChange={(includeZeroBalances) => onChange({ ...params, includeZeroBalances })}
        />
        Show nil balances
      </label>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>

        {exportPath && can("report.export") && (
          <Button variant="outline" size="sm" onClick={() => void download()} loading={exporting}>
            <Download />
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}

/** The heading every printed statement carries: who, what, and as at when. */
export function ReportMeta({
  companyName,
  title,
  label,
  from,
  to,
  currency,
  asAt = false,
}: {
  companyName: string;
  title: string;
  label: string;
  from: string;
  to: string;
  currency: string;
  asAt?: boolean;
}) {
  return (
    <div className="mb-4 text-center">
      <h2 className="text-lg font-semibold">{companyName}</h2>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">
        {asAt ? `As at ${to}` : `${from} to ${to}`} · {label}
      </p>
      <p className="text-xs text-muted-foreground">All figures in {currency}</p>
    </div>
  );
}
