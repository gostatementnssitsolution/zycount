import { Injectable, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

/**
 * Validates request bodies and queries against the **same** Zod schemas the web
 * app uses (docs/spec/09) — a rule can never drift between client and server.
 * `ZodError` is shaped into the error envelope by `AllExceptionsFilter`.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    return this.schema.parse(value);
  }
}

/** `@Body(zodBody(createJournalSchema))` reads better at the call site. */
export function zodBody(schema: ZodSchema): ZodValidationPipe {
  return new ZodValidationPipe(schema);
}

export function zodQuery(schema: ZodSchema): ZodValidationPipe {
  return new ZodValidationPipe(schema);
}
