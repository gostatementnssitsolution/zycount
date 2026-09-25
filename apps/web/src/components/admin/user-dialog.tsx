"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ROLES,
  ROLE_DESCRIPTIONS,
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
  type RoleName,
  type UserDto,
} from "@zycount/shared";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCompanies } from "@/hooks/use-accounting";
import { useCreateUser, useUpdateUser } from "@/hooks/use-admin";
import { ApiError } from "@/lib/api-client";

/** Create a user, or change an existing one's roles, access and password. */
export function UserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserDto | null;
}) {
  const isEdit = Boolean(user);
  const [error, setError] = React.useState<unknown>(null);
  const [resetPassword, setResetPassword] = React.useState(false);

  const create = useCreateUser();
  const update = useUpdateUser();
  const { data: companies } = useCompanies();

  const form = useForm<CreateUserInput>({
    // Editing allows a partial payload; creating requires the full shape.
    resolver: zodResolver(isEdit ? (updateUserSchema as never) : createUserSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      roles: ["ReadOnly"],
      companyIds: [],
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setResetPassword(false);

    if (user) {
      form.reset({
        email: user.email,
        name: user.name,
        password: "",
        roles: user.roles as RoleName[],
        companyIds: user.companies.map((company) => company.id),
        isActive: user.isActive,
      });
    } else {
      form.reset({
        email: "",
        name: "",
        password: "",
        roles: ["ReadOnly"],
        companyIds: companies?.map((company) => company.id) ?? [],
        isActive: true,
      });
    }
  }, [open, user, companies, form]);

  const roles = form.watch("roles");
  const companyIds = form.watch("companyIds");

  const toggleRole = (role: RoleName) => {
    const next = roles.includes(role) ? roles.filter((item) => item !== role) : [...roles, role];
    form.setValue("roles", next.length > 0 ? next : [role], { shouldValidate: true });
  };

  const toggleCompany = (companyId: string) => {
    const next = companyIds.includes(companyId)
      ? companyIds.filter((id) => id !== companyId)
      : [...companyIds, companyId];
    form.setValue("companyIds", next, { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    try {
      if (isEdit && user) {
        await update.mutateAsync({
          id: user.id,
          input: {
            name: values.name,
            roles: values.roles,
            companyIds: values.companyIds,
            isActive: values.isActive,
            // Only send a password when the admin explicitly asked to reset it.
            ...(resetPassword && values.password ? { password: values.password } : {}),
          },
        });
        toast.success(
          resetPassword
            ? `${values.name} updated. Their other sessions have been ended.`
            : `${values.name} updated.`,
        );
      } else {
        await create.mutateAsync(values);
        toast.success(`${values.name} can now sign in.`);
      }
      onOpenChange(false);
    } catch (caught) {
      setError(caught);

      if (caught instanceof ApiError && caught.fields) {
        for (const [field, message] of Object.entries(caught.fields)) {
          form.setError(field as keyof CreateUserInput, { message });
        }
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${user?.name}` : "Add a user"}</DialogTitle>
          <DialogDescription>
            Roles decide what this person can do; company access decides which books they see.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error != null && <FormError error={error} />}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="user-name" required>
                Full name
              </Label>
              <Input
                id="user-name"
                invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email" required>
                Email address
              </Label>
              <Input
                id="user-email"
                type="email"
                disabled={isEdit}
                invalid={Boolean(form.formState.errors.email)}
                {...form.register("email")}
              />
              {isEdit ? (
                <p className="text-xs text-muted-foreground">
                  The sign-in address cannot be changed.
                </p>
              ) : (
                form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )
              )}
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={resetPassword} onCheckedChange={setResetPassword} />
              Set a new password
            </label>
          )}

          {(!isEdit || resetPassword) && (
            <div className="space-y-1.5">
              <Label htmlFor="user-password" required>
                Password
              </Label>
              <Input
                id="user-password"
                type="text"
                autoComplete="new-password"
                placeholder="At least 12 characters, mixed case, a number and a symbol"
                invalid={Boolean(form.formState.errors.password)}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Share it securely. Changing a password ends that user&apos;s other sessions.
              </p>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Roles</legend>
            {form.formState.errors.roles && (
              <p className="text-sm text-destructive">{form.formState.errors.roles.message}</p>
            )}

            <div className="grid gap-1.5 sm:grid-cols-2">
              {ROLES.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-accent/50"
                >
                  <Checkbox
                    checked={roles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{role}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Company access</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {(companies ?? []).map((company) => (
                <label
                  key={company.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-accent/50"
                >
                  <Checkbox
                    checked={companyIds.includes(company.id)}
                    onCheckedChange={() => toggleCompany(company.id)}
                  />
                  <span className="min-w-0 truncate text-sm">{company.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              You can only grant access to companies you can reach yourself.
            </p>
          </fieldset>

          {isEdit && (
            <label className="flex items-start gap-3 rounded-lg border p-3">
              <Switch
                checked={form.watch("isActive")}
                onCheckedChange={(checked) => form.setValue("isActive", checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Can sign in</span>
                <span className="block text-xs text-muted-foreground">
                  Turning this off ends their sessions immediately. Their history is kept.
                </span>
              </span>
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {isEdit ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
