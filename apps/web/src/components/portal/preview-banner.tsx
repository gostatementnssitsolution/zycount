"use client";

import { FlaskConical, X } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Says plainly that a screen is rendering the preview fixture rather than the
 * company's own books.
 *
 * The modules beyond Phase 1 are designed and built here before their API
 * exists. Showing invented figures without saying so would be the one thing an
 * accounting product must never do, so every such screen carries this.
 */
export function PreviewBanner({
  module,
  phase,
  className,
}: {
  module: string;
  phase: number;
  className?: string;
}) {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm",
        className,
      )}
      role="note"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="font-medium">{module} is a design preview.</span>{" "}
        <span className="text-muted-foreground">
          Every figure on this screen comes from a sample data set, not your ledger. The module is
          wired to the API in Phase {phase}; the accounting screens, reports and audit trail already
          read your real books.
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        className="-mr-1 -mt-1 shrink-0 text-muted-foreground"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss this notice"
      >
        <X />
      </Button>
    </div>
  );
}

/** The same statement, small enough to sit inside a card header. */
export function PreviewTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-2xs font-medium text-warning",
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      Sample data
    </span>
  );
}
