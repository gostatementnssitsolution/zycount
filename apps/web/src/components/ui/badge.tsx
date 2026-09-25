import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        brand: "border-transparent bg-brand/10 text-brand dark:bg-brand/20",
        success: "border-transparent bg-success/10 text-success dark:bg-success/20",
        warning: "border-transparent bg-warning/10 text-warning dark:bg-warning/20",
        destructive: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20",
        info: "border-transparent bg-info/10 text-info dark:bg-info/20",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
