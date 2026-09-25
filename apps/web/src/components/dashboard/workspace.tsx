"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { PreviewTag } from "@/components/portal/preview-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WORKSPACE_TASKS } from "@/lib/demo";
import { cn } from "@/lib/utils";

const TONE = {
  destructive: "border-destructive/30 bg-destructive/5 text-destructive",
  warning: "border-warning/30 bg-warning/5 text-warning",
  info: "border-info/30 bg-info/5 text-info",
} as const;

/**
 * What is waiting on a person, in one place.
 *
 * A dashboard that only reports is half a dashboard: the point of opening one
 * in the morning is to find out what needs doing. Each item names the module
 * it belongs to and links straight to the work.
 */
export function WorkspaceTasks({ className }: { className?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">Needs a decision</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {WORKSPACE_TASKS.length} items are waiting on someone.
          </p>
        </div>
        <PreviewTag />
      </CardHeader>

      <CardContent className="flex-1 px-0 pb-0">
        <ul className="divide-y border-t">
          {WORKSPACE_TASKS.map((task) => (
            <li key={task.id}>
              <Link
                href={task.href}
                className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "tabular mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border text-xs font-semibold",
                    TONE[task.tone],
                  )}
                  aria-hidden
                >
                  {task.count}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{task.label}</span>
                  <span className="mt-0.5 block text-2xs text-muted-foreground">{task.detail}</span>
                </span>

                <ArrowRight
                  className="mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** The four things people start from, one click from the dashboard. */
export function QuickActions({
  actions,
  className,
}: {
  actions: Array<{ label: string; href: string; icon: LucideIcon; hint: string }>;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {actions.map((action) => {
        const Icon = action.icon;

        return (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm transition-colors hover:border-brand/40"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{action.label}</span>
              <span className="block truncate text-2xs text-muted-foreground">{action.hint}</span>
            </span>
            <ArrowRight
              className="ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        );
      })}
    </div>
  );
}
