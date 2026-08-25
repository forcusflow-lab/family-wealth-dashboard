import type { CashAccount, WealthProfile } from "./wealth";
import { isRegisteredCashAccount } from "./accountPurposeProgress";

export type AccountInputAlertKind = "no-accounts" | "incomplete" | "missing-date" | "stale";

export type AccountInputAlert = {
  id: string;
  kind: AccountInputAlertKind;
  severity: "red" | "yellow";
  title: string;
  detail: string;
  account?: Pick<CashAccount, "institution" | "nickname" | "owner" | "asOf">;
};

function daysSince(asOf: string, now: Date) {
  const date = new Date(`${asOf}T00:00:00`);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

/**
 * 残高の正しさを推測しない。金融機関名・口座名・基準日が未入力、または45日超なら、
 * 月次判断の前に更新すべき口座として明示する。
 */
export function buildAccountInputAlerts(profile: WealthProfile, now = new Date()) {
  const accounts = profile.cashAccounts ?? [];
  if (accounts.length === 0) {
    return [{ id: "no-accounts", kind: "no-accounts", severity: "red", title: "口座がまだ登録されていません", detail: "給与・生活費に使う実際の口座を1件登録し、残高と基準日を入力してください。" }] satisfies AccountInputAlert[];
  }
  return accounts.flatMap(account => {
    const label = account.institution.trim() && account.institution !== "未分類" && account.nickname.trim()
      ? `${account.institution}｜${account.nickname}`
      : `口座 ${account.owner}`;
    if (!isRegisteredCashAccount(account)) {
      return [{ id: `${account.id}:incomplete`, kind: "incomplete", severity: "red", title: `${label}の名前が未入力です`, detail: "金融機関名と口座名を入力すると、残高と振替先の計算に使えます。", account }];
    }
    if (!account.asOf) {
      return [{ id: `${account.id}:missing-date`, kind: "missing-date", severity: "yellow", title: `${label}の残高基準日が未入力です`, detail: "残高を確認した日を入力してください。今月の判断で古い残高と区別します。", account }];
    }
    const days = daysSince(account.asOf, now);
    if (days > 45) {
      return [{ id: `${account.id}:stale`, kind: "stale", severity: "yellow", title: `${label}の残高が${days}日前です`, detail: "今月の残高を確認し、残高と基準日を更新してください。", account }];
    }
    return [];
  });
}
