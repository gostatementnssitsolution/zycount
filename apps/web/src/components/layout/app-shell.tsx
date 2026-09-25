"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useKeyboardShortcuts, useUiStore } from "@/hooks/use-ui";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";
import { CommandPalette } from "./command-palette";
import { NAVIGATION, PHASE_LABELS } from "./nav-config";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * The authenticated shell (docs/spec/07 §44): sidebar, topbar, command palette
 * and the content area. Unauthenticated visitors are sent to sign in before
 * any of it renders.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  useKeyboardShortcuts({
    onCommandPalette: () => setCommandPaletteOpen(true),
    onSearch: () => setCommandPaletteOpen(true),
    onNewJournal: () => router.push("/accounting/journals/new"),
    onNavigate: (path) => router.push(path),
  });

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, pathname, router]);

  // Close the mobile drawer whenever navigation happens.
  React.useEffect(() => setMobileNavOpen(false), [pathname]);

  if (isLoading) return <ShellSkeleton />;
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>

      <CommandPalette />
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </div>
  );
}

function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const { can } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-full max-w-[17rem] translate-x-0 translate-y-0 rounded-none border-l-0 bg-sidebar p-0 text-sidebar-foreground sm:rounded-none">
        <DialogTitle className="sr-only">Navigation</DialogTitle>

        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <span className="grid size-8 place-items-center rounded-lg bg-brand font-semibold text-brand-foreground">
            Z
          </span>
          <span className="font-semibold tracking-tight">Zycount</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto text-sidebar-muted hover:bg-sidebar-accent"
            onClick={() => onOpenChange(false)}
            aria-label="Close navigation"
          >
            <X />
          </Button>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {NAVIGATION.map((group) => {
            const visible = group.items.filter((item) => !item.permission || can(item.permission));
            if (visible.length === 0) return null;

            return (
              <div key={group.label}>
                <div className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-sidebar-muted">
                  {group.label}
                </div>
                <ul className="space-y-0.5">
                  {visible.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm",
                            active ? "bg-sidebar-accent font-medium" : "text-sidebar-muted",
                          )}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span className="truncate">{item.label}</span>
                          {item.previewPhase && (
                            <span
                              className="ml-auto shrink-0 rounded border border-sidebar-border px-1 text-[10px] font-medium uppercase tracking-wide"
                              title={`Design preview — wired to the API in ${PHASE_LABELS[item.previewPhase]}`}
                            >
                              Preview
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </DialogContent>
    </Dialog>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen" aria-busy="true" aria-label="Loading Zycount">
      <div className="hidden w-64 shrink-0 bg-sidebar lg:block" />
      <div className="flex-1">
        <div className="h-14 border-b" />
        <div className="space-y-4 p-8">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
