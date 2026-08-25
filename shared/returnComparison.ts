import type { WealthProfile } from "./wealth";

const TAXABLE_INVESTMENT_TAX = 0.20315;
const MODEL_FEE = 0.002;
const Z90 = 1.28155;

export type AllocationWeights = { equity: number; bonds: number; gold: number };
export type ReturnBand = { horizonYears: number; expectedAnnualNominal: number; p10Annualized: number; p90Annualized: number };
export type ReturnVehicle = { id: "NISA" | "課税口座" | "iDeCo"; label: string; expectedAnnualAfterTax: number; taxBenefitNote: string; liquidity: "高" | "中" | "低" };
export type PrepaymentReturn = { label: string; loanRate: number; effectiveAnnualReturn: number; creditAdjustment: number; creditPeriod: "控除中" | "控除終了後"; decisionGuardrail: string };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function buildReturnComparison(profile: WealthProfile, weights: AllocationWeights) {
  const grossExpected = weights.equity * 0.06 + weights.bonds * 0.025 + weights.gold * 0.03 - MODEL_FEE;
  const annualVolatility = Math.sqrt(
    Math.pow(weights.equity * 0.18, 2)
      + Math.pow(weights.bonds * 0.07, 2)
      + Math.pow(weights.gold * 0.17, 2),
  );
  const bands: ReturnBand[] = [1, 10, 27].map(horizonYears => {
    const deviation = Z90 * annualVolatility / Math.sqrt(horizonYears);
    return {
      horizonYears,
      expectedAnnualNominal: grossExpected,
      p10Annualized: clamp(grossExpected - deviation, -0.99, 1),
      p90Annualized: clamp(grossExpected + deviation, -0.99, 1),
    };
  });
  const taxableAfterTax = grossExpected * (1 - TAXABLE_INVESTMENT_TAX);
  const vehicles: ReturnVehicle[] = [
    { id: "NISA", label: "NISA内の長期投資", expectedAnnualAfterTax: grossExpected, taxBenefitNote: "売却益・配当／分配金が非課税。制度枠・対象商品・損益通算不可を別途確認。", liquidity: "中" },
    { id: "課税口座", label: "課税口座の長期投資", expectedAnnualAfterTax: taxableAfterTax, taxBenefitNote: `比較用に、毎年の運用益へ税率${(TAXABLE_INVESTMENT_TAX * 100).toFixed(3)}%を単純適用。実際の課税時期・損益通算は異なる。`, liquidity: "中" },
    { id: "iDeCo", label: "iDeCo内の長期投資", expectedAnnualAfterTax: grossExpected, taxBenefitNote: "運用益は非課税で再投資。掛金全額は所得控除の対象だが、受取時課税と原則60歳までの引出制限がある。", liquidity: "低" },
  ];
  const marginalTaxRates = [0.12, 0.2, 0.3];
  const annualIdecoContribution = profile.idecoMonthly * 12;
  const idecoTaxSavingRange = {
    annualContribution: annualIdecoContribution,
    low: annualIdecoContribution * marginalTaxRates[0],
    central: annualIdecoContribution * marginalTaxRates[1],
    high: annualIdecoContribution * marginalTaxRates[2],
    rates: marginalTaxRates,
  };
  const creditAdjustment = profile.loanCreditYears > 0 ? Math.min(profile.loanRate, profile.loanCreditRate) : 0;
  const makePrepayment = (label: string, loanRate: number, creditPeriod: "控除中" | "控除終了後"): PrepaymentReturn => {
    const adjustment = creditPeriod === "控除中" ? Math.min(loanRate, profile.loanCreditRate) : 0;
    return {
      label,
      loanRate,
      creditPeriod,
      creditAdjustment: adjustment,
      effectiveAnnualReturn: Math.max(0, loanRate - adjustment),
      decisionGuardrail: "生活防衛資金12か月分と教育資金の月次必要額を満たす余剰に限って比較。",
    };
  };
  const prepayment: PrepaymentReturn[] = [
    makePrepayment("現状・控除中", profile.loanRate, "控除中"),
    makePrepayment("現状・控除終了後", profile.loanRate, "控除終了後"),
    makePrepayment("金利 +0.5%・控除終了後", profile.loanRate + 0.005, "控除終了後"),
    makePrepayment("金利 +1.0%・控除終了後", profile.loanRate + 0.01, "控除終了後"),
  ];
  return {
    grossExpected,
    annualVolatility,
    bands,
    vehicles,
    idecoTaxSavingRange,
    prepayment,
    methodology: [
      "株式6.0%・債券2.5%・金3.0%の名目期待リターン、年率0.20%の費用、資産間の相関を0と置く簡易モデルです。",
      "10%点・90%点は正規分布近似による年率換算レンジであり、市場の予言・商品固有の将来年利・保証利回りではありません。",
      "課税口座の税引後年率は税率20.315%を単純適用した比較値です。NISA・iDeCoの制度適用や住宅ローン控除の実額は年次書類で確認が必要です。",
    ],
  };
}
