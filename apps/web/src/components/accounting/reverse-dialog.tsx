"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { reverseJournalSchema, type JournalEntryDto, type ReverseJournalInput } from "@zycount/shared";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/common/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Money } from "@/components/ui/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useReverseJournal } from "@/hooks/use-accounting";
import { ApiError } from "@/lib/api-client";
import { toInputDate } from "@/lib/format";

/**
 * Reversal confirmation.
 *
 * The resulting debits and credits are previewed before anything is posted
 * (docs/spec/08), and a reason is required because it is recorded against both
 * entries in the audit trail.
 */
export function ReverseJournalDialog({
  open,
  onOpenChange,
  journal,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journal: JournalEntryDto;
  currency: string;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<unknown>(null);
  const reverse = useReverseJournal();

  const form = useForm<ReverseJournalInput>({
    resolver: zodResolver(reverseJournalSchema),
    defaultValues: { date: toInputDate(), reason: "" },
  });

  React.useEffect(() => {
    if (open) {
      setError(null);
      form.reset({ date: toInputDate(), reason: "" });
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    try {
      const reversal = await reverse.mutateAsync({ id: journal.id, input: values });
      toast.success(`${journal.reference} reversed by ${reversal.reference}.`);
      onOpenChange(false);
      router.push(`/accounting/journals/${reversal.id}`);
    } catch (caught) {
      setError(caught);
      toast.error(
        caught instanceof ApiError && caught.posted === false
          ? "Nothing was reversed."
          : "Could not reverse this entry.",
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Reverse {journal.reference}</DialogTitle>
          <DialogDescription>
            A posted entry is never edited or deleted. Reversing posts an equal and opposite entry;
            both remain in the ledger and net to zero.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error != null && <FormError error={error} />}

          <Alert variant="info">
            <RotateCcw />
            <AlertDescription>
              This is what will be posted. Every debit becomes a credit and every credit a debit.
            </AlertDescription>
          </Alert>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-3">Account</TableHead>
                  <TableHead numeric>Debit</TableHead>
                  <TableHead numeric className="pr-3">
                    Credit
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journal.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="pl-3">
                      <span className="font-mono text-xs text-muted-foreground">
                        {line.accountCode}
                      </span>
                      <span className="ml-2">{line.accountName}</span>
                    </TableCell>
                    {/* Sides swapped — this is the reversal, not the original. */}
                    <TableCell numeric>
                      <Money value={line.credit} currency={currency} dashOnZero />
                    </TableCell>
                    <TableCell numeric className="pr-3">
                      <Money value={line.debit} currency={currency} dashOnZero />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reversal-date">Reversal date</Label>
            <Input
              id="reversal-date"
              type="date"
              invalid={Boolean(form.formState.errors.date)}
              {...form.register("date")}
            />
            <p className="text-xs text-muted-foreground">
              Must fall in an open period. Defaults to today.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason" required>
              Reason
            </Label>
            <Textarea
              id="reason"
              rows={2}
              placeholder="Why this entry is being reversed…"
              invalid={Boolean(form.formState.errors.reason)}
              {...form.register("reason")}
            />
            {form.formState.errors.reason && (
              <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Recorded in the audit trail against both entries.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              <RotateCcw />
              Post the reversal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
