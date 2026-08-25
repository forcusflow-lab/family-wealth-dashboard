import { describe, expect, it } from "vitest";
import { buildAccountPurposeProgress } from "../shared/accountPurposeProgress";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("account purpose progress", () => {
  it("counts only registered real accounts toward named-purpose progress and keeps provisional cash separate", () => {
    const result = buildAccountPurposeProgress({
      ...INITIAL_OWNER_PROFILE,
      cashAccounts: [
        { id: "emergency", institution: "りそな銀行", nickname: "生活防衛", owner: "世帯", purpose: "emergency", balance: 500_000, asOf: "2026-08-18", memo: "" },
        { id: "unallocated", institution: "ドコモ銀行", nickname: "予備口座", owner: "本人", purpose: "unallocated", balance: 300_000, asOf: "2026-08-18", memo: "" },
        { id: "migration", institution: "未分類", nickname: "家計共通の現金", owner: "世帯", purpose: "unallocated", balance: 5_600_000, asOf: "2026-08-18", memo: "" },
      ],
    });
    const emergency = result.purposes.find(item => item.id === "emergency")!;
    expect(emergency.actualRegisteredBalance).toBe(500_000);
    expect(emergency.shortfall).toBeGreaterThan(0);
    expect(result.registeredUnallocatedCash).toBe(300_000);
    expect(result.unregisteredCashTotal).toBe(5_600_000);
    expect(result.registeredAccountCount).toBe(2);
    expect(emergency.risk).toBe("red");
  });

  it("marks a low-funded near-term goal red and a low-funded three-year goal yellow", () => {
    const annualRisk = buildAccountPurposeProgress({
      ...INITIAL_OWNER_PROFILE,
      cashAccounts: [],
    }).purposes.find(item => item.id === "annual")!;
    const homeWarning = buildAccountPurposeProgress({
      ...INITIAL_OWNER_PROFILE,
      homeMaintenanceHorizonYears: 3,
      cashAccounts: [],
    }).purposes.find(item => item.id === "home")!;
    expect(annualRisk.risk).toBe("red");
    expect(annualRisk.requiredMonthlySaving).toBeGreaterThan(0);
    expect(homeWarning.risk).toBe("yellow");
  });
});
