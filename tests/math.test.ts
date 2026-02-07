import { describe, expect, it } from "vitest";
import {
  evaluateExpression,
  formatResultWithRounding,
  toDecimal,
  type Fraction,
} from "../src/lib/math";

describe("evaluateExpression", () => {
  it("evaluates imperial fractions correctly", () => {
    const result = evaluateExpression("1/2 + 1/4", "imperial-inches");
    expect(result.error).toBeNull();
    expect(result.value).not.toBeNull();
    expect(toDecimal(result.value as Fraction)).toBeCloseTo(0.75, 6);
  });
});

describe("formatResultWithRounding", () => {
  it("marks imperial-inches results as rounded when snapping occurs", () => {
    const frac: Fraction = { num: 11, den: 10 }; // 1.1"
    const formatted = formatResultWithRounding(frac, "imperial-inches", 8);
    expect(formatted.rounded).toBe(true);
    expect(formatted.text).toBe('1-1/8"');
  });

  it("does not mark imperial-inches results as rounded when exact", () => {
    const frac: Fraction = { num: 9, den: 8 }; // 1.125"
    const formatted = formatResultWithRounding(frac, "imperial-inches", 8);
    expect(formatted.rounded).toBe(false);
    expect(formatted.text).toBe('1-1/8"');
  });

  it("marks metric results as rounded when trimming to 4 decimals", () => {
    const frac: Fraction = { num: 1, den: 3 }; // 0.3333...
    const formatted = formatResultWithRounding(frac, "metric", 16, "mm");
    expect(formatted.text).toBe("0.3333 mm");
    expect(formatted.rounded).toBe(true);
  });

  it("does not mark metric results as rounded when already exact", () => {
    const frac: Fraction = { num: 1, den: 2 }; // 0.5
    const formatted = formatResultWithRounding(frac, "metric", 16, "mm");
    expect(formatted.text).toBe("0.5 mm");
    expect(formatted.rounded).toBe(false);
  });
});
