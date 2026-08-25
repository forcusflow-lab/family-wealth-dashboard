export type Holding = {
  code: string;
  name: string;
  value: number;
  assetClass: "株式" | "債券" | "金";
  note: string;
};

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

export type WithholdingStatementRecord = {
  taxYear: number;
  sourceLabel: "給与所得の源泉徴収票";
  salaryPayment: number;
  salaryIncomeAfterEmploymentDeduction: number;
  totalIncomeDeductions: number;
  taxableIncomeEstimate: number;
  incomeTaxWithheld: number;
  socialInsuranceContributions: number;
  lifeInsuranceDeduction: number;
  earthquakeInsuranceDeduction: number;
  basicDeduction: number;
  spouseSpecialDeduction: number;
  mortgageCreditApplied: number;
  dependentCount: number;
  derivedIncomeTaxMarginalRate: number;
};

export type NisaPurchaseRecord = {
  id: string;
  tradeDate: string;
  codeOrFund: string;
  name: string;
  allowance: "つみたて投資枠" | "成長投資枠";
  amount: number;
};

export type NisaRecords = {
  taxYear: number;
  reportedAt?: string;
  reportedValue?: number;
  tsumitateAllowance: number;
  growthAllowance: number;
  tsumitateUsed: number;
  growthUsed: number;
  tsumitateRemainingOverride?: number;
  growthRemainingOverride?: number;
  purchases: NisaPurchaseRecord[];
};

export type MarketSnapshotRecord = {
  asOf: string;
  usdJpy: number;
  change1m: number;
  source: string;
  sourceUrl: string;
  inflationStatus: string;
  inflationSource: string;
};

export type MonthlyTaskCompletion = {
  signature: string;
  completedAt: string;
  decision?: "accepted" | "held";
};

export type FamilyChecklistCompletion = {
  signature: string;
  completedAt: string;
  completedBy: "本人" | "配偶者" | "二人で確認";
};

export type MonthlyBalanceUpdateCompletion = {
  signature: string;
  completedAt: string;
};

export const CASH_ACCOUNT_PURPOSES = ["salary", "emergency", "annual", "education", "home", "retirement", "investment", "unallocated"] as const;
export type CashAccountPurpose = (typeof CASH_ACCOUNT_PURPOSES)[number];
export type CashAccountOwner = "世帯" | "本人" | "配偶者" | "第1子" | "第2子";

export const CASH_ACCOUNT_PURPOSE_LABELS: Record<CashAccountPurpose, string> = {
  salary: "給与・引落用",
  emergency: "生活防衛",
  annual: "年払い・旅行",
  education: "教育資金",
  home: "住宅維持",
  retirement: "老後資金",
  investment: "投資待機資金",
  unallocated: "未割当（自動配分の候補）",
};

export type CashAccount = {
  id: string;
  institution: string;
  nickname: string;
  owner: CashAccountOwner;
  purpose: CashAccountPurpose;
  balance: number;
  asOf?: string;
  memo?: string;
};

export type CashAccountPurposeTotals = Record<CashAccountPurpose, number>;

export function getCashAccountPurposeTotals(profile: WealthProfile): CashAccountPurposeTotals {
  const totals: CashAccountPurposeTotals = {
    salary: 0,
    emergency: 0,
    annual: 0,
    education: 0,
    home: 0,
    retirement: 0,
    investment: 0,
    unallocated: 0,
  };
  if (profile.cashAccounts && profile.cashAccounts.length > 0) {
    for (const account of profile.cashAccounts) totals[account.purpose] += yen(account.balance);
    return totals;
  }
  totals.unallocated = yen(profile.cashTotal) + yen(profile.spousePersonalCash) + yen(profile.userPersonalCash);
  totals.education = yen(profile.childOneEducationSavings) + yen(profile.childTwoEducationSavings);
  return totals;
}

export function validateCashAccounts(accounts: CashAccount[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  accounts.forEach((account, index) => {
    const label = `口座${index + 1}`;
    if (!account.id || ids.has(account.id)) errors.push(`${label}の識別子が重複しています。`);
    ids.add(account.id);
    if (!account.institution.trim()) errors.push(`${label}の金融機関名を入力してください。`);
    if (!account.nickname.trim()) errors.push(`${label}の口座名・呼び名を入力してください。`);
    if (!CASH_ACCOUNT_PURPOSES.includes(account.purpose)) errors.push(`${label}の目的を選択してください。`);
    if (!Number.isFinite(account.balance) || account.balance < 0) errors.push(`${label}の残高は0円以上で入力してください。`);
  });
  return errors;
}

export type WealthProfile = {
  annualIncome: number;
  monthlyHouseholdTakeHome: number;
  annualHouseholdBonusTakeHome: number;
  monthlyLiving: number;
  monthlyCoop: number;
  monthlyMutualAid: number;
  annualPropertyTax: number;
  annualTravel: number;
  annualHomeInsuranceReserve: number;
  /** 家計共通で使える預金・証券口座内の現金。子ども専用の積立は含めない。 */
  cashTotal: number;
  spousePersonalCash: number;
  userPersonalCash: number;
  cashSnapshotAsOf?: string;
  nisaValue: number;
  nisaMonthly: number;
  idecoMonthly: number;
  loanBalance: number;
  loanRate: number;
  loanRateReference?: number;
  mortgageRateUpdatedAt?: string;
  loanMonthlyPayment: number;
  loanRemainingYears: number;
  loanCreditRate: number;
  loanCreditYears: number;
  childOneAge: number;
  childTwoAge: number;
  childOneEducationSavings: number;
  childTwoEducationSavings: number;
  cashAccounts?: CashAccount[];
  privateHighSchoolAnnual: number;
  privateUniversityAtHomeAnnual: number;
  homeMaintenanceTarget: number;
  homeMaintenanceHorizonYears?: number;
  retirementMonthlySpend: number;
  pensionMonthlyEstimate: number;
  retirementYears: number;
  currentAge: number;
  retirementAge: number;
  expectedReturn: number;
  rebalanceThreshold: number;
  taxDocuments?: AnnualTaxDocuments;
  withholdingStatements?: WithholdingStatementRecord[];
  nisaRecords?: NisaRecords;
  lastMarketSnapshot?: MarketSnapshotRecord;
  monthlyTaskCompletions?: Record<string, MonthlyTaskCompletion>;
  familyChecklistCompletions?: Record<string, FamilyChecklistCompletion>;
  monthlyBalanceUpdateCompletions?: Record<string, MonthlyBalanceUpdateCompletion>;
  holdings: Holding[];
};

export type Bucket = {
  id: string;
  name: string;
  purpose: string;
  target: number;
  allocated: number;
  shortfall: number;
  color: string;
};

export type PurposeCashAlert = {
  id: "emergency" | "education" | "home";
  name: string;
  target: number;
  actual: number;
  gap: number;
  coverage: number;
  status: "shortfall" | "watch" | "funded" | "long-term";
  nextAction: string;
  color: string;
  longTermTarget?: number;
  nextFundingYears?: number;
};

export type EducationFundingStage = {
  id: "child-one-high" | "child-one-university" | "child-two-high" | "child-two-university";
  label: string;
  yearsUntilStart: number;
  target: number;
  childSavings: number;
};

/** 支出開始まで5年以内の教育費は、価格変動資産ではなく現金で確保する。 */
export const EDUCATION_CASH_HORIZON_YEARS = 5;

export const EMPTY_PROFILE: WealthProfile = {
  annualIncome: 0,
  monthlyHouseholdTakeHome: 0,
  annualHouseholdBonusTakeHome: 0,
  monthlyLiving: 0,
  monthlyCoop: 0,
  monthlyMutualAid: 0,
  annualPropertyTax: 0,
  annualTravel: 0,
  annualHomeInsuranceReserve: 0,
  cashTotal: 0,
  spousePersonalCash: 0,
  userPersonalCash: 0,
  cashSnapshotAsOf: undefined,
  nisaValue: 0,
  nisaMonthly: 0,
  idecoMonthly: 0,
  loanBalance: 0,
  loanRate: 0,
  loanRateReference: 0,
  mortgageRateUpdatedAt: undefined,
  loanMonthlyPayment: 0,
  loanRemainingYears: 25,
  loanCreditRate: 0.007,
  loanCreditYears: 0,
  childOneAge: 0,
  childTwoAge: 0,
  childOneEducationSavings: 0,
  childTwoEducationSavings: 0,
  cashAccounts: [],
  privateHighSchoolAnnual: 1_030_283,
  privateUniversityAtHomeAnnual: 1_986_700,
  homeMaintenanceTarget: 2_000_000,
  homeMaintenanceHorizonYears: 10,
  retirementMonthlySpend: 300_000,
  pensionMonthlyEstimate: 0,
  retirementYears: 25,
  currentAge: 38,
  retirementAge: 65,
  expectedReturn: 0.04,
  rebalanceThreshold: 0.08,
  monthlyTaskCompletions: {},
  holdings: [],
};

const yen = (value: number) => Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

export function summarizeCurrentAssets(profile: WealthProfile) {
  const cash = getCashPosition(profile).totalTrackedCash;
  const invested = (profile.holdings ?? []).reduce((sum, holding) => sum + yen(holding.value), 0);
  return {
    cash,
    invested,
    total: cash + invested,
  };
}

/**
 * 子どもの教育積立は教育目的のみに使う前提で、生活防衛・住宅・投資の原資から除外する。
 * 旧プロフィールは cashTotal を家計共通の現金として扱い、内訳未入力でも従来の計算結果を保つ。
 */
export function getCashPosition(profile: WealthProfile) {
  const accounts = profile.cashAccounts ?? [];
  if (accounts.length > 0) {
    const accountBalance = (predicate: (account: CashAccount) => boolean) => accounts.filter(predicate).reduce((sum, account) => sum + yen(account.balance), 0);
    const childOneEducationSavings = accountBalance(account => account.owner === "第1子" && account.purpose === "education");
    const childTwoEducationSavings = accountBalance(account => account.owner === "第2子" && account.purpose === "education");
    const allTrackedCash = accountBalance(() => true);
    const childEducationSavingsTotal = childOneEducationSavings + childTwoEducationSavings;
    return {
      householdCash: accountBalance(account => account.owner === "世帯"),
      spousePersonalCash: accountBalance(account => account.owner === "配偶者"),
      userPersonalCash: accountBalance(account => account.owner === "本人"),
      childOneEducationSavings,
      childTwoEducationSavings,
      flexibleCashTotal: Math.max(0, allTrackedCash - childEducationSavingsTotal),
      childEducationSavingsTotal,
      totalTrackedCash: allTrackedCash,
    };
  }
  const householdCash = yen(profile.cashTotal);
  const spousePersonalCash = yen(profile.spousePersonalCash ?? 0);
  const userPersonalCash = yen(profile.userPersonalCash ?? 0);
  const childOneEducationSavings = yen(profile.childOneEducationSavings ?? 0);
  const childTwoEducationSavings = yen(profile.childTwoEducationSavings ?? 0);
  const flexibleCashTotal = householdCash + spousePersonalCash + userPersonalCash;
  const childEducationSavingsTotal = childOneEducationSavings + childTwoEducationSavings;
  return {
    householdCash,
    spousePersonalCash,
    userPersonalCash,
    childOneEducationSavings,
    childTwoEducationSavings,
    flexibleCashTotal,
    childEducationSavingsTotal,
    totalTrackedCash: flexibleCashTotal + childEducationSavingsTotal,
  };
}

export function buildEducationFundingStages(profile: WealthProfile): EducationFundingStage[] {
  const cash = getCashPosition(profile);
  return ([
    { id: "child-one-high", label: "第1子高校", yearsUntilStart: Math.max(0, 15 - profile.childOneAge), target: yen(profile.privateHighSchoolAnnual * 3), childSavings: cash.childOneEducationSavings },
    { id: "child-one-university", label: "第1子大学", yearsUntilStart: Math.max(0, 18 - profile.childOneAge), target: yen(profile.privateUniversityAtHomeAnnual * 4), childSavings: 0 },
    { id: "child-two-high", label: "第2子高校", yearsUntilStart: Math.max(0, 15 - profile.childTwoAge), target: yen(profile.privateHighSchoolAnnual * 3), childSavings: cash.childTwoEducationSavings },
    { id: "child-two-university", label: "第2子大学", yearsUntilStart: Math.max(0, 18 - profile.childTwoAge), target: yen(profile.privateUniversityAtHomeAnnual * 4), childSavings: 0 },
  ] satisfies EducationFundingStage[]).sort((left, right) => left.yearsUntilStart - right.yearsUntilStart);
}

export function calculateWealthPlan(profile: WealthProfile) {
  const monthlyKnownSpend = profile.monthlyLiving + profile.monthlyCoop + profile.monthlyMutualAid + profile.loanMonthlyPayment;
  const annualRecurringSpend = monthlyKnownSpend * 12;
  const annualIrregularSpend = profile.annualPropertyTax + profile.annualTravel + profile.annualHomeInsuranceReserve;
  const annualKnownSpend = annualRecurringSpend + annualIrregularSpend;
  const annualSurplusBeforeInvesting = profile.annualIncome - annualKnownSpend;
  const annualInvestmentPlan = (profile.nisaMonthly + profile.idecoMonthly) * 12;
  const annualSurplusAfterInvesting = annualSurplusBeforeInvesting - annualInvestmentPlan;
  const emergencyTarget = monthlyKnownSpend * 12;
  const educationStages = buildEducationFundingStages(profile);
  const educationPerChild = profile.privateHighSchoolAnnual * 3 + profile.privateUniversityAtHomeAnnual * 4;
  const educationTarget = educationStages.reduce((sum, stage) => sum + stage.target, 0);
  const nearTermEducationTarget = educationStages.filter(stage => stage.yearsUntilStart <= EDUCATION_CASH_HORIZON_YEARS).reduce((sum, stage) => sum + stage.target, 0);
  const nearTermChildEducationSavings = educationStages.filter(stage => stage.yearsUntilStart <= EDUCATION_CASH_HORIZON_YEARS).reduce((sum, stage) => sum + stage.childSavings, 0);
  const retirementTarget = Math.max(
    0,
    (profile.retirementMonthlySpend - profile.pensionMonthlyEstimate) * 12 * profile.retirementYears,
  );

  const cashPosition = getCashPosition(profile);
  let remainingCash = cashPosition.flexibleCashTotal;
  const allocate = (target: number) => {
    const allocated = Math.min(remainingCash, target);
    remainingCash -= allocated;
    return allocated;
  };

  const buckets: Bucket[] = [
    {
      id: "emergency",
      name: "生活防衛",
      purpose: "既知の月間支出12か月分。投資の下落時にも売却を避ける資金。",
      target: yen(emergencyTarget),
      allocated: yen(allocate(emergencyTarget)),
      shortfall: 0,
      color: "#33B98E",
    },
    {
      id: "annual",
      name: "年払い・旅行",
      purpose: "固定資産税・旅行・火災／地震保険に使う年度内の現金。",
      target: yen(annualIrregularSpend),
      allocated: yen(allocate(annualIrregularSpend)),
      shortfall: 0,
      color: "#38A6A0",
    },
    {
      id: "education",
      name: "教育資金",
      purpose: `支出開始まで${EDUCATION_CASH_HORIZON_YEARS}年以内の教育費を現金で確保。より先の費用は長期計画として別管理。`,
      target: yen(nearTermEducationTarget),
      allocated: yen(Math.min(nearTermEducationTarget, nearTermChildEducationSavings + allocate(Math.max(0, nearTermEducationTarget - nearTermChildEducationSavings)))),
      shortfall: 0,
      color: "#F4A261",
    },
    {
      id: "home",
      name: "住宅維持",
      purpose: "将来の修繕・設備更新に備える現金バケツ。",
      target: yen(profile.homeMaintenanceTarget),
      allocated: yen(allocate(profile.homeMaintenanceTarget)),
      shortfall: 0,
      color: "#7C8CFF",
    },
    {
      id: "retirement",
      name: "老後資金",
      purpose: "65歳以降の不足額を年金仮定で置いた長期目標。",
      target: yen(retirementTarget),
      allocated: yen(allocate(retirementTarget)),
      shortfall: 0,
      color: "#BF8CFF",
    },
    {
      id: "longterm",
      name: "長期投資",
      purpose: "上記の短中期資金を差し引いた、長期のリスク資産候補。",
      target: 0,
      allocated: yen(remainingCash),
      shortfall: 0,
      color: "#E9C46A",
    },
  ].map(bucket => ({ ...bucket, shortfall: Math.max(0, bucket.target - bucket.allocated) }));

  const allocation = profile.holdings.reduce(
    (totals, holding) => ({
      ...totals,
      [holding.assetClass]: (totals[holding.assetClass] ?? 0) + holding.value,
    }),
    {} as Record<string, number>,
  );
  const totalInvested = profile.holdings.reduce((sum, holding) => sum + holding.value, 0);
  const targetWeights = { 株式: 0.75, 債券: 0.15, 金: 0.1 } as const;
  const drift = Object.entries(targetWeights).map(([assetClass, targetWeight]) => {
    const currentWeight = totalInvested > 0 ? (allocation[assetClass] ?? 0) / totalInvested : 0;
    const driftValue = currentWeight - targetWeight;
    return {
      assetClass,
      currentWeight,
      targetWeight,
      drift: driftValue,
      threshold: profile.rebalanceThreshold,
      action: driftValue < -profile.rebalanceThreshold ? "buy" : driftValue > profile.rebalanceThreshold ? "defer" : "hold",
    };
  });

  const annualPrivateHigh = profile.privateHighSchoolAnnual * 3;
  const annualPrivateUniversity = profile.privateUniversityAtHomeAnnual * 4;
  const educationScenarios = [
    { id: "base", name: "私立高校・私立大学（自宅）", perChild: educationPerChild, total: educationTarget, note: "現在の標準シナリオ" },
    { id: "costUp", name: "費用20%上振れ", perChild: educationPerChild * 1.2, total: educationTarget * 1.2, note: "学部・物価上昇の余裕を確保" },
    { id: "universityOnly", name: "大学費用のみ確保", perChild: annualPrivateUniversity, total: annualPrivateUniversity * 2, note: "高校費用は家計から支出する前提" },
  ];

  const yearsToRetirement = Math.max(0, profile.retirementAge - profile.currentAge);
  const annualContribution = (profile.nisaMonthly + profile.idecoMonthly) * 12;
  const projectedAtRetirement = (rate: number) => {
    const futureExisting = totalInvested * Math.pow(1 + rate, yearsToRetirement);
    const futureContributions = rate === 0 ? annualContribution * yearsToRetirement : annualContribution * ((Math.pow(1 + rate, yearsToRetirement) - 1) / rate);
    return futureExisting + futureContributions;
  };
  const retirementScenarios = [
    { id: "base", name: "ベース", returnRate: profile.expectedReturn, projected: projectedAtRetirement(profile.expectedReturn), note: `年${(profile.expectedReturn * 100).toFixed(1)}%の名目仮定` },
    { id: "low", name: "低リターン", returnRate: 0.01, projected: projectedAtRetirement(0.01), note: "年1%の名目仮定" },
    { id: "incomeShock", name: "収入減少", returnRate: 0.02, projected: totalInvested * Math.pow(1.02, yearsToRetirement) + (annualContribution * 0.7) * ((Math.pow(1.02, yearsToRetirement) - 1) / 0.02), note: "積立額30%減・年2%の仮定" },
  ];

  const paymentAtRate = (rate: number) => {
    const monthlyRate = rate / 12;
    const months = Math.max(1, profile.loanRemainingYears * 12);
    if (monthlyRate === 0) return profile.loanBalance / months;
    return profile.loanBalance * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
  };
  const mortgageSensitivity = [
    { name: "現状", rate: profile.loanRate, estimatedPayment: paymentAtRate(profile.loanRate) },
    { name: "+0.5%", rate: profile.loanRate + 0.005, estimatedPayment: paymentAtRate(profile.loanRate + 0.005) },
    { name: "+1.0%", rate: profile.loanRate + 0.01, estimatedPayment: paymentAtRate(profile.loanRate + 0.01) },
  ];

  const annualCreditUpperBound = profile.loanBalance * profile.loanCreditRate;
  const creditRemainingUpperBound = annualCreditUpperBound * profile.loanCreditYears;
  const investmentGain10Year = cashPosition.flexibleCashTotal * (Math.pow(1 + profile.expectedReturn, 10) - 1);
  const prepayGain10Year = cashPosition.flexibleCashTotal * (Math.pow(1 + profile.loanRate, 10) - 1);
  const canFundPlan = cashPosition.flexibleCashTotal >= emergencyTarget && annualSurplusBeforeInvesting >= annualInvestmentPlan;

  return {
    monthlyKnownSpend,
    annualRecurringSpend,
    annualIrregularSpend,
    annualKnownSpend,
    annualSurplusBeforeInvesting,
    annualInvestmentPlan,
    annualSurplusAfterInvesting,
    cashCoverageMonths: monthlyKnownSpend > 0 ? cashPosition.flexibleCashTotal / (annualKnownSpend / 12) : 0,
    cashPosition,
    educationCashFromFlexible: Math.max(0, (buckets.find(bucket => bucket.id === "education")?.allocated ?? 0) - nearTermChildEducationSavings),
    emergencyTarget,
    educationPerChild,
    educationTarget,
    nearTermEducationTarget,
    nearTermChildEducationSavings,
    educationStages,
    retirementTarget,
    buckets,
    allocation,
    totalInvested,
    drift,
    educationScenarios,
    yearsToRetirement,
    retirementScenarios,
    mortgageSensitivity,
    annualCreditUpperBound,
    creditRemainingUpperBound,
    investmentGain10Year,
    prepayGain10Year,
    canFundPlan,
  };
}

/**
 * 実口座の総残高を、既存の安全優先ルールで目的別に仮想配分した結果を返す。
 * 実口座を目的別に分けていない場合でも、生活防衛→教育→住宅維持の順に不足を検知する。
 * 現金目標が0円の遠期教育費はカードにせず、長期計画として別表示する。
 */
export function buildPurposeCashAlerts(profile: WealthProfile): PurposeCashAlert[] {
  const plan = calculateWealthPlan(profile);
  const byId = new Map(plan.buckets.map(bucket => [bucket.id, bucket]));
  return (["emergency", "education", "home"] as const)
    .filter(id => id !== "education" || (byId.get(id)?.target ?? 0) > 0)
    .map(id => {
    const bucket = byId.get(id)!;
    const coverage = bucket.target > 0 ? Math.min(1, bucket.allocated / bucket.target) : 1;
    const status: PurposeCashAlert["status"] = bucket.shortfall > 0 && coverage < 0.8 ? "shortfall" : bucket.shortfall > 0 ? "watch" : "funded";
    const nextAction = status === "shortfall"
      ? `あと${formatCompactYen(bucket.shortfall)}を現金で確保するまで、追加投資より優先します。`
      : status === "watch"
        ? `あと${formatCompactYen(bucket.shortfall)}で目標です。今月の現金積立を継続します。`
        : "目標を充足しています。支出・金利・進路の変更時だけ見直します。";
    return { id, name: bucket.name, target: bucket.target, actual: bucket.allocated, gap: bucket.shortfall, coverage, status, nextAction, color: bucket.color };
  });
}

export function formatYen(value: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
}

export function formatCompactYen(value: number) {
  if (Math.abs(value) >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}億円`;
  if (Math.abs(value) >= 10_000) return `${Math.round(value / 10_000)}万円`;
  return formatYen(value);
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}
