import { describe, expect, it } from "vitest";
import { parseOfficialNavCsv, summarizeOfficialHistory } from "./productPerformance";

describe("official product performance comparison", () => {
  it("parses official CSV and calculates comparable trailing total returns from reinvested NAV", () => {
    const csv = "header\n2021/08/17,10000,10000,,0\n2023/08/17,12000,12000,,0\n2025/08/17,15000,15000,,0\n2026/08/17,18000,18000,,0";
    const summary = summarizeOfficialHistory(parseOfficialNavCsv(csv));
    expect(summary.asOf).toBe("2026-08-17");
    expect(summary.returns.oneYear).toBeCloseTo(0.2);
    expect(summary.returns.threeYear).toBeCloseTo(0.5);
    expect(summary.returns.fiveYear).toBeCloseTo(0.8);
  });

  it("does not invent unavailable history", () => {
    const summary = summarizeOfficialHistory(parseOfficialNavCsv("header\n2026/08/17,10000,10000,,0"));
    expect(summary.returns.oneYear).toBeNull();
    expect(summary.returns.threeYear).toBeNull();
  });
});
