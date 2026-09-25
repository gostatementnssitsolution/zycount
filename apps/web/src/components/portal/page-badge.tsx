import { CalendarRange } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The period or scope a whole screen is reporting on, shown beside the title
 * so no figure below it is read against the wrong dates.
 */
export function PageBadge({
  children,
  icon: Icon = CalendarRange,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-sm font-medium shadow-sm",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      {children}
    </span>
  );
}
