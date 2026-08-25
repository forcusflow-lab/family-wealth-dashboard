import { describe, expect, it } from "vitest";
import { buildReturnComparison } from "../shared/returnComparison";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("return comparison", () => {
  const weights = { equity: 0.7, bonds: 0.2, gold: 0.1 };

  it("shows tax-aware expected returns without treating the iDeCo deduction as investment return", () => {
    const result = buildReturnComparison(INITIAL_OWNER_PROFILE, weights);
    const nisa = result.vehicles.find(item => item.id === "NISA");
    const taxable = result.vehicles.find(item => item.id === "課税口座");
    expect(nisa?.expectedAnnualAfterTax).toBeGreaterThan(taxable?.expectedAnnualAfterTax ?? 0);
    expect(result.idecoTaxSavingRange.annualContribution).toBe(INITIAL_OWNER_PROFILE.idecoMonthly * 12);
    expect(result.idecoTaxSavingRange.low).toBeLessThan(result.idecoTaxSavingRange.high);
  });

  it("reduces prepayment return only while the housing-loan credit remains", () => {
    const result = buildReturnComparison(INITIAL_OWNER_PROFILE, weights);
    const duringCredit = result.prepayment[0];
    const afterCredit = result.prepayment[1];
    expect(duringCredit?.effectiveAnnualReturn).toBeLessThan(afterCredit?.effectiveAnnualReturn ?? 0);
    expect(result.prepayment[3]?.effectiveAnnualReturn).toBeCloseTo(INITIAL_OWNER_PROFILE.loanRate + 0.01);
  });

  it("narrows annualized uncertainty bands as horizon grows without presenting them as guaranteed", () => {
    const result = buildReturnComparison(INITIAL_OWNER_PROFILE, weights);
    const yearOne = result.bands[0];
    const yearTen = result.bands[1];
    expect(yearOne.p90Annualized - yearOne.p10Annualized).toBeGreaterThan(yearTen.p90Annualized - yearTen.p10Annualized);
    expect(result.methodology.some(item => item.includes("保証"))).toBe(true);
  });
});
