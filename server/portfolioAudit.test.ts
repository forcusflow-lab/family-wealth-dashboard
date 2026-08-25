import { describe, expect, it } from "vitest";
import { buildPortfolioAudit } from "../shared/portfolioAudit";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("portfolio audit", () => {
  it("keeps the all-world ETF as core and stops additional concentrated equity purchases", () => {
    const audit = buildPortfolioAudit(INITIAL_OWNER_PROFILE);
    expect(audit.audits.find(item => item.code === "2559")?.status).toBe("コア");
    expect(audit.audits.find(item => item.code === "1489")?.status).toBe("追加停止");
    expect(audit.audits.find(item => item.code === "2514")?.status).toBe("追加停止");
  });

  it("reserves a non-negative amount for education before allocating free cash", () => {
    const audit = buildPortfolioAudit(INITIAL_OWNER_PROFILE);
    expect(audit.monthlyEducationReserve).toBeGreaterThanOrEqual(0);
    expect(audit.purchasePlan[2]?.action).toContain("安全資産");
  });
});
