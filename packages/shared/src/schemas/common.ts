import { z } from "zod";
import { isValidMoney, money } from "../money";

/** Money as a decimal string. Accepts numbers, always emits `"0.00"` form. */
export const moneySchema = z
  .union([z.string(), z.number()])
  .refine(isValidMoney, { message: "Enter a valid amount." })
  .transform((value) => money(value));

/** A non-negative money amount — the only shape a journal line may carry. */
export const nonNegativeMoneySchema = moneySchema.refine(
  (value) => !value.startsWith("-"),
  { message: "Amount cannot be negative." },
);

export const uuidSchema = z.string().uuid({ message: "Expected a valid id." });

/** `YYYY-MM-DD`, validated as a real calendar date. */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use the format YYYY-MM-DD." })
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, { message: "That date does not exist." });

export const currencyCodeSchema = z
  .string()
  .regex(/^[A-Z]{3}$/, { message: "Use a 3-letter ISO currency code, e.g. MYR." });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type Pagination = z.infer<typeof paginationSchema>;

/** `?sort=-date` → newest first; `?sort=date` → oldest first. */
export const sortSchema = z.string().regex(/^-?[a-zA-Z][a-zA-Z0-9_]*$/).optional();

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function parseSort(
  sort: string | undefined,
  allowed: readonly string[],
  fallback: { field: string; direction: "asc" | "desc" },
): { field: string; direction: "asc" | "desc" } {
  if (!sort) return fallback;
  const direction = sort.startsWith("-") ? "desc" : "asc";
  const field = sort.replace(/^-/, "");
  return allowed.includes(field) ? { field, direction } : fallback;
}
