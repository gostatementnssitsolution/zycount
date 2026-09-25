"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { reopenPeriodSchema, type FiscalPeriodDto } from "@zycount/shared";
import { CheckCircle2, CircleAlert, Lock, LockOpen, TriangleAlert } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/common/error-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCloseReadiness, useClosePeriod, useReopenPeriod } from "@/hooks/use-accounting";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Month-end close centre (docs/spec/08 §31).
 *
 * The checklist is shown before anything happens, and closing with unresolved
 * items requires an explicit override that is recorded in the audit log.
 */
export function ClosePeriodDialog({
  period,
  open,
  onOpenChange,
}: {
  period: FiscalPeriodDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [override, setOverride] = React.useState(false);
  const [error, setError] = React.useState<unknown>(null);

  const { data: readiness, isLoading } = useCloseReadiness(open ? (period?.id ?? null) : null);
  const close = useClosePeriod();

  React.useEffect(() => {
    if (open) {
      setOverride(false);
      setError(null);
    }
  }, [open]);

  if (!period) return null;

  const blockers = readiness?.checks.filter((check) => check.blocking && !check.passed) ?? [];
  const canClose = blockers.length === 0 || override;

  const onClose = async () => {
    setError(null);

    try {
      await close.mutateAsync({ id: period.id, override });
      toast.success(`${period.name} is closed.`);
      onOpenChange(false);
    } catch (caught) {
      setError(caught);
      toast.error(caught instanceof ApiError ? caught.message : "Could not close this period.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close {period.name}</DialogTitle>
          <DialogDescription>
            Once closed, nothing can be posted, edited or reversed in this period until it is
            reopened by someone authorised to do so.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error != null && <FormError error={error} />}

          {isLoading || !readiness ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Month-end checklist</span>
                <span className="text-muted-foreground">{readiness.completion}% complete</span>
              </div>

              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={readiness.completion}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    readiness.ready ? "bg-success" : "bg-warning",
                  )}
                  style={{ width: `${readiness.completion}%` }}
                />
              </div>

              <ul className="space-y-2">
                {readiness.checks.map((check) => (
                  <li key={check.key} className="flex items-start gap-2.5 rounded-lg border p-3">
                    {check.passed ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{check.label}</p>
                      <p className="text-xs text-muted-foreground">{check.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {blockers.length > 0 && (
                <Alert variant="warning">
                  <TriangleAlert />
                  <AlertTitle>
                    {blockers.length} item{blockers.length === 1 ? "" : "s"} must be cleared first
                  </AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      You can close anyway, but the override and the unresolved items are recorded
                      in the audit log.
                    </p>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Switch checked={override} onCheckedChange={setOverride} />
                      Close anyway and record the override
                    </label>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void onClose()} disabled={!canClose} loading={close.isPending}>
            <Lock />
            Close {period.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Reopening is authorised and audited (docs/spec/01 — Period locking). */
export function ReopenPeriodDialog({
  period,
  open,
  onOpenChange,
}: {
  period: FiscalPeriodDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = React.useState<unknown>(null);
  const reopen = useReopenPeriod();

  const form = useForm<{ reason: string }>({
    resolver: zodResolver(reopenPeriodSchema),
    defaultValues: { reason: "" },
  });

  React.useEffect(() => {
    if (open) {
      setError(null);
      form.reset({ reason: "" });
    }
  }, [open, form]);

  if (!period) return null;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    try {
      await reopen.mutateAsync({ id: period.id, reason: values.reason });
      toast.success(`${period.name} is open again.`);
      onOpenChange(false);
    } catch (caught) {
      setError(caught);
      toast.error(caught instanceof ApiError ? caught.message : "Could not reopen this period.");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen {period.name}</DialogTitle>
          <DialogDescription>
            Reopening a closed period changes figures that may already have been reported. The
            reason you give is recorded against your name in the audit log.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error != null && <FormError error={error} />}

          <div className="space-y-1.5">
            <Label htmlFor="reopen-reason" required>
              Why is this period being reopened?
            </Label>
            <Textarea
              id="reopen-reason"
              rows={3}
              placeholder="e.g. The auditor found an unrecorded accrual that belongs in this period."
              invalid={Boolean(form.formState.errors.reason)}
              {...form.register("reason")}
            />
            {form.formState.errors.reason && (
              <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              <LockOpen />
              Reopen the period
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
