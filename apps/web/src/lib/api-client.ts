import { isErrorEnvelope, type ErrorEnvelope } from "@zycount/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/**
 * The error the UI renders (docs/spec/09 §50).
 *
 * `posted` is the field that matters most: after a failed posting action the
 * user must be told plainly whether their transaction reached the ledger.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly reference: string;
  readonly posted?: boolean;
  readonly fields?: Record<string, string>;

  constructor(status: number, envelope: ErrorEnvelope) {
    super(envelope.error.message);
    this.name = "ApiError";
    this.status = status;
    this.code = envelope.error.code;
    this.reference = envelope.error.reference;
    this.posted = envelope.error.posted;
    this.fields = envelope.error.fields;
  }

  /** `true` when the user can fix this themselves by editing the form. */
  get isFieldError(): boolean {
    return Boolean(this.fields && Object.keys(this.fields).length > 0);
  }
}

/** Thrown when the network itself fails, which is not the server's fault. */
export class NetworkError extends Error {
  constructor(message = "We could not reach Zycount. Check your connection and try again.") {
    super(message);
    this.name = "NetworkError";
  }
}

let accessToken: string | null = null;
let currentCompanyId: string | null = null;
let onUnauthenticated: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setCompanyContext(companyId: string | null): void {
  currentCompanyId = companyId;
}

export function setUnauthenticatedHandler(handler: (() => void) | null): void {
  onUnauthenticated = handler;
}

/**
 * A single in-flight refresh shared by every caller, so a burst of parallel
 * requests hitting an expired token produces one refresh, not a stampede.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) return false;

      const body = (await response.json()) as { accessToken?: string };
      if (!body.accessToken) return false;

      accessToken = body.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      // Cleared on the next tick so callers awaiting this promise all see the
      // same result before a new refresh can start.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the company header — used by routes that are not company-scoped. */
  skipCompany?: boolean;
  /** De-duplicates a posting request if it is retried (docs/spec/05). */
  idempotencyKey?: string;
  searchParams?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { body, skipCompany, idempotencyKey, searchParams, headers, ...init } = options;

  const url = new URL(`${API_URL}/api${path}`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");
  if (accessToken) requestHeaders.set("Authorization", `Bearer ${accessToken}`);
  if (!skipCompany && currentCompanyId) requestHeaders.set("X-Company-Id", currentCompanyId);
  if (idempotencyKey) requestHeaders.set("Idempotency-Key", idempotencyKey);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...init,
      headers: requestHeaders,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload: unknown = text ? JSON.parse(text) : null;

  if (response.ok) return payload as T;

  // An expired access token is refreshed once, transparently, then retried.
  if (response.status === 401 && !isRetry && isErrorEnvelope(payload)) {
    const expired = payload.error.code === "AUTH_TOKEN_EXPIRED";

    if (expired && (await refreshAccessToken())) {
      return request<T>(path, options, true);
    }

    if (payload.error.code !== "AUTH_INVALID_CREDENTIALS") {
      onUnauthenticated?.();
    }
  }

  if (isErrorEnvelope(payload)) throw new ApiError(response.status, payload);

  throw new ApiError(response.status, {
    error: {
      code: "INTERNAL",
      message: "Something went wrong. Please try again.",
      reference: "ERR-CLIENT-00000",
    },
  });
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

/** Builds a download URL for a report export, carrying the session token. */
export function exportUrl(path: string, params: Record<string, string | undefined>): string {
  const url = new URL(`${API_URL}/api${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export { API_URL };
