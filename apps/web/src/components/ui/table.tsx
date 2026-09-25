import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Table primitives for financial data.
 *
 * Row height and cell padding come from CSS variables, so the density control
 * retightens every table in the product at once — an accountant scanning two
 * hundred ledger lines needs a different row than someone reading a summary.
 *
 * Rules are hairlines rather than zebra stripes: stripes fight with the status
 * tints and the negative-figure colouring that already carry meaning here.
 */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement> & {
    containerClassName?: string;
    /** Keeps the column headers visible while a long table scrolls. */
    stickyHeader?: boolean;
  }
>(({ className, containerClassName, stickyHeader, ...props }, ref) => (
  <div className={cn("relative w-full overflow-auto", containerClassName)}>
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-[13px]", stickyHeader && "sticky-head", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn(className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />,
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn("border-t-2 border-border-strong bg-sunk/60 font-semibold", className)}
      {...props}
    />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "h-row border-b border-border/70 transition-colors last:border-b-0",
      "data-[state=selected]:bg-brand-muted",
      // The hover tint is the row's only affordance, so it has to be visible
      // without shouting: any stronger and a long table starts to flicker.
      interactive && "cursor-pointer hover:bg-sunk",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn(
      "h-8 whitespace-nowrap px-cell-x text-left align-middle",
      "text-3xs font-semibold uppercase tracking-[0.07em] text-muted-foreground",
      numeric && "text-right",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-cell-x py-cell-y align-middle",
      numeric && "text-right tabular",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-3 text-xs text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
