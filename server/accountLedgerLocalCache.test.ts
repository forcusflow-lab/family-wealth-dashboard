import { describe, expect, it } from "vitest";
import { createAccountLedgerLocalCache, restoreAccountLedgerLocalCache } from "../client/src/lib/accountLedgerLocalCache";
import type { CashAccount } from "../shared/wealth";

const account: CashAccount = { id: "salary", institution: "", nickname: "", owner: "本人", purpose: "salary", balance: 350_000 };

describe("account ledger local cache", () => {
  it("keeps only account identity fields and never stores the monthly balance", () => {
    const cache = createAccountLedgerLocalCache([{ ...account, institution: "りそな銀行", nickname: "給与口座", asOf: "2026-08-19", balance: 999_999 }]);
    expect(cache).toEqual([{ id: "salary", institution: "りそな銀行", nickname: "給与口座", asOf: "2026-08-19" }]);
    expect(JSON.stringify(cache)).not.toContain("999999");
  });

  it("fills only missing server values and does not override newer saved ledger data", () => {
    const cached = [{ id: "salary", institution: "りそな銀行", nickname: "給与口座", asOf: "2026-08-19" }];
    expect(restoreAccountLedgerLocalCache([account], cached)[0]).toMatchObject({ institution: "りそな銀行", nickname: "給与口座", asOf: "2026-08-19", balance: 350_000 });
    expect(restoreAccountLedgerLocalCache([{ ...account, institution: "未分類", nickname: "家計共通の現金" }], cached)[0]).toMatchObject({ institution: "りそな銀行", nickname: "給与口座" });
    expect(restoreAccountLedgerLocalCache([{ ...account, institution: "埼玉りそな銀行", nickname: "住宅ローン口座", asOf: "2026-08-20" }], cached)[0]).toMatchObject({ institution: "埼玉りそな銀行", nickname: "住宅ローン口座", asOf: "2026-08-20" });
  });
});
