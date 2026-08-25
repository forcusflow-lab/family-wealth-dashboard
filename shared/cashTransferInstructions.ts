import { buildMonthlyFundingStatus, type CashPurposeId } from "./fundingStatus";
import type { CashAccount, WealthProfile } from "./wealth";

export type CashTransferStatus = "ready" | "needs-source-account" | "needs-destination-account" | "insufficient-source-balance";

export type CashTransferInstruction = {
  id: CashPurposeId;
  purpose: string;
  requestedAmount: number;
  amount: number;
  due: string;
  status: CashTransferStatus;
  sourceAccount?: Pick<CashAccount, "institution" | "nickname" | "owner" | "purpose">;
  destinationAccount?: Pick<CashAccount, "institution" | "nickname" | "owner" | "purpose">;
  availableFromSource?: number;
  action: string;
  completion: string;
};

function isRegistered(account: CashAccount) {
  return Boolean(account.institution.trim() && account.institution !== "未分類" && account.nickname.trim());
}

export function accountLabel(account: Pick<CashAccount, "institution" | "nickname" | "owner">) {
  return `${account.institution}｜${account.nickname}（${account.owner}）`;
}

/**
 * 実際の台帳残高を超える振替は提案しない。出金元・入金先が未登録なら金額を0円に止め、
 * 残高不足なら移せる上限と残りを明示する。アプリは振替を実行しない。
 */
export function buildCashTransferInstructions(profile: WealthProfile) {
  const funding = buildMonthlyFundingStatus(profile);
  const accounts = profile.cashAccounts ?? [];
  const source = accounts.find(account => account.purpose === "unallocated" && isRegistered(account))
    ?? accounts.find(account => account.purpose === "salary" && isRegistered(account));
  let sourceRemaining = Math.max(0, source?.balance ?? 0);
  const instructions: CashTransferInstruction[] = funding.cashPurposes
    .filter(purpose => purpose.monthlyTransfer > 0)
    .map(purpose => {
      const destination = accounts.find(account => account.purpose === purpose.id && isRegistered(account));
      const requestedAmount = purpose.monthlyTransfer;
      if (!source) {
        return {
          id: purpose.id,
          purpose: purpose.label,
          requestedAmount,
          amount: 0,
          due: purpose.due,
          status: "needs-source-account" as const,
          destinationAccount: destination,
          action: `今月の振替は0円。先に、未分類の現金を実際の出金元口座として台帳へ登録する。登録後、${purpose.label}へ${requestedAmount.toLocaleString("ja-JP")}円を移す。`,
          completion: "口座台帳に出金元の金融機関名・口座名・残高を登録して保存する。まだ振替はしない。",
        };
      }
      if (!destination) {
        return {
          id: purpose.id,
          purpose: purpose.label,
          requestedAmount,
          amount: 0,
          due: purpose.due,
          status: "needs-destination-account" as const,
          sourceAccount: source,
          action: `今月の振替は0円。${accountLabel(source)}から移す先となる「${purpose.label}」目的の口座が未登録のため、先にその口座を台帳へ追加する。登録後の振替額は${requestedAmount.toLocaleString("ja-JP")}円。`,
          completion: `「${purpose.label}」目的の入金先口座を台帳へ登録して保存する。まだ振替はしない。`,
        };
      }
      const availableFromSource = sourceRemaining;
      const amount = Math.min(requestedAmount, availableFromSource);
      sourceRemaining -= amount;
      if (amount < requestedAmount) {
        return {
          id: purpose.id,
          purpose: purpose.label,
          requestedAmount,
          amount,
          due: purpose.due,
          status: "insufficient-source-balance" as const,
          sourceAccount: source,
          destinationAccount: destination,
          availableFromSource,
          action: `${accountLabel(source)}の登録残高から今月移せる額は${amount.toLocaleString("ja-JP")}円です。${accountLabel(destination)}へ${amount.toLocaleString("ja-JP")}円まで振り替え、残り${(requestedAmount - amount).toLocaleString("ja-JP")}円は来月以降に再計算します。`,
          completion: `振替した場合は、${accountLabel(destination)}の残高と基準日を台帳で更新して保存する。`,
        };
      }
      return {
        id: purpose.id,
        purpose: purpose.label,
        requestedAmount,
        amount,
        due: purpose.due,
        status: "ready" as const,
        sourceAccount: source,
        destinationAccount: destination,
        availableFromSource,
        action: `給料日後に${accountLabel(source)}から${accountLabel(destination)}へ${amount.toLocaleString("ja-JP")}円を振り替える。`,
        completion: `振替後、${accountLabel(destination)}の残高を台帳で更新して保存する。`,
      };
    });
  const readyTotal = instructions.filter(item => item.status === "ready" || item.status === "insufficient-source-balance").reduce((sum, item) => sum + item.amount, 0);
  const setupTotal = instructions.filter(item => item.status === "needs-source-account" || item.status === "needs-destination-account").reduce((sum, item) => sum + item.requestedAmount, 0);
  const requiresSetup = instructions.some(item => item.status === "needs-source-account" || item.status === "needs-destination-account");
  const hasInsufficientSourceBalance = instructions.some(item => item.status === "insufficient-source-balance");
  return {
    instructions,
    readyTotal,
    setupTotal,
    requiresSetup,
    hasInsufficientSourceBalance,
    summary: instructions.length === 0
      ? "今月の目的別現金の振替は0円です。"
      : requiresSetup
        ? `今月は振替せず、口座台帳を整える月です。登録後に合計${setupTotal.toLocaleString("ja-JP")}円の振替候補が出ます。`
        : hasInsufficientSourceBalance
          ? `出金元の登録残高の範囲で合計${readyTotal.toLocaleString("ja-JP")}円まで振り替えます。残りは次回に再計算します。`
          : `今月は登録済み口座間で合計${readyTotal.toLocaleString("ja-JP")}円を振り替えます。`,
  };
}
