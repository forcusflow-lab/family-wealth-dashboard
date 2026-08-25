import { isRegisteredCashAccount } from "./accountPurposeProgress";
import type { CashAccount, MonthlyBalanceUpdateCompletion, WealthProfile } from "./wealth";

export type MonthlyBalanceUpdateAccountState = "updated" | "missing-account" | "missing-date" | "stale";

export type MonthlyBalanceUpdateAccount = {
  id: string;
  label: string;
  state: MonthlyBalanceUpdateAccountState;
  detail: string;
  asOf?: string;
};

const period = (asOf: string) => asOf.slice(0, 7);
const accountLabel = (account: CashAccount) => isRegisteredCashAccount(account) ? `${account.institution}｜${account.nickname}` : `口座 ${account.owner}`;
const signatureFor = (accounts: MonthlyBalanceUpdateAccount[]) => accounts.map(account => `${account.id}:${account.state}:${account.asOf ?? ""}`).sort().join("|");

export function buildMonthlyBalanceUpdateStatus(profile: WealthProfile, asOf: string) {
  const month = period(asOf);
  const accounts = (profile.cashAccounts ?? []).map(account => {
    const label = accountLabel(account);
    if (!isRegisteredCashAccount(account)) return { id: account.id, label, state: "missing-account" as const, detail: "金融機関名と口座名を入力してください。" };
    if (!account.asOf) return { id: account.id, label, state: "missing-date" as const, detail: "残高を確認した日を入力してください。" };
    if (period(account.asOf) !== month) return { id: account.id, label, state: "stale" as const, asOf: account.asOf, detail: `${account.asOf.replaceAll("-", "/")}時点の残高です。今月の残高へ更新してください。` };
    return { id: account.id, label, state: "updated" as const, asOf: account.asOf, detail: `${account.asOf.replaceAll("-", "/")}時点の残高を確認済みです。` };
  });
  const updatedCount = accounts.filter(account => account.state === "updated").length;
  const signature = signatureFor(accounts);
  const completion = profile.monthlyBalanceUpdateCompletions?.[month];
  const completed = Boolean(accounts.length && updatedCount === accounts.length && completion?.signature === signature);
  return {
    month,
    accounts,
    updatedCount,
    totalCount: accounts.length,
    percent: accounts.length ? Math.round(updatedCount / accounts.length * 100) : 0,
    canComplete: Boolean(accounts.length && updatedCount === accounts.length),
    completion: completed ? completion : undefined,
    isCompleted: completed,
    signature,
  };
}

export function recordMonthlyBalanceUpdate(profile: WealthProfile, asOf: string) {
  const status = buildMonthlyBalanceUpdateStatus(profile, asOf);
  if (!status.canComplete) return profile;
  const completion: MonthlyBalanceUpdateCompletion = { signature: status.signature, completedAt: asOf };
  return { ...profile, monthlyBalanceUpdateCompletions: { ...(profile.monthlyBalanceUpdateCompletions ?? {}), [status.month]: completion } };
}

/** 表示中の月だけの完了記録を消し、口座ごとの更新状態そのものは変更しない。 */
export function cancelMonthlyBalanceUpdate(profile: WealthProfile, asOf: string) {
  const month = period(asOf);
  const completions = profile.monthlyBalanceUpdateCompletions ?? {};
  if (!completions[month]) return profile;
  const { [month]: _cancelled, ...remaining } = completions;
  return { ...profile, monthlyBalanceUpdateCompletions: remaining };
}
