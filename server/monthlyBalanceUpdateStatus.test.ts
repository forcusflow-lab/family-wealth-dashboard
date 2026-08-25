import { describe, expect, it } from "vitest";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";
import { buildMonthlyBalanceUpdateStatus, cancelMonthlyBalanceUpdate, recordMonthlyBalanceUpdate } from "../shared/monthlyBalanceUpdateStatus";

describe("monthly balance update status", () => {
  const asOf = "2026-08-19T10:00:00.000Z";
  it("shows account-by-account current, stale, and missing status and blocks a false completion", () => {
    const profile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [
      { id: "salary", institution: "りそな銀行", nickname: "給与口座", owner: "本人" as const, purpose: "salary" as const, balance: 300_000, asOf: "2026-08-19" },
      { id: "education", institution: "ゆうちょ銀行", nickname: "教育口座", owner: "配偶者" as const, purpose: "education" as const, balance: 50_000, asOf: "2026-07-31" },
      { id: "legacy", institution: "未分類", nickname: "家計共通", owner: "世帯" as const, purpose: "unallocated" as const, balance: 0 },
    ] };
    const status = buildMonthlyBalanceUpdateStatus(profile, asOf);
    expect(status.accounts.map(account => account.state)).toEqual(["updated", "stale", "missing-account"]);
    expect(status).toMatchObject({ updatedCount: 1, totalCount: 3, canComplete: false, isCompleted: false });
    expect(recordMonthlyBalanceUpdate(profile, asOf)).toBe(profile);
  });

  it("records completion only after every registered account has this month's balance date", () => {
    const profile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [
      { id: "salary", institution: "りそな銀行", nickname: "給与口座", owner: "本人" as const, purpose: "salary" as const, balance: 300_000, asOf: "2026-08-19" },
      { id: "education", institution: "ゆうちょ銀行", nickname: "教育口座", owner: "配偶者" as const, purpose: "education" as const, balance: 50_000, asOf: "2026-08-18" },
    ] };
    const recorded = recordMonthlyBalanceUpdate(profile, asOf);
    expect(buildMonthlyBalanceUpdateStatus(recorded, asOf)).toMatchObject({ canComplete: true, isCompleted: true, updatedCount: 2, totalCount: 2 });
  });

  it("cancels only the displayed month's completion and keeps account updates and other months intact", () => {
    const profile = { ...INITIAL_OWNER_PROFILE, cashAccounts: [
      { id: "salary", institution: "りそな銀行", nickname: "給与口座", owner: "本人" as const, purpose: "salary" as const, balance: 300_000, asOf: "2026-08-19" },
    ], monthlyBalanceUpdateCompletions: {
      "2026-08": { signature: "salary:updated:2026-08-19", completedAt: asOf },
      "2026-07": { signature: "historical", completedAt: "2026-07-31T10:00:00.000Z" },
    } };
    const cancelled = cancelMonthlyBalanceUpdate(profile, asOf);
    expect(cancelled.cashAccounts).toEqual(profile.cashAccounts);
    expect(cancelled.monthlyBalanceUpdateCompletions).toEqual({ "2026-07": { signature: "historical", completedAt: "2026-07-31T10:00:00.000Z" } });
    expect(buildMonthlyBalanceUpdateStatus(cancelled, asOf).isCompleted).toBe(false);
  });
});
