import type { FamilyChecklistCompletion, WealthProfile } from "./wealth";

export type FamilyChecklistStepId = "balances" | "transfers" | "decisions";
export type FamilyChecklistStep = {
  id: FamilyChecklistStepId;
  title: string;
  detail: string;
  completed?: FamilyChecklistCompletion;
};

const period = (asOf: string) => asOf.slice(0, 7);
const recordKey = (asOf: string, id: FamilyChecklistStepId) => `${period(asOf)}:${id}`;

export function buildFamilyMonthlyChecklist(profile: WealthProfile, asOf: string, inputAlertCount: number, transferSummary: string): FamilyChecklistStep[] {
  const records = profile.familyChecklistCompletions ?? {};
  return [
    { id: "balances", title: "二人で口座残高を確認", detail: inputAlertCount ? `更新が必要な口座が${inputAlertCount}件あります。口座・現金画面で確認してください。` : "登録した口座の残高と基準日を二人で確認しました。", completed: records[recordKey(asOf, "balances")] },
    { id: "transfers", title: "今月の口座操作を確認", detail: transferSummary, completed: records[recordKey(asOf, "transfers")] },
    { id: "decisions", title: "今月の方針を確認", detail: "今月の判断リストを見て、進める項目と見送る項目を二人で確認します。注文や振込はこの画面から実行しません。", completed: records[recordKey(asOf, "decisions")] },
  ];
}

export function recordFamilyMonthlyChecklist(profile: WealthProfile, asOf: string, id: FamilyChecklistStepId, completedBy: FamilyChecklistCompletion["completedBy"]) {
  const key = recordKey(asOf, id);
  return {
    ...profile,
    familyChecklistCompletions: {
      ...(profile.familyChecklistCompletions ?? {}),
      [key]: { signature: key, completedAt: asOf, completedBy },
    },
  };
}
