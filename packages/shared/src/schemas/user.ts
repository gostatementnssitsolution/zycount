import { z } from "zod";
import { ROLES } from "../permissions";
import { emailSchema, passwordSchema } from "./auth";
import { paginationSchema, sortSchema, uuidSchema } from "./common";

export const roleNameSchema = z.enum(ROLES);

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2, { message: "Enter the person's name." }).max(200),
  password: passwordSchema,
  roles: z.array(roleNameSchema).min(1, { message: "Assign at least one role." }),
  companyIds: z.array(uuidSchema).default([]),
  isActive: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  roles: z.array(roleNameSchema).min(1, { message: "Assign at least one role." }).optional(),
  companyIds: z.array(uuidSchema).optional(),
  isActive: z.boolean().optional(),
  /** Admin-initiated reset; the user is forced through MFA again on next login. */
  password: passwordSchema.optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  role: roleNameSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  sort: sortSchema,
});

export interface UserDto {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  mfaEnabled: boolean;
  roles: string[];
  permissions: string[];
  companies: Array<{ id: string; name: string }>;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
}

export const listAuditQuerySchema = paginationSchema.extend({
  action: z.string().trim().max(60).optional(),
  entityType: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(60).optional(),
  userId: uuidSchema.optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  q: z.string().trim().max(100).optional(),
  sort: sortSchema,
});

export interface AuditLogDto {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  companyId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}
