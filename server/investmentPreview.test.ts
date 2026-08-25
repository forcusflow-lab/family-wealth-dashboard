import { describe, expect, it } from "vitest";
import { buildInvestmentPreview } from "../shared/investmentPreview";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("investment amount preview", () => {
  it("recalculates funding, product proposals, and asset projection from unsaved monthly inputs", () => {
    const saved = buildInvestmentPreview(INITIAL_OWNER_PROFILE, { nisaMonthly: 50_000, idecoMonthly: 20_000 }, new Date("2026-08-19T00:00:00.000Z"));
    const higher = buildInvestmentPreview(INITIAL_OWNER_PROFILE, { nisaMonthly: 100_000, idecoMonthly: 20_000 }, new Date("2026-08-19T00:00:00.000Z"));

    expect(higher.previewProfile).toMatchObject({ nisaMonthly: 100_000, idecoMonthly: 20_000 });
    expect(higher.requestedMonthlyInvestment).toBe(120_000);
    expect(higher.recommendation.monthlyProductRecommendations.find(item => item.id === "nisa-core")?.monthlyAmount).toBe(100_000);
    expect(higher.projection.nisaContext.annualContribution).toBe(1_200_000);
    expect(higher.baseEndAssets).toBeGreaterThan(saved.baseEndAssets);
    expect(INITIAL_OWNER_PROFILE.nisaMonthly).toBe(50_000);
  });

  it("rounds slider values, respects the current NISA limit, and blocks saving when monthly capacity is exceeded", () => {
    const exhausted = buildInvestmentPreview({ ...INITIAL_OWNER_PROFILE, nisaRecords: { ...INITIAL_OWNER_PROFILE.nisaRecords!, tsumitateRemainingOverride: 0 } }, { nisaMonthly: 50_400, idecoMonthly: 20_400 }, new Date("2026-08-19T00:00:00.000Z"));
    expect(exhausted.input).toMatchObject({ nisaMonthly: 0, idecoMonthly: 20_000 });

    const unsafe = buildInvestmentPreview({ ...INITIAL_OWNER_PROFILE, monthlyHouseholdTakeHome: 300_000 }, { nisaMonthly: 100_000, idecoMonthly: 23_000 }, new Date("2026-08-19T00:00:00.000Z"));
    expect(unsafe.withinMonthlyCapacity).toBe(false);
    expect(unsafe.canSave).toBe(false);
    expect(unsafe.saveBoundary).toContain("注文・買付・振替は実行しません");
  });
});
