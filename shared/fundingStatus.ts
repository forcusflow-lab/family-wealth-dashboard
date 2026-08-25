import { buildEducationFundingStages, EDUCATION_CASH_HORIZON_YEARS, getCashAccountPurposeTotals, getCashPosition, type CashAccountPurposeTotals, type WealthProfile } from "./wealth";

export type CashPurposeId = "emergency" | "annual" | "education" | "home";

export type CashPurposeStatus = {
  id: CashPurposeId;
  label: string;
  currentAllocated: number;
  cashTarget: number;
  gap: number;
  monthlyTransfer: number;
  monthsToFund: number;
  due: string;
  nextAction: string;
  status: "funded" | "funding";
  color: string;
};

export type LongTermFundingPlan = {
  id: "education" | "retirement";
  label: string;
  totalEstimate: number;
  timing: string;
  nextReview: string;
  detail: string;
};

export type MonthlyFundingStatus = {
  monthlyRegularTakeHome: number;
  annualBonusTakeHome: number;
  monthlyBaseSpending: number;
  monthlyFlexBuffer: number;
  accountPurposeTotals: CashAccountPurposeTotals;
  unallocatedCashAfterRouting: number;
  cashPurposes: CashPurposeStatus[];
  monthlyCashTransfers: number;
  afterCashTransfers: number;
  recommendedIdeco: number;
  recommendedNisa: number;
  unallocatedMonthlySurplus: number;
  fundingGap: number;
  investmentAllowed: boolean;
  longTermPlans: LongTermFundingPlan[];
};

const roundUpHundred = (value: number) => Math.max(0, Math.ceil(value / 100) * 100);

/**
 * 一つの数字に意味を混ぜないための共通資金計画。
 * 目的指定済み口座は保護し、未割当現金だけを 生活防衛→年払い→近期限教育→住宅維持 の順に仮想配分し、
 * 今月の移動額は未充足分だけを残存期間で月割りする。
 */
export function buildMonthlyFundingStatus(profile: WealthProfile): MonthlyFundingStatus {
  const cash = getCashPosition(profile);
  const accountPurposeTotals = getCashAccountPurposeTotals(profile);
  const stages = buildEducationFundingStages(profile);
  const monthlyBaseSpending = profile.monthlyLiving + profile.monthlyCoop + profile.monthlyMutualAid + profile.loanMonthlyPayment;
  const monthlyRegularTakeHome = profile.monthlyHouseholdTakeHome > 0 ? profile.monthlyHouseholdTakeHome : profile.annualIncome / 12;
  const annualBonusTakeHome = Math.max(0, profile.annualHouseholdBonusTakeHome ?? 0);
  const monthlyFlexBuffer = Math.max(30_000, roundUpHundred(monthlyRegularTakeHome * 0.05));
  const emergencyTarget = monthlyBaseSpending * 12;
  const annualTarget = profile.annualPropertyTax + profile.annualTravel + profile.annualHomeInsuranceReserve;
  const nearTermStages = stages.filter(stage => stage.yearsUntilStart <= EDUCATION_CASH_HORIZON_YEARS);
  const educationTarget = nearTermStages.reduce((sum, stage) => sum + stage.target, 0);
  const nearTermChildSavings = nearTermStages.reduce((sum, stage) => sum + stage.childSavings, 0);

  let unallocatedCash = accountPurposeTotals.unallocated;
  const allocate = (target: number) => {
    const allocated = Math.min(unallocatedCash, Math.max(0, target));
    unallocatedCash -= allocated;
    return allocated;
  };
  const emergencyAllocated = Math.min(emergencyTarget, accountPurposeTotals.emergency + allocate(Math.max(0, emergencyTarget - accountPurposeTotals.emergency)));
  const annualAllocated = Math.min(annualTarget, accountPurposeTotals.annual + allocate(Math.max(0, annualTarget - accountPurposeTotals.annual)));
  const dedicatedEducationAccountCash = (profile.cashAccounts ?? [])
    .filter(account => account.purpose === "education" && account.owner !== "第1子" && account.owner !== "第2子")
    .reduce((sum, account) => sum + Math.max(0, account.balance), 0);
  const educationAllocated = Math.min(educationTarget, dedicatedEducationAccountCash + nearTermChildSavings + allocate(Math.max(0, educationTarget - dedicatedEducationAccountCash - nearTermChildSavings)));
  const homeAllocated = Math.min(profile.homeMaintenanceTarget, accountPurposeTotals.home + allocate(Math.max(0, profile.homeMaintenanceTarget - accountPurposeTotals.home)));

  const firstEducation = nearTermStages[0];
  const rawPurposes: Array<Omit<CashPurposeStatus, "gap" | "monthlyTransfer" | "status">> = [
    {
      id: "emergency",
      label: "生活防衛",
      currentAllocated: emergencyAllocated,
      cashTarget: emergencyTarget,
      due: "常時維持",
      nextAction: "不足分は、投資より先に生活防衛用の現金へ移します。",
      color: "#33B98E",
      monthsToFund: 12,
    },
    {
      id: "annual",
      label: "年払い・旅行",
      currentAllocated: annualAllocated,
      cashTarget: annualTarget,
      due: "次の支払月まで",
      nextAction: "固定資産税・旅行・保険に使う分を、目的別の現金として積み立てます。",
      color: "#38A6A0",
      monthsToFund: 12,
    },
    ...(educationTarget > 0 ? [{
      id: "education" as const,
      label: "近期限教育費",
      currentAllocated: educationAllocated,
      cashTarget: educationTarget,
      due: `${firstEducation?.label ?? "進学"}まで約${firstEducation?.yearsUntilStart ?? 0}年`,
      nextAction: `支出開始まで${EDUCATION_CASH_HORIZON_YEARS}年以内の教育費だけを、値動きのない現金で確保します。`,
      color: "#F4A261",
      monthsToFund: Math.max(1, (firstEducation?.yearsUntilStart ?? 1) * 12),
    }] : []),
    {
      id: "home",
      label: "住宅維持",
      currentAllocated: homeAllocated,
      cashTarget: profile.homeMaintenanceTarget,
      due: `${profile.homeMaintenanceHorizonYears ?? 10}年以内の点検・修繕に備える`,
      nextAction: "点検・見積りが出るまでは、修繕用の現金として積み立てます。",
      color: "#7C8CFF",
      monthsToFund: Math.max(1, (profile.homeMaintenanceHorizonYears ?? 10) * 12),
    },
  ];
  const cashPurposes = rawPurposes.map(purpose => {
    const gap = Math.max(0, purpose.cashTarget - purpose.currentAllocated);
    return {
      ...purpose,
      gap,
      monthlyTransfer: gap > 0 ? roundUpHundred(gap / purpose.monthsToFund) : 0,
      status: gap === 0 ? "funded" as const : "funding" as const,
    };
  });
  const monthlyCashTransfers = cashPurposes.reduce((sum, purpose) => sum + purpose.monthlyTransfer, 0);
  const afterCashTransfers = monthlyRegularTakeHome - monthlyBaseSpending - monthlyFlexBuffer - monthlyCashTransfers;
  const fundingGap = Math.max(0, -afterCashTransfers);
  const investableAfterCash = Math.max(0, afterCashTransfers);
  const recommendedIdeco = investableAfterCash >= profile.idecoMonthly ? profile.idecoMonthly : 0;
  const recommendedNisa = investableAfterCash - recommendedIdeco >= profile.nisaMonthly ? profile.nisaMonthly : 0;
  const unallocatedMonthlySurplus = Math.max(0, investableAfterCash - recommendedIdeco - recommendedNisa);
  const futureEducationTotal = stages.filter(stage => stage.yearsUntilStart > EDUCATION_CASH_HORIZON_YEARS).reduce((sum, stage) => sum + stage.target, 0);
  const nextLongTermEducation = stages.find(stage => stage.yearsUntilStart > EDUCATION_CASH_HORIZON_YEARS);
  const retirementTarget = Math.max(0, (profile.retirementMonthlySpend - profile.pensionMonthlyEstimate) * 12 * profile.retirementYears);
  const longTermPlans: LongTermFundingPlan[] = [
    ...(futureEducationTotal > 0 ? [{
      id: "education" as const,
      label: "長期教育計画",
      totalEstimate: futureEducationTotal,
      timing: `${nextLongTermEducation?.label ?? "進学"}まで約${nextLongTermEducation?.yearsUntilStart ?? 0}年`,
      nextReview: `支出開始の${EDUCATION_CASH_HORIZON_YEARS}年前に現金化を始める`,
      detail: "これは今月の現金目標ではありません。生活防衛と近期限教育費を確保した後、長期の資産配分で検討します。",
    }] : []),
    {
      id: "retirement",
      label: "老後の長期計画",
      totalEstimate: retirementTarget,
      timing: `${Math.max(0, profile.retirementAge - profile.currentAge)}年後の退職開始を仮定`,
      nextReview: "年1回、年金見込額・退職時期・住宅費で再試算",
      detail: "今すぐ現金で用意する目標ではありません。教育費・住宅費が落ち着くまでの長期資産形成として扱います。",
    },
  ];
  return {
    monthlyRegularTakeHome,
    annualBonusTakeHome,
    monthlyBaseSpending,
    monthlyFlexBuffer,
    accountPurposeTotals,
    unallocatedCashAfterRouting: unallocatedCash,
    cashPurposes,
    monthlyCashTransfers,
    afterCashTransfers,
    recommendedIdeco,
    recommendedNisa,
    unallocatedMonthlySurplus,
    fundingGap,
    investmentAllowed: fundingGap === 0 && (recommendedIdeco > 0 || recommendedNisa > 0),
    longTermPlans,
  };
}
