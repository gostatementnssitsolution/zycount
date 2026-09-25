import { Injectable } from "@nestjs/common";
import type { FiscalPeriod, Prisma } from "@zycount/db";
import {
  ERROR_CODES,
  ZycountError,
  checkBalance,
  type CreatePeriodInput,
  type FiscalPeriodDto,
  type GeneratePeriodsInput,
  type PeriodCloseCheck,
  type PeriodCloseReadiness,
} from "@zycount/shared";
import { AuditService } from "../../common/audit/audit.service";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MONTH_NAMES, formatIsoDate, monthEnd, parseIsoDate } from "../../common/util/dates";
import { decimalToString } from "../../common/util/money";

@Injectable()
export class PeriodsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(period: FiscalPeriod, journalCount?: number): FiscalPeriodDto {
    return {
      id: period.id,
      companyId: period.companyId,
      name: period.name,
      year: period.year,
      periodNo: period.periodNo,
      startDate: formatIsoDate(period.startDate),
      endDate: formatIsoDate(period.endDate),
      status: period.status,
      closedAt: period.closedAt?.toISOString() ?? null,
      closedBy: period.closedBy,
      reopenedAt: period.reopenedAt?.toISOString() ?? null,
      ...(journalCount === undefined ? {} : { journalCount }),
    };
  }

  async list(companyId: string, year?: number): Promise<FiscalPeriodDto[]> {
    const periods = await this.prisma.fiscalPeriod.findMany({
      where: { companyId, ...(year ? { year } : {}) },
      orderBy: [{ year: "asc" }, { periodNo: "asc" }],
      include: { _count: { select: { journalEntries: true } } },
    });

    return periods.map((period) => this.toDto(period, period._count.journalEntries));
  }

  async findOne(companyId: string, id: string): Promise<FiscalPeriodDto> {
    const period = await this.prisma.fiscalPeriod.findFirst({
      where: { id, companyId },
      include: { _count: { select: { journalEntries: true } } },
    });
    if (!period) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That fiscal period does not exist in this company.");
    }
    return this.toDto(period, period._count.journalEntries);
  }

  /**
   * Resolve the period a transaction date belongs to. Posting refuses any date
   * with no period, rather than inventing one — a gap in the calendar is a
   * setup problem the user must see (docs/spec/09).
   */
  async resolveForDate(
    companyId: string,
    date: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<FiscalPeriod> {
    const client = tx ?? this.prisma;
    const period = await client.fiscalPeriod.findFirst({
      where: { companyId, startDate: { lte: date }, endDate: { gte: date } },
    });

    if (!period) {
      throw new ZycountError(
        ERROR_CODES.PERIOD_NOT_FOUND_FOR_DATE,
        `No fiscal period covers ${formatIsoDate(date)}. Create the period before posting to that date.`,
        { posted: false, fields: { date: "No open period covers this date." } },
      );
    }

    return period;
  }

  async create(
    companyId: string,
    input: CreatePeriodInput,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<FiscalPeriodDto> {
    const startDate = parseIsoDate(input.startDate);
    const endDate = parseIsoDate(input.endDate);

    await this.assertNoOverlap(companyId, startDate, endDate);

    const period = await this.prisma.fiscalPeriod.create({
      data: {
        companyId,
        name: input.name,
        year: input.year,
        periodNo: input.periodNo,
        startDate,
        endDate,
      },
    });

    await this.audit.record({
      userId: user.id,
      companyId,
      action: "period.create",
      entityType: "FiscalPeriod",
      entityId: period.id,
      metadata: { name: period.name, startDate: input.startDate, endDate: input.endDate },
      client,
    });

    return this.toDto(period);
  }

  /** Generate a whole fiscal year in one step (onboarding wizard, step 2). */
  async generate(
    companyId: string,
    input: GeneratePeriodsInput,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<FiscalPeriodDto[]> {
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { fiscalYearStartMonth: true },
    });

    const startMonth = input.startMonth ?? company.fiscalYearStartMonth;
    const monthsPerPeriod = 12 / input.periodsPerYear;
    const created: FiscalPeriodDto[] = [];

    for (let index = 0; index < input.periodsPerYear; index += 1) {
      // A fiscal year starting in, say, July runs July→June, so the calendar
      // year rolls over mid-way through the period numbering.
      const absoluteMonth = startMonth + index * monthsPerPeriod;
      const calendarYear = input.year + Math.floor((absoluteMonth - 1) / 12);
      const month = ((absoluteMonth - 1) % 12) + 1;

      const endAbsoluteMonth = absoluteMonth + monthsPerPeriod - 1;
      const endCalendarYear = input.year + Math.floor((endAbsoluteMonth - 1) / 12);
      const endMonth = ((endAbsoluteMonth - 1) % 12) + 1;

      const startDate = new Date(Date.UTC(calendarYear, month - 1, 1));
      const endDate = monthEnd(endCalendarYear, endMonth);

      const name =
        monthsPerPeriod === 1
          ? `${MONTH_NAMES[month - 1]} ${calendarYear}`
          : `Q${index + 1} ${input.year}`;

      const existing = await this.prisma.fiscalPeriod.findUnique({
        where: { companyId_year_periodNo: { companyId, year: input.year, periodNo: index + 1 } },
      });

      if (existing) {
        created.push(this.toDto(existing));
        continue;
      }

      const period = await this.prisma.fiscalPeriod.create({
        data: {
          companyId,
          name,
          year: input.year,
          periodNo: index + 1,
          startDate,
          endDate,
        },
      });

      created.push(this.toDto(period));
    }

    await this.audit.record({
      userId: user.id,
      companyId,
      action: "period.generate",
      entityType: "FiscalPeriod",
      metadata: { year: input.year, periodsPerYear: input.periodsPerYear, created: created.length },
      client,
    });

    return created;
  }

  /**
   * Month-end checklist (docs/spec/08 §31). Phase 1 checks what the core
   * ledger can prove; bank, AR, AP and inventory reconciliation join as their
   * modules land in Phase 2 and 3.
   */
  async closeReadiness(companyId: string, periodId: string): Promise<PeriodCloseReadiness> {
    const period = await this.prisma.fiscalPeriod.findFirst({ where: { id: periodId, companyId } });
    if (!period) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That fiscal period does not exist in this company.");
    }

    const [draftCount, lines, unbalanced] = await Promise.all([
      this.prisma.journalEntry.count({
        where: { companyId, fiscalPeriodId: periodId, status: "DRAFT" },
      }),
      this.prisma.journalLine.aggregate({
        where: { journalEntry: { companyId, fiscalPeriodId: periodId, status: { in: ["POSTED", "REVERSED"] } } },
        _sum: { debit: true, credit: true },
      }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT je.id
          FROM "JournalEntry" je
          JOIN "JournalLine" jl ON jl."journalEntryId" = je.id
          WHERE je."companyId" = ${companyId}::uuid
            AND je."fiscalPeriodId" = ${periodId}::uuid
            AND je.status IN ('POSTED', 'REVERSED')
          GROUP BY je.id
          HAVING SUM(jl.debit) <> SUM(jl.credit)
        ) unbalanced`,
    ]);

    const totalDebit = decimalToString(lines._sum.debit);
    const totalCredit = decimalToString(lines._sum.credit);
    const balance = checkBalance([{ accountId: "-", debit: totalDebit, credit: totalCredit }]);
    const unbalancedCount = Number(unbalanced[0]?.count ?? 0n);

    const checks: PeriodCloseCheck[] = [
      {
        key: "period_open",
        label: "Period is open",
        passed: period.status === "OPEN",
        detail: period.status === "OPEN" ? "Ready to close." : "This period is already closed.",
        blocking: true,
      },
      {
        key: "no_drafts",
        label: "No draft journals left",
        passed: draftCount === 0,
        detail:
          draftCount === 0
            ? "Every journal in this period has been posted."
            : `${draftCount} draft journal${draftCount === 1 ? "" : "s"} still need posting or deleting.`,
        blocking: true,
      },
      {
        key: "entries_balanced",
        label: "Every posted journal balances",
        passed: unbalancedCount === 0,
        detail:
          unbalancedCount === 0
            ? "All posted entries balance to the cent."
            : `${unbalancedCount} posted entr${unbalancedCount === 1 ? "y does" : "ies do"} not balance.`,
        blocking: true,
      },
      {
        key: "ledger_balanced",
        label: "Period ledger balances",
        passed: totalDebit === totalCredit,
        detail:
          totalDebit === totalCredit
            ? `Debits and credits both total ${totalDebit}.`
            : `Debits ${totalDebit} do not match credits ${totalCredit} (difference ${balance.difference}).`,
        blocking: true,
      },
    ];

    const passed = checks.filter((check) => check.passed).length;

    return {
      periodId,
      ready: checks.every((check) => check.passed || !check.blocking),
      completion: Math.round((passed / checks.length) * 100),
      checks,
    };
  }

  async close(
    companyId: string,
    periodId: string,
    options: { override: boolean; note?: string },
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<FiscalPeriodDto> {
    const period = await this.prisma.fiscalPeriod.findFirst({ where: { id: periodId, companyId } });
    if (!period) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That fiscal period does not exist in this company.");
    }

    if (period.status === "CLOSED") {
      throw new ZycountError(
        ERROR_CODES.PERIOD_ALREADY_CLOSED,
        `${period.name} is already closed.`,
        { posted: false },
      );
    }

    const readiness = await this.closeReadiness(companyId, periodId);
    const blockers = readiness.checks.filter((check) => check.blocking && !check.passed);

    // An override is allowed — and audited — but it is never silent.
    if (blockers.length > 0 && !options.override) {
      throw new ZycountError(
        ERROR_CODES.PERIOD_HAS_ENTRIES,
        `${period.name} is not ready to close: ${blockers[0].detail}`,
        { posted: false, details: { blockers } },
      );
    }

    const updated = await this.prisma.fiscalPeriod.update({
      where: { id: periodId },
      data: { status: "CLOSED", closedAt: new Date(), closedBy: user.id },
    });

    await this.audit.record({
      userId: user.id,
      companyId,
      action: "period.close",
      entityType: "FiscalPeriod",
      entityId: periodId,
      metadata: {
        name: period.name,
        override: options.override,
        note: options.note ?? null,
        blockers: blockers.map((blocker) => blocker.key),
      },
      client,
    });

    return this.toDto(updated);
  }

  async reopen(
    companyId: string,
    periodId: string,
    reason: string,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<FiscalPeriodDto> {
    const period = await this.prisma.fiscalPeriod.findFirst({ where: { id: periodId, companyId } });
    if (!period) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That fiscal period does not exist in this company.");
    }

    if (period.status === "OPEN") {
      throw new ZycountError(
        ERROR_CODES.PERIOD_ALREADY_OPEN,
        `${period.name} is already open.`,
        { posted: false },
      );
    }

    const updated = await this.prisma.fiscalPeriod.update({
      where: { id: periodId },
      data: { status: "OPEN", reopenedAt: new Date(), reopenedBy: user.id },
    });

    // Reopening a closed period is one of the most sensitive actions in the
    // product, so the reason is mandatory and recorded verbatim.
    await this.audit.record({
      userId: user.id,
      companyId,
      action: "period.reopen",
      entityType: "FiscalPeriod",
      entityId: periodId,
      metadata: {
        name: period.name,
        reason,
        closedAt: period.closedAt?.toISOString() ?? null,
        closedBy: period.closedBy,
      },
      client,
    });

    return this.toDto(updated);
  }

  private async assertNoOverlap(companyId: string, startDate: Date, endDate: Date): Promise<void> {
    const overlapping = await this.prisma.fiscalPeriod.findFirst({
      where: { companyId, startDate: { lte: endDate }, endDate: { gte: startDate } },
    });

    if (overlapping) {
      throw new ZycountError(
        ERROR_CODES.PERIOD_OVERLAP,
        `Those dates overlap "${overlapping.name}" (${formatIsoDate(overlapping.startDate)} – ${formatIsoDate(overlapping.endDate)}).`,
        { fields: { startDate: "Periods cannot overlap." } },
      );
    }
  }
}
