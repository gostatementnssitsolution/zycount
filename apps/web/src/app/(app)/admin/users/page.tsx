"use client";

import { PERMISSIONS, type UserDto } from "@zycount/shared";
import { KeyRound, MoreHorizontal, Pencil, Plus, Search, ShieldCheck, UserX } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { UserDialog } from "@/components/admin/user-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Pagination } from "@/components/common/pagination";
import { PermissionGate, RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SkeletonTable } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeactivateUser, useRoles, useUsers } from "@/hooks/use-admin";
import { useDebounced } from "@/hooks/use-ui";
import { ApiError } from "@/lib/api-client";
import { formatRelative, initials, pluralise } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";

export default function UsersPage() {
  return (
    <RequirePermission permission={PERMISSIONS.USER_VIEW}>
      <UsersAndRoles />
    </RequirePermission>
  );
}

function UsersAndRoles() {
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Administration" }, { label: "Users & Roles" }]}
        title="Users & Roles"
        description="Who can reach this organisation, and what each of them is allowed to do."
      />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const { user: currentUser } = useAuth();

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<UserDto | null>(null);

  const debouncedSearch = useDebounced(search, 300);
  React.useEffect(() => setPage(1), [debouncedSearch]);

  const { data, isLoading, error, refetch } = useUsers({
    page,
    pageSize: 25,
    q: debouncedSearch || undefined,
  });
  const deactivate = useDeactivateUser();

  const onDeactivate = async (user: UserDto) => {
    try {
      await deactivate.mutateAsync(user.id);
      toast.success(`${user.name} can no longer sign in.`);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not deactivate that user.");
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-[14rem] flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email…"
              className="pl-8"
              aria-label="Search users"
            />
          </div>

          <PermissionGate permission={PERMISSIONS.USER_CREATE}>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus />
              Add user
            </Button>
          </PermissionGate>
        </div>

        {error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={() => void refetch()} />
          </div>
        ) : isLoading && !data ? (
          <div className="p-4">
            <SkeletonTable rows={6} columns={5} />
          </div>
        ) : (data?.data.length ?? 0) === 0 ? (
          <EmptyState
            title="No users match"
            description="Try a different name or email."
            className="m-4 border-0"
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Companies</TableHead>
                  <TableHead>Last signed in</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {data?.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">
                          {initials(user.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                            )}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge key={role} variant="brand" className="font-normal">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {pluralise(user.companies.length, "company", "companies")}
                    </TableCell>

                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {user.lastLoginAt ? formatRelative(user.lastLoginAt) : "Never"}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={user.isActive ? "success" : "default"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {user.mfaEnabled && (
                          <ShieldCheck
                            className="size-3.5 text-success"
                            aria-label="Two-factor enabled"
                          />
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="pr-4 text-right">
                      <PermissionGate permission={PERMISSIONS.USER_EDIT}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${user.name}`}
                            >
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditing(user);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil />
                              Edit user
                            </DropdownMenuItem>

                            {user.isActive && user.id !== currentUser?.id && (
                              <DropdownMenuItem
                                destructive
                                onSelect={() => void onDeactivate(user)}
                              >
                                <UserX />
                                Deactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="p-4 pt-0">
              <Pagination
                page={data!.page}
                pageSize={data!.pageSize}
                total={data!.total}
                totalPages={data!.totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </CardContent>

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editing} />
    </Card>
  );
}

/** The role matrix, read-only until custom roles arrive in Phase 6. */
function RolesTab() {
  const { data: roles, isLoading, error, refetch } = useRoles();

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (isLoading || !roles) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="pt-5">
              <SkeletonTable rows={3} columns={2} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {roles.map((role) => (
        <Card key={role.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{role.name}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </div>
              <Badge variant="outline" className="shrink-0 font-normal">
                {pluralise(role.userCount, "user")}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {role.permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No Phase 1 permissions. This role becomes active in a later phase.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {role.permissions.map((permission) => (
                  <span
                    key={permission}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-2xs"
                  >
                    {permission}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
