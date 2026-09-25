import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ERROR_CODES, ZycountError, type AccessTokenClaims } from "@zycount/shared";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators";
import type { AuthenticatedUser } from "./types";

/**
 * Verifies the short-lived JWT access token and attaches the caller to the
 * request. Routes opt out with `@Public()` (docs/spec/06 — Sessions).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      throw new ZycountError(
        ERROR_CODES.AUTH_UNAUTHENTICATED,
        "Please sign in to continue.",
      );
    }

    const token = header.slice("Bearer ".length).trim();

    let claims: AccessTokenClaims;
    try {
      claims = this.jwt.verify<AccessTokenClaims>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
    } catch (error) {
      const expired = (error as { name?: string }).name === "TokenExpiredError";
      throw new ZycountError(
        expired ? ERROR_CODES.AUTH_TOKEN_EXPIRED : ERROR_CODES.AUTH_TOKEN_INVALID,
        expired
          ? "Your session has expired. Sign in again to continue."
          : "That session is no longer valid. Sign in again to continue.",
      );
    }

    request.user = {
      id: claims.sub,
      email: claims.email,
      name: "",
      organizationId: claims.organizationId,
      roles: claims.roles ?? [],
      permissions: claims.permissions ?? [],
      companies: claims.companies ?? [],
    };

    return true;
  }
}
