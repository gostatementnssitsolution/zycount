import { RECORD_STATUS_LABELS, type RecordStatus } from "@zycount/shared";
import {
  Archive,
  Ban,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import * as React from "react";
import { Badge, type BadgeProps } from "./badge";
import { cn } from "@/lib/utils";

/**
 * One status vocabulary across the whole product (docs/spec/09 §49).
 *
 * Colour alone never carries the meaning — every status pairs a tint with an
 * icon and a word, so the state survives greyscale printing and colour-blindness.
 */
const STATUS_STYLES: Record<RecordStatus, { variant: BadgeProps["variant"]; icon: typeof Circle }> = {
  DRAFT: { variant: "default", icon: FileText },
  PENDING: { variant: "warning", icon: Clock },
  APPROVED: { variant: "info", icon: CheckCircle2 },
  POSTED: { variant: "success", icon: CheckCircle2 },
  PARTIALLY_PAID: { variant: "info", icon: Circle },
  PAID: { variant: "success", icon: CheckCircle2 },
  OVERDUE: { variant: "destructive", icon: TriangleAlert },
  CANCELLED: { variant: "default", icon: Ban },
  REVERSED: { variant: "warning", icon: RotateCcw },
  ARCHIVED: { variant: "default", icon: Archive },
};

export function StatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: RecordStatus | string;
  className?: string;
  showIcon?: boolean;
}) {
  const key = status as RecordStatus;
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.DRAFT;
  const Icon = style.icon;

  return (
    <Badge variant={style.variant} className={cn("whitespace-nowrap", className)}>
      {showIcon && <Icon className="size-3" aria-hidden />}
      {RECORD_STATUS_LABELS[key] ?? status}
    </Badge>
  );
}

/** Period status reads as a lock, not a document state. */
export function PeriodStatusBadge({ status }: { status: "OPEN" | "CLOSED" }) {
  return (
    <Badge variant={status === "OPEN" ? "success" : "default"}>
      {status === "OPEN" ? "Open" : "Closed"}
    </Badge>
  );
}
