import { describe, expect, it } from "vitest";
import { buildGoalTimeline, buildMonthlyReviewGuide, summarizeMonthlyFunding } from "../shared/goalTimeline";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("goal timeline", () => {
  it("holds purchases in the exhausted NISA growth allowance while preserving the tsumitate allowance context", () => {
    const result = buildGoalTimeline(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    expect(INITIAL_OWNER_PROFILE.nisaValue).toBeGreaterThan(0);
    expect(INITIAL_OWNER_PROFILE.nisaRecords).toMatchObject({ growthUsed: 2_400_000, growthRemainingOverride: 0, tsumitateUsed: 0, tsumitateRemainingOverride: 1_200_000 });
    expect(result.nisa.growthRemaining).toBe(0);
    expect(result.nisa.tsumitateRemaining).toBe(1_200_000);
    expect(result.priorities.find(item => item.id === "nisa-growth-hold")?.detail).toContain("新規買付は保留");
  });

  it("creates time-bounded education, mortgage, retirement, annual-cash and safe-import actions", () => {
    const result = buildGoalTimeline(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    expect(result.monthlySinking).toBe(0);
    expect(result.futureNeeds.map(item => item.category)).toEqual(expect.arrayContaining(["教育", "住宅", "老後", "年払い"]));
    expect(result.connections.find(item => item.id === "resona")?.capability).toContain("CSV");
    expect(result.connections.find(item => item.id === "docomo")).toMatchObject({ name: "ドコモSMTBネット銀行", status: "CSV取込候補" });
    expect(result.connections.every(item => !("apiStatus" in item))).toBe(true);
    expect(result.methodology.join(" ")).toContain("ログイン情報を保存せず");
    expect(result.priorities.find(item => item.id === "home-maintenance")?.amount).toBeGreaterThan(0);
    expect(result.priorities.find(item => item.id === "mortgage-rate-review")?.title).toContain("変動金利");
    expect(result.futureNeeds.find(item => item.id === "home-maintenance")?.estimate).toBe(2_000_000);
    expect(result.planningSources.map(item => item.id)).toEqual(expect.arrayContaining(["education", "university", "maintenance", "mortgage"]));
  });

  it("funds deadline-based education and home reserves before allowing configured iDeCo and NISA", () => {
    const nearTermProfile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [], childOneAge: 14, cashTotal: 3_209_004, spousePersonalCash: 0, userPersonalCash: 0 };
    const result = buildGoalTimeline(nearTermProfile, "2026-08-18T00:00:00.000Z");
    expect(INITIAL_OWNER_PROFILE.privateHighSchoolAnnual).toBe(1_030_283);
    expect(INITIAL_OWNER_PROFILE.privateUniversityAtHomeAnnual).toBe(1_986_700);
    expect(result.monthlyFunding.monthlyEducationReserve).toBeGreaterThan(0);
    expect(result.monthlyFunding.monthlyHomeMaintenance).toBeGreaterThan(0);
    expect(result.priorities.find(item => item.id === "education-reserve")?.amount).toBe(result.monthlyFunding.monthlyEducationReserve);
    expect(result.priorities.find(item => item.id === "nisa-tsumitate")?.detail).toContain("現金目標");
    expect(result.monthlyFunding.recommendedLongTermInvestment).toBe(0);
    expect(result.monthlyFunding.monthlyIncomeBasis).toBe(450_000);
    expect(result.monthlyFunding.monthlyFlexBuffer).toBeGreaterThanOrEqual(30_000);
    expect(result.monthlyActions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "cash-reserves", state: "do" }),
      expect.objectContaining({ id: "ideco-contribution", state: "hold", amount: 0 }),
      expect.objectContaining({ id: "nisa-contribution", state: "hold", amount: 0 }),
      expect.objectContaining({ id: "market-refresh", state: "review" }),
    ]));
    expect(result.monthlyActions.every(item => item.due.length > 0)).toBe(true);
    expect(result.methodology.join(" ")).toContain("注文・振込・返済を実行しません");
    expect(summarizeMonthlyFunding(result.monthlyFunding)).toMatchObject({
      cashReserveTotal: result.monthlyFunding.monthlyAnnualSinking + result.monthlyFunding.monthlyEmergencyRepair + result.monthlyFunding.monthlyEducationReserve + result.monthlyFunding.monthlyHomeMaintenance,
      ideco: result.monthlyFunding.recommendedIdeco,
      nisa: result.monthlyFunding.recommendedNisa,
      longTermInvestment: result.monthlyFunding.recommendedLongTermInvestment,
    });
    expect(result.provisionalCostRanges).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "private-high-school", base: 1_030_283, stress: 1_236_400 }),
      expect.objectContaining({ id: "private-university-home", base: 1_986_700, stress: 2_384_100 }),
      expect.objectContaining({ id: "home-maintenance", base: 2_000_000, stress: 4_000_000 }),
    ]));
  });

  it("does not recommend long-term investment when reserve requirements consume monthly capacity", () => {
    const result = buildGoalTimeline({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], annualIncome: 3_000_000, monthlyHouseholdTakeHome: 200_000, annualHouseholdBonusTakeHome: 0, cashTotal: 0, spousePersonalCash: 0, userPersonalCash: 0 }, "2026-08-18T00:00:00.000Z");
    expect(result.monthlyFunding.status).toBe("cash-constrained");
    expect(result.monthlyFunding.recommendedIdeco).toBe(0);
    expect(result.monthlyFunding.recommendedLongTermInvestment).toBe(0);
  });

  it("uses child-specific education savings to reduce only that child’s near-term funding gap", () => {
    const nearTermProfile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [], childOneAge: 14, cashTotal: 3_209_004, spousePersonalCash: 0, userPersonalCash: 0 };
    const baseline = buildGoalTimeline(nearTermProfile, "2026-08-18T00:00:00.000Z");
    const withChildSavings = buildGoalTimeline({ ...nearTermProfile, childOneEducationSavings: 300_000, childTwoEducationSavings: 30_000 }, "2026-08-18T00:00:00.000Z");
    expect(withChildSavings.monthlyFunding.monthlyEducationReserve).toBeLessThan(baseline.monthlyFunding.monthlyEducationReserve);
    expect(withChildSavings.monthlyFunding.educationCashAlreadyAssigned).toBe(baseline.monthlyFunding.educationCashAlreadyAssigned + 300_000);
  });

  it("uses spouse and user cash for safety capacity without treating child savings as flexible cash", () => {
    const nearTermProfile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [], childOneAge: 14 };
    const baseline = buildGoalTimeline({ ...nearTermProfile, cashTotal: 0, spousePersonalCash: 0, userPersonalCash: 0 }, "2026-08-18T00:00:00.000Z");
    const withFamilyCash = buildGoalTimeline({ ...nearTermProfile, cashTotal: 0, spousePersonalCash: 2_000_000, userPersonalCash: 1_000_000, childOneEducationSavings: 500_000 }, "2026-08-18T00:00:00.000Z");
    expect(withFamilyCash.monthlyFunding.monthlyEmergencyRepair).toBeLessThan(baseline.monthlyFunding.monthlyEmergencyRepair);
    expect(withFamilyCash.monthlyFunding.educationCashAlreadyAssigned).toBe(500_000);
  });

  it("guides a low-effort monthly review without forcing a market refresh after every balance update", () => {
    const guide = buildMonthlyReviewGuide({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], childOneAge: 14, cashTotal: 3_209_004, spousePersonalCash: 0, userPersonalCash: 0, cashSnapshotAsOf: "2026-08-18" }, "2026-08-18T00:00:00.000Z");
    expect(guide.snapshotLabel).toContain("2026-08-18");
    expect(guide.steps).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "balances", required: true }),
      expect.objectContaining({ id: "checklist", required: true }),
      expect.objectContaining({ id: "market", required: false }),
    ]));
    expect(guide.marketRefreshMessage).toContain("残高入力");
    expect(guide.investmentMessage).toContain("見送ります");
  });

  it("recalculates the rate-rise impact and switches the monthly priority after a manual rate update", () => {
    const result = buildGoalTimeline({ ...INITIAL_OWNER_PROFILE, loanRate: 0.01795, mortgageRateUpdatedAt: "2026-10-15" }, "2026-10-16T00:00:00.000Z");
    expect(result.mortgageRateUpdate.rateRise).toBeCloseTo(0.005);
    expect(result.mortgageRateUpdate.paymentIncreaseEstimate).toBeGreaterThan(0);
    expect(result.mortgageRateUpdate.fiveYearCap).toBeCloseTo(INITIAL_OWNER_PROFILE.loanMonthlyPayment * 1.25);
    expect(result.priorities.find(item => item.id === "mortgage-rate-review")?.title).toContain("上昇");
  });
});
