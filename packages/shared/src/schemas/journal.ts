import { z } from "zod";
import { JOURNAL_SOURCES, JOURNAL_STATUSES } from "../accounting";
import { validateJournalStructure } from "../invariants";
import { isoDateSchema, nonNegativeMoneySchema, paginationSchema, sortSchema, uuidSchema } from "./common";

export const journalStatusSchema = z.enum(JOURNAL_STATUSES);
export const journalSourceSchema = z.enum(JOURNAL_SOURCES);

export const journalLineSchema = z.object({
  accountId: uuidSchema,
  debit: nonNegativeMoneySchema.default("0.00"),
  credit: nonNegativeMoneySchema.default("0.00"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});
export type JournalLineInput = z.infer<typeof journalLineSchema>;

const journalFields = z.object({
  date: isoDateSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
  memo: z.string().trim().max(2000).optional().or(z.literal("")),
  /** Omit to let the server allocate the next `JV-YYYY-NNNNNN`. */
  reference: z.string().trim().max(50).optional(),
  source: journalSourceSchema.optional().default("MANUAL"),
  lines: z.array(journalLineSchema).min(2, { message: "A journal entry needs at least two lines." }),
});

/**
 * Applies the shared structural invariants (balance, one-sided lines, non-zero
 * total) so the browser shows the same message the API would return.
 */
function attachInvariants<T extends z.ZodTypeAny>(schema: T): T {
  return schema.superRefine((value: { lines?: unknown }, ctx: z.RefinementCtx) => {
    const lines = value?.lines;
    if (!Array.isArray(lines) || lines.length === 0) return;

    for (const issue of validateJournalStructure(lines as never)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: issue.path ? issue.path.split(".") : ["lines"],
        // Carry the domain code through the Zod layer so the API answers with
        // `JOURNAL_UNBALANCED` rather than a generic validation failure —
        // clients branch on these codes (docs/spec/05, docs/spec/09).
        params: { zycountCode: issue.code },
      });
    }
  }) as unknown as T;
}

export const createJournalSchema = attachInvariants(journalFields);
export type CreateJournalInput = z.infer<typeof journalFields>;

export const updateJournalSchema = attachInvariants(
  journalFields.partial().extend({
    /** Optimistic lock — a stale value returns `CONFLICT` (docs/spec/09). */
    version: z.coerce.number().int().positive().optional(),
  }),
);
export type UpdateJournalInput = z.infer<typeof updateJournalSchema>;

export const postJournalSchema = z.object({
  version: z.coerce.number().int().positive().optional(),
});

export const reverseJournalSchema = z.object({
  /** Defaults to the original entry's date when omitted. */
  date: isoDateSchema.optional(),
  reason: z
    .string()
    .trim()
    .min(5, { message: "Give a reason — it is recorded against both entries." })
    .max(500),
});
export type ReverseJournalInput = z.infer<typeof reverseJournalSchema>;

export const listJournalsQuerySchema = paginationSchema.extend({
  status: journalStatusSchema.optional(),
  source: journalSourceSchema.optional(),
  fiscalPeriodId: uuidSchema.optional(),
  accountId: uuidSchema.optional(),
  dateFrom: isoDateSchema.optional(),
  dateTo: isoDateSchema.optional(),
  q: z.string().trim().max(100).optional(),
  sort: sortSchema,
});
export type ListJournalsQuery = z.infer<typeof listJournalsQuerySchema>;

export interface JournalLineDto {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: string;
  credit: string;
  description: string | null;
  lineNo: number;
}

export interface JournalEntryDto {
  id: string;
  companyId: string;
  fiscalPeriodId: string;
  fiscalPeriodName: string;
  periodStatus: "OPEN" | "CLOSED";
  reference: string;
  date: string;
  description: string | null;
  memo: string | null;
  status: "DRAFT" | "POSTED" | "REVERSED";
  source: string;
  sourceId: string | null;
  reversalOfId: string | null;
  reversalOfReference: string | null;
  reversedById: string | null;
  reversedByReference: string | null;
  totalDebit: string;
  totalCredit: string;
  version: number;
  createdBy: string | null;
  createdByName: string | null;
  postedAt: string | null;
  postedBy: string | null;
  postedByName: string | null;
  createdAt: string;
  updatedAt: string;
  lines: JournalLineDto[];
}

export type JournalEntrySummary = Omit<JournalEntryDto, "lines"> & { lineCount: number };
