import { cn } from "@/lib/utils";

/** Placeholder that holds the layout while data loads, avoiding a page jump. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function SkeletonTable({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      <div className="flex gap-3 border-b pb-2">
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-3 py-1">
          {Array.from({ length: columns }).map((_, column) => (
            <Skeleton key={column} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
