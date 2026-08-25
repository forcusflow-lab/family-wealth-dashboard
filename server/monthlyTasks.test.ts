import { describe, expect, it } from "vitest";
import { buildCommandTasks, getMonthlyInvestmentGate, toggleCommandTask } from "../shared/monthlyTasks";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("monthly command tasks", () => {
  it("persists completion only while the monthly task signature is unchanged", () => {
    const tasks = buildCommandTasks(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    const reserve = tasks.find(task => task.id === "cash-reserves")!;
    const completedProfile = toggleCommandTask(INITIAL_OWNER_PROFILE, reserve, "accepted", "2026-08-18T09:00:00.000Z");
    expect(buildCommandTasks(completedProfile, "2026-08-18T00:00:00.000Z").find(task => task.id === "cash-reserves")?.completed).toBe(true);

    const changedProfile = { ...completedProfile, annualTravel: completedProfile.annualTravel + 120_000 };
    expect(buildCommandTasks(changedProfile, "2026-08-18T00:00:00.000Z").find(task => task.id === "cash-reserves")?.completed).toBe(false);
  });

  it("resets completion on the next month and shows the child-allowance review in even-numbered months", () => {
    const augustTasks = buildCommandTasks(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    const allowance = augustTasks.find(task => task.id === "child-allowance")!;
    const completedProfile = toggleCommandTask(INITIAL_OWNER_PROFILE, allowance, "accepted", "2026-08-18T09:00:00.000Z");
    expect(buildCommandTasks(completedProfile, "2026-09-01T00:00:00.000Z").find(task => task.id === "child-allowance")).toBeUndefined();
    expect(allowance).toMatchObject({ category: "税制・支援", state: "review", completed: false, sourceUrl: "https://www.cfa.go.jp/policies/kokoseido/jidouteate/annai" });
    expect(allowance.title).toContain("教育目的口座へ記録");
    expect(allowance.guidance).toMatchObject({
      money: expect.stringContaining("0円"),
      recommendation: expect.stringContaining("教育口座"),
      completion: expect.stringContaining("口座台帳"),
    });
  });

  it("records an accepted or held AI recommendation without transferring money or placing an order", () => {
    const task = buildCommandTasks(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z").find(item => item.id === "nisa-contribution")!;
    const held = toggleCommandTask(INITIAL_OWNER_PROFILE, task, "held", "2026-08-18T09:00:00.000Z");
    expect(buildCommandTasks(held, "2026-08-18T00:00:00.000Z").find(item => item.id === "nisa-contribution")?.decision).toBe("held");
    const accepted = toggleCommandTask(held, { ...task, completed: true, decision: "held" }, "accepted", "2026-08-18T10:00:00.000Z");
    expect(buildCommandTasks(accepted, "2026-08-18T00:00:00.000Z").find(item => item.id === "nisa-contribution")?.decision).toBe("accepted");
  });

  it("removes only the selected monthly decision when the same decision is recorded again", () => {
    const asOf = "2026-08-18T00:00:00.000Z";
    const task = buildCommandTasks(INITIAL_OWNER_PROFILE, asOf).find(item => item.id === "nisa-contribution")!;
    const accepted = toggleCommandTask(INITIAL_OWNER_PROFILE, task, "accepted", "2026-08-18T09:00:00.000Z");
    const acceptedTask = buildCommandTasks(accepted, asOf).find(item => item.id === "nisa-contribution")!;
    const reverted = toggleCommandTask(accepted, acceptedTask, "accepted", "2026-08-18T10:00:00.000Z");
    expect(buildCommandTasks(reverted, asOf).find(item => item.id === "nisa-contribution")?.completed).toBe(false);
    expect(buildCommandTasks(reverted, asOf).find(item => item.id === "nisa-contribution")?.decision).toBeUndefined();
  });

  it("makes each money task state its actual amount and completion condition without executing a transfer or order", () => {
    const tasks = buildCommandTasks(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    const cash = tasks.find(task => task.id === "cash-reserves")!;
    const nisa = tasks.find(task => task.id === "nisa-contribution")!;
    const market = tasks.find(task => task.id === "market-refresh")!;
    expect(cash.guidance.money).toContain("今月");
    expect(cash.guidance.completion).toContain("口座台帳");
    expect(nisa.guidance.money).toContain("一括買付は0円");
    expect(market.guidance.money).toContain("0円");
    expect(market.guidance.completion).toContain("更新せず完了");
    for (const task of tasks) {
      expect(task.guidance.recommendation.length).toBeGreaterThan(0);
      expect(task.guidance.rationale.length).toBeGreaterThan(0);
      expect(task.guidance.changesWhen.length).toBeGreaterThan(0);
    }
  });

  it("keeps protected cash actions before investment and blocks new investment when near-term education reserves consume capacity", () => {
    const tasks = buildCommandTasks(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    expect(tasks.map(task => task.id)).toEqual(expect.arrayContaining(["cash-reserves", "ideco-contribution", "nisa-contribution"]));
    expect(tasks.findIndex(task => task.id === "cash-reserves")).toBeLessThan(tasks.findIndex(task => task.id === "ideco-contribution"));
    const gate = getMonthlyInvestmentGate(INITIAL_OWNER_PROFILE, "2026-08-18T00:00:00.000Z");
    expect(gate).toMatchObject({ cashReserveFirst: true, investmentAllowed: true, recommendedNisa: INITIAL_OWNER_PROFILE.nisaMonthly, recommendedLongTermInvestment: 0 });
    const nearTermGate = getMonthlyInvestmentGate({ ...INITIAL_OWNER_PROFILE, childOneAge: 14, cashTotal: 3_209_004, spousePersonalCash: 0, userPersonalCash: 0 }, "2026-08-18T00:00:00.000Z");
    expect(nearTermGate).toMatchObject({ investmentAllowed: false, recommendedNisa: 0, recommendedLongTermInvestment: 0 });
  });
});
