import { Reflector } from "@nestjs/core";
import { ERROR_CODES, PERMISSIONS, ZycountError } from "@zycount/shared";
import { describe, expect, it } from "vitest";
import { CompanyScopeGuard } from "../guards/company-scope.guard";
import { PermissionsGuard } from "../guards/permissions.guard";
import { zodBody } from "../pipes/zod-validation.pipe";
import { createJournalSchema } from "@zycount/shared";

/**
 * The guards are the authority on who may do what, and in which company. The
 * UI hides controls by the same codes, but nothing relies on the UI having
 * done so (docs/spec/05, docs/spec/06).
 */

function contextFor(request: unknown) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as never;
}

/** A Reflector that answers with whatever the route is said to require. */
function reflectorReturning(value: unknown): Reflector {
  return { getAllAndOverride: () => value } as unknown as Reflector;
}

describe("PermissionsGuard", () => {
  const required = [PERMISSIONS.JOURNAL_POST];

  it("lets an unguarded route through", () => {
    const guard = new PermissionsGuard(reflectorReturning(undefined));
    expect(guard.canActivate(contextFor({}))).toBe(true);
  });

  it("allows a user holding the permission", () => {
    const guard = new PermissionsGuard(reflectorReturning(required));
    const request = { user: { id: "u1", permissions: [PERMISSIONS.JOURNAL_POST], companies: [] } };
    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it("refuses a user who is signed in but lacks it", () => {
    const guard = new PermissionsGuard(reflectorReturning(required));
    const request = { user: { id: "u1", permissions: [PERMISSIONS.JOURNAL_VIEW], companies: [] } };

    expect(() => guard.canActivate(contextFor(request))).toThrowError(ZycountError);
    try {
      guard.canActivate(contextFor(request));
    } catch (error) {
      expect((error as ZycountError).code).toBe(ERROR_CODES.PERMISSION_DENIED);
      expect((error as ZycountError).details).toMatchObject({ missing: PERMISSIONS.JOURNAL_POST });
    }
  });

  it("refuses an anonymous caller before it looks at permissions", () => {
    const guard = new PermissionsGuard(reflectorReturning(required));
    try {
      guard.canActivate(contextFor({}));
      throw new Error("the guard should have refused");
    } catch (error) {
      expect((error as ZycountError).code).toBe(ERROR_CODES.AUTH_UNAUTHENTICATED);
    }
  });

  it("requires every permission a route asks for, not just one", () => {
    const guard = new PermissionsGuard(
      reflectorReturning([PERMISSIONS.JOURNAL_POST, PERMISSIONS.PERIOD_CLOSE]),
    );
    const request = { user: { id: "u1", permissions: [PERMISSIONS.JOURNAL_POST], companies: [] } };
    expect(() => guard.canActivate(contextFor(request))).toThrowError(ZycountError);
  });
});

describe("CompanyScopeGuard", () => {
  const guard = () => new CompanyScopeGuard(reflectorReturning(true));
  const company = "8f14e45f-ceea-467a-9f43-7a2ec0b6f1f1";
  const other = "1d2f3a4b-5c6d-4e7f-8a9b-0c1d2e3f4a5b";

  it("takes the company from the path and puts it on the request", () => {
    const request = { params: { companyId: company }, headers: {}, user: { companies: [company] } };
    expect(guard().canActivate(contextFor(request))).toBe(true);
    expect((request as { companyId?: string }).companyId).toBe(company);
  });

  it("falls back to the X-Company-Id header", () => {
    const request = { params: {}, headers: { "x-company-id": company }, user: { companies: [company] } };
    expect(guard().canActivate(contextFor(request))).toBe(true);
    expect((request as { companyId?: string }).companyId).toBe(company);
  });

  it("refuses a company the user was not granted", () => {
    const request = { params: { companyId: other }, headers: {}, user: { companies: [company] } };
    try {
      guard().canActivate(contextFor(request));
      throw new Error("the guard should have refused");
    } catch (error) {
      expect((error as ZycountError).code).toBe(ERROR_CODES.COMPANY_ACCESS_DENIED);
    }
  });

  it("says the same thing whether the company is unknown or merely out of reach", () => {
    const unknown = { params: { companyId: "00000000-0000-4000-8000-000000000000" }, headers: {}, user: { companies: [company] } };
    const forbidden = { params: { companyId: other }, headers: {}, user: { companies: [company] } };

    const messages = [unknown, forbidden].map((request) => {
      try {
        guard().canActivate(contextFor(request));
        return "allowed";
      } catch (error) {
        return (error as ZycountError).message;
      }
    });

    expect(messages[0]).toBe(messages[1]);
  });

  it("asks for a company when none was given", () => {
    try {
      guard().canActivate(contextFor({ params: {}, headers: {}, user: { companies: [company] } }));
      throw new Error("the guard should have refused");
    } catch (error) {
      expect((error as ZycountError).code).toBe(ERROR_CODES.COMPANY_CONTEXT_REQUIRED);
    }
  });

  it("leaves a route alone when it is not company-scoped", () => {
    const open = new CompanyScopeGuard(reflectorReturning(false));
    expect(open.canActivate(contextFor({ params: {}, headers: {} }))).toBe(true);
  });
});

describe("ZodValidationPipe", () => {
  const pipe = zodBody(createJournalSchema);
  const line = (accountId: string, debit: string, credit: string) => ({ accountId, debit, credit });
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";

  it("returns the parsed value, defaults filled in", () => {
    const parsed = pipe.transform({
      date: "2026-08-31",
      lines: [line(a, "100.00", "0.00"), line(b, "0.00", "100.00")],
    }) as { source: string };

    expect(parsed.source).toBe("MANUAL");
  });

  it("rejects an entry that does not balance", () => {
    expect(() =>
      pipe.transform({
        date: "2026-08-31",
        lines: [line(a, "100.00", "0.00"), line(b, "0.00", "99.99")],
      }),
    ).toThrowError();
  });

  it("rejects a single-sided entry", () => {
    expect(() => pipe.transform({ date: "2026-08-31", lines: [line(a, "100.00", "0.00")] })).toThrowError();
  });
});
