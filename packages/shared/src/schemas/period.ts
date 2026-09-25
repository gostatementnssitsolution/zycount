import { z } from "zod";
import { PERIOD_STATUSES } from "../accounting";
import { isoDateSchema } from "./common";

export const periodStatusSchema = z.enum(PERIOD_STATUSES);

export const createPeriodSchema = z
  .object({
    name: z.string().trim().min(2, { message: "Name the period." }).max(100),
    year: z.coerce.number().int().min(1900).max(2999),
    periodNo: z.coerce.number().int().min(1).max(24),
    startDate: isoDateSchema,
    endDate: isoDateSchema,
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "The end date must fall on or after the start date.",
    path: ["endDate"],
  });
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;

/**
 * Generate a fiscal year of monthly periods in one call — the path the
 * onboarding wizard uses (docs/spec/13 §51 step 2).
 */
export const generatePeriodsSchema = z.object({
  year: z.coerce.number().int().min(1900).max(2999),
  /** 1 = January. Defaults to the company's configured fiscal year start. */
  startMonth: z.coerce.number().int().min(1).max(12).optional(),
  periodsPerYear: z.coerce.number().int().refine((v) => v === 12 || v === 4, {
    message: "Choose 12 monthly periods or 4 quarterly periods.",
  }).default(12),
});
export type GeneratePeriodsInput = z.infer<typeof generatePeriodsSchema>;

export const closePeriodSchema = z.object({
  /** Closing with unresolved checklist items requires an audited override. */
  override: z.boolean().optional().default(false),
  note: z.string().trim().max(500).optional(),
});

export const reopenPeriodSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, { message: "Explain why this period is being reopened — it is recorded in the audit log." })
    .max(500),
});

export interface FiscalPeriodDto {
  id: string;
  companyId: string;
  name: string;
  year: number;
  periodNo: number;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  closedAt: string | null;
  closedBy: string | null;
  reopenedAt: string | null;
  journalCount?: number;
}

/** Month-end checklist surfaced by the close centre (docs/spec/08 §31). */
export interface PeriodCloseCheck {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
  blocking: boolean;
}

export interface PeriodCloseReadiness {
  periodId: string;
  ready: boolean;
  completion: number;
  checks: PeriodCloseCheck[];
}
