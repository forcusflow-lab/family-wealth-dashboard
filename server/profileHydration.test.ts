import { describe, expect, it } from "vitest";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";
import { hydrateStoredProfile } from "./profileHydration";

describe("stored profile hydration", () => {
  it("adds only missing schema fields and never injects a separate profile's financial records", () => {
    const legacy = { ...INITIAL_OWNER_PROFILE, annualIncome: 6_000_000, loanRateReference: undefined, withholdingStatements: undefined };
    const hydrated = hydrateStoredProfile(legacy);
    expect(hydrated.changed).toBe(true);
    expect(hydrated.profile.loanRateReference).toBe(legacy.loanRate);
    expect(hydrated.profile.withholdingStatements).toBeUndefined();
    expect(hydrated.profile.annualIncome).toBe(6_000_000);
    expect(hydrated.profile.nisaValue).toBe(INITIAL_OWNER_PROFILE.nisaValue);
  });

  it("does not rewrite an already normalized profile", () => {
    const hydrated = hydrateStoredProfile(INITIAL_OWNER_PROFILE);
    expect(hydrated.changed).toBe(false);
    expect(hydrated.profile).toBe(INITIAL_OWNER_PROFILE);
  });

  it("preserves user-entered education estimates during hydration", () => {
    const legacy = { ...INITIAL_OWNER_PROFILE, privateHighSchoolAnnual: 1_179_000, privateUniversityAtHomeAnnual: 1_600_000 };
    const hydrated = hydrateStoredProfile(legacy);
    expect(hydrated.changed).toBe(false);
    expect(hydrated.profile).toBe(legacy);
  });

  it("adds separate household take-home and child education-savings fields to legacy profiles", () => {
    const legacy = { ...INITIAL_OWNER_PROFILE } as Record<string, unknown>;
    delete legacy.monthlyHouseholdTakeHome;
    delete legacy.annualHouseholdBonusTakeHome;
    delete legacy.childOneEducationSavings;
    delete legacy.childTwoEducationSavings;
    const hydrated = hydrateStoredProfile(legacy as unknown as typeof INITIAL_OWNER_PROFILE);
    expect(hydrated.changed).toBe(true);
    expect(hydrated.profile).toMatchObject({ monthlyHouseholdTakeHome: INITIAL_OWNER_PROFILE.monthlyHouseholdTakeHome, annualHouseholdBonusTakeHome: INITIAL_OWNER_PROFILE.annualHouseholdBonusTakeHome, childOneEducationSavings: 0, childTwoEducationSavings: 0 });
  });

  it("preserves legacy common cash while adding zero-valued spouse and user cash fields", () => {
    const legacy = { ...INITIAL_OWNER_PROFILE } as Record<string, unknown>;
    delete legacy.spousePersonalCash;
    delete legacy.userPersonalCash;
    delete legacy.cashSnapshotAsOf;
    const hydrated = hydrateStoredProfile(legacy as unknown as typeof INITIAL_OWNER_PROFILE);
    expect(hydrated.changed).toBe(true);
    expect(hydrated.profile).toMatchObject({ cashTotal: INITIAL_OWNER_PROFILE.cashTotal, spousePersonalCash: 0, userPersonalCash: 0, cashSnapshotAsOf: undefined });
  });

  it("migrates legacy aggregate cash into editable unallocated account entries", () => {
    const legacy = { ...INITIAL_OWNER_PROFILE } as Record<string, unknown>;
    delete legacy.cashAccounts;
    const hydrated = hydrateStoredProfile(legacy as unknown as typeof INITIAL_OWNER_PROFILE);
    expect(hydrated.changed).toBe(true);
    expect(hydrated.profile.cashAccounts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "legacy-household-cash", purpose: "unallocated", balance: INITIAL_OWNER_PROFILE.cashTotal }),
      expect.objectContaining({ id: "legacy-spouse-cash", purpose: "unallocated", balance: INITIAL_OWNER_PROFILE.spousePersonalCash }),
    ]));
  });

  it("adds empty monthly task completion state to legacy profiles", () => {
    const legacy = { ...INITIAL_OWNER_PROFILE } as Record<string, unknown>;
    delete legacy.monthlyTaskCompletions;
    const hydrated = hydrateStoredProfile(legacy as unknown as typeof INITIAL_OWNER_PROFILE);
    expect(hydrated.changed).toBe(true);
    expect(hydrated.profile.monthlyTaskCompletions).toEqual({});
  });
});
