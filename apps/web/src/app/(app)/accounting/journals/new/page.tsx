"use client";

import { PERMISSIONS } from "@zycount/shared";
import { RequirePermission } from "@/components/common/permission-gate";
import { JournalEditor } from "@/components/accounting/journal-editor";
import { PageHeader } from "@/components/layout/page-header";

export default function NewJournalPage() {
  return (
    <RequirePermission permission={PERMISSIONS.JOURNAL_CREATE}>
      <PageHeader
        title="New journal entry"
        description="Debits and credits must match to the cent before this can reach the ledger."
      />
      <JournalEditor />
    </RequirePermission>
  );
}
