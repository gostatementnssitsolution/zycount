import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ERROR_CODES, ZycountError } from "@zycount/shared";
import type { Request } from "express";
import { REQUIRE_COMPANY_KEY } from "../decorators";
import type { AuthenticatedUser } from "./types";

/**
 * Multi-tenancy enforcement (docs/spec/05 — Company scoping).
 *
 * Resolves the target company from the `:companyId` path param or the
 * `X-Company-Id` header and refuses it unless the caller was granted access.
 * Nothing company-scoped runs before this guard has produced `request.companyId`.
 */
@Injectable()
export class CompanyScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(REQUIRE_COMPANY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; companyId?: string }>();

    const fromParams = (request.params as Record<string, string | undefined>)?.companyId;
    const fromHeader = request.headers["x-company-id"];
    const companyId = fromParams ?? (typeof fromHeader === "string" ? fromHeader : undefined);

    if (!companyId) {
      throw new ZycountError(
        ERROR_CODES.COMPANY_CONTEXT_REQUIRED,
        "Choose a company before continuing.",
      );
    }

    const user = request.user;
    if (!user) {
      throw new ZycountError(ERROR_CODES.AUTH_UNAUTHENTICATED, "Please sign in to continue.");
    }

    if (!user.companies.includes(companyId)) {
      // Deliberately the same message whether the company is missing or simply
      // out of reach — probing must not reveal which companies exist.
      throw new ZycountError(
        ERROR_CODES.COMPANY_ACCESS_DENIED,
        "You do not have access to that company.",
      );
    }

    request.companyId = companyId;
    return true;
  }
}
