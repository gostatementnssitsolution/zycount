import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Prisma } from "@zycount/db";
import { ERROR_CODES, ZycountError, createJournalSchema } from "@zycount/shared";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AllExceptionsFilter } from "../filters/all-exceptions.filter";

/**
 * The error envelope is a contract the web app reads on every failure
 * (docs/spec/09 §50): a stable code, a sentence a person can act on, a
 * traceable reference, and — on a posting route — whether the ledger moved.
 */

beforeAll(() => {
  vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
});

function run(exception: unknown, path = "/api/v1/journals") {
  const json = vi.fn<(body: unknown) => void>();
  const status = vi.fn<(code: number) => { json: typeof json }>(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: "POST", path, originalUrl: path }),
    }),
  };

  new AllExceptionsFilter().catch(exception, host as never);

  return {
    status: status.mock.calls[0]?.[0] as number | undefined,
    body: json.mock.calls[0]?.[0] as {
      error: { code: string; message: string; reference: string; posted?: boolean; fields?: Record<string, string> };
    },
  };
}

describe("the error envelope", () => {
  it("carries a domain error through with its own code and status", () => {
    const { status, body } = run(
      new ZycountError(ERROR_CODES.PERIOD_CLOSED, "January 2026 is closed."),
    );

    expect(body.error.code).toBe(ERROR_CODES.PERIOD_CLOSED);
    expect(body.error.message).toBe("January 2026 is closed.");
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it("gives every failure a reference the user can quote", () => {
    const { body } = run(new Error("boom"));
    expect(body.error.reference).toMatch(/^ERR-/);
  });

  it("never leaks an unexpected error's message", () => {
    const { status, body } = run(new Error("connect ECONNREFUSED 10.0.0.5:5432"));

    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.error.code).toBe(ERROR_CODES.INTERNAL);
    expect(body.error.message).not.toContain("ECONNREFUSED");
  });

  it("says the ledger did not move when a posting route fails", () => {
    expect(run(new Error("boom"), "/api/v1/journals/abc/post").body.error.posted).toBe(false);
    expect(run(new Error("boom"), "/api/v1/journals/abc/reverse").body.error.posted).toBe(false);
    expect(run(new Error("boom"), "/api/v1/periods/abc/close").body.error.posted).toBe(false);
  });

  it("leaves `posted` off a route that never touches the ledger", () => {
    expect(run(new Error("boom"), "/api/v1/accounts").body.error.posted).toBeUndefined();
  });

  it("keeps a domain code that a Zod schema carries, rather than flattening it", () => {
    const unbalanced = createJournalSchema.safeParse({
      date: "2026-08-31",
      description: "Unbalanced on purpose",
      lines: [
        { accountId: "11111111-1111-4111-8111-111111111111", debit: "100.00", credit: "0.00" },
        { accountId: "22222222-2222-4222-8222-222222222222", debit: "0.00", credit: "90.00" },
      ],
    });

    expect(unbalanced.success).toBe(false);
    if (unbalanced.success) return;

    const { body } = run(unbalanced.error);
    expect(body.error.code).toBe(ERROR_CODES.JOURNAL_UNBALANCED);
    expect(body.error.code).not.toBe(ERROR_CODES.VALIDATION_FAILED);
  });

  it("names the field that failed so the form can point at it", () => {
    const bad = createJournalSchema.safeParse({ date: "not-a-date", lines: [] });
    expect(bad.success).toBe(false);
    if (bad.success) return;

    const { status, body } = run(bad.error);
    expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(Object.keys(body.error.fields ?? {}).length).toBeGreaterThan(0);
  });

  it("turns a duplicate key into a message about the value, not the constraint", () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "5.22.0",
      meta: { target: ["code"] },
    });

    const { status, body } = run(duplicate);
    expect(status).toBe(HttpStatus.CONFLICT);
    expect(body.error.code).toBe(ERROR_CODES.VALIDATION_DUPLICATE);
    expect(body.error.message).toContain("code");
  });

  it("turns a missing record into a 404 rather than a 500", () => {
    const missing = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "5.22.0",
    });

    expect(run(missing).status).toBe(HttpStatus.NOT_FOUND);
    expect(run(missing).body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  it("passes a framework HttpException through at its own status", () => {
    const { status } = run(new HttpException("Too many requests", HttpStatus.TOO_MANY_REQUESTS));
    expect(status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });

  it("recognises a domain error by shape, so a duplicate module copy still maps", () => {
    const lookalike = Object.assign(new Error("Period is closed."), {
      name: "ZycountError",
      code: ERROR_CODES.PERIOD_CLOSED,
      status: 409,
    });

    const { status, body } = run(lookalike);
    expect(status).toBe(409);
    expect(body.error.code).toBe(ERROR_CODES.PERIOD_CLOSED);
  });
});
