import { describe, expect, it } from "vitest";
import { buildAssetProjection, PROJECTION_NON_GUARANTEE_COPY } from "../shared/assetProjection";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("asset projection", () => {
  it("uses saved NISA remaining allowance for the first projected contribution year", () => {
    const result = buildAssetProjection({ ...INITIAL_OWNER_PROFILE, nisaMonthly: 50_000, nisaRecords: { taxYear: 2026, tsumitateAllowance: 1_200_000, growthAllowance: 2_400_000, tsumitateUsed: 0, growthUsed: 0, tsumitateRemainingOverride: 0, growthRemainingOverride: 120_000, purchases: [] } }, 2);
    const base = result.scenarios.find(scenario => scenario.id === "base")!;
    expect(base.points[1]?.nisaContribution).toBe(120_000);
    expect(base.points[2]?.nisaContribution).toBe(600_000);
  });

  it("stops first-year NISA contribution when both saved remaining allowances are exhausted", () => {
    const result = buildAssetProjection({ ...INITIAL_OWNER_PROFILE, nisaMonthly: 50_000, nisaRecords: { taxYear: 2026, tsumitateAllowance: 1_200_000, growthAllowance: 2_400_000, tsumitateUsed: 1_200_000, growthUsed: 2_400_000, tsumitateRemainingOverride: 0, growthRemainingOverride: 0, purchases: [] } }, 1);
    expect(result.scenarios.find(scenario => scenario.id === "base")?.points[1]?.nisaContribution).toBe(0);
  });

  it("keeps iDeCo separate as locked capital and orders downside below base at the horizon", () => {
    const result = buildAssetProjection(INITIAL_OWNER_PROFILE, 10);
    const base = result.scenarios.find(scenario => scenario.id === "base")!;
    const downside = result.scenarios.find(scenario => scenario.id === "downside")!;
    expect(base.points[1]?.idecoContribution).toBe(INITIAL_OWNER_PROFILE.idecoMonthly * 12);
    expect(base.endAssets).toBeGreaterThan(downside.endAssets);
    expect(result.idecoContext.lockUp).toContain("60歳");
  });

  it("uses the reported NISA value rather than fabricating a separate other-holdings balance, and discloses fixed starting cash in base", () => {
    const result = buildAssetProjection(INITIAL_OWNER_PROFILE, 1);
    const base = result.scenarios.find(scenario => scenario.id === "base")!;
    expect(base.points[0]).toMatchObject({ nisa: INITIAL_OWNER_PROFILE.nisaValue, liquidReserve: INITIAL_OWNER_PROFILE.cashTotal + INITIAL_OWNER_PROFILE.spousePersonalCash + INITIAL_OWNER_PROFILE.userPersonalCash });
    expect(base.points[0]).not.toHaveProperty("otherInvestments");
    expect(result.liquidReserveContext.behavior).toContain("据え置き");
  });

  it("reduces liquid reserves under education and mortgage stress without spending iDeCo", () => {
    const result = buildAssetProjection(INITIAL_OWNER_PROFILE, 6);
    const base = result.scenarios.find(scenario => scenario.id === "base")!;
    const education = result.scenarios.find(scenario => scenario.id === "educationShock")!;
    const mortgage = result.scenarios.find(scenario => scenario.id === "mortgageShock")!;
    expect(education.lowestLiquidReserve).toBeLessThan(base.lowestLiquidReserve);
    expect(mortgage.lowestLiquidReserve).toBeLessThan(base.lowestLiquidReserve);
    expect(education.points.at(-1)?.ideco).toBeGreaterThan(0);
    expect(PROJECTION_NON_GUARANTEE_COPY).toContain("保証");
    expect(result.methodology.at(-1)).toContain(PROJECTION_NON_GUARANTEE_COPY);
  });

  it("uses the latest valid non-identifying withholding statement as a disclosed historical income baseline", () => {
    const statement = INITIAL_OWNER_PROFILE.withholdingStatements![0]!;
    const result = buildAssetProjection({ ...INITIAL_OWNER_PROFILE, annualIncome: 1_000_000, withholdingStatements: [statement] }, 2);
    expect(result.incomeContext).toMatchObject({ annualIncome: statement.salaryPayment, sourceTaxYear: statement.taxYear });
    expect(result.methodology.join(" ")).toContain("源泉徴収票");
  });
});
