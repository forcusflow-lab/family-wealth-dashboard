import { describe, expect, it } from "vitest";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";
import { buildAccountInputAlerts } from "../shared/accountInputAlerts";

describe("account input alerts", () => {
  it("identifies incomplete, missing-date, and stale account records", () => {
    const profile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [
      { id: "legacy", institution: "未分類", nickname: "家計共通の現金", owner: "世帯" as const, purpose: "unallocated" as const, balance: 100_000, asOf: "" },
      { id: "no-date", institution: "りそな銀行", nickname: "給与口座", owner: "本人" as const, purpose: "salary" as const, balance: 200_000 },
      { id: "stale", institution: "ゆうちょ銀行", nickname: "教育", owner: "配偶者" as const, purpose: "education" as const, balance: 100_000, asOf: "2026-05-01" },
    ] };
    const alerts = buildAccountInputAlerts(profile, new Date("2026-08-19T00:00:00"));
    expect(alerts.map(alert => alert.kind)).toEqual(["incomplete", "missing-date", "stale"]);
    expect(alerts[2].detail).toContain("残高を確認");
  });
});
