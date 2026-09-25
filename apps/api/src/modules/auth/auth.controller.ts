import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  changePasswordSchema,
  loginSchema,
  mfaEnrolConfirmSchema,
  mfaVerifySchema,
  type AuthUser,
  type LoginResponse,
} from "@zycount/shared";
import { z } from "zod";
import type { Request, Response } from "express";
import { ClientInfo, CurrentUser, Public } from "../../common/decorators";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { zodBody } from "../../common/pipes/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";

const REFRESH_COOKIE = "zycount_refresh";

/** Sign-in attempts allowed per minute per address. */
const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT ?? 10);

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  /** Rate limited hard — this is the endpoint credential stuffing aims at. */
  @Public()
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: 60_000 } })
  @Post("login")
  @HttpCode(200)
  async login(
    @Body(zodBody(loginSchema)) body: z.infer<typeof loginSchema>,
    @ClientInfo() client: ClientContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { response: payload, refreshToken } = await this.auth.login(body, client);
    if (refreshToken) {
      response.cookie(REFRESH_COOKIE, refreshToken, this.tokens.refreshCookieOptions);
    }
    return payload;
  }

  @Public()
  @Throttle({ default: { limit: AUTH_RATE_LIMIT, ttl: 60_000 } })
  @Post("mfa/verify")
  @HttpCode(200)
  async verifyMfa(
    @Body(zodBody(mfaVerifySchema)) body: z.infer<typeof mfaVerifySchema>,
    @ClientInfo() client: ClientContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const { response: payload, refreshToken } = await this.auth.verifyMfa(body, client);
    if (refreshToken) {
      response.cookie(REFRESH_COOKIE, refreshToken, this.tokens.refreshCookieOptions);
    }
    return payload;
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @ClientInfo() client: ClientContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const raw = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    const { response: payload, refreshToken } = await this.auth.refresh(raw, client);
    response.cookie(REFRESH_COOKIE, refreshToken, this.tokens.refreshCookieOptions);
    return payload;
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @ClientInfo() client: ClientContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const raw = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    const user = (request as Request & { user?: AuthenticatedUser }).user;
    await this.auth.logout(raw, user?.id ?? null, client);
    response.clearCookie(REFRESH_COOKIE, { ...this.tokens.refreshCookieOptions, maxAge: undefined });
  }

  @Get("me")
  me(@CurrentUser("id") userId: string): Promise<AuthUser> {
    return this.auth.me(userId);
  }

  @Post("password")
  @HttpCode(204)
  changePassword(
    @CurrentUser("id") userId: string,
    @Body(zodBody(changePasswordSchema)) body: z.infer<typeof changePasswordSchema>,
    @ClientInfo() client: ClientContext,
  ): Promise<void> {
    return this.auth.changePassword(userId, body, client);
  }

  @Post("mfa/enrol")
  @HttpCode(200)
  beginMfa(@CurrentUser("id") userId: string) {
    return this.auth.beginMfaEnrolment(userId);
  }

  @Post("mfa/enrol/confirm")
  @HttpCode(200)
  confirmMfa(
    @CurrentUser("id") userId: string,
    @Body(zodBody(mfaEnrolConfirmSchema)) body: z.infer<typeof mfaEnrolConfirmSchema>,
    @ClientInfo() client: ClientContext,
  ) {
    return this.auth.confirmMfaEnrolment(userId, body.code, client);
  }

  @Post("mfa/disable")
  @HttpCode(204)
  disableMfa(
    @CurrentUser("id") userId: string,
    @Body(zodBody(z.object({ password: z.string().min(1) }))) body: { password: string },
    @ClientInfo() client: ClientContext,
  ): Promise<void> {
    return this.auth.disableMfa(userId, body.password, client);
  }

  @Get("sessions")
  sessions(@CurrentUser("id") userId: string) {
    return this.auth.listSessions(userId);
  }

  @Delete("sessions/:id")
  @HttpCode(204)
  revokeSession(@CurrentUser("id") userId: string, @Param("id") sessionId: string): Promise<void> {
    return this.auth.revokeSession(userId, sessionId);
  }

  @Get("login-history")
  loginHistory(@CurrentUser("id") userId: string) {
    return this.auth.loginHistory(userId);
  }
}
