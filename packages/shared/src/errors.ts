/**
 * Error model (docs/spec/09-status-validation-errors.md §50).
 *
 * Every failure leaves the API as a structured envelope with a user-safe
 * message and a traceable reference. On a posting action `posted` is mandatory:
 * the user must always know whether their transaction hit the ledger.
 */

export const ERROR_CODES = {
  // Auth
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_ACCOUNT_LOCKED: "AUTH_ACCOUNT_LOCKED",
  AUTH_ACCOUNT_INACTIVE: "AUTH_ACCOUNT_INACTIVE",
  AUTH_MFA_REQUIRED: "AUTH_MFA_REQUIRED",
  AUTH_MFA_INVALID: "AUTH_MFA_INVALID",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_REFRESH_REUSED: "AUTH_REFRESH_REUSED",
  AUTH_UNAUTHENTICATED: "AUTH_UNAUTHENTICATED",

  // Authorisation
  PERMISSION_DENIED: "PERMISSION_DENIED",
  COMPANY_ACCESS_DENIED: "COMPANY_ACCESS_DENIED",
  COMPANY_CONTEXT_REQUIRED: "COMPANY_CONTEXT_REQUIRED",

  // Validation
  VALIDATION_FAILED: "VALIDATION_FAILED",
  VALIDATION_DUPLICATE: "VALIDATION_DUPLICATE",

  // Accounting
  JOURNAL_UNBALANCED: "JOURNAL_UNBALANCED",
  JOURNAL_TOO_FEW_LINES: "JOURNAL_TOO_FEW_LINES",
  JOURNAL_LINE_TWO_SIDED: "JOURNAL_LINE_TWO_SIDED",
  JOURNAL_ZERO_TOTAL: "JOURNAL_ZERO_TOTAL",
  JOURNAL_NOT_DRAFT: "JOURNAL_NOT_DRAFT",
  JOURNAL_NOT_POSTED: "JOURNAL_NOT_POSTED",
  JOURNAL_ALREADY_REVERSED: "JOURNAL_ALREADY_REVERSED",
  JOURNAL_IMMUTABLE: "JOURNAL_IMMUTABLE",
  PERIOD_CLOSED: "PERIOD_CLOSED",
  PERIOD_NOT_FOUND_FOR_DATE: "PERIOD_NOT_FOUND_FOR_DATE",
  PERIOD_HAS_ENTRIES: "PERIOD_HAS_ENTRIES",
  PERIOD_ALREADY_CLOSED: "PERIOD_ALREADY_CLOSED",
  PERIOD_ALREADY_OPEN: "PERIOD_ALREADY_OPEN",
  PERIOD_OVERLAP: "PERIOD_OVERLAP",
  ACCOUNT_NOT_POSTABLE: "ACCOUNT_NOT_POSTABLE",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  ACCOUNT_HAS_CHILDREN: "ACCOUNT_HAS_CHILDREN",
  ACCOUNT_IN_USE: "ACCOUNT_IN_USE",
  ACCOUNT_CYCLE: "ACCOUNT_CYCLE",
  ACCOUNT_TYPE_MISMATCH: "ACCOUNT_TYPE_MISMATCH",
  POSTING_RULE_UNRESOLVED: "POSTING_RULE_UNRESOLVED",
  OVER_ALLOCATION: "OVER_ALLOCATION",

  // Platform
  CONFLICT: "CONFLICT",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  IDEMPOTENCY_MISMATCH: "IDEMPOTENCY_MISMATCH",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ErrorEnvelope {
  error: {
    code: ErrorCode | string;
    message: string;
    reference: string;
    /** Mandatory on any error raised during a posting action. */
    posted?: boolean;
    /** Field-level messages keyed by form path, for inline display. */
    fields?: Record<string, string>;
    details?: unknown;
  };
}

/** HTTP status for each code, so controllers never hand-pick one. */
export const ERROR_HTTP_STATUS: Record<string, number> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 401,
  [ERROR_CODES.AUTH_ACCOUNT_LOCKED]: 423,
  [ERROR_CODES.AUTH_ACCOUNT_INACTIVE]: 403,
  [ERROR_CODES.AUTH_MFA_REQUIRED]: 401,
  [ERROR_CODES.AUTH_MFA_INVALID]: 401,
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 401,
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 401,
  [ERROR_CODES.AUTH_REFRESH_REUSED]: 401,
  [ERROR_CODES.AUTH_UNAUTHENTICATED]: 401,
  [ERROR_CODES.PERMISSION_DENIED]: 403,
  [ERROR_CODES.COMPANY_ACCESS_DENIED]: 403,
  [ERROR_CODES.COMPANY_CONTEXT_REQUIRED]: 400,
  [ERROR_CODES.VALIDATION_FAILED]: 422,
  [ERROR_CODES.VALIDATION_DUPLICATE]: 409,
  [ERROR_CODES.JOURNAL_UNBALANCED]: 422,
  [ERROR_CODES.JOURNAL_TOO_FEW_LINES]: 422,
  [ERROR_CODES.JOURNAL_LINE_TWO_SIDED]: 422,
  [ERROR_CODES.JOURNAL_ZERO_TOTAL]: 422,
  [ERROR_CODES.JOURNAL_NOT_DRAFT]: 409,
  [ERROR_CODES.JOURNAL_NOT_POSTED]: 409,
  [ERROR_CODES.JOURNAL_ALREADY_REVERSED]: 409,
  [ERROR_CODES.JOURNAL_IMMUTABLE]: 409,
  [ERROR_CODES.PERIOD_CLOSED]: 409,
  [ERROR_CODES.PERIOD_NOT_FOUND_FOR_DATE]: 422,
  [ERROR_CODES.PERIOD_HAS_ENTRIES]: 409,
  [ERROR_CODES.PERIOD_ALREADY_CLOSED]: 409,
  [ERROR_CODES.PERIOD_ALREADY_OPEN]: 409,
  [ERROR_CODES.PERIOD_OVERLAP]: 409,
  [ERROR_CODES.ACCOUNT_NOT_POSTABLE]: 422,
  [ERROR_CODES.ACCOUNT_INACTIVE]: 422,
  [ERROR_CODES.ACCOUNT_HAS_CHILDREN]: 409,
  [ERROR_CODES.ACCOUNT_IN_USE]: 409,
  [ERROR_CODES.ACCOUNT_CYCLE]: 422,
  [ERROR_CODES.ACCOUNT_TYPE_MISMATCH]: 422,
  [ERROR_CODES.POSTING_RULE_UNRESOLVED]: 422,
  [ERROR_CODES.OVER_ALLOCATION]: 422,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.IDEMPOTENCY_MISMATCH]: 409,
  [ERROR_CODES.INTERNAL]: 500,
};

/**
 * `ERR-YYYYMMDD-NNNNN` — quoted to the user and logged with full context so
 * support can trace any failure end to end.
 */
export function buildErrorReference(now: Date = new Date()): string {
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const serial = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  return `ERR-${stamp}-${serial}`;
}

export interface ZycountErrorOptions {
  posted?: boolean;
  fields?: Record<string, string>;
  details?: unknown;
  reference?: string;
}

/** Domain error carrying everything the envelope needs. */
export class ZycountError extends Error {
  readonly code: ErrorCode | string;
  readonly status: number;
  readonly posted?: boolean;
  readonly fields?: Record<string, string>;
  readonly details?: unknown;
  readonly reference: string;

  constructor(code: ErrorCode | string, message: string, options: ZycountErrorOptions = {}) {
    super(message);
    this.name = "ZycountError";
    this.code = code;
    this.status = ERROR_HTTP_STATUS[code] ?? 400;
    this.posted = options.posted;
    this.fields = options.fields;
    this.details = options.details;
    this.reference = options.reference ?? buildErrorReference();
  }

  toEnvelope(): ErrorEnvelope {
    return {
      error: {
        code: this.code,
        message: this.message,
        reference: this.reference,
        ...(this.posted === undefined ? {} : { posted: this.posted }),
        ...(this.fields ? { fields: this.fields } : {}),
        ...(this.details === undefined ? {} : { details: this.details }),
      },
    };
  }
}

export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ErrorEnvelope).error?.code === "string"
  );
}
