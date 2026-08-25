import { describe, expect, it } from "vitest";
import { buildHouseholdOpportunity } from "../shared/householdOpportunity";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("household opportunity", () => {
  it("puts cash safety before new NISA buying when the household cash buffer is short", () => {
    const result = buildHouseholdOpportunity({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], cashTotal: 0, spousePersonalCash: 0, userPersonalCash: 0 });
    expect(result.recommendation).toContain("生活防衛資金");
    expect(result.opportunities.find(item => item.id === "cash")?.priority).toBe("最優先");
    expect(result.opportunities.find(item => item.id === "nisa")?.action).toContain("保留");
  });

  it("changes the cash-safety recommendation when spouse and user balances restore household liquidity", () => {
    const empty = buildHouseholdOpportunity({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], cashTotal: 0, spousePersonalCash: 0, userPersonalCash: 0 });
    const funded = buildHouseholdOpportunity({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], cashTotal: 0, spousePersonalCash: 3_000_000, userPersonalCash: 1_000_000 });
    expect(empty.cashShortfall).toBeGreaterThan(0);
    expect(funded.cashShortfall).toBe(0);
    expect(funded.opportunities.find(item => item.id === "cash")?.priority).toBe("比較");
  });

  it("keeps iDeCo and mortgage prepayment distinctly illiquid", () => {
    const result = buildHouseholdOpportunity(INITIAL_OWNER_PROFILE);
    expect(result.opportunities.find(item => item.id === "ideco")?.liquidity).toBe("低");
    expect(result.opportunities.find(item => item.id === "prepay")?.liquidity).toBe("低");
  });

  it("shows an explicit lower-tail value and downside mechanism for market-linked options", () => {
    const result = buildHouseholdOpportunity(INITIAL_OWNER_PROFILE);
    const nisa = result.opportunities.find(item => item.id === "nisa")!;
    expect(nisa.downsideTenYearValue).toBeLessThan(nisa.tenYearNominalValue);
    expect(nisa.downsideRisk).toContain("10%点");
  });
});
