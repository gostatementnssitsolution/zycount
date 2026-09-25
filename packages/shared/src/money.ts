/**
 * Money utilities.
 *
 * Money crosses the wire as a decimal **string** (`"1234.56"`) so no value ever
 * passes through a JS float. Internally we work in integer minor units (cents),
 * which makes every sum, comparison and equality check exact.
 */

/** Number of minor units in one major unit. Zycount is 2-decimal throughout. */
export const MONEY_SCALE = 2;
const FACTOR = 100;

export type MoneyInput = string | number | bigint | { toString(): string };

const MONEY_PATTERN = /^-?\d+(\.\d+)?$/;

/** Parse any accepted money representation into integer cents. Throws on garbage. */
export function toCents(value: MoneyInput): number {
  if (typeof value === "bigint") return Number(value) * FACTOR;

  const raw = typeof value === "string" ? value.trim() : String(value).trim();
  const normalized = raw === "" ? "0" : raw.replace(/,/g, "");

  if (!MONEY_PATTERN.test(normalized)) {
    throw new Error(`Invalid money value: ${JSON.stringify(raw)}`);
  }

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole, fraction = ""] = unsigned.split(".");

  // Round half-up on the first discarded digit rather than truncating, so a
  // value that arrives with extra precision lands on the nearest cent.
  const kept = fraction.slice(0, MONEY_SCALE).padEnd(MONEY_SCALE, "0");
  const nextDigit = fraction.charCodeAt(MONEY_SCALE) - 48;
  const roundUp = nextDigit >= 5 && nextDigit <= 9;

  const cents = Number(whole) * FACTOR + Number(kept) + (roundUp ? 1 : 0);
  return negative ? -cents : cents;
}

/** Render integer cents as a fixed 2-decimal string, e.g. `"1234.56"`. */
export function fromCents(cents: number): string {
  const rounded = Math.round(cents);
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const whole = Math.floor(abs / FACTOR);
  const fraction = String(abs % FACTOR).padStart(MONEY_SCALE, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/** Normalise any money input to its canonical string form. */
export function money(value: MoneyInput): string {
  return fromCents(toCents(value));
}

/** Exact sum of money values. */
export function sumMoney(values: MoneyInput[]): string {
  return fromCents(values.reduce<number>((acc, v) => acc + toCents(v), 0));
}

export function addMoney(a: MoneyInput, b: MoneyInput): string {
  return fromCents(toCents(a) + toCents(b));
}

export function subtractMoney(a: MoneyInput, b: MoneyInput): string {
  return fromCents(toCents(a) - toCents(b));
}

/** Multiply money by a plain factor (e.g. qty × unit price), rounded half-up. */
export function multiplyMoney(a: MoneyInput, factor: number): string {
  const product = toCents(a) * factor;
  return fromCents(product >= 0 ? Math.round(product) : -Math.round(-product));
}

export function negateMoney(a: MoneyInput): string {
  return fromCents(-toCents(a));
}

export function absMoney(a: MoneyInput): string {
  return fromCents(Math.abs(toCents(a)));
}

/** `-1 | 0 | 1` — exact comparison, no epsilon needed. */
export function compareMoney(a: MoneyInput, b: MoneyInput): -1 | 0 | 1 {
  const diff = toCents(a) - toCents(b);
  return diff === 0 ? 0 : diff > 0 ? 1 : -1;
}

export function moneyEquals(a: MoneyInput, b: MoneyInput): boolean {
  return toCents(a) === toCents(b);
}

export function isZeroMoney(a: MoneyInput): boolean {
  return toCents(a) === 0;
}

export function isNegativeMoney(a: MoneyInput): boolean {
  return toCents(a) < 0;
}

/** `true` when the value parses as money — used by validators. */
export function isValidMoney(value: unknown): boolean {
  if (typeof value !== "string" && typeof value !== "number") return false;
  try {
    toCents(value as MoneyInput);
    return true;
  } catch {
    return false;
  }
}

/**
 * Locales chosen so the currency symbol is the local one (`RM`, not `MYR`)
 * while abbreviations stay English to match the interface — `ms-MY` would
 * render a million as "1.5J" (juta) beside otherwise English labels.
 */
const CURRENCY_LOCALE: Record<string, string> = {
  MYR: "en-MY",
  SGD: "en-SG",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

/**
 * Human-readable money for the UI. `compact` renders 1.2M-style labels for
 * chart axes and KPI tiles; everything else stays fully precise.
 */
export function formatMoney(
  value: MoneyInput,
  options: { currency?: string; compact?: boolean; showSymbol?: boolean } = {},
): string {
  const { currency = "MYR", compact = false, showSymbol = true } = options;
  const amount = toCents(value) / FACTOR;
  const locale = CURRENCY_LOCALE[currency] ?? "en-US";

  return new Intl.NumberFormat(locale, {
    style: showSymbol ? "currency" : "decimal",
    currency,
    notation: compact ? "compact" : "standard",
    minimumFractionDigits: compact ? 0 : MONEY_SCALE,
    maximumFractionDigits: compact ? 1 : MONEY_SCALE,
  }).format(amount);
}

/**
 * Percentage change from `base` to `base + delta`, as a string with one
 * decimal. Returns `null` when the base is zero, because "up from nothing" has
 * no meaningful percentage — the UI shows a dash instead of a fake infinity.
 */
export function divideSafe(delta: MoneyInput, base: MoneyInput | null | undefined): string | null {
  if (base === null || base === undefined) return null;

  const baseCents = toCents(base);
  if (baseCents === 0) return null;

  return ((toCents(delta) / Math.abs(baseCents)) * 100).toFixed(1);
}

/** Percentage of a total, as a string with one decimal (`"0.0"` when no total). */
export function percentOfTotal(value: MoneyInput, total: MoneyInput): string {
  const totalCents = toCents(total);
  if (totalCents === 0) return "0.0";
  return ((toCents(value) / totalCents) * 100).toFixed(1);
}
