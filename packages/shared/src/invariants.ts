/**
 * Accounting invariants (docs/spec/01 §3, docs/spec/12 §60).
 *
 * These are the rules that make the books trustworthy. They are pure functions
 * over plain data so the same code runs in the browser (instant form feedback),
 * in the API (the authority that decides whether a post succeeds) and in the
 * invariant test suite (which asserts them against real seeded companies).
 */

import { ERROR_CODES, ZycountError } from "./errors";
import { fromCents, formatMoney, toCents, type MoneyInput } from "./money";
import { NORMAL_BALANCE, type AccountType, type NormalBalance } from "./accounting";

export interface JournalLineLike {
  accountId: string;
  debit: MoneyInput;
  credit: MoneyInput;
  description?: string | null;
  lineNo?: number;
}

export interface BalanceCheck {
  balanced: boolean;
  totalDebit: string;
  totalCredit: string;
  /** `debit − credit`; zero on a balanced entry. */
  difference: string;
}

/** Sum both sides exactly and report the difference. */
export function checkBalance(lines: readonly JournalLineLike[]): BalanceCheck {
  let debitCents = 0;
  let creditCents = 0;

  for (const line of lines) {
    debitCents += toCents(line.debit ?? 0);
    creditCents += toCents(line.credit ?? 0);
  }

  return {
    balanced: debitCents === creditCents && debitCents > 0,
    totalDebit: fromCents(debitCents),
    totalCredit: fromCents(creditCents),
    difference: fromCents(debitCents - creditCents),
  };
}

/** Invariant 1: `Σ debit = Σ credit` to the cent, and the total is positive. */
export function isBalanced(lines: readonly JournalLineLike[]): boolean {
  return checkBalance(lines).balanced;
}

export interface JournalValidationIssue {
  code: string;
  message: string;
  /** Form path for inline display, e.g. `lines.2.debit`. */
  path?: string;
}

/**
 * Every structural rule a journal must satisfy before it can be posted
 * (docs/spec/09 — Validation rules). Account existence, postability and period
 * state need the database, so the API layers those checks on top.
 */
export function validateJournalStructure(lines: readonly JournalLineLike[]): JournalValidationIssue[] {
  const issues: JournalValidationIssue[] = [];

  if (lines.length < 2) {
    issues.push({
      code: ERROR_CODES.JOURNAL_TOO_FEW_LINES,
      message: "A journal entry needs at least two lines.",
      path: "lines",
    });
  }

  lines.forEach((line, index) => {
    let debit: number;
    let credit: number;

    try {
      debit = toCents(line.debit ?? 0);
      credit = toCents(line.credit ?? 0);
    } catch {
      issues.push({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Line ${index + 1}: amounts must be valid money values.`,
        path: `lines.${index}`,
      });
      return;
    }

    if (debit < 0 || credit < 0) {
      issues.push({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Line ${index + 1}: amounts cannot be negative — use the other side instead.`,
        path: `lines.${index}`,
      });
    }

    // Each line is one-sided: a line that is both a debit and a credit hides
    // its own net effect and breaks drill-down from the statements.
    if (debit > 0 && credit > 0) {
      issues.push({
        code: ERROR_CODES.JOURNAL_LINE_TWO_SIDED,
        message: `Line ${index + 1}: enter either a debit or a credit, not both.`,
        path: `lines.${index}`,
      });
    }

    if (debit === 0 && credit === 0) {
      issues.push({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Line ${index + 1}: enter an amount.`,
        path: `lines.${index}`,
      });
    }

    if (!line.accountId) {
      issues.push({
        code: ERROR_CODES.VALIDATION_FAILED,
        message: `Line ${index + 1}: choose an account.`,
        path: `lines.${index}.accountId`,
      });
    }
  });

  const balance = checkBalance(lines);

  if (toCents(balance.totalDebit) === 0 && toCents(balance.totalCredit) === 0) {
    issues.push({
      code: ERROR_CODES.JOURNAL_ZERO_TOTAL,
      message: "A journal entry must move a non-zero amount.",
      path: "lines",
    });
  } else if (!balance.balanced) {
    issues.push({
      code: ERROR_CODES.JOURNAL_UNBALANCED,
      message: `This journal does not balance. Debit ${formatMoney(balance.totalDebit, {
        showSymbol: false,
      })} ≠ Credit ${formatMoney(balance.totalCredit, { showSymbol: false })}.`,
      path: "lines",
    });
  }

  return issues;
}

/** Throw the first structural problem as a `ZycountError`. */
export function assertJournalValid(lines: readonly JournalLineLike[], posted = false): void {
  const issues = validateJournalStructure(lines);
  if (issues.length === 0) return;

  const primary = issues[0];
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    if (issue.path && !fields[issue.path]) fields[issue.path] = issue.message;
  }

  throw new ZycountError(primary.code, primary.message, { posted, fields, details: issues });
}

/**
 * Signed balance in the account's own normal direction: positive means the
 * account carries its natural balance. Used by every report renderer.
 */
export function signedBalance(
  debit: MoneyInput,
  credit: MoneyInput,
  normalBalance: NormalBalance,
): string {
  const diff = toCents(debit) - toCents(credit);
  return fromCents(normalBalance === "DEBIT" ? diff : -diff);
}

export function signedBalanceForType(
  debit: MoneyInput,
  credit: MoneyInput,
  type: AccountType,
): string {
  return signedBalance(debit, credit, NORMAL_BALANCE[type]);
}

export interface TrialBalanceRowLike {
  debit: MoneyInput;
  credit: MoneyInput;
}

/** Invariant 3: the trial balance balances across the whole ledger. */
export function checkTrialBalance(rows: readonly TrialBalanceRowLike[]): BalanceCheck {
  let debitCents = 0;
  let creditCents = 0;
  for (const row of rows) {
    debitCents += toCents(row.debit);
    creditCents += toCents(row.credit);
  }
  return {
    // A ledger with no postings is trivially balanced, so zero is allowed here
    // (unlike a journal entry, which must move a non-zero amount).
    balanced: debitCents === creditCents,
    totalDebit: fromCents(debitCents),
    totalCredit: fromCents(creditCents),
    difference: fromCents(debitCents - creditCents),
  };
}

/** Invariant 2: `Assets = Liabilities + Equity` (equity including the result). */
export function checkAccountingEquation(input: {
  assets: MoneyInput;
  liabilities: MoneyInput;
  equity: MoneyInput;
}): { holds: boolean; difference: string } {
  const difference = toCents(input.assets) - (toCents(input.liabilities) + toCents(input.equity));
  return { holds: difference === 0, difference: fromCents(difference) };
}

/**
 * Invariant 12: an entry and its reversal net to zero.
 * The reversal swaps each line's sides, leaving the ledger balanced.
 */
export function buildReversalLines(lines: readonly JournalLineLike[]): JournalLineLike[] {
  return lines.map((line, index) => ({
    accountId: line.accountId,
    debit: fromCents(toCents(line.credit ?? 0)),
    credit: fromCents(toCents(line.debit ?? 0)),
    description: line.description ?? null,
    lineNo: line.lineNo ?? index + 1,
  }));
}

/** `true` when the two sets of lines cancel out account by account. */
export function reversalNetsToZero(
  original: readonly JournalLineLike[],
  reversal: readonly JournalLineLike[],
): boolean {
  const net = new Map<string, number>();

  for (const line of original) {
    net.set(line.accountId, (net.get(line.accountId) ?? 0) + toCents(line.debit) - toCents(line.credit));
  }
  for (const line of reversal) {
    net.set(line.accountId, (net.get(line.accountId) ?? 0) + toCents(line.debit) - toCents(line.credit));
  }

  return [...net.values()].every((value) => value === 0);
}
