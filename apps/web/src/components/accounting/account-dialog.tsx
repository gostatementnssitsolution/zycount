"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ACCOUNT_SUB_TYPE_LABELS,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  SUB_TYPES_BY_TYPE,
  createAccountSchema,
  type AccountTreeNode,
  type AccountType,
  type CreateAccountInput,
} from "@zycount/shared";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAccounts, useCreateAccount, useUpdateAccount } from "@/hooks/use-accounting";
import { ApiError } from "@/lib/api-client";

/** Create or edit a ledger account, with the same rules the server enforces. */
export function AccountDialog({
  open,
  onOpenChange,
  account,
  defaultParent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: AccountTreeNode | null;
  defaultParent?: AccountTreeNode | null;
}) {
  const isEdit = Boolean(account);
  const [error, setError] = React.useState<unknown>(null);

  const create = useCreateAccount();
  const update = useUpdateAccount();
  const { data: allAccounts } = useAccounts({ includeInactive: false });

  const form = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "ASSET",
      subType: null,
      parentId: null,
      description: "",
      isPostable: true,
      isActive: true,
    },
  });

  const type = form.watch("type");
  const parentId = form.watch("parentId");

  // Re-seed the form whenever the dialog opens for a different account.
  React.useEffect(() => {
    if (!open) return;
    setError(null);

    if (account) {
      form.reset({
        code: account.code,
        name: account.name,
        type: account.type,
        subType: (account.subType as CreateAccountInput["subType"]) ?? null,
        parentId: account.parentId,
        description: account.description ?? "",
        isPostable: account.isPostable,
        isActive: account.isActive,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        // A new child inherits its parent's type, because the server requires
        // them to match.
        type: (defaultParent?.type as AccountType) ?? "ASSET",
        subType: (defaultParent?.subType as CreateAccountInput["subType"]) ?? null,
        parentId: defaultParent?.id ?? null,
        description: "",
        isPostable: true,
        isActive: true,
      });
    }
  }, [open, account, defaultParent, form]);

  // A sub-type belonging to another type would be rejected, so clear it when
  // the type changes.
  React.useEffect(() => {
    const current = form.getValues("subType");
    if (current && !SUB_TYPES_BY_TYPE[type].includes(current)) {
      form.setValue("subType", null);
    }
  }, [type, form]);

  const parentOptions = React.useMemo(
    () =>
      (allAccounts ?? []).filter(
        (candidate) => candidate.type === type && candidate.id !== account?.id,
      ),
    [allAccounts, type, account?.id],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    try {
      if (isEdit && account) {
        await update.mutateAsync({ id: account.id, input: values });
        toast.success(`${values.code} ${values.name} updated.`);
      } else {
        await create.mutateAsync(values);
        toast.success(`${values.code} ${values.name} created.`);
      }
      onOpenChange(false);
    } catch (caught) {
      setError(caught);

      if (caught instanceof ApiError && caught.fields) {
        for (const [field, message] of Object.entries(caught.fields)) {
          form.setError(field as keyof CreateAccountInput, { message });
        }
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit account" : "New ledger account"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes apply to future postings; entries already in the ledger are untouched."
              : "Accounts under a heading roll up into it on the statements."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error != null && <FormError error={error} />}

          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="code" required>
                Code
              </Label>
              <Input
                id="code"
                placeholder="1310"
                className="font-mono"
                invalid={Boolean(form.formState.errors.code)}
                {...form.register("code")}
              />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" required>
                Name
              </Label>
              <Input
                id="name"
                placeholder="Trade Debtors"
                invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label required>Account type</Label>
              <Select
                value={type}
                onValueChange={(value) => form.setValue("type", value as AccountType)}
                disabled={isEdit && account?.isSystem}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((candidate) => (
                    <SelectItem key={candidate} value={candidate}>
                      {ACCOUNT_TYPE_LABELS[candidate]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Fixed once the account carries postings.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Statement group</Label>
              <Select
                value={form.watch("subType") ?? "__none__"}
                onValueChange={(value) =>
                  form.setValue(
                    "subType",
                    value === "__none__" ? null : (value as CreateAccountInput["subType"]),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  {SUB_TYPES_BY_TYPE[type].map((subType) => (
                    <SelectItem key={subType} value={subType}>
                      {ACCOUNT_SUB_TYPE_LABELS[subType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Decides where the balance appears on the statements.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Sits underneath</Label>
            <Select
              value={parentId ?? "__none__"}
              onValueChange={(value) =>
                form.setValue("parentId", value === "__none__" ? null : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Top level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Top level</SelectItem>
                {parentOptions.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.code} · {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only accounts of the same type can be a parent.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="What this account is for…"
              {...form.register("description")}
            />
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <label className="flex items-start gap-3">
              <Switch
                checked={form.watch("isPostable")}
                onCheckedChange={(checked) => form.setValue("isPostable", checked)}
              />
              <span className="text-sm">
                <span className="font-medium">Accepts postings</span>
                <span className="block text-xs text-muted-foreground">
                  Turn off for a heading that only totals the accounts beneath it.
                </span>
              </span>
            </label>

            {isEdit && (
              <label className="flex items-start gap-3">
                <Switch
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) => form.setValue("isActive", checked)}
                />
                <span className="text-sm">
                  <span className="font-medium">Active</span>
                  <span className="block text-xs text-muted-foreground">
                    An archived account keeps its history but can no longer be posted to.
                  </span>
                </span>
              </label>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {isEdit ? "Save changes" : "Create account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
