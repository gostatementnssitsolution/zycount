import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A trend at tile size. It carries direction only — the figure beside it
 * carries the value — so it has no axes and never stands alone.
 */
export function Sparkline({
  data,
  tone = "brand",
  className,
  width = 96,
  height = 28,
  area = true,
  label,
}: {
  data: number[];
  tone?: "brand" | "success" | "warning" | "destructive" | "info" | "muted";
  className?: string;
  width?: number;
  height?: number;
  area?: boolean;
  label?: string;
}) {
  const id = React.useId();
  if (data.length < 2) return null;

  const stroke = {
    brand: "hsl(var(--chart-1))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    destructive: "hsl(var(--destructive))",
    info: "hsl(var(--info))",
    muted: "hsl(var(--muted-foreground))",
  }[tone];

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((value, index) => {
    const x = index * step;
    // 2px of padding top and bottom keeps the stroke from clipping.
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return [x, y] as const;
  });

  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const fill = `${line} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={label ?? `Trend across ${data.length} periods`}
      preserveAspectRatio="none"
    >
      {area && (
        <>
          <defs>
            <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
              <stop offset="100%" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fill} fill={`url(#spark-${id})`} />
        </>
      )}
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="2.25" fill={stroke} />
    </svg>
  );
}
