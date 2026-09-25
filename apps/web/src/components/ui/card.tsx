import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Surfaces.
 *
 * `flat` is the default on purpose. Giving every block the same border, radius
 * and shadow flattens the hierarchy — the page reads as a grid of equal boxes
 * instead of content with a shape. Reach for `raised` only where something
 * genuinely sits above the page, and `plain` where a section just needs a
 * boundary.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "flat" | "raised" | "plain" }
>(({ className, variant = "flat", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "min-w-0 rounded-lg bg-card text-card-foreground",
      variant === "flat" && "border border-border",
      variant === "raised" && "border border-border shadow-raised",
      variant === "plain" && "border-0",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { divided?: boolean }
>(({ className, divided, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col gap-1 px-4 py-3",
      divided && "border-b border-border",
      className,
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-sm font-semibold leading-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs leading-relaxed text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("px-4 pb-4", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center px-4 pb-4", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
