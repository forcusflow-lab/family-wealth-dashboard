import { type WealthProfile } from "../shared/wealth";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

export function hydrateStoredProfile(payload: WealthProfile) {
  let changed = false;
  let normalized = payload;
  if (normalized.loanRate !== undefined && normalized.loanRateReference === undefined) {
    normalized = { ...normalized, loanRateReference: normalized.loanRate, mortgageRateUpdatedAt: normalized.mortgageRateUpdatedAt ?? undefined };
    changed = true;
  }
  if (!normalized.homeMaintenanceHorizonYears) {
    normalized = { ...normalized, homeMaintenanceHorizonYears: INITIAL_OWNER_PROFILE.homeMaintenanceHorizonYears ?? 10 };
    changed = true;
  }
  if (normalized.monthlyHouseholdTakeHome === undefined || normalized.annualHouseholdBonusTakeHome === undefined || normalized.childOneEducationSavings === undefined || normalized.childTwoEducationSavings === undefined || normalized.spousePersonalCash === undefined || normalized.userPersonalCash === undefined || normalized.monthlyTaskCompletions === undefined) {
    normalized = {
      ...normalized,
      monthlyHouseholdTakeHome: normalized.monthlyHouseholdTakeHome ?? INITIAL_OWNER_PROFILE.monthlyHouseholdTakeHome,
      annualHouseholdBonusTakeHome: normalized.annualHouseholdBonusTakeHome ?? INITIAL_OWNER_PROFILE.annualHouseholdBonusTakeHome,
      childOneEducationSavings: normalized.childOneEducationSavings ?? INITIAL_OWNER_PROFILE.childOneEducationSavings,
      childTwoEducationSavings: normalized.childTwoEducationSavings ?? INITIAL_OWNER_PROFILE.childTwoEducationSavings,
      spousePersonalCash: normalized.spousePersonalCash ?? 0,
      userPersonalCash: normalized.userPersonalCash ?? 0,
      cashSnapshotAsOf: normalized.cashSnapshotAsOf ?? undefined,
      monthlyTaskCompletions: normalized.monthlyTaskCompletions ?? {},
    };
    changed = true;
  }
  if (normalized.cashAccounts === undefined) {
    const asOf = normalized.cashSnapshotAsOf;
    normalized = {
      ...normalized,
      cashAccounts: [
        ...(normalized.cashTotal > 0 ? [{ id: "legacy-household-cash", institution: "未分類", nickname: "家計共通の現金", owner: "世帯" as const, purpose: "unallocated" as const, balance: normalized.cashTotal, asOf, memo: "既存の家計共通現金から移行。金融機関名と目的を更新してください。" }] : []),
        ...(normalized.spousePersonalCash > 0 ? [{ id: "legacy-spouse-cash", institution: "未分類", nickname: "配偶者の現金", owner: "配偶者" as const, purpose: "unallocated" as const, balance: normalized.spousePersonalCash, asOf, memo: "既存の配偶者現金から移行。家計に使わない場合は台帳から外してください。" }] : []),
        ...(normalized.userPersonalCash > 0 ? [{ id: "legacy-user-cash", institution: "未分類", nickname: "本人の現金", owner: "本人" as const, purpose: "unallocated" as const, balance: normalized.userPersonalCash, asOf, memo: "既存の本人現金から移行。金融機関名と目的を更新してください。" }] : []),
        ...(normalized.childOneEducationSavings > 0 ? [{ id: "legacy-child-one-education", institution: "未分類", nickname: "第1子の教育積立", owner: "第1子" as const, purpose: "education" as const, balance: normalized.childOneEducationSavings, asOf, memo: "既存の子ども教育積立から移行。" }] : []),
        ...(normalized.childTwoEducationSavings > 0 ? [{ id: "legacy-child-two-education", institution: "未分類", nickname: "第2子の教育積立", owner: "第2子" as const, purpose: "education" as const, balance: normalized.childTwoEducationSavings, asOf, memo: "既存の子ども教育積立から移行。" }] : []),
      ],
    };
    changed = true;
  }
  return { profile: normalized, changed };
}
