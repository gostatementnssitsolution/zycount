"use client";

import { PERMISSIONS } from "@zycount/shared";
import { useParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { ErrorState } from "@/components/common/error-state";
import { RequirePermission } from "@/components/common/permission-gate";
import { JournalEditor } from "@/components/accounting/journal-editor";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useJournal } from "@/hooks/use-accounting";

export default function EditJournalPage() {
  const params = useParams<{ id: string }>();
  const { data: journal, isLoading, error, refetch } = useJournal(params.id);

  return (
    <RequirePermission permission={PERMISSIONS.JOURNAL_EDIT}>
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !journal ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      ) : journal.status !== "DRAFT" ? (
        // A posted entry is immutable — the only correction is a reversal.
        <Alert variant="warning">
          <Lock />
          <AlertTitle>{journal.reference} can no longer be edited</AlertTitle>
          <AlertDescription>
            This entry is {journal.status.toLowerCase()} and sits in the ledger. To correct it, post
            a reversal from the entry itself — the audit trail must stay complete.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <PageHeader
            title={`Edit ${journal.reference}`}
            description="Only drafts can be changed. Posting is a separate, deliberate step."
          />
          <JournalEditor journal={journal} />
        </>
      )}
    </RequirePermission>
  );
}
