import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { Observable, tap } from "rxjs";
import type { AuthenticatedUser } from "../guards/types";

/**
 * Structured request logging with a correlation id, so a slow or failing
 * request can be traced across API and workers (docs/spec/14 — Observability).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser; companyId?: string; correlationId?: string }>();

    const correlationId =
      (request.headers["x-correlation-id"] as string | undefined) ?? randomUUID();
    request.correlationId = correlationId;
    context.switchToHttp().getResponse().setHeader("X-Correlation-Id", correlationId);

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(request, context, correlationId, startedAt),
        error: () => this.log(request, context, correlationId, startedAt),
      }),
    );
  }

  private log(
    request: Request & { user?: AuthenticatedUser; companyId?: string },
    context: ExecutionContext,
    correlationId: string,
    startedAt: number,
  ): void {
    const status = context.switchToHttp().getResponse().statusCode;
    const duration = Date.now() - startedAt;

    this.logger.log(
      JSON.stringify({
        correlationId,
        method: request.method,
        path: request.originalUrl,
        status,
        durationMs: duration,
        userId: request.user?.id ?? null,
        companyId: request.companyId ?? null,
      }),
    );
  }
}
