import type { WealthProfile } from "./wealth";
import { getLatestValidWithholdingStatement } from "./withholdingStatement";

export type AnnualTaxDocuments = {
  taxYear: number;
  idecoContributionsPaid?: number;
  incomeTaxMarginalRate?: number;
  residentTaxRate?: number;
  incomeTaxWithheld?: number;
  mortgageYearEndBalance?: number;
  mortgageCreditRate?: number;
  mortgageCreditApplied?: number;
  residentTaxHousingCreditApplied?: number;
};

export function buildTaxDocumentEstimate(profile: WealthProfile) {
  const doc = profile.taxDocuments;
  const sourceStatement = getLatestValidWithholdingStatement(profile.withholdingStatements);
  const idecoPaid = doc?.idecoContributionsPaid ?? profile.idecoMonthly * 12;
  const incomeTaxRate = doc?.incomeTaxMarginalRate ?? sourceStatement?.derivedIncomeTaxMarginalRate ?? null;
  const residentTaxRate = doc?.residentTaxRate ?? 0.1;
  const taxBenefit = (incomeRate: number) => Math.round(idecoPaid * (incomeRate + residentTaxRate));
  const idecoTaxReduction = incomeTaxRate === null ? null : taxBenefit(incomeTaxRate);
  const scenarioIncomeTaxRates = incomeTaxRate === null
    ? [0.05, 0.1, 0.2]
    : [Math.max(0, incomeTaxRate - 0.05), incomeTaxRate, Math.min(0.45, incomeTaxRate + 0.1)];
  const idecoTaxReductionRange = {
    low: taxBenefit(scenarioIncomeTaxRates[0]!),
    base: taxBenefit(scenarioIncomeTaxRates[1]!),
    high: taxBenefit(scenarioIncomeTaxRates[2]!),
    incomeTaxRates: scenarioIncomeTaxRates,
    basedOnEnteredRate: doc?.incomeTaxMarginalRate !== undefined,
  };
  const mortgageBalance = doc?.mortgageYearEndBalance ?? profile.loanBalance;
  const creditRate = doc?.mortgageCreditRate ?? profile.loanCreditRate;
  const statutoryMortgageCredit = mortgageBalance * creditRate;
  const appliedCredit = doc?.mortgageCreditApplied !== undefined
    ? doc.mortgageCreditApplied + (doc.residentTaxHousingCreditApplied ?? 0)
    : doc?.incomeTaxWithheld !== undefined
      ? Math.min(statutoryMortgageCredit, doc.incomeTaxWithheld + (doc.residentTaxHousingCreditApplied ?? 0))
      : sourceStatement?.mortgageCreditApplied ?? null;
  const effectiveCreditRate = appliedCredit === null || mortgageBalance <= 0 ? null : Math.min(profile.loanRate, appliedCredit / mortgageBalance);
  const prepaymentEffectiveReturn = effectiveCreditRate === null ? null : Math.max(0, profile.loanRate - effectiveCreditRate);
  const missing = [
    doc?.idecoContributionsPaid === undefined ? "iDeCo掛金払込証明書の年額" : null,
    doc?.incomeTaxMarginalRate === undefined && sourceStatement?.derivedIncomeTaxMarginalRate === undefined ? "所得税の限界税率（または確定申告の課税所得）" : null,
    doc?.mortgageYearEndBalance === undefined ? "住宅取得資金に係る借入金の年末残高" : null,
    doc?.mortgageCreditApplied === undefined && sourceStatement?.mortgageCreditApplied === undefined ? "住宅借入金等特別控除の適用額（所得税・住民税）" : null,
  ].filter((item): item is string => Boolean(item));
  return {
    taxYear: doc?.taxYear ?? sourceStatement?.taxYear ?? new Date().getFullYear(),
    idecoPaid,
    incomeTaxRate,
    residentTaxRate,
    idecoTaxReduction,
    idecoTaxReductionRange,
    mortgageBalance,
    creditRate,
    statutoryMortgageCredit,
    appliedCredit,
    effectiveCreditRate,
    prepaymentEffectiveReturn,
    missing,
    isDocumentBacked: missing.length === 0,
    sourceStatement: sourceStatement ? { taxYear: sourceStatement.taxYear, sourceLabel: sourceStatement.sourceLabel, salaryPayment: sourceStatement.salaryPayment, salaryIncomeAfterEmploymentDeduction: sourceStatement.salaryIncomeAfterEmploymentDeduction, totalIncomeDeductions: sourceStatement.totalIncomeDeductions, taxableIncomeEstimate: sourceStatement.taxableIncomeEstimate, socialInsuranceContributions: sourceStatement.socialInsuranceContributions, lifeInsuranceDeduction: sourceStatement.lifeInsuranceDeduction, earthquakeInsuranceDeduction: sourceStatement.earthquakeInsuranceDeduction, basicDeduction: sourceStatement.basicDeduction, spouseSpecialDeduction: sourceStatement.spouseSpecialDeduction, mortgageCreditApplied: sourceStatement.mortgageCreditApplied, dependentCount: sourceStatement.dependentCount, rateIsDerived: doc?.incomeTaxMarginalRate === undefined } : null,
  };
}
