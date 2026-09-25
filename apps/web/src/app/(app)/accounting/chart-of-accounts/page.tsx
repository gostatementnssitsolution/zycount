"use client";

import {
  ACCOUNT_TYPE_LABELS,
  PERMISSIONS,
  type AccountTreeNode,
  type AccountType,
} from "@zycount/shared";
import {
  ChevronRight,
  Layers,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { AccountDialog } from "@/components/accounting/account-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { PermissionGate, RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAccountTree, useDeleteAccount } from "@/hooks/use-accounting";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function ChartOfAccountsPage() {
  return (
    <RequirePermission permission={PERMISSIONS.ACCOUNT_VIEW}>
      <ChartOfAccounts />
    </RequirePermission>
  );
}

function ChartOfAccounts() {
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [includeInactive, setIncludeInactive] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(searchParams.get("new") === "1");
  const [editing, setEditing] = React.useState<AccountTreeNode | null>(null);
  const [parentFor, setParentFor] = React.useState<AccountTreeNode | null>(null);

  const { data: tree, isLoading, error, refetch } = useAccountTree(includeInactive);

  // Searching flattens the tree: a hit deep in the hierarchy should be visible
  // without the user expanding its ancestors first.
  const filtered = React.useMemo(
    () => filterTree(tree ?? [], search.trim().toLowerCase(), typeFilter),
    [tree, search, typeFilter],
  );

  const totals = React.useMemo(() => countAccounts(tree ?? []), [tree]);

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        description={
          totals.total > 0
            ? `${totals.total} accounts · ${totals.postable} accept postings`
            : "The tree of ledger accounts this company posts to."
        }
        actions={
          <PermissionGate permission={PERMISSIONS.ACCOUNT_CREATE}>
            <Button
              onClick={() => {
                setEditing(null);
                setParentFor(null);
                setDialogOpen(true);
              }}
            >
              <Plus />
              New account
            </Button>
          </PermissionGate>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative min-w-[13rem] flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by code or name…"
                className="pl-8"
                aria-label="Search accounts"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[11rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
              Show archived
            </label>
          </div>

          <div className="p-2">
            {error ? (
              <ErrorState error={error} onRetry={() => void refetch()} className="m-2" />
            ) : isLoading ? (
              <div className="p-4">
                <SkeletonTable rows={10} columns={3} />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Layers}
                title={search ? "No accounts match your search" : "No accounts yet"}
                description={
                  search
                    ? "Try a different code or name."
                    : "Create your first ledger account to start posting."
                }
                className="m-2 border-0"
              />
            ) : (
              <ul role="tree" aria-label="Chart of accounts">
                {filtered.map((node) => (
                  <AccountRow
                    key={node.id}
                    node={node}
                    expandAll={search.length > 0}
                    onEdit={(account) => {
                      setEditing(account);
                      setParentFor(null);
                      setDialogOpen(true);
                    }}
                    onAddChild={(account) => {
                      setEditing(null);
                      setParentFor(account);
                      setDialogOpen(true);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        account={editing}
        defaultParent={parentFor}
      />
    </div>
  );
}

function AccountRow({
  node,
  depth = 0,
  expandAll,
  onEdit,
  onAddChild,
}: {
  node: AccountTreeNode;
  depth?: number;
  expandAll: boolean;
  onEdit: (account: AccountTreeNode) => void;
  onAddChild: (account: AccountTreeNode) => void;
}) {
  // Top two levels start open, so the shape of the chart is visible at a glance.
  const [expanded, setExpanded] = React.useState(depth < 2);
  const open = expandAll || expanded;
  const hasChildren = node.children.length > 0;

  const remove = useDeleteAccount();

  const onDelete = async () => {
    try {
      const result = await remove.mutateAsync(node.id);
      toast.success(
        result.archived
          ? `${node.code} archived — it carries postings, so its history is kept.`
          : `${node.code} ${node.name} deleted.`,
      );
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove that account.");
    }
  };

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined}>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/60",
          !node.isActive && "opacity-55",
        )}
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent"
            aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
          >
            <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}

        <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{node.code}</span>

        <span className={cn("truncate", !node.isPostable && "font-medium")}>{node.name}</span>

        {!node.isPostable && (
          <Badge variant="outline" className="shrink-0 font-normal">
            Heading
          </Badge>
        )}
        {node.isSystem && (
          <Lock className="size-3 shrink-0 text-muted-foreground" aria-label="System account" />
        )}
        {!node.isActive && (
          <Badge variant="default" className="shrink-0">
            Archived
          </Badge>
        )}

        <Badge variant="outline" className="ml-auto shrink-0 font-normal">
          {ACCOUNT_TYPE_LABELS[node.type as AccountType]}
        </Badge>

        <PermissionGate permission={PERMISSIONS.ACCOUNT_EDIT}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label={`Actions for ${node.name}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(node)}>
                <Pencil />
                Edit account
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAddChild(node)}>
                <Plus />
                Add account underneath
              </DropdownMenuItem>
              <DropdownMenuItem destructive disabled={node.isSystem} onSelect={() => void onDelete()}>
                <Trash2 />
                {node.isSystem ? "System account" : "Delete or archive"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PermissionGate>
      </div>

      {hasChildren && open && (
        <ul role="group">
          {node.children.map((child) => (
            <AccountRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandAll={expandAll}
              onEdit={onEdit}
              onAddChild={onAddChild}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Keeps a branch when it matches, or when any descendant does. */
function filterTree(nodes: AccountTreeNode[], search: string, type: string): AccountTreeNode[] {
  const matches = (node: AccountTreeNode): boolean => {
    const matchesType = type === "all" || node.type === type;
    const matchesSearch =
      !search ||
      node.code.toLowerCase().includes(search) ||
      node.name.toLowerCase().includes(search);
    return matchesType && matchesSearch;
  };

  const walk = (list: AccountTreeNode[]): AccountTreeNode[] =>
    list
      .map((node) => {
        const children = walk(node.children);
        if (matches(node) || children.length > 0) return { ...node, children };
        return null;
      })
      .filter((node): node is AccountTreeNode => node !== null);

  return walk(nodes);
}

function countAccounts(nodes: AccountTreeNode[]): { total: number; postable: number } {
  let total = 0;
  let postable = 0;

  const walk = (list: AccountTreeNode[]): void => {
    for (const node of list) {
      total += 1;
      if (node.isPostable) postable += 1;
      walk(node.children);
    }
  };

  walk(nodes);
  return { total, postable };
}
