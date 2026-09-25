import { Prisma } from "@zycount/db";
import { describe, expect, it } from "vitest";
import {
  addUtcDays,
  daysBetween,
  endOfUtcDay,
  formatIsoDate,
  monthEnd,
  parseIsoDate,
  startOfUtcDay,
} from "../util/dates";
import { centsToString, decimalToCents, decimalToString, toDecimal } from "../util/money";
import { paginate, skipTake } from "../util/pagination";

describe("money at the Prisma boundary", () => {
  it("turns a decimal string into a Decimal without going through a float", () => {
    expect(toDecimal("1234.56").toString()).toBe("1234.56");
    // 0.1 + 0.2 territory: the value that breaks naive float handling.
    expect(toDecimal("0.30").toString()).toBe("0.3");
  });

  it("formats a Decimal back to two places", () => {
    expect(decimalToString(new Prisma.Decimal("1234.5"))).toBe("1234.50");
    expect(decimalToString(new Prisma.Decimal("0"))).toBe("0.00");
  });

  it("reads a missing Decimal as zero rather than throwing", () => {
    expect(decimalToString(null)).toBe("0.00");
    expect(decimalToString(undefined)).toBe("0.00");
    expect(decimalToCents(null)).toBe(0);
  });

  it("converts to whole cents", () => {
    expect(decimalToCents(new Prisma.Decimal("26435.60"))).toBe(2_643_560);
    expect(centsToString(2_643_560)).toBe("26435.60");
  });

  it("round-trips every cent it is given", () => {
    for (const value of ["0.01", "0.99", "1.00", "99.95", "123456.78"]) {
      expect(centsToString(decimalToCents(new Prisma.Decimal(value)))).toBe(value);
    }
  });
});

describe("accounting dates", () => {
  it("keeps a calendar date on its own day, whatever the server timezone", () => {
    const date = parseIsoDate("2026-01-31");
    expect(date.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(formatIsoDate(date)).toBe("2026-01-31");
  });

  it("formats a string date by taking its date part", () => {
    expect(formatIsoDate("2026-08-31T15:04:05.000Z")).toBe("2026-08-31");
  });

  it("bounds a day without spilling into the next one", () => {
    const day = parseIsoDate("2026-06-15");
    expect(startOfUtcDay(day).toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(endOfUtcDay(day).toISOString()).toBe("2026-06-15T23:59:59.999Z");
  });

  it("adds days across a month boundary", () => {
    expect(formatIsoDate(addUtcDays(parseIsoDate("2026-01-31"), 1))).toBe("2026-02-01");
    expect(formatIsoDate(addUtcDays(parseIsoDate("2026-03-01"), -1))).toBe("2026-02-28");
  });

  it("counts whole days between two dates", () => {
    expect(daysBetween(parseIsoDate("2026-01-01"), parseIsoDate("2026-01-31"))).toBe(30);
    expect(daysBetween(parseIsoDate("2026-01-31"), parseIsoDate("2026-01-01"))).toBe(-30);
  });

  it("knows the last day of a month, February included", () => {
    expect(formatIsoDate(monthEnd(2026, 2))).toBe("2026-02-28");
    expect(formatIsoDate(monthEnd(2024, 2))).toBe("2024-02-29");
    expect(formatIsoDate(monthEnd(2026, 12))).toBe("2026-12-31");
  });
});

describe("pagination", () => {
  it("reports the page count a client needs", () => {
    expect(paginate([1, 2], 25, 1, 10).totalPages).toBe(3);
    expect(paginate([], 0, 1, 10).totalPages).toBe(1);
  });

  it("never reports zero pages, which would hide the empty state", () => {
    expect(paginate([], 0, 1, 0).totalPages).toBe(1);
  });

  it("translates a page number into skip and take", () => {
    expect(skipTake(1, 25)).toEqual({ skip: 0, take: 25 });
    expect(skipTake(4, 25)).toEqual({ skip: 75, take: 25 });
  });
});
