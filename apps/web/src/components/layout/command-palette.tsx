"use client";

import { PERMISSIONS } from "@zycount/shared";
import { Command } from "cmdk";
import {
  BookOpen,
  Building2,
  CalendarRange,
  FileBarChart,
  LayoutDashboard,
  Layers,
  Moon,
  Plus,
  Scale,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  TrendingUp,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAccounts, useJournals } from "@/hooks/use-accounting";
import { useDebounced, useUiStore } from "@/hooks/use-ui";
import { useAuth } from "@/providers/auth-provider";

/**
 * Command palette (docs/spec/07 §45) — ⌘K.
 *
 * Actions, navigation and jump-to-record in one place. Records are searched
 * live once the user types, so the palette is a way into the data, not just a
 * menu of links.
 */
export function CommandPalette() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { can, user, setActiveCompany, activeCompanyId } = useAuth();
  const { commandPaletteOpen, setCommandPaletteOpen } = useUiStore();

  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounced(search, 250);

  // Records are only fetched once there is something worth searching for —
  // the query stays disabled until then rather than firing an empty request.
  const searching = debouncedSearch.length >= 2;

  const { data: journals } = useJournals({ q: debouncedSearch, pageSize: 5 }, searching);
  const { data: accounts } = useAccounts({ q: debouncedSearch }, searching);

  const run = React.useCallback(
    (action: () => void) => {
      setCommandPaletteOpen(false);
      setSearch("");
      action();
    },
    [setCommandPaletteOpen],
  );

  const go = (path: string) => run(() => router.push(path));

  const matchingAccounts = searching ? (accounts ?? []).slice(0, 5) : [];
  const matchingJournals = searching ? (journals?.data ?? []).slice(0, 5) : [];

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="overflow-hidden p-0" size="lg">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search for records or run a command.
        </DialogDescription>

        <Command shouldFilter={false} loop className="overflow-hidden">
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search journals and accounts, or run a command…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <Command.List className="max-h-[22rem] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
              Nothing matched “{search}”.
            </Command.Empty>

            {matchingJournals.length > 0 && (
              <Group heading="Journal entries">
                {matchingJournals.map((entry) => (
                  <Item
                    key={entry.id}
                    icon={BookOpen}
                    onSelect={() => go(`/accounting/journals/${entry.id}`)}
                  >
                    <span className="font-mono text-xs">{entry.reference}</span>
                    <span className="truncate text-muted-foreground">
                      {entry.description ?? "No description"}
                    </span>
                    <span className="ml-auto shrink-0 text-2xs uppercase text-muted-foreground">
                      {entry.status}
                    </span>
                  </Item>
                ))}
              </Group>
            )}

            {matchingAccounts.length > 0 && (
              <Group heading="Accounts">
                {matchingAccounts.map((account) => (
                  <Item
                    key={account.id}
                    icon={Layers}
                    onSelect={() =>
                      go(`/accounting/general-ledger?accountId=${account.id}`)
                    }
                  >
                    <span className="font-mono text-xs">{account.code}</span>
                    <span className="truncate">{account.name}</span>
                  </Item>
                ))}
              </Group>
            )}

            <Group heading="Actions">
              {can(PERMISSIONS.JOURNAL_CREATE) && (
                <Item icon={Plus} onSelect={() => go("/accounting/journals/new")}>
                  Create a journal entry
                </Item>
              )}
              {can(PERMISSIONS.ACCOUNT_CREATE) && (
                <Item icon={Layers} onSelect={() => go("/accounting/chart-of-accounts?new=1")}>
                  Add a ledger account
                </Item>
              )}
            </Group>

            <Group heading="Go to">
              <Item icon={LayoutDashboard} onSelect={() => go("/")} shortcut="G D">
                Dashboard
              </Item>
              <Item icon={Layers} onSelect={() => go("/accounting/chart-of-accounts")} shortcut="G A">
                Chart of Accounts
              </Item>
              <Item icon={BookOpen} onSelect={() => go("/accounting/journals")} shortcut="G J">
                Journal Entries
              </Item>
              <Item icon={ScrollText} onSelect={() => go("/accounting/general-ledger")} shortcut="G L">
                General Ledger
              </Item>
              <Item icon={CalendarRange} onSelect={() => go("/accounting/periods")}>
                Fiscal Periods
              </Item>
              <Item icon={Scale} onSelect={() => go("/reports/trial-balance")} shortcut="G T">
                Trial Balance
              </Item>
              <Item icon={TrendingUp} onSelect={() => go("/reports/profit-loss")} shortcut="G P">
                Profit &amp; Loss
              </Item>
              <Item icon={FileBarChart} onSelect={() => go("/reports/balance-sheet")} shortcut="G B">
                Balance Sheet
              </Item>
              {can(PERMISSIONS.USER_VIEW) && (
                <Item icon={ShieldCheck} onSelect={() => go("/admin/users")}>
                  Users &amp; Roles
                </Item>
              )}
              {can(PERMISSIONS.AUDIT_VIEW) && (
                <Item icon={ScrollText} onSelect={() => go("/admin/audit-log")}>
                  Audit Log
                </Item>
              )}
              <Item icon={Settings} onSelect={() => go("/admin/settings")}>
                Company Settings
              </Item>
            </Group>

            {(user?.companies.length ?? 0) > 1 && (
              <Group heading="Switch company">
                {user?.companies
                  .filter((company) => company.id !== activeCompanyId)
                  .map((company) => (
                    <Item
                      key={company.id}
                      icon={Building2}
                      onSelect={() => run(() => setActiveCompany(company.id))}
                    >
                      {company.name}
                    </Item>
                  ))}
              </Group>
            )}

            <Group heading="Appearance">
              <Item icon={Sun} onSelect={() => run(() => setTheme("light"))}>
                Light theme
              </Item>
              <Item icon={Moon} onSelect={() => run(() => setTheme("dark"))}>
                Dark theme
              </Item>
            </Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
    >
      {children}
    </Command.Group>
  );
}

function Item({
  icon: Icon,
  children,
  onSelect,
  shortcut,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onSelect: () => void;
  shortcut?: string;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      {children}
      {shortcut && (
        <kbd className="ml-auto shrink-0 rounded border bg-muted px-1.5 font-mono text-2xs text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
