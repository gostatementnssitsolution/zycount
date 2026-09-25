"use client";

import { PERMISSIONS } from "@zycount/shared";
import {
  Building2,
  Check,
  ChevronsUpDown,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  UserCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUiStore } from "@/hooks/use-ui";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const router = useRouter();
  const { user, activeCompany, can } = useAuth();
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen);

  return (
    <header className="print-hidden sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <CompanySwitcher />

      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className={cn(
          "ml-2 hidden h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-card px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent md:flex",
        )}
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="truncate">Search or jump to…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border bg-muted px-1.5 font-mono text-2xs lg:inline-block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {can(PERMISSIONS.JOURNAL_CREATE) && (
          <Button size="sm" onClick={() => router.push("/accounting/journals/new")}>
            <Plus />
            <span className="hidden sm:inline">New Journal</span>
          </Button>
        )}

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-foreground"
              aria-label="Account menu"
            >
              {user ? initials(user.name) : <UserCircle className="size-4" />}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="truncate font-medium">{user?.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {user?.roles.map((role) => (
                  <span key={role} className="rounded bg-muted px-1.5 py-0.5 text-2xs font-medium">
                    {role}
                  </span>
                ))}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/account">
                <UserCircle />
                Your account
              </Link>
            </DropdownMenuItem>

            {can(PERMISSIONS.COMPANY_VIEW) && (
              <DropdownMenuItem asChild>
                <Link href="/admin/settings">
                  <Settings />
                  Company settings
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
            <SignOutItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <span className="sr-only" aria-live="polite">
        {activeCompany ? `Working in ${activeCompany.name}` : ""}
      </span>
    </header>
  );
}

function SignOutItem() {
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = React.useState(false);

  return (
    <DropdownMenuItem
      destructive
      disabled={signingOut}
      onSelect={(event) => {
        event.preventDefault();
        setSigningOut(true);
        void logout();
      }}
    >
      <LogOut />
      {signingOut ? "Signing out…" : "Sign out"}
    </DropdownMenuItem>
  );
}

function CompanySwitcher() {
  const { user, activeCompanyId, setActiveCompany } = useAuth();
  const companies = user?.companies ?? [];
  const active = companies.find((company) => company.id === activeCompanyId);

  if (companies.length === 0) return null;

  // With a single company there is nothing to switch between, so it reads as a
  // label rather than pretending to be a control.
  if (companies.length === 1) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium">
        <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate">{active?.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 max-w-[15rem] items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{active?.name ?? "Select company"}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Switch company</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.id}
            onSelect={() => setActiveCompany(company.id)}
            className="gap-2"
          >
            <Building2 className="text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate">{company.name}</div>
              <div className="text-2xs text-muted-foreground">{company.baseCurrency}</div>
            </div>
            {company.id === activeCompanyId && <Check className="size-4 shrink-0" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // The server cannot know the user's theme, so the icon renders only after
  // hydration — otherwise the markup would mismatch.
  React.useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Change theme">
          {!mounted ? (
            <Monitor />
          ) : theme === "dark" ? (
            <Moon />
          ) : theme === "light" ? (
            <Sun />
          ) : (
            <Monitor />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setTheme("light")}>
          <Sun />
          Light
          {mounted && theme === "light" && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("dark")}>
          <Moon />
          Dark
          {mounted && theme === "dark" && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme("system")}>
          <Monitor />
          System
          {mounted && theme === "system" && <DropdownMenuShortcut>✓</DropdownMenuShortcut>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
