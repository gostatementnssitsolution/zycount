import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@zycount/db";
import {
  ERROR_CODES,
  ZycountError,
  assertJournalValid,
  buildReversalLines,
  checkBalance,
  type JournalLineInput,
} from "@zycount/shared";
import { AuditService } from "../../common/audit/audit.service";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { formatIsoDate } from "../../common/util/dates";
import { toDecimal } from "../../common/util/money";
import { PeriodsService } from "../periods/periods.service";
import { NumberingService } from "./numbering.service";

interface ResolvedLine {
  accountId: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  description: string | null;
  lineNo: number;
}

/**
 * The accounting engine. **Every** entry that reaches the general ledger passes
 * through here, so the invariants in docs/spec/01 §3 hold by construction:
 *
 *  1. an unbalanced journal can never be posted;
 *  2. a posted journal's lines are never mutated — corrections are reversals;
 *  3. nothing posts into a closed period;
 *  4. every posting carries its source, and writes its audit entry inside the
 *     same transaction, so the trail can never disagree with the ledger.
 */
@Injectable()
export class PostingService {
  private readonly logger = new Logger(PostingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly periods: PeriodsService,
    private readonly numbering: NumberingService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Validate the lines structurally, then confirm every account really exists
   * in this company, is active, and accepts postings.
   */
  async resolveLines(
    tx: Prisma.TransactionClient,
    companyId: string,
    lines: JournalLineInput[],
    posted: boolean,
  ): Promise<ResolvedLine[]> {
    assertJournalValid(lines, posted);

    const accountIds = [...new Set(lines.map((line) => line.accountId))];
    const accounts = await tx.account.findMany({
      where: { id: { in: accountIds }, companyId },
      select: { id: true, code: true, name: true, isActive: true, isPostable: true },
    });

    const byId = new Map(accounts.map((account) => [account.id, account]));

    lines.forEach((line, index) => {
      const account = byId.get(line.accountId);

      if (!account) {
        throw new ZycountError(
          ERROR_CODES.NOT_FOUND,
          `Line ${index + 1}: that account does not exist in this company.`,
          { posted, fields: { [`lines.${index}.accountId`]: "Choose an account from this company's chart." } },
        );
      }

      // Posting to a heading would double-count it against its own children.
      if (!account.isPostable) {
        throw new ZycountError(
          ERROR_CODES.ACCOUNT_NOT_POSTABLE,
          `Line ${index + 1}: "${account.code} ${account.name}" is a heading and cannot take postings. Choose one of the accounts underneath it.`,
          { posted, fields: { [`lines.${index}.accountId`]: "This account does not accept postings." } },
        );
      }

      if (!account.isActive) {
        throw new ZycountError(
          ERROR_CODES.ACCOUNT_INACTIVE,
          `Line ${index + 1}: "${account.code} ${account.name}" has been archived and can no longer be used.`,
          { posted, fields: { [`lines.${index}.accountId`]: "This account is archived." } },
        );
      }
    });

    return lines.map((line, index) => ({
      accountId: line.accountId,
      debit: toDecimal(line.debit ?? 0),
      credit: toDecimal(line.credit ?? 0),
      description: line.description?.trim() ? line.description.trim() : null,
      lineNo: index + 1,
    }));
  }

  /** Refuse anything that would change a closed period (invariant 5). */
  async assertPeriodOpen(
    tx: Prisma.TransactionClient,
    periodId: string,
    action: string,
  ): Promise<void> {
    const period = await tx.fiscalPeriod.findUniqueOrThrow({
      where: { id: periodId },
      select: { name: true, status: true },
    });

    if (period.status === "CLOSED") {
      throw new ZycountError(
        ERROR_CODES.PERIOD_CLOSED,
        `${period.name} is closed, so nothing can be ${action} in it. Ask a finance manager to reopen the period first.`,
        { posted: false, fields: { date: `${period.name} is closed.` } },
      );
    }
  }

  async allocateReference(
    tx: Prisma.TransactionClient,
    companyId: string,
    date: Date,
  ): Promise<string> {
    return this.numbering.next(tx, companyId, "JV", date.getUTCFullYear(), "JV");
  }

  /**
   * Move a draft into the ledger. Runs as one serialisable unit: the period
   * check, the balance check, the status flip, the balance roll-up and the
   * audit entry either all happen or none do.
   */
  async post(
    journalEntryId: string,
    companyId: string,
    user: AuthenticatedUser,
    client: ClientContext,
    expectedVersion?: number,
  ): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        const entry = await tx.journalEntry.findFirst({
          where: { id: journalEntryId, companyId },
          include: { lines: true, fiscalPeriod: true },
        });

        if (!entry) {
          throw new ZycountError(ERROR_CODES.NOT_FOUND, "That journal entry does not exist in this company.", {
            posted: false,
          });
        }

        if (entry.status !== "DRAFT") {
          throw new ZycountError(
            ERROR_CODES.JOURNAL_NOT_DRAFT,
            entry.status === "POSTED"
              ? `${entry.reference} is already posted.`
              : `${entry.reference} has been reversed and cannot be posted again.`,
            // Either way the entry is already in the ledger, so say so plainly.
            { posted: true },
          );
        }

        if (expectedVersion !== undefined && expectedVersion !== entry.version) {
          throw new ZycountError(
            ERROR_CODES.CONFLICT,
            "Someone else changed this journal while you were working on it. Reload it and try again.",
            { posted: false, details: { currentVersion: entry.version } },
          );
        }

        await this.assertPeriodOpen(tx, entry.fiscalPeriodId, "posted");

        // Re-check the balance against what is actually stored, not what the
        // request claimed. This is the last gate before the ledger.
        const balance = checkBalance(
          entry.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit.toString(),
            credit: line.credit.toString(),
          })),
        );

        if (!balance.balanced) {
          throw new ZycountError(
            ERROR_CODES.JOURNAL_UNBALANCED,
            `${entry.reference} does not balance. Debit ${balance.totalDebit} ≠ Credit ${balance.totalCredit}.`,
            { posted: false, fields: { lines: "Debit and credit totals must match." } },
          );
        }

        await tx.journalEntry.update({
          where: { id: journalEntryId },
          data: {
            status: "POSTED",
            postedAt: new Date(),
            postedBy: user.id,
            totalDebit: toDecimal(balance.totalDebit),
            totalCredit: toDecimal(balance.totalCredit),
            version: { increment: 1 },
          },
        });

        await this.applyToBalances(tx, companyId, entry.fiscalPeriodId, entry.lines, 1);

        await this.audit.record(
          {
            userId: user.id,
            companyId,
            action: "journal.post",
            entityType: "JournalEntry",
            entityId: journalEntryId,
            metadata: {
              reference: entry.reference,
              date: formatIsoDate(entry.date),
              totalDebit: balance.totalDebit,
              totalCredit: balance.totalCredit,
              lineCount: entry.lines.length,
              source: entry.source,
            },
            client,
          },
          tx,
        );

        this.logger.log(`Posted ${entry.reference} (${balance.totalDebit}) for company ${companyId}`);
        return journalEntryId;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Reverse a posted entry with an equal-and-opposite one (invariant 4 and 12).
   * The original is never edited — it moves to REVERSED and gains a link to its
   * reversal, so both sides stay visible in the ledger forever.
   */
  async reverse(
    journalEntryId: string,
    companyId: string,
    options: { date?: string; reason: string },
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        const original = await tx.journalEntry.findFirst({
          where: { id: journalEntryId, companyId },
          include: { lines: { orderBy: { lineNo: "asc" } }, reversedBy: true },
        });

        if (!original) {
          throw new ZycountError(ERROR_CODES.NOT_FOUND, "That journal entry does not exist in this company.", {
            posted: false,
          });
        }

        if (original.status === "DRAFT") {
          throw new ZycountError(
            ERROR_CODES.JOURNAL_NOT_POSTED,
            `${original.reference} has not been posted, so there is nothing to reverse. Edit or delete the draft instead.`,
            { posted: false },
          );
        }

        if (original.status === "REVERSED" || original.reversedBy) {
          throw new ZycountError(
            ERROR_CODES.JOURNAL_ALREADY_REVERSED,
            `${original.reference} has already been reversed${original.reversedBy ? ` by ${original.reversedBy.reference}` : ""}.`,
            { posted: true },
          );
        }

        const reversalDate = options.date
          ? new Date(`${options.date}T00:00:00.000Z`)
          : original.date;

        const period = await this.periods.resolveForDate(companyId, reversalDate, tx);
        await this.assertPeriodOpen(tx, period.id, "reversed");

        // The original's own period must also be open: reversing changes the
        // net position of the period it sits in.
        if (period.id !== original.fiscalPeriodId) {
          await this.assertPeriodOpen(tx, original.fiscalPeriodId, "reversed");
        }

        const reversalLines = buildReversalLines(
          original.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit.toString(),
            credit: line.credit.toString(),
            description: line.description,
            lineNo: line.lineNo,
          })),
        );

        const balance = checkBalance(reversalLines);
        if (!balance.balanced) {
          // Unreachable unless the original was already corrupt — surfacing it
          // beats writing a second broken entry on top of the first.
          throw new ZycountError(
            ERROR_CODES.JOURNAL_UNBALANCED,
            `${original.reference} does not balance, so it cannot be reversed automatically. Contact support.`,
            { posted: true },
          );
        }

        const reference = await this.allocateReference(tx, companyId, reversalDate);

        const reversal = await tx.journalEntry.create({
          data: {
            companyId,
            fiscalPeriodId: period.id,
            reference,
            date: reversalDate,
            description: `Reversal of ${original.reference}${original.description ? ` — ${original.description}` : ""}`,
            memo: options.reason,
            status: "POSTED",
            source: original.source,
            sourceId: original.sourceId,
            reversalOfId: original.id,
            totalDebit: toDecimal(balance.totalDebit),
            totalCredit: toDecimal(balance.totalCredit),
            createdBy: user.id,
            postedAt: new Date(),
            postedBy: user.id,
            lines: {
              create: reversalLines.map((line, index) => ({
                accountId: line.accountId,
                debit: toDecimal(line.debit),
                credit: toDecimal(line.credit),
                description: line.description ?? null,
                lineNo: index + 1,
              })),
            },
          },
          include: { lines: true },
        });

        await tx.journalEntry.update({
          where: { id: original.id },
          data: { status: "REVERSED", version: { increment: 1 } },
        });

        await this.applyToBalances(tx, companyId, period.id, reversal.lines, 1);

        await this.audit.record(
          {
            userId: user.id,
            companyId,
            action: "journal.reverse",
            entityType: "JournalEntry",
            entityId: original.id,
            metadata: {
              reference: original.reference,
              reversalReference: reference,
              reversalId: reversal.id,
              reason: options.reason,
              date: formatIsoDate(reversalDate),
              amount: balance.totalDebit,
            },
            client,
          },
          tx,
        );

        this.logger.log(`Reversed ${original.reference} with ${reference} for company ${companyId}`);
        return reversal.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /**
   * Keep the pre-aggregated `AccountBalance` rows in step with the ledger, so
   * reports never scan the full journal (docs/spec/14 §57).
   */
  private async applyToBalances(
    tx: Prisma.TransactionClient,
    companyId: string,
    fiscalPeriodId: string,
    lines: Array<{ accountId: string; debit: Prisma.Decimal; credit: Prisma.Decimal }>,
    sign: 1 | -1,
  ): Promise<void> {
    // Several lines can hit the same account in one entry, so net them first
    // and touch each account's balance row exactly once.
    const totals = new Map<string, { debit: Prisma.Decimal; credit: Prisma.Decimal }>();

    for (const line of lines) {
      const current = totals.get(line.accountId) ?? {
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(0),
      };
      totals.set(line.accountId, {
        debit: current.debit.plus(line.debit),
        credit: current.credit.plus(line.credit),
      });
    }

    for (const [accountId, total] of totals) {
      const debit = sign === 1 ? total.debit : total.debit.negated();
      const credit = sign === 1 ? total.credit : total.credit.negated();

      await tx.accountBalance.upsert({
        where: { accountId_fiscalPeriodId: { accountId, fiscalPeriodId } },
        update: { debit: { increment: debit }, credit: { increment: credit } },
        create: { companyId, accountId, fiscalPeriodId, debit, credit },
      });
    }
  }
}
