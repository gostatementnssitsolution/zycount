"use client";

import { ChevronDown, ChevronLeft, Command } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/hooks/use-ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { NAVIGATION, PHASE_LABELS, type NavGroup, type NavItem } from "./nav-config";

/**
 * The portal sidebar.
 *
 * Eleven modules is more than fits comfortably in a flat list, so groups
 * collapse. The group holding the current page is always open, a group the
 * user opens stays open, and collapsing the rail falls back to icons with the
 * label in a tooltip.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { can } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

  const isActive = React.useCallback(
    (href: string): boolean => (href === "/" ? pathname === "/" : pathname.startsWith(href)),
    [pathname],
  );

  const activeGroup = React.useMemo(
    () => NAVIGATION.find((group) => group.items.some((item) => isActive(item.href)))?.label,
    [isActive],
  );

  const [open, setOpen] = React.useState<string[]>(() =>
    NAVIGATION.filter((group) => group.items.some((item) => isActive(item.href))).map((group) => group.label),
  );

  // Navigating into a collapsed group opens it, rather than leaving the current
  // page hidden behind a closed heading.
  React.useEffect(() => {
    if (activeGroup) setOpen((current) => (current.includes(activeGroup) ? current : [...current, activeGroup]));
  }, [activeGroup]);

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

        <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {NAVIGATION.map((group) => (
            <SidebarGroup
              key={group.label}
              group={group}
              collapsed={sidebarCollapsed}
              open={open.includes(group.label)}
              onToggle={() =>
                setOpen((current) =>
                  current.includes(group.label)
                    ? current.filter((label) => label !== group.label)
                    : [...current, group.label],
                )
              }
              isActive={isActive}
              can={can}
            />
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div className="border-t border-sidebar-border px-4 py-3 text-2xs text-sidebar-muted">
            <div className="font-medium text-sidebar-foreground">Zycount Portal</div>
            <div className="mt-1 flex items-center gap-1">
              <Command className="size-3" aria-hidden />
              <span>Press ⌘K for anything</span>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

function SidebarGroup({
  group,
  collapsed,
  open,
  onToggle,
  isActive,
  can,
}: {
  group: NavGroup;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
  can: (permission: string) => boolean;
}) {
  // A group whose every item is hidden by permission disappears entirely,
  // rather than leaving an empty heading behind.
  const visible = group.items.filter((item) => !item.permission || can(item.permission));
  if (visible.length === 0) return null;

  const groupActive = visible.some((item) => isActive(item.href));

  if (collapsed) {
    return (
      <div className="space-y-0.5 border-b border-sidebar-border/60 pb-1.5 last:border-0">
        {visible.map((item) => (
          <SidebarLink key={item.href} item={item} active={isActive(item.href)} collapsed />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-2xs font-semibold uppercase tracking-wider transition-colors",
          groupActive ? "text-sidebar-foreground" : "text-sidebar-muted hover:text-sidebar-foreground",
        )}
      >
        <span className="truncate">{group.label}</span>
        {!open && groupActive && <span className="size-1.5 rounded-full bg-brand" aria-hidden />}
        <ChevronDown className={cn("ml-auto size-3.5 shrink-0 transition-transform", !open && "-rotate-90")} />
      </button>

      {open && (
        <ul className="space-y-0.5 pb-1">
          {visible.map((item) => (
            <li key={item.href}>
              <SidebarLink item={item} active={isActive(item.href)} collapsed={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
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

  const body = (
    <span
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        collapsed && "justify-center px-0 py-2",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-foreground"
          : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {active && !collapsed && (
        <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand" aria-hidden />
      )}
      <Icon className="size-4 shrink-0" aria-hidden />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {item.previewPhase && (
            <span
              className="ml-auto shrink-0 rounded border border-sidebar-border px-1 text-[10px] font-medium uppercase tracking-wide text-sidebar-muted"
              title={`Design preview — wired to the API in ${PHASE_LABELS[item.previewPhase]}`}
            >
              Preview
            </span>
          )}
        </>
      )}
    </span>
  );

  const label = item.previewPhase
    ? `${item.label} — design preview, live in ${PHASE_LABELS[item.previewPhase]}`
    : item.shortcut
      ? `${item.label} (${item.shortcut})`
      : item.label;

  const link = (
    <Link href={item.href} aria-current={active ? "page" : undefined} title={collapsed ? undefined : label}>
      {body}
    </Link>
  );

  // Collapsed, the icon alone is not self-explanatory, so the label moves into
  // a tooltip rather than disappearing.
  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
