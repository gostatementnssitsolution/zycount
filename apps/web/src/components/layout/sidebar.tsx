"use client";

import { ChevronLeft, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/hooks/use-ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { NAVIGATION, PHASE_LABELS, type NavItem } from "./nav-config";

export function Sidebar() {
  const pathname = usePathname();
  const { can } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  const isActive = (href: string): boolean =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "print-hidden sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
          sidebarCollapsed ? "w-[68px]" : "w-64",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <Link href="/" className="flex items-center gap-2 overflow-hidden">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand font-semibold text-brand-foreground">
              Z
            </span>
            {!sidebarCollapsed && (
              <span className="truncate text-base font-semibold tracking-tight">Zycount</span>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ChevronLeft className={cn("size-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {NAVIGATION.map((group) => {
            // A group whose every item is hidden by permission disappears
            // entirely, rather than leaving an empty heading behind.
            const visible = group.items.filter((item) => !item.permission || can(item.permission));
            if (visible.length === 0) return null;

            return (
              <div key={group.label}>
                {!sidebarCollapsed && (
                  <div className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-sidebar-muted">
                    {group.label}
                  </div>
                )}
                <ul className="space-y-0.5">
                  {visible.map((item) => (
                    <li key={item.href}>
                      <SidebarLink
                        item={item}
                        active={isActive(item.href)}
                        collapsed={sidebarCollapsed}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <div className="border-t border-sidebar-border px-4 py-3 text-2xs text-sidebar-muted">
            <div className="font-medium text-sidebar-foreground">Phase 1 · Core Accounting</div>
            <div className="mt-0.5">Press ⌘K for commands</div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

function SidebarLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const locked = Boolean(item.phase);

  const body = (
    <span
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
        collapsed && "justify-center px-0",
        locked
          ? "cursor-not-allowed text-sidebar-muted/60"
          : active
            ? "bg-sidebar-accent font-medium text-sidebar-foreground"
            : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {locked && <Lock className="ml-auto size-3 shrink-0" aria-hidden />}
        </>
      )}
    </span>
  );

  const label = locked
    ? `${item.label} — arrives in ${PHASE_LABELS[item.phase!]}`
    : item.shortcut
      ? `${item.label} (${item.shortcut})`
      : item.label;

  const wrapped = locked ? (
    <div aria-disabled="true" title={label}>
      {body}
    </div>
  ) : (
    <Link href={item.href} aria-current={active ? "page" : undefined} title={label}>
      {body}
    </Link>
  );

  // Collapsed, the icon alone is not self-explanatory, so the label moves into
  // a tooltip rather than disappearing.
  if (!collapsed) return wrapped;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
