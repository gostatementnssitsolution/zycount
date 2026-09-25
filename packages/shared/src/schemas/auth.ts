import { z } from "zod";
import { uuidSchema } from "./common";

/**
 * Password policy (docs/spec/06 §2): length plus mixed character classes.
 * Breached-password checks and reuse history are enforced server-side.
 */
export const passwordSchema = z
  .string()
  .min(12, { message: "Use at least 12 characters." })
  .max(128, { message: "That password is too long." })
  .refine((value) => /[a-z]/.test(value), { message: "Include a lowercase letter." })
  .refine((value) => /[A-Z]/.test(value), { message: "Include an uppercase letter." })
  .refine((value) => /\d/.test(value), { message: "Include a number." })
  .refine((value) => /[^A-Za-z0-9]/.test(value), { message: "Include a symbol." });

export const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Enter your email address." })
  .email({ message: "Enter a valid email address." })
  .toLowerCase();

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Enter your password." }),
  rememberDevice: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const mfaVerifySchema = z.object({
  /** Short-lived challenge token issued by `/auth/login` when MFA is required. */
  mfaToken: z.string().min(1),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$|^[A-Z0-9]{10}$/, { message: "Enter the 6-digit code or a recovery code." }),
});
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Enter your current password." }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Those passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "Choose a password you have not used here before.",
    path: ["newPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const mfaEnrolConfirmSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, { message: "Enter the 6-digit code." }),
});

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  mfaEnabled: boolean;
  organizationId: string;
  roles: string[];
  permissions: string[];
  companies: Array<{ id: string; name: string; baseCurrency: string; isDefault: boolean }>;
}

export interface LoginResponse {
  accessToken?: string;
  expiresIn?: number;
  user?: AuthUser;
  /** Present instead of tokens when the account has MFA enabled. */
  mfaRequired?: boolean;
  mfaToken?: string;
}

/** JWT access-token payload. */
export interface AccessTokenClaims {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  companies: string[];
}

export const revokeSessionSchema = z.object({ sessionId: uuidSchema });
