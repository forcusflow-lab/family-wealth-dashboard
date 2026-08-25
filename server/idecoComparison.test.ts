import { describe, expect, it } from "vitest";
import { buildIdecoComparison } from "../shared/idecoComparison";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("SBI iDeCo comparison", () => {
  it("keeps the active Select Plan universe and scheduled changes distinct", () => {
    const result = buildIdecoComparison(INITIAL_OWNER_PROFILE);
    expect(result.currentCount).toBe(27);
    expect(result.currentFunds.every(item => item.status === "現行候補")).toBe(true);
    expect(result.currentFunds.every(item => item.liquidity === "低" && item.sourceAsOf === "2026-08-18" && Boolean(item.sourceUrl))).toBe(true);
    expect(result.additional).toHaveLength(10);
    expect(result.scheduledRemoval.find(item => item.name === "iFree NYダウ・インデックス")).toMatchObject({ status: "除外予定", liquidity: "低" });
    expect(result.scheduledRemoval).toHaveLength(11);
    expect(result.totalSelectUniverseCount).toBe(37);
  });

  it("prioritizes the low-cost ex-Japan global fund only as a long-horizon iDeCo candidate", () => {
    const result = buildIdecoComparison(INITIAL_OWNER_PROFILE);
    expect(result.currentFunds[0]).toMatchObject({ id: "emaxis-world-ex-jp", decision: "定額候補" });
    expect(result.currentFunds.find(item => item.id === "fine-gold")?.decision).toBe("サテライト");
  });
});
