import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@zycount/db";
import {
  ERROR_CODES,
  ERROR_HTTP_STATUS,
  ZycountError,
  buildErrorReference,
  type ErrorEnvelope,
} from "@zycount/shared";
import type { Request, Response } from "express";
import type { ZodIssue } from "zod";

/**
 * Turns every failure into the structured envelope from docs/spec/09 §50.
 *
 * The user never sees a raw stack or a bare 500, and every envelope carries a
 * traceable `ERR-…` reference that is logged with the full context behind it.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Error");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const reference = buildErrorReference();

    const { status, envelope, logLevel } = this.describe(exception, reference, request);

    const context = {
      reference,
      method: request.method,
      path: request.originalUrl,
      status,
      code: envelope.error.code,
      userId: (request as { user?: { id?: string } }).user?.id,
      companyId: (request as { companyId?: string }).companyId,
    };

    if (logLevel === "error") {
      this.logger.error(
        `${envelope.error.code} ${JSON.stringify(context)}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${envelope.error.code} ${JSON.stringify(context)}`);
    }

    response.status(status).json(envelope);
  }

  private describe(
    exception: unknown,
    reference: string,
    request: Request,
  ): { status: number; envelope: ErrorEnvelope; logLevel: "warn" | "error" } {
    // A posting route must always tell the user whether the ledger was touched.
    const isPostingRoute = /\/(post|reverse|close|reopen)$/.test(request.path);

    if (isZycountError(exception)) {
      return {
        status: exception.status,
        envelope: {
          error: {
            code: exception.code,
            message: exception.message,
            reference,
            ...(exception.posted === undefined
              ? isPostingRoute
                ? { posted: false }
                : {}
              : { posted: exception.posted }),
            ...(exception.fields ? { fields: exception.fields } : {}),
          },
        },
        logLevel: exception.status >= 500 ? "error" : "warn",
      };
    }

    if (isZodError(exception)) {
      const fields: Record<string, string> = {};
      for (const issue of exception.issues) {
        const path = issue.path.join(".") || "_";
        if (!fields[path]) fields[path] = issue.message;
      }

      // A domain rule that happens to be checked inside a Zod schema keeps its
      // own code, so `JOURNAL_UNBALANCED` never arrives as `VALIDATION_FAILED`.
      const carried = exception.issues
        .map((issue) => ({ issue, code: carriedCode(issue) }))
        .find((entry) => entry.code !== null);

      const code = carried?.code ?? ERROR_CODES.VALIDATION_FAILED;

      return {
        status: ERROR_HTTP_STATUS[code] ?? HttpStatus.UNPROCESSABLE_ENTITY,
        envelope: {
          error: {
            code,
            message:
              carried?.issue.message ??
              exception.issues[0]?.message ??
              "Some of the details you entered are not valid.",
            reference,
            fields,
            ...(isPostingRoute ? { posted: false } : {}),
          },
        },
        logLevel: "warn",
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.describePrisma(exception, reference, isPostingRoute);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);

      return {
        status,
        envelope: {
          error: {
            code: this.codeForStatus(status),
            message: Array.isArray(message) ? message[0] : message,
            reference,
            ...(isPostingRoute ? { posted: false } : {}),
          },
        },
        logLevel: status >= 500 ? "error" : "warn",
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      envelope: {
        error: {
          code: ERROR_CODES.INTERNAL,
          message:
            "Something went wrong on our side. Nothing was changed. Quote the reference below if you contact support.",
          reference,
          ...(isPostingRoute ? { posted: false } : {}),
        },
      },
      logLevel: "error",
    };
  }

  private describePrisma(
    exception: Prisma.PrismaClientKnownRequestError,
    reference: string,
    isPostingRoute: boolean,
  ): { status: number; envelope: ErrorEnvelope; logLevel: "warn" | "error" } {
    const posted = isPostingRoute ? { posted: false } : {};

    switch (exception.code) {
      case "P2002": {
        const target = (exception.meta?.target as string[] | undefined)?.join(", ") ?? "value";
        return {
          status: HttpStatus.CONFLICT,
          envelope: {
            error: {
              code: ERROR_CODES.VALIDATION_DUPLICATE,
              message: `That ${target} is already in use. Choose a different one.`,
              reference,
              ...posted,
            },
          },
          logLevel: "warn",
        };
      }
      case "P2025":
        return {
          status: HttpStatus.NOT_FOUND,
          envelope: {
            error: {
              code: ERROR_CODES.NOT_FOUND,
              message: "That record no longer exists. It may have been removed by someone else.",
              reference,
              ...posted,
            },
          },
          logLevel: "warn",
        };
      case "P2003":
        return {
          status: HttpStatus.CONFLICT,
          envelope: {
            error: {
              code: ERROR_CODES.CONFLICT,
              message: "Another record depends on this one, so it cannot be changed or removed.",
              reference,
              ...posted,
            },
          },
          logLevel: "warn",
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          envelope: {
            error: {
              code: ERROR_CODES.INTERNAL,
              message: "The database rejected that request. Nothing was changed.",
              reference,
              ...posted,
            },
          },
          logLevel: "error",
        };
    }
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case 401:
        return ERROR_CODES.AUTH_UNAUTHENTICATED;
      case 403:
        return ERROR_CODES.PERMISSION_DENIED;
      case 404:
        return ERROR_CODES.NOT_FOUND;
      case 409:
        return ERROR_CODES.CONFLICT;
      case 422:
        return ERROR_CODES.VALIDATION_FAILED;
      case 429:
        return ERROR_CODES.RATE_LIMITED;
      default:
        return status >= 500 ? ERROR_CODES.INTERNAL : ERROR_CODES.VALIDATION_FAILED;
    }
  }
}

/**
 * Shape-based detection rather than `instanceof`.
 *
 * In a monorepo the API and `@zycount/shared` can resolve separate copies of
 * zod, and `instanceof` across two copies is false — which would turn every
 * validation failure into an opaque 500. Matching on shape is immune to that.
 */
function isZycountError(value: unknown): value is ZycountError {
  return (
    value instanceof ZycountError ||
    (typeof value === "object" &&
      value !== null &&
      (value as { name?: string }).name === "ZycountError" &&
      typeof (value as { code?: unknown }).code === "string")
  );
}

function isZodError(value: unknown): value is { issues: ZodIssue[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { name?: string }).name === "ZodError" &&
    Array.isArray((value as { issues?: unknown }).issues)
  );
}

/**
 * A Zod `custom` issue may carry a Zycount error code in its `params`. Only
 * custom issues have that field, so the union is narrowed before reading it.
 */
function carriedCode(issue: ZodIssue): string | null {
  if (issue.code !== "custom") return null;

  const params = (issue as { params?: { zycountCode?: unknown } }).params;
  return typeof params?.zycountCode === "string" ? params.zycountCode : null;
}
