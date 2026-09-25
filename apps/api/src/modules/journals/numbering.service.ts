import { Injectable } from "@nestjs/common";
import type { Prisma } from "@zycount/db";

/**
 * Document numbering (`JV-2026-000001`).
 *
 * The counter is bumped with an atomic `UPDATE … RETURNING` inside the caller's
 * transaction, so two journals created at the same instant can never claim the
 * same reference.
 */
@Injectable()
export class NumberingService {
  async next(
    tx: Prisma.TransactionClient,
    companyId: string,
    docType: string,
    year: number,
    prefix = docType,
    padding = 6,
  ): Promise<string> {
    const rows = await tx.$queryRaw<Array<{ next: number; prefix: string; padding: number }>>`
      INSERT INTO "NumberSequence" ("id", "companyId", "docType", "year", "prefix", "padding", "next", "updatedAt")
      VALUES (gen_random_uuid(), ${companyId}::uuid, ${docType}, ${year}, ${prefix}, ${padding}, 2, NOW())
      ON CONFLICT ("companyId", "docType", "year")
      DO UPDATE SET "next" = "NumberSequence"."next" + 1, "updatedAt" = NOW()
      RETURNING ("next" - 1) AS "next", "prefix", "padding"`;

    const row = rows[0];
    return `${row.prefix}-${year}-${String(row.next).padStart(row.padding, "0")}`;
  }
}
