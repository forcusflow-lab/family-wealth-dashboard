import { describe, expect, it } from "vitest";
import { buildExpandedProxyBacktest, validateBacktestWeights } from "./marketData";

describe("expanded proxy backtest", () => {
  it("uses common monthly history and returns all three fixed-weight comparisons", () => {
    const dates = Array.from({ length: 37 }, (_, index) => `2023-${String(index + 1).padStart(2, "0")}`);
    const histories = {
      world: dates.map((date, index) => ({ date, value: 100 + index })),
      japan: dates.map((date, index) => ({ date, value: 100 + index * 0.8 })),
      bond: dates.map((date, index) => ({ date, value: 100 + index * 0.2 })),
      gold: dates.map((date, index) => ({ date, value: 100 + index * 0.4 })),
    };
    const result = buildExpandedProxyBacktest(histories);
    expect(result.comparisons.map(item => item.id)).toEqual(["core", "current", "defensive"]);
    expect(result.comparisons.every(item => item.metrics.months === 37)).toBe(true);
    expect(result.chart.at(-1)).toMatchObject({ core: expect.any(Number), portfolio: expect.any(Number), defensive: expect.any(Number) });
  });

  it("rejects imbalanced weights and insufficient common history instead of silently producing results", () => {
    expect(() => validateBacktestWeights({ world: 0.7, japan: 0.2, bond: 0.2, gold: 0.1 })).toThrow("weights must sum to 1");
    const dates = Array.from({ length: 35 }, (_, index) => `2023-${String(index + 1).padStart(2, "0")}`);
    const histories = Object.fromEntries(["world", "japan", "bond", "gold"].map(asset => [asset, dates.map((date, index) => ({ date, value: 100 + index }))])) as never;
    expect(() => buildExpandedProxyBacktest(histories)).toThrow("Insufficient common proxy history");
  });
});
