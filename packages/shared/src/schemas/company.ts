import { z } from "zod";
import { currencyCodeSchema, uuidSchema } from "./common";

export const companyBaseSchema = z.object({
  name: z.string().trim().min(2, { message: "Enter the company name." }).max(200),
  registrationNo: z.string().trim().max(50).optional().or(z.literal("")),
  taxNo: z.string().trim().max(50).optional().or(z.literal("")),
  baseCurrency: currencyCodeSchema.default("MYR"),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().email({ message: "Enter a valid email address." }).optional().or(z.literal("")),
  fiscalYearStartMonth: z.coerce
    .number()
    .int()
    .min(1, { message: "Pick a month." })
    .max(12, { message: "Pick a month." })
    .default(1),
  timezone: z.string().trim().max(64).default("Asia/Kuala_Lumpur"),
});

export const createCompanySchema = companyBaseSchema;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = companyBaseSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export interface CompanyDto {
  id: string;
  organizationId: string;
  name: string;
  registrationNo: string | null;
  taxNo: string | null;
  baseCurrency: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  fiscalYearStartMonth: number;
  timezone: string;
  isDemo: boolean;
  isActive: boolean;
  createdAt: string;
}

export const createBranchSchema = z.object({
  code: z.string().trim().min(1, { message: "Enter a branch code." }).max(20),
  name: z.string().trim().min(1, { message: "Enter a branch name." }).max(200),
  address: z.string().trim().max(500).optional().or(z.literal("")),
});

/** Assign a user to a company and hand them roles. */
export const assignUserCompanySchema = z.object({
  userId: uuidSchema,
  isDefault: z.boolean().optional().default(false),
});
