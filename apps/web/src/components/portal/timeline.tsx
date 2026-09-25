import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * What happened to a record, oldest first. Each entry names who did it and
 * when — the same account of events the audit trail holds.
 */
export function Timeline({
  events,
  className,
}: {
  events: Array<{ at: string; actor: string; event: string; detail?: string }>;
  className?: string;
}) {
  if (events.length === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Nothing has happened yet.</p>;
  }

  return (
    <ol className={cn("relative space-y-4 before:absolute before:bottom-2 before:left-4 before:top-2 before:w-px before:bg-border", className)}>
      {events.map((entry, index) => (
        <li key={`${entry.at}-${index}`} className="relative flex gap-3">
          <Avatar name={entry.actor} size="sm" className="relative z-10 ring-4 ring-card" />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium">{entry.event}</span>
              <span className="text-xs text-muted-foreground">{entry.actor}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
              {entry.detail && (
                <>
                  <span aria-hidden>·</span>
                  <span>{entry.detail}</span>
                </>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
