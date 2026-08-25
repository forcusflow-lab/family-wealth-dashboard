import { describe, expect, it } from "vitest";
import { shouldFetchBacktest, shouldFetchMarketData } from "../shared/marketRefreshPolicy";

describe("manual market refresh policy", () => {
  it("does not fetch market data until the user explicitly requests it", () => {
    expect(shouldFetchMarketData(false)).toBe(false);
    expect(shouldFetchMarketData(true)).toBe(true);
  });

  it("does not fetch a backtest outside the analysis route or before manual refresh", () => {
    expect(shouldFetchBacktest(false, "/analysis")).toBe(false);
    expect(shouldFetchBacktest(true, "/")).toBe(false);
    expect(shouldFetchBacktest(true, "/analysis")).toBe(true);
  });
});
