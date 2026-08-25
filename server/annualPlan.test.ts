import { describe, expect, it } from "vitest";
import { buildAnnualPlan } from "../shared/annualPlan";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("annual plan", () => {
  it("places cash safety before annual investment actions", () => {
    const result = buildAnnualPlan({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], cashTotal: 0, spousePersonalCash: 0, userPersonalCash: 0 }, { asOf: new Date("2026-08-17"), lastMarketRefreshAt: new Date("2026-08-16") });
    expect(result.triggers.find(trigger => trigger.id === "cash")).toMatchObject({ status: "実行", effect: "新規買付保留" });
    expect(result.executionPriority).toBe("新規買付保留");
  });

  it("creates an explicit, ordered January-to-December calendar", () => {
    const result = buildAnnualPlan(INITIAL_OWNER_PROFILE, { asOf: new Date("2026-08-17"), lastMarketRefreshAt: new Date("2026-08-16") });
    expect(result.annualActions.map(item => item.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(result.annualActions.map(item => item.category)).toEqual(expect.arrayContaining(["積立", "税制", "教育", "住宅", "見直し", "保留"]));
  });

  it("uses actual holdings for drift and refresh timestamp for macro safety", () => {
    const result = buildAnnualPlan({ ...INITIAL_OWNER_PROFILE, holdings: INITIAL_OWNER_PROFILE.holdings.map(item => ({ ...item, assetClass: "株式" as const })) }, { asOf: new Date("2026-08-17"), lastMarketRefreshAt: new Date("2026-06-01") });
    expect(result.triggers.find(trigger => trigger.id === "allocation")).toMatchObject({ status: "確認", effect: "新規資金で調整" });
    expect(result.triggers.find(trigger => trigger.id === "macro")).toMatchObject({ status: "実行", effect: "新規買付保留" });
    expect(result.executionPriority).toBe("新規買付保留");
  });

  it("requests a conservative recheck when the current mortgage rate rises by one point", () => {
    const result = buildAnnualPlan({ ...INITIAL_OWNER_PROFILE, loanRate: INITIAL_OWNER_PROFILE.loanRateReference! + 0.01 }, { asOf: new Date("2026-08-17"), lastMarketRefreshAt: new Date("2026-08-16") });
    expect(result.triggers.find(trigger => trigger.id === "rate")).toMatchObject({ status: "実行", effect: "再試算" });
  });

  it("rechecks before adding risk assets when education funding is short", () => {
    const result = buildAnnualPlan({ ...INITIAL_OWNER_PROFILE, cashAccounts: [], childOneAge: 14, cashTotal: 3_209_004, spousePersonalCash: 0, userPersonalCash: 0 }, { asOf: new Date("2026-08-17"), lastMarketRefreshAt: new Date("2026-08-16") });
    expect(result.triggers.find(trigger => trigger.id === "education")).toMatchObject({ status: "確認", effect: "再試算" });
  });
});
