import { describe, expect, it } from "vitest";
import { buildRecommendation } from "../shared/recommendation";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("recommendation engine", () => {
  it("produces deterministic results with a feasible target portfolio", () => {
    const first = buildRecommendation(INITIAL_OWNER_PROFILE);
    const second = buildRecommendation(INITIAL_OWNER_PROFILE);
    expect(first.paths).toBe(5_000);
    expect(first.recommended).toEqual(second.recommended);
    expect(first.recommended.weights.equity + first.recommended.weights.bonds + first.recommended.weights.gold).toBeCloseTo(1);
    expect(first.actionPlan.map(item => item.priority)).toEqual(["今月", "年内", "条件付き"]);
  });

  it("includes a caveat for every tax-aware comparison", () => {
    const result = buildRecommendation(INITIAL_OWNER_PROFILE);
    expect(result.taxComparison).toHaveLength(4);
    expect(result.taxComparison.every(item => item.caveat.length > 0)).toBe(true);
    expect(result.taxComparison.some(item => item.action.includes("現金"))).toBe(true);
    expect(result.implementationCandidates.every(item => item.includes("月") || item.includes("リバランス") || item.includes("NISA"))).toBe(true);
  });

  it("discloses product evidence and a non-exhaustive comparison universe", () => {
    const result = buildRecommendation(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    expect(result.productEvidence).toHaveLength(6);
    expect(result.productEvidence.every(item => item.sourceUrl.startsWith("https://"))).toBe(true);
    expect(result.productEvidence.some(item => item.decision === "追加停止")).toBe(true);
    expect(result.comparisonScope.exclusions).toContain("全ETF");
    expect(result.comparisonScope.sourceAsOf).toBe("2026-08-18T00:00:00.000Z");
  });

  it("defers NISA buying in the monthly action context when the saved annual allowance is exhausted", () => {
    const result = buildRecommendation({ ...INITIAL_OWNER_PROFILE, nisaRecords: { taxYear: 2026, tsumitateAllowance: 1_200_000, growthAllowance: 2_400_000, tsumitateUsed: 1_200_000, growthUsed: 2_400_000, purchases: [] } });
    expect(result.actionPlan[0].action).toContain("新規買付は保留");
    expect(result.taxComparison.find(item => item.liquidity === "中")?.action).toContain("残枠0円");
  });

  it("uses same-month recorded purchases to avoid duplicate immediate NISA buying suggestions", () => {
    const result = buildRecommendation({ ...INITIAL_OWNER_PROFILE, nisaRecords: { taxYear: 2026, tsumitateAllowance: 1_200_000, growthAllowance: 2_400_000, tsumitateUsed: 0, growthUsed: 0, purchases: [{ id: "1", tradeDate: "2026-08-10", codeOrFund: "2559", name: "MAXIS全世界株式", allowance: "成長投資枠", amount: 100_000 }] } }, "2026-08-18T00:00:00.000Z");
    expect(result.actionPlan[0].action).toContain("当月の買付履歴");
  });

  it("uses disclosed withholding income as a historical baseline rather than a future guarantee", () => {
    const statement = INITIAL_OWNER_PROFILE.withholdingStatements![0]!;
    const result = buildRecommendation({ ...INITIAL_OWNER_PROFILE, annualIncome: 1_000_000, withholdingStatements: [statement] }, "2026-08-18T00:00:00.000Z");
    expect(result.incomeContext).toMatchObject({ annualIncome: statement.salaryPayment, sourceTaxYear: statement.taxYear });
    expect(result.incomeContext.source).toContain("将来の増減を織り込まない");
  });

  it("separates exhausted growth allowance from remaining tsumitate allowance in the monthly action", () => {
    const result = buildRecommendation(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    expect(result.actionPlan[0].action).toContain("成長投資枠は残枠0円");
    expect(result.taxComparison.find(item => item.liquidity === "中")?.action).toContain("つみたて投資枠残120万円");
  });

  it("states one exact product and monthly amount for each investable account while stopping additions to current satellite holdings", () => {
    const result = buildRecommendation(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    expect(result.monthlyProductRecommendations).toEqual(expect.arrayContaining([
      expect.objectContaining({ account: "NISAつみたて投資枠", fundName: "eMAXIS Slim 全世界株式（オール・カントリー）", monthlyAmount: 50_000, allocationPercent: 100, status: "積立を提案" }),
      expect.objectContaining({ account: "SBI証券 iDeCo", fundName: "eMAXIS Slim 全世界株式（除く日本）", monthlyAmount: 20_000, allocationPercent: 100, status: "積立を提案" }),
    ]));
    expect(result.existingHoldingInstructions).toHaveLength(INITIAL_OWNER_PROFILE.holdings.length);
    expect(result.existingHoldingInstructions.every(item => item.monthlyAmount === 0)).toBe(true);
    expect(result.monthlyProductRecommendations.every(item => item.changesWhen.length > 0 && item.sourceUrl.startsWith("https://"))).toBe(true);
  });

  it("sets product-level purchases to zero when near-term education funding removes monthly investing capacity", () => {
    const result = buildRecommendation({ ...INITIAL_OWNER_PROFILE, childOneAge: 14, cashTotal: 3_209_004, spousePersonalCash: 0, userPersonalCash: 0 }, "2026-08-18T00:00:00.000Z");
    expect(result.monthlyProductRecommendations.map(item => item.monthlyAmount)).toEqual([0, 0]);
    expect(result.monthlyProductRecommendations.every(item => item.status === "今月は保留")).toBe(true);
  });
});
