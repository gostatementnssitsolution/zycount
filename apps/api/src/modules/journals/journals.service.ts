import { Injectable } from "@nestjs/common";
import { Prisma } from "@zycount/db";
import {
  ERROR_CODES,
  ZycountError,
  parseSort,
  type CreateJournalInput,
  type JournalEntryDto,
  type JournalEntrySummary,
  type JournalLineDto,
  type ListJournalsQuery,
  type Paginated,
  type ReverseJournalInput,
  type UpdateJournalInput,
} from "@zycount/shared";
import { AuditService } from "../../common/audit/audit.service";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { formatIsoDate, parseIsoDate } from "../../common/util/dates";
import { paginate, skipTake } from "../../common/util/pagination";
import { decimalToString, toDecimal } from "../../common/util/money";
import { PeriodsService } from "../periods/periods.service";
import { PostingService } from "./posting.service";

const journalInclude = {
  lines: { orderBy: { lineNo: "asc" }, include: { account: true } },
  fiscalPeriod: true,
  reversalOf: { select: { id: true, reference: true } },
  reversedBy: { select: { id: true, reference: true } },
} satisfies Prisma.JournalEntryInclude;

type JournalWithRelations = Prisma.JournalEntryGetPayload<{ include: typeof journalInclude }>;

const SORTABLE = ["date", "reference", "createdAt", "totalDebit", "status"] as const;

@Injectable()
export class JournalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly periods: PeriodsService,
    private readonly posting: PostingService,
    private readonly audit: AuditService,
  ) {}

  // ── Mapping ────────────────────────────────────────────────

  private toLineDto(line: JournalWithRelations["lines"][number]): JournalLineDto {
    return {
      id: line.id,
      accountId: line.accountId,
      accountCode: line.account.code,
      accountName: line.account.name,
      accountType: line.account.type,
      debit: decimalToString(line.debit),
      credit: decimalToString(line.credit),
      description: line.description,
      lineNo: line.lineNo,
    };
  }

  private toDto(
    entry: JournalWithRelations,
    names: Map<string, string> = new Map(),
  ): JournalEntryDto {
    return {
      id: entry.id,
      companyId: entry.companyId,
      fiscalPeriodId: entry.fiscalPeriodId,
      fiscalPeriodName: entry.fiscalPeriod.name,
      periodStatus: entry.fiscalPeriod.status,
      reference: entry.reference,
      date: formatIsoDate(entry.date),
      description: entry.description,
      memo: entry.memo,
      status: entry.status,
      source: entry.source,
      sourceId: entry.sourceId,
      reversalOfId: entry.reversalOf?.id ?? null,
      reversalOfReference: entry.reversalOf?.reference ?? null,
      reversedById: entry.reversedBy?.id ?? null,
      reversedByReference: entry.reversedBy?.reference ?? null,
      totalDebit: decimalToString(entry.totalDebit),
      totalCredit: decimalToString(entry.totalCredit),
      version: entry.version,
      createdBy: entry.createdBy,
      createdByName: entry.createdBy ? (names.get(entry.createdBy) ?? null) : null,
      postedAt: entry.postedAt?.toISOString() ?? null,
      postedBy: entry.postedBy,
      postedByName: entry.postedBy ? (names.get(entry.postedBy) ?? null) : null,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      lines: entry.lines.map((line) => this.toLineDto(line)),
    };
  }

  /** Resolve the display names behind `createdBy` / `postedBy` in one query. */
  private async resolveUserNames(entries: JournalWithRelations[]): Promise<Map<string, string>> {
    const ids = new Set<string>();
    for (const entry of entries) {
      if (entry.createdBy) ids.add(entry.createdBy);
      if (entry.postedBy) ids.add(entry.postedBy);
    }
    if (ids.size === 0) return new Map();

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, name: true },
    });
    return new Map(users.map((user) => [user.id, user.name]));
  }

  // ── Queries ────────────────────────────────────────────────

  async list(companyId: string, query: ListJournalsQuery): Promise<Paginated<JournalEntrySummary>> {
    const where: Prisma.JournalEntryWhereInput = { companyId };

    if (query.status) where.status = query.status;
    if (query.source) where.source = query.source;
    if (query.fiscalPeriodId) where.fiscalPeriodId = query.fiscalPeriodId;
    if (query.accountId) where.lines = { some: { accountId: query.accountId } };

    if (query.dateFrom || query.dateTo) {
      where.date = {
        ...(query.dateFrom ? { gte: parseIsoDate(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: parseIsoDate(query.dateTo) } : {}),
      };
    }

    if (query.q) {
      where.OR = [
        { reference: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { memo: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const sort = parseSort(query.sort, SORTABLE, { field: "date", direction: "desc" });
    const { skip, take } = skipTake(query.page, query.pageSize);

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: journalInclude,
        // A stable tiebreak keeps pagination deterministic when many entries
        // share a date.
        orderBy: [{ [sort.field]: sort.direction }, { reference: "desc" }],
        skip,
        take,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    const names = await this.resolveUserNames(entries);

    const data: JournalEntrySummary[] = entries.map((entry) => {
      const { lines, ...rest } = this.toDto(entry, names);
      return { ...rest, lineCount: lines.length };
    });

    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string): Promise<JournalEntryDto> {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: journalInclude,
    });

    if (!entry) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That journal entry does not exist in this company.");
    }

    return this.toDto(entry, await this.resolveUserNames([entry]));
  }

  // ── Mutations ──────────────────────────────────────────────

  /**
   * Create a journal. `postImmediately` runs the draft straight through the
   * posting service — the path the "Save and post" button uses.
   */
  async create(
    companyId: string,
    input: CreateJournalInput,
    user: AuthenticatedUser,
    client: ClientContext,
    postImmediately = false,
  ): Promise<JournalEntryDto> {
    const date = parseIsoDate(input.date);

    const created = await this.prisma.$transaction(async (tx) => {
      const period = await this.periods.resolveForDate(companyId, date, tx);

      // A draft may be prepared in a closed period only if it is not posted;
      // posting into it is refused either way, so block it up front for clarity.
      if (period.status === "CLOSED") {
        throw new ZycountError(
          ERROR_CODES.PERIOD_CLOSED,
          `${period.name} is closed, so nothing can be dated into it. Ask a finance manager to reopen the period first.`,
          { posted: false, fields: { date: `${period.name} is closed.` } },
        );
      }

      const lines = await this.posting.resolveLines(tx, companyId, input.lines, false);
      const totalDebit = lines.reduce((sum, line) => sum.plus(line.debit), new Prisma.Decimal(0));
      const totalCredit = lines.reduce((sum, line) => sum.plus(line.credit), new Prisma.Decimal(0));

      const reference =
        input.reference?.trim() || (await this.posting.allocateReference(tx, companyId, date));

      return tx.journalEntry.create({
        data: {
          companyId,
          fiscalPeriodId: period.id,
          reference,
          date,
          description: input.description || null,
          memo: input.memo || null,
          source: input.source ?? "MANUAL",
          status: "DRAFT",
          totalDebit,
          totalCredit,
          createdBy: user.id,
          lines: { create: lines },
        },
        include: journalInclude,
      });
    });

    await this.audit.record({
      userId: user.id,
      companyId,
      action: "journal.create",
      entityType: "JournalEntry",
      entityId: created.id,
      metadata: {
        reference: created.reference,
        date: input.date,
        lineCount: input.lines.length,
        totalDebit: decimalToString(created.totalDebit),
      },
      client,
    });

    if (postImmediately) {
      await this.posting.post(created.id, companyId, user, client);
      return this.findOne(companyId, created.id);
    }

    return this.toDto(created, await this.resolveUserNames([created]));
  }

  /** Only drafts are editable — a posted entry is corrected by reversal. */
  async update(
    companyId: string,
    id: string,
    input: UpdateJournalInput,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<JournalEntryDto> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.journalEntry.findFirst({
        where: { id, companyId },
        include: { fiscalPeriod: true },
      });

      if (!existing) {
        throw new ZycountError(ERROR_CODES.NOT_FOUND, "That journal entry does not exist in this company.");
      }

      if (existing.status !== "DRAFT") {
        throw new ZycountError(
          ERROR_CODES.JOURNAL_IMMUTABLE,
          `${existing.reference} is ${existing.status.toLowerCase()} and can no longer be edited. Post a reversal to correct it.`,
        );
      }

      if (input.version !== undefined && input.version !== existing.version) {
        throw new ZycountError(
          ERROR_CODES.CONFLICT,
          "Someone else changed this journal while you were working on it. Reload it and try again.",
          { details: { currentVersion: existing.version } },
        );
      }

      const date = input.date ? parseIsoDate(input.date) : existing.date;
      const period = input.date
        ? await this.periods.resolveForDate(companyId, date, tx)
        : existing.fiscalPeriod;

      if (period.status === "CLOSED") {
        throw new ZycountError(
          ERROR_CODES.PERIOD_CLOSED,
          `${period.name} is closed, so nothing can be dated into it.`,
          { fields: { date: `${period.name} is closed.` } },
        );
      }

      let totalDebit = existing.totalDebit;
      let totalCredit = existing.totalCredit;

      if (input.lines) {
        const lines = await this.posting.resolveLines(tx, companyId, input.lines, false);
        totalDebit = lines.reduce((sum, line) => sum.plus(line.debit), new Prisma.Decimal(0));
        totalCredit = lines.reduce((sum, line) => sum.plus(line.credit), new Prisma.Decimal(0));

        // Drafts are not in the ledger, so replacing their lines wholesale is
        // safe and keeps line numbering contiguous.
        await tx.journalLine.deleteMany({ where: { journalEntryId: id } });
        await tx.journalLine.createMany({
          data: lines.map((line) => ({ ...line, journalEntryId: id })),
        });
      }

      return tx.journalEntry.update({
        where: { id },
        data: {
          ...(input.date ? { date, fiscalPeriodId: period.id } : {}),
          ...(input.description === undefined ? {} : { description: input.description || null }),
          ...(input.memo === undefined ? {} : { memo: input.memo || null }),
          ...(input.reference === undefined ? {} : { reference: input.reference }),
          ...(input.source === undefined ? {} : { source: input.source }),
          totalDebit,
          totalCredit,
          version: { increment: 1 },
        },
        include: journalInclude,
      });
    });

    await this.audit.record({
      userId: user.id,
      companyId,
      action: "journal.edit",
      entityType: "JournalEntry",
      entityId: id,
      metadata: { reference: updated.reference, fields: Object.keys(input) },
      client,
    });

    return this.toDto(updated, await this.resolveUserNames([updated]));
  }

  async remove(
    companyId: string,
    id: string,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<void> {
    const entry = await this.prisma.journalEntry.findFirst({ where: { id, companyId } });

    if (!entry) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That journal entry does not exist in this company.");
    }

    // Posted accounting data is never deleted (docs/spec/02 — Design rules).
    if (entry.status !== "DRAFT") {
      throw new ZycountError(
        ERROR_CODES.JOURNAL_IMMUTABLE,
        `${entry.reference} is in the ledger and cannot be deleted. Post a reversal instead — the audit trail must stay complete.`,
      );
    }

    await this.prisma.journalEntry.delete({ where: { id } });

    await this.audit.record({
      userId: user.id,
      companyId,
      action: "journal.delete",
      entityType: "JournalEntry",
      entityId: id,
      metadata: { reference: entry.reference, date: formatIsoDate(entry.date) },
      client,
    });
  }

  async post(
    companyId: string,
    id: string,
    version: number | undefined,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<JournalEntryDto> {
    await this.posting.post(id, companyId, user, client, version);
    return this.findOne(companyId, id);
  }

  async reverse(
    companyId: string,
    id: string,
    input: ReverseJournalInput,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<JournalEntryDto> {
    const reversalId = await this.posting.reverse(id, companyId, input, user, client);
    return this.findOne(companyId, reversalId);
  }

  /**
   * Draft a reversal without posting it — powers the "preview the Dr/Cr before
   * confirming" step in docs/spec/08.
   */
  async previewReversal(companyId: string, id: string): Promise<JournalLineDto[]> {
    const entry = await this.findOne(companyId, id);
    return entry.lines.map((line, index) => ({
      ...line,
      id: `preview-${index}`,
      debit: line.credit,
      credit: line.debit,
      lineNo: index + 1,
    }));
  }

  /** Copy a posted or draft entry into a fresh draft, ready to edit. */
  async duplicate(
    companyId: string,
    id: string,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<JournalEntryDto> {
    const source = await this.findOne(companyId, id);
    const today = new Date().toISOString().slice(0, 10);

    return this.create(
      companyId,
      {
        date: today,
        description: source.description ? `Copy of ${source.description}` : `Copy of ${source.reference}`,
        memo: source.memo ?? undefined,
        source: "MANUAL",
        lines: source.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description ?? undefined,
        })),
      } as CreateJournalInput,
      user,
      client,
    );
  }
}
