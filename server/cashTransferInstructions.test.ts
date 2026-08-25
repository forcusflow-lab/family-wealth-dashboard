import { describe, expect, it } from "vitest";
import { buildCashTransferInstructions } from "../shared/cashTransferInstructions";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("cash transfer instructions", () => {
  it("blocks a transfer and names the setup action when the ledger does not contain an actual source and destination account", () => {
    const result = buildCashTransferInstructions(INITIAL_OWNER_PROFILE);
    expect(result.requiresSetup).toBe(true);
    expect(result.readyTotal).toBe(0);
    expect(result.instructions.find(item => item.id === "home")).toMatchObject({ status: "needs-source-account" });
    expect(result.instructions.find(item => item.id === "home")?.action).toContain("今月の振替は0円");
    expect(result.instructions.find(item => item.id === "home")?.amount).toBe(0);
    expect(result.instructions.find(item => item.id === "home")?.requestedAmount).toBeGreaterThan(0);
  });

  it("names the source, destination, purpose, and exact amount once both accounts are registered", () => {
    const profile = {
      ...INITIAL_OWNER_PROFILE,
      cashAccounts: [
        { id: "source", institution: "りそな銀行", nickname: "生活口座", owner: "世帯" as const, purpose: "unallocated" as const, balance: 5_600_000 },
        { id: "home", institution: "ドコモSMTBネット銀行", nickname: "住宅維持", owner: "世帯" as const, purpose: "home" as const, balance: 0 },
      ],
    };
    const result = buildCashTransferInstructions(profile);
    const home = result.instructions.find(item => item.id === "home")!;
    expect(home.status).toBe("ready");
    expect(home.action).toContain("りそな銀行｜生活口座（世帯）からドコモSMTBネット銀行｜住宅維持（世帯）へ");
    expect(home.action).toContain(`${home.amount.toLocaleString("ja-JP")}円`);
    expect(home.completion).toContain("残高を台帳で更新");
  });

  it("limits a transfer to the actual registered source balance", () => {
    const profile = {
      ...INITIAL_OWNER_PROFILE,
      cashAccounts: [
        { id: "source", institution: "りそな銀行", nickname: "給与口座", owner: "本人" as const, purpose: "salary" as const, balance: 1_000, asOf: "2026-08-19" },
        { id: "home", institution: "ドコモSMTBネット銀行", nickname: "住宅維持", owner: "世帯" as const, purpose: "home" as const, balance: 0, asOf: "2026-08-19" },
      ],
    };
    const result = buildCashTransferInstructions(profile);
    const home = result.instructions.find(item => item.id === "home")!;
    expect(home.status).toBe("insufficient-source-balance");
    expect(home.amount).toBe(1_000);
    expect(home.requestedAmount).toBeGreaterThan(1_000);
    expect(result.hasInsufficientSourceBalance).toBe(true);
  });
});
