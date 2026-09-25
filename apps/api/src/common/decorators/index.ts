import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "../guards/types";

/** Marks a route as reachable without an access token (login, refresh, health). */
export const IS_PUBLIC_KEY = "zycount:isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Declares the permission codes a route needs. `PermissionsGuard` checks the
 * caller's effective permissions — the union of their roles' grants.
 */
export const PERMISSIONS_KEY = "zycount:permissions";
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Requires a resolved company context (`X-Company-Id` or `:companyId`). */
export const REQUIRE_COMPANY_KEY = "zycount:requireCompany";
export const RequireCompany = () => SetMetadata(REQUIRE_COMPANY_KEY, true);

export const CurrentUser = createParamDecorator((data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
  return data ? request.user?.[data] : request.user;
});

/** The company this request operates on, resolved and authorised by the guard. */
export const CompanyId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { companyId?: string }>();
  return request.companyId;
});

export const ClientInfo = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return {
    ipAddress:
      (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      request.socket.remoteAddress ??
      null,
    userAgent: (request.headers["user-agent"] as string | undefined) ?? null,
  };
});

export const IdempotencyKey = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return (request.headers["idempotency-key"] as string | undefined) ?? null;
});
