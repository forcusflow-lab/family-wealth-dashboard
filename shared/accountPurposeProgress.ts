import { buildMonthlyFundingStatus } from "./fundingStatus";
import type { CashAccount, WealthProfile } from "./wealth";

export type AccountPurposeProgress = {
  id: "emergency" | "annual" | "education" | "home";
  label: string;
  actualRegisteredBalance: number;
  cashTarget: number;
  shortfall: number;
  percent: number;
  barPercent: number;
  monthsToFund: number;
  requiredMonthlySaving: number;
  due: string;
  color: string;
  status: "funded" | "shortfall";
  risk: "green" | "yellow" | "red";
  riskLabel: "計画どおり" | "注意" | "要対応" | "達成";
  riskReason: string;
};

export function isRegisteredCashAccount(account: CashAccount) {
  return Boolean(account.institution.trim() && account.institution !== "未分類" && account.nickname.trim());
}

/**
 * 目的別の達成率には、実在する金融機関名・口座名が登録された口座だけを使う。
 * 未分類・仮口座を自動配分した仮想残高は、進捗を水増ししないよう別表示にする。
 */
export function buildAccountPurposeProgress(profile: WealthProfile) {
  const funding = buildMonthlyFundingStatus(profile);
  const accounts = profile.cashAccounts ?? [];
  const actualAccounts = accounts.filter(isRegisteredCashAccount);
  const unregisteredAccounts = accounts.filter(account => !isRegisteredCashAccount(account));
  const actualPurposeTotals = actualAccounts.reduce<Record<string, number>>((totals, account) => ({
    ...totals,
    [account.purpose]: (totals[account.purpose] ?? 0) + Math.max(0, account.balance),
  }), {});

  const purposes: AccountPurposeProgress[] = funding.cashPurposes.map(purpose => {
    const actualRegisteredBalance = Math.max(0, actualPurposeTotals[purpose.id] ?? 0);
    const shortfall = Math.max(0, purpose.cashTarget - actualRegisteredBalance);
    const percent = purpose.cashTarget > 0 ? Math.round(actualRegisteredBalance / purpose.cashTarget * 100) : 100;
    const funded = shortfall === 0;
    const requiredMonthlySaving = shortfall > 0 ? Math.ceil(shortfall / Math.max(1, purpose.monthsToFund) / 100) * 100 : 0;
    const risk = funded ? "green"
      : purpose.monthsToFund <= 12 && percent < 80 ? "red"
        : purpose.monthsToFund <= 24 && percent < 50 ? "red"
          : purpose.monthsToFund <= 36 && percent < 50 ? "yellow"
            : purpose.monthsToFund <= 60 && percent < 25 ? "yellow" : "green";
    const riskLabel = funded ? "達成" : risk === "red" ? "要対応" : risk === "yellow" ? "注意" : "計画どおり";
    const riskReason = funded ? "登録済み実口座の残高だけで、現金目標を満たしています。"
      : risk === "red" ? `期限まで約${purpose.monthsToFund}か月で不足${shortfall.toLocaleString("ja-JP")}円です。月${requiredMonthlySaving.toLocaleString("ja-JP")}円の確保を優先してください。`
        : risk === "yellow" ? `期限まで約${purpose.monthsToFund}か月です。不足${shortfall.toLocaleString("ja-JP")}円を、月${requiredMonthlySaving.toLocaleString("ja-JP")}円のペースで確認してください。`
          : `期限まで約${purpose.monthsToFund}か月あります。月${requiredMonthlySaving.toLocaleString("ja-JP")}円の計画で進めます。`;
    return {
      id: purpose.id,
      label: purpose.label,
      actualRegisteredBalance,
      cashTarget: purpose.cashTarget,
      shortfall,
      percent,
      barPercent: Math.min(100, percent),
      monthsToFund: purpose.monthsToFund,
      requiredMonthlySaving,
      due: purpose.due,
      color: purpose.color,
      status: funded ? "funded" : "shortfall",
      risk,
      riskLabel,
      riskReason,
    };
  });

  return {
    purposes,
    registeredAccountCount: actualAccounts.length,
    registeredCashTotal: actualAccounts.reduce((sum, account) => sum + Math.max(0, account.balance), 0),
    registeredUnallocatedCash: Math.max(0, actualPurposeTotals.unallocated ?? 0),
    unregisteredCashTotal: unregisteredAccounts.reduce((sum, account) => sum + Math.max(0, account.balance), 0),
    unregisteredAccountCount: unregisteredAccounts.length,
  };
}
