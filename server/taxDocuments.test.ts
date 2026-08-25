import { describe, expect, it } from "vitest";
import { buildTaxDocumentEstimate } from "../shared/taxDocuments";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("annual tax documents", () => {
  it("uses entered annual documents for iDeCo and housing-loan-credit arithmetic", () => {
    const result = buildTaxDocumentEstimate({ ...INITIAL_OWNER_PROFILE, taxDocuments: { taxYear: 2026, idecoContributionsPaid: 240_000, incomeTaxMarginalRate: 0.1, residentTaxRate: 0.1, mortgageYearEndBalance: 27_000_000, mortgageCreditRate: 0.007, mortgageCreditApplied: 170_000, residentTaxHousingCreditApplied: 20_000 } });
    expect(result.idecoTaxReduction).toBe(48_000);
    expect(result.idecoTaxReductionRange).toMatchObject({ low: 36_000, base: 48_000, high: 72_000, basedOnEnteredRate: true });
    expect(result.appliedCredit).toBe(190_000);
    expect(result.prepaymentEffectiveReturn).toBeCloseTo(INITIAL_OWNER_PROFILE.loanRate - 190_000 / 27_000_000);
    expect(result.isDocumentBacked).toBe(true);
  });

  it("does not mislabel estimates as document-backed when fields are missing", () => {
    const result = buildTaxDocumentEstimate(INITIAL_OWNER_PROFILE);
    expect(result.isDocumentBacked).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.idecoTaxReductionRange).toMatchObject({ low: 36_000, base: 48_000, high: 72_000, basedOnEnteredRate: false });
  });

  it("uses non-identifying salary withholding values as a 2025 reference without overwriting the target tax year", () => {
    const statement = INITIAL_OWNER_PROFILE.withholdingStatements![0]!;
    const result = buildTaxDocumentEstimate({ ...INITIAL_OWNER_PROFILE, taxDocuments: { taxYear: 2026, idecoContributionsPaid: 240_000, residentTaxRate: 0.1 } });
    expect(result.taxYear).toBe(2026);
    expect(result.incomeTaxRate).toBe(statement.derivedIncomeTaxMarginalRate);
    expect(result.appliedCredit).toBe(statement.mortgageCreditApplied);
    expect(result.sourceStatement).toMatchObject({ taxYear: statement.taxYear, salaryPayment: statement.salaryPayment, taxableIncomeEstimate: statement.taxableIncomeEstimate, mortgageCreditApplied: statement.mortgageCreditApplied, dependentCount: statement.dependentCount });
    expect(result.sourceStatement?.sourceLabel).toBe("給与所得の源泉徴収票");
    expect(result.sourceStatement).not.toHaveProperty("address");
    expect(result.sourceStatement).not.toHaveProperty("employeeName");
  });
});
