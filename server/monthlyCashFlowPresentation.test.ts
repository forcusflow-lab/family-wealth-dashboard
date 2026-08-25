import { describe, expect, it } from "vitest";
import { buildMonthlyCashFlowPresentation } from "../shared/monthlyCashFlowPresentation";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("monthly cash-flow presentation", () => {
  it("labels the retained living reserve as a positive safety amount instead of a deficit", () => {
    const result = buildMonthlyCashFlowPresentation(INITIAL_OWNER_PROFILE);
    expect(result).toMatchObject({ livingReserve: 30_000, livingReserveLabel: "生活口座に残す安全余力", isCashFlowDeficit: false });
    expect(result.beforeInvestmentRemainder).toBeGreaterThan(0);
  });

  it("reports a deficit only when income cannot cover spending, cash transfers, and the living reserve", () => {
    const result = buildMonthlyCashFlowPresentation({ ...INITIAL_OWNER_PROFILE, monthlyHouseholdTakeHome: 250_000 });
    expect(result.isCashFlowDeficit).toBe(true);
    expect(result.deficitAmount).toBeGreaterThan(0);
    expect(result.statusLabel).toBe("月次の資金不足");
  });
});
