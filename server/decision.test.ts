import { describe, expect, it } from "vitest";
import { buildMonthlyDecision } from "../client/src/lib/decision";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("monthly decision waterfall", () => {
  it("permits configured iDeCo and NISA only after near-term cash goals are funded", () => {
    const result = buildMonthlyDecision(INITIAL_OWNER_PROFILE);
    expect(result.recommendation.action).toBe("iDeCo・NISAの設定額を継続");
    expect(result.recommendation.nisa).toBe(INITIAL_OWNER_PROFILE.nisaMonthly);
    expect(result.recommendation.ideco).toBe(INITIAL_OWNER_PROFILE.idecoMonthly);
    expect(result.steps).toHaveLength(6);
  });

  it("defers new investment when take-home cash flow cannot cover reserves", () => {
    const result = buildMonthlyDecision({ ...INITIAL_OWNER_PROFILE, annualIncome: 3_000_000, monthlyHouseholdTakeHome: 200_000, annualHouseholdBonusTakeHome: 0 });
    expect(result.recommendation.action).toBe("新規買付を見送り");
    expect(result.recommendation.nisa).toBe(0);
  });

  it("holds additional buying when macro data is unavailable", () => {
    const result = buildMonthlyDecision(INITIAL_OWNER_PROFILE, false);
    expect(result.recommendation.action).toBe("市場データ更新待ち");
    expect(result.recommendation.nisa).toBe(0);
  });
});
