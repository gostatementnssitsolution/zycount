import { describe, expect, it } from "vitest";
import {
  addMoney,
  compareMoney,
  divideSafe,
  formatMoney,
  fromCents,
  isValidMoney,
  money,
  multiplyMoney,
  subtractMoney,
  sumMoney,
  toCents,
} from "../money";

describe("money parsing", () => {
  it("parses decimal strings to exact cents", () => {
    expect(toCents("1234.56")).toBe(123456);
    expect(toCents("0.01")).toBe(1);
    expect(toCents("-99.99")).toBe(-9999);
    expect(toCents("1000")).toBe(100000);
    expect(toCents("")).toBe(0);
  });

  it("strips thousands separators", () => {
    expect(toCents("1,234,567.89")).toBe(123456789);
  });

  it("rounds half-up on extra precision rather than truncating", () => {
    expect(toCents("1.005")).toBe(101);
    expect(toCents("1.004")).toBe(100);
    expect(toCents("-1.005")).toBe(-101);
  });

  it("rejects values that are not money", () => {
    expect(() => toCents("abc")).toThrow();
    expect(() => toCents("1.2.3")).toThrow();
    expect(isValidMoney("12.34")).toBe(true);
    expect(isValidMoney("twelve")).toBe(false);
  });

  it("round-trips through the canonical string form", () => {
    expect(money("5")).toBe("5.00");
    expect(money(5.5)).toBe("5.50");
    expect(fromCents(-1)).toBe("-0.01");
  });
});

describe("money arithmetic", () => {
  it("adds and subtracts exactly", () => {
    expect(addMoney("0.10", "0.20")).toBe("0.30");
    expect(subtractMoney("1000.00", "0.01")).toBe("999.99");
  });

  it("avoids the float error that bites naive implementations", () => {
    // 0.1 + 0.2 === 0.30000000000000004 in IEEE-754 floats.
    expect(addMoney(0.1, 0.2)).toBe("0.30");
    expect(sumMoney(Array.from({ length: 10 }, () => "0.10"))).toBe("1.00");
  });

  it("sums long lists without drift", () => {
    const values = Array.from({ length: 1000 }, () => "0.01");
    expect(sumMoney(values)).toBe("10.00");
  });

  it("multiplies by a quantity and rounds half-up", () => {
    expect(multiplyMoney("19.99", 3)).toBe("59.97");
    expect(multiplyMoney("0.015", 1)).toBe("0.02");
  });

  it("compares without an epsilon", () => {
    expect(compareMoney("1.00", "1.00")).toBe(0);
    expect(compareMoney("1.01", "1.00")).toBe(1);
    expect(compareMoney("0.99", "1.00")).toBe(-1);
  });
});

describe("percentage change", () => {
  it("returns null when there is no base to compare against", () => {
    expect(divideSafe("100.00", "0.00")).toBeNull();
    expect(divideSafe("100.00", null)).toBeNull();
  });

  it("reports change against the magnitude of the base", () => {
    expect(divideSafe("50.00", "200.00")).toBe("25.0");
    expect(divideSafe("-50.00", "200.00")).toBe("-25.0");
    // A loss shrinking is an improvement, so the sign follows the delta.
    expect(divideSafe("100.00", "-200.00")).toBe("50.0");
  });
});

describe("formatting", () => {
  it("renders Malaysian ringgit with the local symbol", () => {
    const formatted = formatMoney("1234.56");
    expect(formatted).toContain("1,234.56");
    expect(formatted).toContain("RM");
  });

  it("drops the symbol on request", () => {
    expect(formatMoney("1234.56", { showSymbol: false })).toBe("1,234.56");
  });

  it("compacts large figures for chart axes", () => {
    expect(formatMoney("1500000", { compact: true, showSymbol: false })).toBe("1.5M");
  });
});
