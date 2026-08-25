import { describe, expect, it } from "vitest";
import { buildFundingComparison } from "../shared/fundingComparison";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("funding comparison", () => {
  it("prioritizes education and liquidity when a near-term education cash need is unfunded", () => {
    const comparison = buildFundingComparison({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], childOneAge: 14, annualIncome: 4_800_000, cashTotal: 0, spousePersonalCash: 0, userPersonalCash: 0 });
    expect(comparison.education).toHaveLength(4);
    expect(comparison.educationMonthlyNeed).toBeGreaterThan(0);
    expect(comparison.priority).toBe("教育・防衛資金");
  });

  it("does not treat distant education costs as a current monthly cash transfer", () => {
    const comparison = buildFundingComparison(INITIAL_OWNER_PROFILE);
    expect(comparison.educationMonthlyNeed).toBe(0);
    expect(comparison.educationLongTermTotal).toBeGreaterThan(0);
  });

  it("models credit-period, rate-rise, and tax-aware investment comparisons", () => {
    const comparison = buildFundingComparison(INITIAL_OWNER_PROFILE);
    expect(comparison.mortgage.scenarios).toHaveLength(3);
    expect(comparison.mortgage.scenarios[0].netPrepaymentReturnDuringCredit).toBeLessThan(comparison.mortgage.scenarios[0].netPrepaymentReturnAfterCredit);
    expect(comparison.mortgage.scenarios[2].rate).toBeCloseTo(INITIAL_OWNER_PROFILE.loanRate + 0.01);
    expect(comparison.investment.nisaAfterTaxReturn).toBeGreaterThan(comparison.investment.taxableAfterTaxReturn);
  });
});
