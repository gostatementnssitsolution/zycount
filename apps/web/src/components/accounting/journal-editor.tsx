"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  addMoney,
  checkBalance,
  createJournalSchema,
  formatMoney,
  subtractMoney,
  type CreateJournalInput,
  type JournalEntryDto,
} from "@zycount/shared";
import { AlertTriangle, ArrowLeftRight, CheckCircle2, Plus, Save, Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AccountPicker } from "@/components/common/account-picker";
import { FormError } from "@/components/common/error-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCreateJournal, usePeriods, useUpdateJournal } from "@/hooks/use-accounting";
import { ApiError } from "@/lib/api-client";
import { toInputDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const EMPTY_LINE = { accountId: "", debit: "0.00", credit: "0.00", description: "" };

/**
 * Journal editor.
 *
 * The running balance is the centrepiece: the user can see at every keystroke
 * whether the entry balances, and the post button stays disabled until it does.
 * The same Zod schema the API uses validates here, so the browser and the
 * server never disagree about what is acceptable.
 */
export function JournalEditor({ journal }: { journal?: JournalEntryDto }) {
  const router = useRouter();
  const { activeCompany, can } = useAuth();
  const isEdit = Boolean(journal);

  const [error, setError] = React.useState<unknown>(null);
  const [intent, setIntent] = React.useState<"draft" | "post">("draft");

  const create = useCreateJournal();
  const update = useUpdateJournal();
  const { data: periods } = usePeriods();

  const currency = activeCompany?.baseCurrency ?? "MYR";

  const form = useForm<CreateJournalInput>({
    resolver: zodResolver(createJournalSchema),
    mode: "onChange",
    defaultValues: journal
      ? {
          date: journal.date,
          description: journal.description ?? "",
          memo: journal.memo ?? "",
          source: "MANUAL",
          lines: journal.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description ?? "",
          })),
        }
      : {
          date: toInputDate(),
          description: "",
          memo: "",
          source: "MANUAL",
          lines: [{ ...EMPTY_LINE }, { ...EMPTY_LINE }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });

  const lines = form.watch("lines");
  const date = form.watch("date");

  const balance = React.useMemo(
    () => checkBalance((lines ?? []).map((line) => ({ ...line, accountId: line.accountId || "-" }))),
    [lines],
  );

  // Warn before the server does: a closed period will refuse the entry.
  const targetPeriod = React.useMemo(
    () => periods?.find((period) => date >= period.startDate && date <= period.endDate),
    [periods, date],
  );

  const periodProblem =
    date && periods
      ? !targetPeriod
        ? `No fiscal period covers ${date}. Create the period before dating an entry to it.`
        : targetPeriod.status === "CLOSED"
          ? `${targetPeriod.name} is closed. Ask a finance manager to reopen it, or choose another date.`
          : null
      : null;

  const submit = async (values: CreateJournalInput, post: boolean) => {
    setError(null);

    try {
      if (isEdit && journal) {
        await update.mutateAsync({ id: journal.id, input: { ...values, version: journal.version } });
        toast.success(`${journal.reference} saved.`);
        router.push(`/accounting/journals/${journal.id}`);
        return;
      }

      const created = await create.mutateAsync({ input: values, post });
      toast.success(
        post
          ? `${created.reference} posted to the ledger.`
          : `${created.reference} saved as a draft.`,
      );
      router.push(`/accounting/journals/${created.id}`);
    } catch (caught) {
      setError(caught);

      if (caught instanceof ApiError && caught.fields) {
        for (const [field, message] of Object.entries(caught.fields)) {
          form.setError(field as never, { message });
        }
      }

      toast.error(
        caught instanceof ApiError && caught.posted === false
          ? "Nothing was posted. See the message above."
          : "Could not save this entry.",
      );
    }
  };

  const onSubmit = form.handleSubmit((values) => submit(values, intent === "post"));

  /** Fills the opposite side with whatever is needed to balance the entry. */
  const balanceOnLine = (index: number) => {
    const difference = subtractMoney(balance.totalDebit, balance.totalCredit);
    const short = difference.startsWith("-");
    const amount = short ? difference.slice(1) : difference;

    if (amount === "0.00") return;

    if (short) {
      form.setValue(`lines.${index}.debit`, amount, { shouldValidate: true });
      form.setValue(`lines.${index}.credit`, "0.00", { shouldValidate: true });
    } else {
      form.setValue(`lines.${index}.credit`, amount, { shouldValidate: true });
      form.setValue(`lines.${index}.debit`, "0.00", { shouldValidate: true });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error != null && <FormError error={error} />}

      {periodProblem && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>This date cannot be posted to</AlertTitle>
          <AlertDescription>{periodProblem}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Entry details</CardTitle>
        </CardHeader>

        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="date" required>
              Date
            </Label>
            <Input
              id="date"
              type="date"
              invalid={Boolean(form.formState.errors.date)}
              {...form.register("date")}
            />
            {form.formState.errors.date ? (
              <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
            ) : (
              targetPeriod && (
                <p className="text-xs text-muted-foreground">Posts into {targetPeriod.name}</p>
              )
            )}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What this entry records…"
              {...form.register("description")}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Reference</Label>
            <Input
              value={journal?.reference ?? "Allocated on save"}
              disabled
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Lines</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ ...EMPTY_LINE })}>
            <Plus />
            Add line
          </Button>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          <Table containerClassName="overflow-x-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-4">#</TableHead>
                <TableHead className="min-w-[16rem]">Account</TableHead>
                <TableHead className="min-w-[12rem]">Line description</TableHead>
                <TableHead numeric className="w-36">
                  Debit
                </TableHead>
                <TableHead numeric className="w-36">
                  Credit
                </TableHead>
                <TableHead className="w-20 pr-4" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell className="pl-4 text-xs text-muted-foreground">{index + 1}</TableCell>

                  <TableCell>
                    <AccountPicker
                      value={form.watch(`lines.${index}.accountId`)}
                      onChange={(accountId) =>
                        form.setValue(`lines.${index}.accountId`, accountId, {
                          shouldValidate: true,
                        })
                      }
                      invalid={Boolean(form.formState.errors.lines?.[index]?.accountId)}
                    />
                  </TableCell>

                  <TableCell>
                    <Input
                      placeholder="Optional"
                      {...form.register(`lines.${index}.description`)}
                    />
                  </TableCell>

                  <TableCell>
                    <AmountInput
                      value={form.watch(`lines.${index}.debit`)}
                      onChange={(value) => {
                        form.setValue(`lines.${index}.debit`, value, { shouldValidate: true });
                        // A line is one-sided: entering a debit clears the credit.
                        if (value !== "0.00" && value !== "") {
                          form.setValue(`lines.${index}.credit`, "0.00", { shouldValidate: true });
                        }
                      }}
                      invalid={Boolean(form.formState.errors.lines?.[index])}
                    />
                  </TableCell>

                  <TableCell>
                    <AmountInput
                      value={form.watch(`lines.${index}.credit`)}
                      onChange={(value) => {
                        form.setValue(`lines.${index}.credit`, value, { shouldValidate: true });
                        if (value !== "0.00" && value !== "") {
                          form.setValue(`lines.${index}.debit`, "0.00", { shouldValidate: true });
                        }
                      }}
                      invalid={Boolean(form.formState.errors.lines?.[index])}
                    />
                  </TableCell>

                  <TableCell className="pr-4">
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => balanceOnLine(index)}
                        disabled={balance.difference === "0.00"}
                        title="Fill this line with the amount needed to balance"
                        aria-label={`Balance the entry on line ${index + 1}`}
                      >
                        <ArrowLeftRight />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 2}
                        title={
                          fields.length <= 2
                            ? "An entry needs at least two lines"
                            : "Remove this line"
                        }
                        aria-label={`Remove line ${index + 1}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <BalanceBar balance={balance} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1.5 pt-5">
          <Label htmlFor="memo">Internal note</Label>
          <Textarea
            id="memo"
            rows={2}
            placeholder="Context for whoever reviews this later…"
            {...form.register("memo")}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>

        <Button
          type="submit"
          variant="outline"
          loading={form.formState.isSubmitting && intent === "draft"}
          disabled={form.formState.isSubmitting}
          onClick={() => setIntent("draft")}
        >
          <Save />
          {isEdit ? "Save changes" : "Save as draft"}
        </Button>

        {!isEdit && can("journal.post") && (
          <Button
            type="submit"
            loading={form.formState.isSubmitting && intent === "post"}
            disabled={form.formState.isSubmitting || !balance.balanced || Boolean(periodProblem)}
            onClick={() => setIntent("post")}
            title={
              !balance.balanced
                ? "The entry must balance before it can be posted"
                : (periodProblem ?? "Post this entry to the ledger")
            }
          >
            <Send />
            Save and post
          </Button>
        )}
      </div>
    </form>
  );
}

/** Running totals, and the exact difference when the entry does not balance. */
function BalanceBar({
  balance,
  currency,
}: {
  balance: ReturnType<typeof checkBalance>;
  currency: string;
}) {
  const zero = balance.totalDebit === "0.00" && balance.totalCredit === "0.00";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-x-8 gap-y-2 border-t px-4 py-3 text-sm",
        balance.balanced ? "bg-success/5" : !zero && "bg-destructive/5",
      )}
      aria-live="polite"
    >
      <div className="mr-auto flex items-center gap-2">
        {balance.balanced ? (
          <>
            <CheckCircle2 className="size-4 text-success" aria-hidden />
            <span className="font-medium text-success">This entry balances</span>
          </>
        ) : zero ? (
          <span className="text-muted-foreground">Enter the debits and credits.</span>
        ) : (
          <>
            <AlertTriangle className="size-4 text-destructive" aria-hidden />
            <span className="font-medium text-destructive">
              Out of balance by {formatMoney(balance.difference.replace("-", ""), { currency })}
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Total debit</span>
        <Money value={balance.totalDebit} currency={currency} className="w-28 text-right font-medium" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Total credit</span>
        <Money
          value={balance.totalCredit}
          currency={currency}
          className="w-28 text-right font-medium"
        />
      </div>
    </div>
  );
}

/**
 * Money input that stays out of the way while typing and normalises on blur,
 * so a half-typed "12." is never rejected mid-keystroke.
 */
function AmountInput({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const display = draft ?? (value === "0.00" ? "" : value);

  return (
    <Input
      inputMode="decimal"
      placeholder="0.00"
      value={display}
      invalid={invalid}
      className="text-right tabular"
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => {
        if (draft === null) return;
        const cleaned = draft.replace(/[^0-9.-]/g, "");
        const numeric = Number(cleaned);
        onChange(Number.isFinite(numeric) && cleaned !== "" ? numeric.toFixed(2) : "0.00");
        setDraft(null);
      }}
    />
  );
}
