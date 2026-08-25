import type { CashAccount } from "@shared/wealth";

export const ACCOUNT_LEDGER_LOCAL_CACHE_KEY = "family-wealth-dashboard.account-ledger.v1";

export type AccountLedgerLocalCacheEntry = Pick<CashAccount, "id" | "institution" | "nickname" | "asOf">;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function currentStorage(): StorageLike | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage; } catch { return undefined; }
}

export function createAccountLedgerLocalCache(accounts: CashAccount[]): AccountLedgerLocalCacheEntry[] {
  return accounts.map(({ id, institution, nickname, asOf }) => ({ id, institution, nickname, asOf }));
}

export function readAccountLedgerLocalCache(storage: StorageLike | undefined = currentStorage()): AccountLedgerLocalCacheEntry[] {
  if (!storage) return [];
  try {
    const value = storage.getItem(ACCOUNT_LEDGER_LOCAL_CACHE_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is AccountLedgerLocalCacheEntry => Boolean(entry) && typeof entry === "object" && typeof (entry as AccountLedgerLocalCacheEntry).id === "string" && typeof (entry as AccountLedgerLocalCacheEntry).institution === "string" && typeof (entry as AccountLedgerLocalCacheEntry).nickname === "string" && ((entry as AccountLedgerLocalCacheEntry).asOf === undefined || typeof (entry as AccountLedgerLocalCacheEntry).asOf === "string"));
  } catch { return []; }
}

export function writeAccountLedgerLocalCache(accounts: CashAccount[], storage: StorageLike | undefined = currentStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(ACCOUNT_LEDGER_LOCAL_CACHE_KEY, JSON.stringify(createAccountLedgerLocalCache(accounts)));
    return true;
  } catch { return false; }
}

/** サーバーに保存済みの値を常に優先し、端末内の値は空欄だけを補う。残高は保存も復元もしない。 */
export function restoreAccountLedgerLocalCache(accounts: CashAccount[], cachedEntries: AccountLedgerLocalCacheEntry[]): CashAccount[] {
  const cache = new Map(cachedEntries.map(entry => [entry.id, entry]));
  return accounts.map(account => {
    const cached = cache.get(account.id);
    if (!cached) return account;
    const needsAccountIdentity = !account.institution.trim() || account.institution === "未分類";
    return {
      ...account,
      institution: needsAccountIdentity ? cached.institution : account.institution,
      nickname: needsAccountIdentity || !account.nickname.trim() ? cached.nickname : account.nickname,
      asOf: account.asOf ?? cached.asOf,
    };
  });
}
