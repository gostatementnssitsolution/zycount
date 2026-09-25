import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ERROR_CODES, PERMISSION_DESCRIPTIONS, ZycountError, hasPermission } from "@zycount/shared";
import type { Request } from "express";
import { PERMISSIONS_KEY } from "../decorators";
import type { AuthenticatedUser } from "./types";

/**
 * Enforces `@RequirePermission(...)` on every guarded route. The UI hides
 * controls by the same codes, but this guard is the authority (docs/spec/06).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ZycountError(ERROR_CODES.AUTH_UNAUTHENTICATED, "Please sign in to continue.");
    }

    if (!hasPermission(user.permissions, ...required)) {
      const missing = required.find((code) => !user.permissions.includes(code));
      const label = missing
        ? (PERMISSION_DESCRIPTIONS[missing as keyof typeof PERMISSION_DESCRIPTIONS] ?? missing)
        : "this action";

      throw new ZycountError(
        ERROR_CODES.PERMISSION_DENIED,
        `Your role does not allow you to ${label.charAt(0).toLowerCase()}${label.slice(1)}. Ask an administrator for access.`,
        { details: { required, missing } },
      );
    }

    return true;
  }
}
