import { describe, expect, it } from "vitest";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";
import { buildFamilyMonthlyChecklist, recordFamilyMonthlyChecklist } from "../shared/familyMonthlyChecklist";

describe("family monthly checklist", () => {
  const asOf = "2026-08-19T00:00:00.000Z";
  it("records who completed a shared monthly review without executing money movement", () => {
    const updated = recordFamilyMonthlyChecklist(INITIAL_OWNER_PROFILE, asOf, "balances", "二人で確認");
    const checklist = buildFamilyMonthlyChecklist(updated, asOf, 0, "今月の振替は0円です。");
    expect(checklist[0].completed?.completedBy).toBe("二人で確認");
    expect(checklist[1].detail).toContain("振替は0円");
  });
});
