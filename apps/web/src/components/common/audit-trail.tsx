"use client";

import { ScrollText } from "lucide-react";
import * as React from "react";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityAudit } from "@/hooks/use-admin";
import { formatDateTime, humaniseAction } from "@/lib/format";

/** The Audit tab on a detail page — one record's full history (docs/spec/08 §48). */
export function AuditTrail({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data, isLoading, error, refetch } = useEntityAudit(entityType, entityId);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={ScrollText}
            title="No recorded activity"
            description="Actions on this record will appear here."
            className="border-0"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <ol className="space-y-0">
          {data.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
              {/* Connector line, omitted on the final item. */}
              {index < data.length - 1 && (
                <span className="absolute left-[7px] top-4 h-full w-px bg-border" aria-hidden />
              )}
              <span className="relative mt-1 size-3.5 shrink-0 rounded-full border-2 border-brand bg-card" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium">{humaniseAction(entry.action)}</span>
                  <span className="text-xs text-muted-foreground">
                    by {entry.userName ?? "the system"}
                  </span>
                  <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>

                {entry.metadata && <AuditMetadata metadata={entry.metadata} />}

                {entry.ipAddress && (
                  <p className="mt-1 text-2xs text-muted-foreground">From {entry.ipAddress}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/** The handful of metadata fields worth showing, in readable form. */
const INTERESTING_KEYS: Record<string, string> = {
  reference: "Reference",
  reason: "Reason",
  totalDebit: "Amount",
  amount: "Amount",
  lineCount: "Lines",
  reversalReference: "Reversal",
  override: "Override used",
  note: "Note",
  date: "Date",
  name: "Name",
  code: "Code",
};

function AuditMetadata({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(
    ([key, value]) => key in INTERESTING_KEYS && value !== null && value !== "",
  );

  if (entries.length === 0) return null;

  return (
    <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-1">
          <dt>{INTERESTING_KEYS[key]}:</dt>
          <dd className="font-medium text-foreground">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
