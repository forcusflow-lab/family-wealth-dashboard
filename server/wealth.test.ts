import { describe, expect, it } from "vitest";
import { buildEducationFundingStages, buildPurposeCashAlerts, calculateWealthPlan, getCashPosition, summarizeCurrentAssets, validateCashAccounts } from "../shared/wealth";
import { buildMonthlyFundingStatus } from "../shared/fundingStatus";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("wealth plan calculations", () => {
  it("keeps a full year of known outflows in the emergency bucket before other buckets", () => {
    const plan = calculateWealthPlan(INITIAL_OWNER_PROFILE);
    const emergency = plan.buckets.find(bucket => bucket.id === "emergency");
    expect(emergency?.allocated).toBe(plan.emergencyTarget);
    expect(plan.cashCoverageMonths).toBeGreaterThan(12);
  });

  it("requires institution, account nickname, purpose, and a non-negative balance before saving a cash account", () => {
    expect(validateCashAccounts([{ id: "a", institution: "", nickname: "", owner: "世帯", purpose: "unallocated", balance: -1 }])).toEqual(expect.arrayContaining([
      "口座1の金融機関名を入力してください。",
      "口座1の口座名・呼び名を入力してください。",
      "口座1の残高は0円以上で入力してください。",
    ]));
    expect(validateCashAccounts([{ id: "a", institution: "りそな銀行", nickname: "給与口座", owner: "世帯", purpose: "salary", balance: 100_000 }])).toEqual([]);
  });

  it("does not permit the monthly investment plan if recurring cash flow cannot cover it", () => {
    const plan = calculateWealthPlan({ ...INITIAL_OWNER_PROFILE, annualIncome: 3_000_000 });
    expect(plan.canFundPlan).toBe(false);
  });

  it("reports a positive education target for both children", () => {
    const plan = calculateWealthPlan(INITIAL_OWNER_PROFILE);
    expect(plan.educationTarget).toBe(plan.educationPerChild * 2);
    expect(plan.educationTarget).toBeGreaterThan(0);
  });

  it("increases the estimated repayment under the variable-rate stress cases", () => {
    const plan = calculateWealthPlan(INITIAL_OWNER_PROFILE);
    expect(plan.mortgageSensitivity[1]?.estimatedPayment).toBeGreaterThan(plan.mortgageSensitivity[0]?.estimatedPayment ?? 0);
    expect(plan.mortgageSensitivity[2]?.estimatedPayment).toBeGreaterThan(plan.mortgageSensitivity[1]?.estimatedPayment ?? 0);
  });

  it("exposes a usable drift action for the sample allocation and a strict rebalancing threshold", () => {
    const defaultPlan = calculateWealthPlan(INITIAL_OWNER_PROFILE);
    expect(defaultPlan.drift.find(item => item.assetClass === "株式")?.action).toBeTruthy();
    const strictPlan = calculateWealthPlan({ ...INITIAL_OWNER_PROFILE, rebalanceThreshold: 0.04 });
    expect(strictPlan.drift.find(item => item.assetClass === "株式")?.action).toBe("buy");
  });

  it("aggregates household, spouse, and user cash while isolating child education savings from flexible liquidity", () => {
    const profile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [], cashTotal: 1_000_000, spousePersonalCash: 2_000_000, userPersonalCash: 300_000, childOneEducationSavings: 50_000, childTwoEducationSavings: 20_000 };
    const cash = getCashPosition(profile);
    const plan = calculateWealthPlan(profile);
    expect(cash).toMatchObject({ flexibleCashTotal: 3_300_000, childEducationSavingsTotal: 70_000, totalTrackedCash: 3_370_000 });
    expect(plan.cashCoverageMonths).toBeCloseTo(3_300_000 / (plan.annualKnownSpend / 12));
    expect(plan.buckets.find(bucket => bucket.id === "education")?.target).toBe(0);
    expect(plan.educationStages.find(stage => stage.id === "child-one-high")?.childSavings).toBe(50_000);
  });

  it("always provides a numeric current-assets total from the ledger and valid holdings", () => {
    const summary = summarizeCurrentAssets({
      ...INITIAL_OWNER_PROFILE,
      cashAccounts: [{ id: "cash", institution: "りそな銀行", nickname: "生活口座", owner: "世帯", purpose: "unallocated", balance: 5_600_000 }],
      holdings: [...INITIAL_OWNER_PROFILE.holdings, { code: "invalid", name: "不完全な評価額", value: Number.NaN, assetClass: "株式", note: "入力保護の検証用" }],
    });
    expect(summary).toMatchObject({ cash: 5_600_000, invested: INITIAL_OWNER_PROFILE.nisaValue, total: 5_600_000 + INITIAL_OWNER_PROFILE.nisaValue });
    expect(Number.isFinite(summary.total)).toBe(true);
  });

  it("keeps distant education costs out of zero-target cash alerts", () => {
    const alerts = buildPurposeCashAlerts(INITIAL_OWNER_PROFILE);
    const emergency = alerts.find(alert => alert.id === "emergency")!;
    expect(emergency).toMatchObject({ status: "funded", gap: 0, actual: emergency.target });
    expect(alerts.find(alert => alert.id === "education")).toBeUndefined();
    expect(buildEducationFundingStages(INITIAL_OWNER_PROFILE).map(stage => stage.yearsUntilStart)).toEqual([8, 11, 12, 15]);
  });

  it("separates current allocation, cash target, this-month transfer, and distant education plan", () => {
    const funding = buildMonthlyFundingStatus(INITIAL_OWNER_PROFILE);
    const annual = funding.cashPurposes.find(purpose => purpose.id === "annual")!;
    const home = funding.cashPurposes.find(purpose => purpose.id === "home")!;
    expect(funding.cashPurposes.find(purpose => purpose.id === "education")).toBeUndefined();
    const annualTarget = INITIAL_OWNER_PROFILE.annualPropertyTax + INITIAL_OWNER_PROFILE.annualTravel + INITIAL_OWNER_PROFILE.annualHomeInsuranceReserve;
    expect(annual).toMatchObject({ cashTarget: annualTarget, currentAllocated: annualTarget, monthlyTransfer: 0, status: "funded" });
    expect(home.cashTarget).toBe(2_000_000);
    expect(home.monthlyTransfer).toBeGreaterThan(0);
    expect(funding.monthlyCashTransfers).toBe(home.monthlyTransfer);
    expect(funding.longTermPlans.find(plan => plan.id === "education")?.totalEstimate).toBe(22_075_298);
    expect(funding.recommendedIdeco).toBe(INITIAL_OWNER_PROFILE.idecoMonthly);
    expect(funding.recommendedNisa).toBe(INITIAL_OWNER_PROFILE.nisaMonthly);
  });

  it("preserves purpose-assigned account balances and routes only unallocated cash to remaining safety goals", () => {
    const basePlan = calculateWealthPlan(INITIAL_OWNER_PROFILE);
    const profile = {
      ...INITIAL_OWNER_PROFILE,
      cashAccounts: [
        { id: "emergency", institution: "りそな", nickname: "生活防衛", owner: "世帯" as const, purpose: "emergency" as const, balance: basePlan.emergencyTarget, asOf: "2026-08-18" },
        { id: "annual", institution: "ゆうちょ", nickname: "年払い", owner: "世帯" as const, purpose: "annual" as const, balance: 500_000, asOf: "2026-08-18" },
        { id: "unallocated", institution: "SBI証券", nickname: "待機現金", owner: "本人" as const, purpose: "unallocated" as const, balance: 300_000, asOf: "2026-08-18" },
        { id: "investment", institution: "SBI証券", nickname: "長期投資待機", owner: "本人" as const, purpose: "investment" as const, balance: 1_000_000, asOf: "2026-08-18" },
      ],
    };
    const funding = buildMonthlyFundingStatus(profile);
    const emergency = funding.cashPurposes.find(purpose => purpose.id === "emergency")!;
    const annual = funding.cashPurposes.find(purpose => purpose.id === "annual")!;
    expect(emergency.currentAllocated).toBe(basePlan.emergencyTarget);
    expect(annual.currentAllocated).toBe(INITIAL_OWNER_PROFILE.annualPropertyTax + INITIAL_OWNER_PROFILE.annualTravel + INITIAL_OWNER_PROFILE.annualHomeInsuranceReserve);
    expect(funding.accountPurposeTotals.investment).toBe(1_000_000);
    expect(funding.unallocatedCashAfterRouting).toBeGreaterThanOrEqual(0);
    expect(funding.cashPurposes.find(purpose => purpose.id === "home")?.currentAllocated).toBeLessThan(INITIAL_OWNER_PROFILE.homeMaintenanceTarget);
  });

  it("marks a near-target reserve as watch and a near-term education gap as shortfall", () => {
    const basePlan = calculateWealthPlan(INITIAL_OWNER_PROFILE);
    const watchProfile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [], cashTotal: Math.round(basePlan.emergencyTarget * 0.9), spousePersonalCash: 0, userPersonalCash: 0, childOneEducationSavings: 0, childTwoEducationSavings: 0 };
    expect(buildPurposeCashAlerts(watchProfile).find(alert => alert.id === "emergency")?.status).toBe("watch");

    const nearTermProfile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [], childOneAge: 14, cashTotal: basePlan.emergencyTarget, spousePersonalCash: 0, userPersonalCash: 0, childOneEducationSavings: 0, childTwoEducationSavings: 0 };
    const education = buildPurposeCashAlerts(nearTermProfile).find(alert => alert.id === "education")!;
    expect(education).toMatchObject({ status: "shortfall", gap: education.target - education.actual });
  });
});
