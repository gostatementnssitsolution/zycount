import { z } from "zod";
import { ACCOUNT_SUB_TYPES, ACCOUNT_TYPES, SUB_TYPES_BY_TYPE, type AccountType } from "../accounting";
import { uuidSchema } from "./common";

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);
export const accountSubTypeSchema = z.enum(ACCOUNT_SUB_TYPES);

const accountFields = z.object({
  code: z
    .string()
    .trim()
    .min(1, { message: "Enter an account code." })
    .max(20)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
      message: "Use letters, digits, dot, dash or underscore.",
    }),
  name: z.string().trim().min(2, { message: "Enter an account name." }).max(200),
  type: accountTypeSchema,
  subType: accountSubTypeSchema.optional().nullable(),
  parentId: uuidSchema.optional().nullable(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isPostable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

/** A sub-type must belong to its account type (e.g. no CURRENT_ASSET revenue). */
function subTypeMatchesType(value: { type?: AccountType; subType?: string | null }): boolean {
  if (!value.subType || !value.type) return true;
  return SUB_TYPES_BY_TYPE[value.type].includes(value.subType as never);
}

export const createAccountSchema = accountFields.refine(subTypeMatchesType, {
  message: "That statement group does not belong to this account type.",
  path: ["subType"],
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = accountFields.partial().refine(subTypeMatchesType, {
  message: "That statement group does not belong to this account type.",
  path: ["subType"],
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const listAccountsQuerySchema = z.object({
  type: accountTypeSchema.optional(),
  q: z.string().trim().max(100).optional(),
  /** `true` narrows the list to accounts that actually accept postings. */
  postableOnly: z.coerce.boolean().optional(),
  includeInactive: z.coerce.boolean().optional(),
});

export interface AccountDto {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: AccountType;
  subType: string | null;
  parentId: string | null;
  description: string | null;
  isPostable: boolean;
  isActive: boolean;
  isSystem: boolean;
}

export interface AccountTreeNode extends AccountDto {
  depth: number;
  children: AccountTreeNode[];
}
