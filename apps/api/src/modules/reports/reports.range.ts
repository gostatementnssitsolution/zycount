import { ERROR_CODES, ZycountError, type ReportRangeQuery } from "@zycount/shared";
import type { PrismaService } from "../../common/prisma/prisma.service";
import { formatIsoDate, parseIsoDate } from "../../common/util/dates";

export interface ResolvedRange {
  from: Date;
  to: Date;
  label: string;
  /** The range immediately before this one, of equal length. */
  previous: { from: Date; to: Date; label: string } | null;
}

/**
 * Every report runs over an explicit range. A fiscal period id is the usual
 * way in; an arbitrary date range is supported for ad-hoc analysis.
 */
export async function resolveRange(
  prisma: PrismaService,
  companyId: string,
  query: ReportRangeQuery,
): Promise<ResolvedRange> {
  let from: Date;
  let to: Date;
  let label: string;

  if (query.fiscalPeriodId) {
    const period = await prisma.fiscalPeriod.findFirst({
      where: { id: query.fiscalPeriodId, companyId },
    });

    if (!period) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That fiscal period does not exist in this company.");
    }

    from = query.dateFrom ? parseIsoDate(query.dateFrom) : period.startDate;
    to = period.endDate;
    label = period.name;
  } else {
    to = parseIsoDate(query.dateTo!);
    // With no start date the report runs year-to-date, which is what an
    // accountant means by "as at" for a P&L.
    from = query.dateFrom
      ? parseIsoDate(query.dateFrom)
      : new Date(Date.UTC(to.getUTCFullYear(), 0, 1));
    label = `${formatIsoDate(from)} – ${formatIsoDate(to)}`;
  }

  let previous: ResolvedRange["previous"] = null;

  if (query.comparePrevious) {
    const lengthMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 86_400_000);
    const previousFrom = new Date(previousTo.getTime() - lengthMs);

    // Prefer the named period immediately before this one, so the column reads
    // "December 2025" rather than a raw date range.
    const priorPeriod = query.fiscalPeriodId
      ? await prisma.fiscalPeriod.findFirst({
          where: { companyId, endDate: { lt: from } },
          orderBy: { endDate: "desc" },
        })
      : null;

    previous = priorPeriod
      ? { from: priorPeriod.startDate, to: priorPeriod.endDate, label: priorPeriod.name }
      : {
          from: previousFrom,
          to: previousTo,
          label: `${formatIsoDate(previousFrom)} – ${formatIsoDate(previousTo)}`,
        };
  }

  return { from, to, label, previous };
}
