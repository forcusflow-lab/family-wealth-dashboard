import { describe, expect, it } from "vitest";
import { buildNisaReview, getNisaAllowanceStatus, NISA_ORDER_SAFETY_COPY, NISA_UNIVERSE_SCOPE, RECOMMENDATION_HUB_LINKS, validateNisaRecords } from "../shared/nisaComparison";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("NISA comparison", () => {
  it("states the official universe scope without ranking all products by future return", () => {
    const result = buildNisaReview(INITIAL_OWNER_PROFILE);
    expect(NISA_UNIVERSE_SCOPE.tsumitateCount).toBe(361);
    expect(result.universe.coverage).toContain("順位付けはしない");
    expect(result.disclaimer).toContain("注文・売買を実行しません");
  });

  it("marks new risk-asset buying as on hold when the emergency bucket is short", () => {
    const result = buildNisaReview({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], cashTotal: 0, spousePersonalCash: 0, userPersonalCash: 0 });
    expect(result.emergencyShortfall).toBeGreaterThan(0);
    expect(result.reviews.find(item => item.id === "emaxis-ac")?.decision).toBe("追加買付は保留");
  });

  it("keeps emergency, education, housing, retirement, and long-term growth under distinct selection rules", () => {
    const result = buildNisaReview({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], cashTotal: 0, spousePersonalCash: 0, userPersonalCash: 0 });
    const nearTermEducation = buildNisaReview({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], childOneAge: 14, cashTotal: 3_209_004, spousePersonalCash: 0, userPersonalCash: 0 });
    expect(result.reviews.find(item => item.id === "2559")?.feeRate).toBeGreaterThan(0);
    expect(result.purposeSelections.find(item => item.purpose === "生活防衛")?.nisaRole).toBe("対象外");
    expect(result.purposeSelections.find(item => item.purpose === "教育")?.nisaRole).toBe("広範囲コア候補");
    expect(nearTermEducation.purposeSelections.find(item => item.purpose === "教育")?.nisaRole).toBe("安全資産を優先");
    expect(result.purposeSelections.find(item => item.purpose === "老後")?.nisaRole).toBe("広範囲コア候補");
  });

  it("calculates saved annual allowance, validates history, and retains no-order safety copy", () => {
    const records = { taxYear: 2026, tsumitateAllowance: 1_200_000, growthAllowance: 2_400_000, tsumitateUsed: 300_000, growthUsed: 2_000_000, purchases: [{ id: "1", tradeDate: "2026-01-15", codeOrFund: "2559", name: "MAXIS全世界株式", allowance: "成長投資枠" as const, amount: 200_000 }] };
    expect(getNisaAllowanceStatus({ ...INITIAL_OWNER_PROFILE, nisaRecords: records })).toMatchObject({ state: "入力済み", totalRemaining: 1_300_000, purchaseCount: 1 });
    expect(validateNisaRecords({ ...records, growthUsed: 2_500_000 })).toContain("成長投資枠の利用額が年間枠を超えています。証券会社画面で確認してください。");
    expect(NISA_ORDER_SAFETY_COPY).toContain("注文・売買を実行しません");
  });

  it("uses recorded purchases and broker-displayed remaining allowance in the review context", () => {
    const records = { taxYear: 2026, tsumitateAllowance: 1_200_000, growthAllowance: 2_400_000, tsumitateUsed: 0, growthUsed: 0, growthRemainingOverride: 0, purchases: [{ id: "1", tradeDate: "2026-08-05", codeOrFund: "2559", name: "MAXIS全世界株式", allowance: "つみたて投資枠" as const, amount: 100_000 }] };
    const review = buildNisaReview({ ...INITIAL_OWNER_PROFILE, nisaRecords: records });
    expect(review.allowance.tsumitateRemaining).toBe(1_100_000);
    expect(review.allowance.growthRemaining).toBe(0);
    expect(review.reviews.find(item => item.id === "2559")?.rationale).toContain("買付履歴1件");
    expect(RECOMMENDATION_HUB_LINKS.map(link => link.path)).toEqual(expect.arrayContaining(["/recommendation", "/portfolio-audit", "/decision-evidence"]));
  });

  it("holds growth-only ETFs when the growth allowance is exhausted but retains the tsumitate context", () => {
    const review = buildNisaReview(INITIAL_OWNER_PROFILE);
    expect(review.allowance).toMatchObject({ growthRemaining: 0, tsumitateRemaining: 1_200_000 });
    expect(review.reviews.find(item => item.id === "2559")).toMatchObject({ decision: "追加買付は保留" });
    expect(review.reviews.find(item => item.id === "2559")?.rationale).toContain("成長投資枠の残枠が0円");
    expect(review.reviews.find(item => item.id === "emaxis-ac")?.decision).toBe("コア候補");
  });
});
