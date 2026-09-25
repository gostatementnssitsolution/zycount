"use client";

import { ACCOUNT_TYPE_LABELS, type AccountDto, type AccountType } from "@zycount/shared";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAccounts } from "@/hooks/use-accounting";
import { cn } from "@/lib/utils";

/**
 * Account selector for journal lines.
 *
 * Only postable, active accounts are offered — a heading can never be chosen,
 * so the user cannot construct an entry the server would refuse. Search matches
 * both the code and the name, because accountants reach for either.
 */
export function AccountPicker({
  value,
  onChange,
  placeholder = "Select an account",
  invalid,
  disabled,
  className,
  autoFocus,
}: {
  value: string | undefined;
  onChange: (accountId: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const { data: accounts, isLoading } = useAccounts({ postableOnly: true });

  const selected = accounts?.find((account) => account.id === value);

  const filtered = React.useMemo(() => {
    if (!accounts) return [];
    const term = search.trim().toLowerCase();
    if (!term) return accounts;

    return accounts.filter(
      (account) =>
        account.code.toLowerCase().includes(term) || account.name.toLowerCase().includes(term),
    );
  }, [accounts, search]);

  const grouped = React.useMemo(() => {
    const groups = new Map<AccountType, AccountDto[]>();
    for (const account of filtered) {
      const list = groups.get(account.type) ?? [];
      list.push(account);
      groups.set(account.type, list);
    }
    return [...groups.entries()];
  }, [filtered]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled || isLoading}
          autoFocus={autoFocus}
          className={cn(
            "w-full justify-between font-normal",
            !selected && "text-muted-foreground",
            invalid && "border-destructive",
            className,
          )}
        >
          <span className="truncate">
            {selected ? (
              <>
                <span className="font-mono text-xs">{selected.code}</span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                {selected.name}
              </>
            ) : (
              (isLoading ? "Loading accounts…" : placeholder)
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(28rem,calc(100vw-2rem))] p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code or name…"
            className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-1">
          {grouped.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No postable account matches “{search}”.
            </p>
          ) : (
            grouped.map(([type, typeAccounts]) => (
              <div key={type}>
                <div className="px-2 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {ACCOUNT_TYPE_LABELS[type]}
                </div>
                {typeAccounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => {
                      onChange(account.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                      account.id === value && "bg-accent",
                    )}
                  >
                    <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                      {account.code}
                    </span>
                    <span className="truncate">{account.name}</span>
                    {account.id === value && <Check className="ml-auto size-4 shrink-0" />}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
