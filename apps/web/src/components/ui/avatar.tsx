import * as React from "react";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Initials on a tinted disc. The hue is derived from the name so the same
 * person is the same colour everywhere, and never carries meaning on its own.
 */
const TINTS = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
  "bg-chart-6/15 text-chart-6",
];

export function Avatar({
  name,
  size = "default",
  className,
}: {
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash * 31 + name.charCodeAt(index)) >>> 0;

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold",
        { sm: "size-6 text-2xs", default: "size-8 text-xs", lg: "size-10 text-sm" }[size],
        TINTS[hash % TINTS.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
