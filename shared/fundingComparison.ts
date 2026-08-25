import { calculateWealthPlan, type WealthProfile } from "./wealth";
import { buildMonthlyFundingStatus } from "./fundingStatus";

const TAXABLE_CAPITAL_GAINS_TAX = 0.20315;

export type FundingComparison = {
  education: Array<{ child: string; milestone: string; years: number; target: number; monthlyNeed: number }>;
  educationMonthlyNeed: number;
  educationLongTermTotal: number;
  annualFreeCash: number;
  mortgage: {
    loanRate: number;
    creditYears: number;
    liquidityGuardrail: boolean;
    scenarios: Array<{ label: string; rate: number; netPrepaymentReturnDuringCredit: number; netPrepaymentReturnAfterCredit: number; nisaReturnGap: number; taxableReturnGap: number; action: string }>;
  };
  investment: { grossExpectedReturn: number; nisaAfterTaxReturn: number; taxableAfterTaxReturn: number; taxableTaxRate: number; note: string };
  priority: "教育・防衛資金" | "並行" | "繰上返済検討";
  explanation: string;
};

function paymentNeeded(target: number, years: number, annualYield = 0.01) {
  const months = Math.max(1, years * 12);
  const monthlyRate = annualYield / 12;
  return Math.round(target * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1));
}

export function buildFundingComparison(profile: WealthProfile): FundingComparison {
  const plan = calculateWealthPlan(profile);
  const monthlyFunding = buildMonthlyFundingStatus(profile);
  const highTotal = profile.privateHighSchoolAnnual * 3;
  const universityTotal = profile.privateUniversityAtHomeAnnual * 4;
  const firstHighYears = Math.max(1, 15 - profile.childOneAge);
  const secondHighYears = Math.max(1, 15 - profile.childTwoAge);
  const education = [
    { child: "第一子", milestone: "私立高校", years: firstHighYears, target: highTotal },
    { child: "第一子", milestone: "私立大学（自宅）", years: Math.max(firstHighYears, 18 - profile.childOneAge), target: universityTotal },
    { child: "第二子", milestone: "私立高校", years: secondHighYears, target: highTotal },
    { child: "第二子", milestone: "私立大学（自宅）", years: Math.max(secondHighYears, 18 - profile.childTwoAge), target: universityTotal },
  ].map(item => ({ ...item, monthlyNeed: paymentNeeded(item.target, item.years) }));
  const nearTermEducation = monthlyFunding.cashPurposes.find(purpose => purpose.id === "education");
  const educationMonthlyNeed = nearTermEducation?.monthlyTransfer ?? 0;
  const educationLongTermTotal = monthlyFunding.longTermPlans.find(item => item.id === "education")?.totalEstimate ?? 0;
  const annualFreeCash = Math.max(0, plan.annualSurplusAfterInvesting);
  const nisaAfterTaxReturn = Math.max(0, profile.expectedReturn);
  const taxableAfterTaxReturn = Math.max(0, profile.expectedReturn * (1 - TAXABLE_CAPITAL_GAINS_TAX));
  const liquidityGuardrail = plan.cashCoverageMonths >= 12 && monthlyFunding.fundingGap === 0 && (nearTermEducation?.gap ?? 0) === 0;
  const scenarios = [
    { label: "現状金利", rate: profile.loanRate },
    { label: "金利 +0.5%", rate: profile.loanRate + 0.005 },
    { label: "金利 +1.0%", rate: profile.loanRate + 0.01 },
  ].map(scenario => {
    const netPrepaymentReturnDuringCredit = Math.max(0, scenario.rate - profile.loanCreditRate);
    const netPrepaymentReturnAfterCredit = scenario.rate;
    const action = !liquidityGuardrail
      ? "教育・防衛資金が先。繰上返済には充当しない。"
      : scenario.rate >= taxableAfterTaxReturn
        ? "控除終了後は繰上返済を課税口座投資と再比較。"
        : "NISA長期投資との優劣は不確実。流動性を維持しながら定期再判定。";
    return { ...scenario, netPrepaymentReturnDuringCredit, netPrepaymentReturnAfterCredit, nisaReturnGap: nisaAfterTaxReturn - netPrepaymentReturnAfterCredit, taxableReturnGap: taxableAfterTaxReturn - netPrepaymentReturnAfterCredit, action };
  });
  const priority = !liquidityGuardrail ? "教育・防衛資金" : profile.loanCreditYears > 0 ? "並行" : "繰上返済検討";
  const explanation = priority === "教育・防衛資金"
    ? "近期限の教育現金または12か月の生活防衛資金が不足しています。流動性を失う繰上返済より、目的資金の確保を先行します。"
    : priority === "並行"
      ? "住宅ローン控除中は、利息削減の一部が控除減少で相殺されます。教育・防衛資金を残し、控除終了時または金利上昇時に再比較します。"
      : "教育・防衛資金を満たす余剰がある場合のみ、控除終了後の繰上返済を比較候補にします。";
  return { education, educationMonthlyNeed, educationLongTermTotal, annualFreeCash, mortgage: { loanRate: profile.loanRate, creditYears: profile.loanCreditYears, liquidityGuardrail, scenarios }, investment: { grossExpectedReturn: profile.expectedReturn, nisaAfterTaxReturn, taxableAfterTaxReturn, taxableTaxRate: TAXABLE_CAPITAL_GAINS_TAX, note: "NISAは売却益・分配金が非課税、課税口座は譲渡益・分配金の税率20.315%を単純化して反映。iDeCoの所得控除・受取時課税は個別の所得・受取方法で異なるため、この比較率には混在させません。" }, priority, explanation };
}
