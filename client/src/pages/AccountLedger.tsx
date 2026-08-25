import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readAccountLedgerLocalCache, restoreAccountLedgerLocalCache, writeAccountLedgerLocalCache } from "@/lib/accountLedgerLocalCache";
import { trpc } from "@/lib/trpc";
import { buildAccountInputAlerts } from "@shared/accountInputAlerts";
import { buildAccountPurposeProgress, isRegisteredCashAccount } from "@shared/accountPurposeProgress";
import { buildCashTransferInstructions } from "@shared/cashTransferInstructions";
import { buildMonthlyBalanceUpdateStatus, cancelMonthlyBalanceUpdate, recordMonthlyBalanceUpdate } from "@shared/monthlyBalanceUpdateStatus";
import { CASH_ACCOUNT_PURPOSES, CASH_ACCOUNT_PURPOSE_LABELS, EMPTY_PROFILE, formatCompactYen, validateCashAccounts, type CashAccount, type CashAccountOwner, type CashAccountPurpose, type WealthProfile } from "@shared/wealth";
import { Building2, CircleAlert, Landmark, Loader2, Plus, Save, Trash2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const owners: CashAccountOwner[] = ["世帯", "本人", "配偶者", "第1子", "第2子"];

const progressTone = {
  green: { card: "border-[#C8E6D1] bg-[#F4FBF6]", badge: "bg-[#DFF3E5] text-[#23704E]", bar: "#35A76E", text: "text-[#2D7551]" },
  yellow: { card: "border-[#F0D49A] bg-[#FFFDF6]", badge: "bg-[#FFF0C9] text-[#946019]", bar: "#D99A24", text: "text-[#8B5E17]" },
  red: { card: "border-[#EDC4BE] bg-[#FFF8F6]", badge: "bg-[#FBE0DC] text-[#AA4B3F]", bar: "#D85B4B", text: "text-[#A3463A]" },
} as const;

function purposeHint(purpose: CashAccountPurpose) {
  const hints: Record<CashAccountPurpose, string> = {
    salary: "毎月の給与受取・生活費引落に使う口座です。",
    emergency: "急な収入減や病気に備える、生活防衛用の口座です。",
    annual: "固定資産税・旅行・保険など年払い用の口座です。",
    education: "子どもの教育費用として分けておく口座です。",
    home: "修繕・設備更新など住宅維持用の口座です。",
    retirement: "老後資金として長期に分けておく口座です。",
    investment: "投資前の待機資金用です。生活費には使わない前提です。",
    unallocated: "まだ用途を決めていない現金です。今月の資金計画で配分候補になります。",
  };
  return hints[purpose];
}

export default function AccountLedger() {
  const profileQuery = trpc.profile.get.useQuery();
  const saveMutation = trpc.profile.save.useMutation({ onError: () => toast.error("口座台帳を保存できませんでした。もう一度お試しください。") });
  const [profile, setProfile] = useState<WealthProfile>(EMPTY_PROFILE);
  const [asOf] = useState(() => new Date().toISOString());
  const [cancelArmed, setCancelArmed] = useState(false);

  useEffect(() => {
    if (!profileQuery.data?.payload) return;
    try { const loaded = JSON.parse(profileQuery.data.payload) as WealthProfile; setProfile({ ...loaded, cashAccounts: restoreAccountLedgerLocalCache(loaded.cashAccounts ?? [], readAccountLedgerLocalCache()) }); }
    catch { toast.error("口座台帳の読み込みに失敗しました。"); }
  }, [profileQuery.data?.payload]);

  const accounts = profile.cashAccounts ?? [];
  const purposeProgress = useMemo(() => buildAccountPurposeProgress(profile), [profile]);
  const inputAlerts = useMemo(() => buildAccountInputAlerts(profile, new Date(asOf)), [profile, asOf]);
  const transfers = useMemo(() => buildCashTransferInstructions(profile), [profile]);
  const balanceUpdate = useMemo(() => buildMonthlyBalanceUpdateStatus(profile, asOf), [profile, asOf]);
  useEffect(() => { if (profileQuery.data?.payload) writeAccountLedgerLocalCache(accounts); }, [accounts, profileQuery.data?.payload]);
  const update = (id: string, patch: Partial<CashAccount>) => setProfile(current => ({ ...current, cashAccounts: (current.cashAccounts ?? []).map(account => account.id === id ? { ...account, ...patch } : account) }));
  const add = () => setProfile(current => ({ ...current, cashAccounts: [...(current.cashAccounts ?? []), { id: `account-${Date.now()}`, institution: "", nickname: "", owner: "世帯", purpose: "unallocated", balance: 0, asOf: current.cashSnapshotAsOf, memo: "" }] }));
  const remove = (id: string) => setProfile(current => ({ ...current, cashAccounts: (current.cashAccounts ?? []).filter(account => account.id !== id) }));
  const save = () => {
    const errors = validateCashAccounts(accounts);
    if (errors.length) { toast.error(errors[0]); return; }
    saveMutation.mutate({ payload: JSON.stringify(profile) }, { onSuccess: () => toast.success("口座台帳を保存しました。今月の口座操作を再計算します。") });
  };
  const recordBalanceUpdateCompletion = () => {
    if (!balanceUpdate.canComplete) { toast.error("すべての口座について、今月の残高と基準日を更新してから完了にできます。"); return; }
    const previous = profile;
    const next = recordMonthlyBalanceUpdate(profile, asOf);
    setProfile(next);
    saveMutation.mutate({ payload: JSON.stringify(next) }, { onSuccess: () => toast.success("今月の残高更新を完了として記録しました。"), onError: () => setProfile(previous) });
  };
  const cancelBalanceUpdateCompletion = () => {
    const previous = profile;
    const next = cancelMonthlyBalanceUpdate(profile, asOf);
    setProfile(next);
    setCancelArmed(false);
    saveMutation.mutate({ payload: JSON.stringify(next) }, { onSuccess: () => toast.success("今月の完了記録を取り消しました。口座ごとの更新状況を確認できます。"), onError: () => setProfile(previous) });
  };

  if (profileQuery.isLoading) return <DashboardLayout><main className="grid min-h-[60vh] place-items-center"><div className="text-center"><Loader2 className="mx-auto animate-spin text-[#4A9471]"/><p className="mt-3 text-sm text-[#60756A]">口座の情報を読み込んでいます</p></div></main></DashboardLayout>;

  return <DashboardLayout><main className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-[1.75rem] bg-[#17362C] p-6 text-white sm:p-8">
      <p className="eyebrow text-[#A9EDCE]">口座と現金 · 手動入力</p>
      <h1 className="mt-2 font-serif text-3xl sm:text-4xl">現金・口座のポジション</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/70">ここは、実際に使う銀行・証券口座の残高を記録する流動性台帳です。月に1回、各アプリの残高を更新すると、Decision Deskの現金余力・振替候補・投資余力を再計算します。ここから振込や注文は行いません。</p><p className="mt-3 inline-flex rounded-lg bg-white/10 px-3 py-2 text-xs leading-5 text-[#C9EEDC]">この端末では、金融機関名・口座名・残高の基準日を自動で保管して次回の入力に使います。残高は毎月あらためて入力してください。</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/10 p-4"><p className="text-[10px] text-white/55">入力済みの口座</p><p className="mt-2 font-serif text-2xl text-[#A9EDCE]">{purposeProgress.registeredAccountCount}件</p></div>
        <div className="rounded-2xl bg-white/10 p-4"><p className="text-[10px] text-white/55">入力済み口座の現金</p><p className="mt-2 font-serif text-2xl text-[#A9EDCE]">{formatCompactYen(purposeProgress.registeredCashTotal)}</p></div>
        <div className="rounded-2xl bg-white/10 p-4"><p className="text-[10px] text-white/55">まだ口座名を入れていないお金</p><p className="mt-2 font-serif text-2xl text-[#A9EDCE]">{formatCompactYen(purposeProgress.unregisteredCashTotal)}</p></div>
      </div>
    </header>

    <section className={`rounded-[1.5rem] border p-5 sm:p-6 ${balanceUpdate.isCompleted ? "border-[#C9E5D3] bg-[#F5FBF7]" : "border-[#D7E6DB] bg-white"}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow text-[#39735C]">今月の残高更新</p><h2 className="mt-2 font-serif text-2xl text-[#1B342C]">口座ごとの更新状況</h2><p className="mt-2 text-xs leading-6 text-[#60766B]">今月の基準日が入った口座を一覧で確認します。すべて更新後に完了記録を残せます。</p></div><div className="shrink-0 rounded-2xl bg-[#EDF6F0] px-4 py-3 text-right"><p className="text-[10px] text-[#507462]">今月の進捗</p><p className="mt-1 font-serif text-2xl text-[#1A4935]">{balanceUpdate.updatedCount} / {balanceUpdate.totalCount}件</p></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E6ECE7]" role="progressbar" aria-label="今月の残高更新進捗" aria-valuemin={0} aria-valuemax={100} aria-valuenow={balanceUpdate.percent}><div className="h-full rounded-full bg-[#369160] transition-[width] duration-300" style={{ width: `${balanceUpdate.percent}%` }}/></div><div className="mt-4 grid gap-2 md:grid-cols-2">{balanceUpdate.accounts.length ? balanceUpdate.accounts.map(account => <div key={account.id} className={`rounded-xl border px-4 py-3 ${account.state === "updated" ? "border-[#D6E9DC] bg-[#F8FCF9]" : account.state === "missing-account" ? "border-[#EAC8BF] bg-[#FFF8F5]" : "border-[#F0D79D] bg-[#FFFDF7]"}`}><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold text-[#294638]">{account.label}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${account.state === "updated" ? "bg-[#DCF2E4] text-[#26704D]" : account.state === "missing-account" ? "bg-[#F9E1DB] text-[#A54B3E]" : "bg-[#FFF0CA] text-[#946019]"}`}>{account.state === "updated" ? "更新済み" : account.state === "missing-account" ? "口座名を入力" : account.state === "missing-date" ? "基準日を入力" : "今月更新"}</span></div><p className="mt-2 text-[11px] leading-5 text-[#61756B]">{account.detail}</p></div>) : <p className="rounded-xl bg-[#F6F9F6] px-4 py-3 text-xs text-[#61756B]">まず、実際に使う口座を追加してください。</p>}</div><div className="mt-5 flex flex-col gap-3 rounded-xl bg-[#F4F8F5] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#557066]">{balanceUpdate.isCompleted ? `今月の残高更新は${new Date(balanceUpdate.completion!.completedAt).toLocaleDateString("ja-JP")}に記録済みです。取り消しても残高・基準日は変わらず、この月の完了記録だけを外します。` : balanceUpdate.canComplete ? "すべての口座が今月の残高として更新されています。完了を記録してください。" : "未更新または入力待ちの口座を更新すると、完了を記録できます。"}</p>{balanceUpdate.isCompleted ? cancelArmed ? <div className="flex shrink-0 gap-2"><Button disabled={saveMutation.isPending} onClick={() => setCancelArmed(false)} variant="outline" className="rounded-xl">やめる</Button><Button disabled={saveMutation.isPending} onClick={cancelBalanceUpdateCompletion} className="rounded-xl bg-[#A54B3E] hover:bg-[#8E3E33]">取り消しを確定</Button></div> : <Button disabled={saveMutation.isPending} onClick={() => setCancelArmed(true)} variant="outline" className="shrink-0 rounded-xl border-[#DDB5AC] bg-white text-[#A54B3E] hover:bg-[#FFF6F4] hover:text-[#8E3E33]">完了記録を取り消す</Button> : <Button disabled={!balanceUpdate.canComplete || saveMutation.isPending} onClick={recordBalanceUpdateCompletion} className="shrink-0 rounded-xl bg-[#17362C] hover:bg-[#284B42]">今月の残高更新を完了にする</Button>}</div></section>

    {inputAlerts.length > 0 && <section className="rounded-[1.5rem] border border-[#EBCDC4] bg-[#FFF9F6] p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow text-[#A44E41]">今月の入力を確認</p><h2 className="mt-2 font-serif text-2xl text-[#4D3028]">更新が必要な口座があります</h2><p className="mt-2 text-xs leading-6 text-[#765046]">残高が0円かどうかではなく、口座名・残高の基準日が不足しているときだけ知らせます。45日より前の残高も今月の判断前に確認します。</p></div><span className="shrink-0 rounded-xl bg-[#F9E3DD] px-3 py-2 text-xs font-semibold text-[#9D4A3D]">{inputAlerts.length}件</span></div><div className="mt-4 grid gap-2 md:grid-cols-2">{inputAlerts.map(alert => <div key={alert.id} className={`rounded-xl border px-4 py-3 text-xs leading-5 ${alert.severity === "red" ? "border-[#ECC5BD] bg-white text-[#84463A]" : "border-[#F0D69B] bg-[#FFFDF7] text-[#805D23]"}`}><p className="font-semibold">{alert.title}</p><p className="mt-1 opacity-85">{alert.detail}</p></div>)}</div></section>}

    <section className="rounded-[1.5rem] border border-[#D7E6DB] bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow text-[#39735C]">目的ごとの貯金の進みぐあい</p><h2 className="mt-2 font-serif text-2xl text-[#1B342C]">使い道ごとの貯金の進みぐあい</h2><p className="mt-1 max-w-3xl text-xs leading-6 text-[#60766B]">入力済みの口座だけを数えています。赤は今月優先したい状態、黄は積立ペースを確認する状態、緑は今の計画で進める状態です。</p></div>
        <div className="rounded-xl bg-[#F4F8F5] px-4 py-3 text-right"><p className="text-[10px] text-[#718078]">まだ使い道を決めていないお金</p><p className="mt-1 font-serif text-xl text-[#1B312C]">{formatCompactYen(purposeProgress.registeredUnallocatedCash)}</p></div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {purposeProgress.purposes.map(purpose => {
          const tone = progressTone[purpose.risk];
          return <article key={purpose.id} className={`rounded-2xl border p-4 ${tone.card}`}>
            <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-[#1C372D]">{purpose.label}</p><p className="mt-1 text-[10px] text-[#6D7D75]">{purpose.due}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${tone.badge}`}>{purpose.riskLabel}</span></div>
            <p className="mt-4 font-serif text-2xl text-[#1B342C]">{formatCompactYen(purpose.actualRegisteredBalance)}</p>
            <p className="mt-1 text-[11px] text-[#65766E]">目標 {formatCompactYen(purpose.cashTarget)} ・ {purpose.percent}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E6ECE7]" role="progressbar" aria-label={`${purpose.label}の現金目標達成率`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={purpose.barPercent}><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${purpose.barPercent}%`, background: tone.bar }}/></div>
            <p className={`mt-3 text-[11px] leading-5 ${tone.text}`}>{purpose.riskReason}</p>
          </article>;
        })}
      </div>
    </section>

    <section className="rounded-[1.5rem] border border-[#D7E6DB] bg-white p-5 sm:p-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow text-[#39735C]">残高から計算した今月の口座操作</p><h2 className="mt-2 font-serif text-2xl text-[#1B342C]">目的別の振替指示</h2><p className="mt-1 max-w-3xl text-xs leading-6 text-[#60766B]">実際に登録された出金元の残高を超えては表示しません。口座名が未入力の場合も、振替額は0円で止めます。ここから振込は実行しません。</p></div><span className="rounded-xl bg-[#F2F7F3] px-3 py-2 text-xs text-[#315A48]">今月移せる合計 {formatCompactYen(transfers.readyTotal)}</span></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{transfers.instructions.length ? transfers.instructions.map(instruction => <article key={instruction.id} className={`rounded-2xl border p-4 ${instruction.status === "ready" ? "border-[#CBE4D3] bg-[#F7FCF8]" : instruction.status === "insufficient-source-balance" ? "border-[#F0D498] bg-[#FFFDF7]" : "border-[#EBCDC4] bg-[#FFF9F6]"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#1B372C]">{instruction.purpose}</p><p className="mt-1 text-[11px] text-[#65766D]">{instruction.due}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${instruction.status === "ready" ? "bg-[#DCF2E4] text-[#24704C]" : instruction.status === "insufficient-source-balance" ? "bg-[#FFF0CA] text-[#946019]" : "bg-[#F9E1DB] text-[#A54B3E]"}`}>{instruction.status === "ready" ? "振替候補" : instruction.status === "insufficient-source-balance" ? "残高不足" : "先に口座を入力"}</span></div><p className="mt-3 font-serif text-2xl text-[#17362C]">{formatCompactYen(instruction.amount)} <span className="font-sans text-[11px] text-[#65766D]">/ 今月移せる額</span></p>{instruction.amount !== instruction.requestedAmount && <p className="mt-1 text-[11px] text-[#946019]">本来の目安 {formatCompactYen(instruction.requestedAmount)} ・残り {formatCompactYen(instruction.requestedAmount - instruction.amount)}</p>}<p className="mt-3 text-xs leading-5 text-[#5E7168]">{instruction.action}</p></article>) : <p className="rounded-xl bg-[#F6F9F6] px-4 py-3 text-xs text-[#61756B]">今月、追加で目的別口座へ移すお金はありません。</p>}</div></section>

    <section className="rounded-[1.5rem] border border-[#D7E6DB] bg-[#F3FAF5] p-5 sm:p-6"><div className="flex gap-3"><CircleAlert className="mt-1 shrink-0 text-[#367D5C]"/><div><h2 className="font-serif text-xl text-[#1B342C]">最初はここだけ</h2><p className="mt-2 text-xs leading-6 text-[#5D7469]">「未分類｜家計共通の現金」は、以前の数字を一時的に入れたものです。実際の銀行名と口座名へ書き換えるか、削除して普段使う口座を追加してください。出金元と入金先の口座名がそろうまで、アプリは振込額を0円と表示します。</p></div></div></section>

    <section className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow text-[#4B7E68]">入力する口座</p><h2 className="mt-2 font-serif text-2xl text-[#1B312C]">口座と使い道</h2><p className="mt-1 text-xs leading-5 text-[#6B7B73]">口座に使い道を付けると、生活防衛・教育・住宅維持などの資金計画とつながります。</p></div><Button onClick={add} variant="outline" className="rounded-xl border-[#BFD7C7] bg-white"><Plus size={16}/>口座を追加</Button></div>
      {profileQuery.isLoading ? <div className="grid h-48 place-items-center rounded-2xl border border-[#DDE8E0] bg-white"><Loader2 className="animate-spin text-[#4A9471]"/></div> : accounts.length === 0 ? <div className="rounded-2xl border border-dashed border-[#BFD7C7] bg-white p-8 text-center"><Landmark className="mx-auto text-[#4A9471]"/><p className="mt-3 font-semibold text-[#274A3D]">登録済みの口座はありません</p><p className="mt-2 text-xs text-[#708078]">まず、給与や生活費に使う実際の銀行口座を1件追加してください。</p></div> : accounts.map((account, index) => <article key={account.id} className={`rounded-[1.5rem] border bg-white p-5 ${inputAlerts.some(alert => alert.id.startsWith(`${account.id}:`) && alert.severity === "red") ? "border-[#EBC7BF]" : inputAlerts.some(alert => alert.id.startsWith(`${account.id}:`)) ? "border-[#EFD89E]" : "border-[#DCE6DE]"}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${isRegisteredCashAccount(account) ? "bg-[#E3F5EA] text-[#267151]" : "bg-[#FFF0D7] text-[#9B6519]"}`}><Building2 size={19}/></div><div><p className="text-sm font-semibold text-[#1A342B]">口座 {index + 1} {isRegisteredCashAccount(account) ? "・実口座として登録済み" : "・実口座の入力待ち"}</p><p className="mt-1 text-[11px] text-[#6B7B73]">{isRegisteredCashAccount(account) ? `${account.institution}｜${account.nickname}` : "金融機関名と口座名を入力してください"}</p></div></div><Button onClick={() => remove(account.id)} variant="outline" size="sm" className="rounded-lg border-[#F1C7C0] text-[#A54B3E] hover:bg-[#FFF5F2] hover:text-[#A54B3E]"><Trash2 size={15}/>削除</Button></div>{inputAlerts.filter(alert => alert.id.startsWith(`${account.id}:`)).map(alert => <div key={alert.id} className={`mt-4 rounded-xl px-4 py-3 text-xs leading-5 ${alert.severity === "red" ? "bg-[#FCE5E0] text-[#93483D]" : "bg-[#FFF2D3] text-[#805D21]"}`}><span className="font-semibold">{alert.severity === "red" ? "入力が必要: " : "更新を確認: "}</span>{alert.detail}</div>)}
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label><span className="mb-1.5 block text-[11px] font-medium text-[#587066]">金融機関名</span><Input value={account.institution} placeholder="例：りそな銀行" onChange={event => update(account.id, { institution: event.target.value })} className="h-10 rounded-xl shadow-none"/></label><label><span className="mb-1.5 block text-[11px] font-medium text-[#587066]">口座名・呼び名</span><Input value={account.nickname} placeholder="例：給与・引落口座" onChange={event => update(account.id, { nickname: event.target.value })} className="h-10 rounded-xl shadow-none"/></label><label><span className="mb-1.5 block text-[11px] font-medium text-[#587066]">名義</span><select value={account.owner} onChange={event => update(account.id, { owner: event.target.value as CashAccountOwner })} className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">{owners.map(owner => <option key={owner} value={owner}>{owner}</option>)}</select></label><label><span className="mb-1.5 block text-[11px] font-medium text-[#587066]">目的</span><select value={account.purpose} onChange={event => update(account.id, { purpose: event.target.value as CashAccountPurpose })} className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring">{CASH_ACCOUNT_PURPOSES.map(purpose => <option key={purpose} value={purpose}>{CASH_ACCOUNT_PURPOSE_LABELS[purpose]}</option>)}</select></label></div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1.35fr_.8fr_.8fr]"><label><span className="mb-1.5 block text-[11px] font-medium text-[#587066]">メモ</span><Input value={account.memo ?? ""} placeholder="例：住宅ローンと固定資産税の引落用" onChange={event => update(account.id, { memo: event.target.value })} className="h-10 rounded-xl shadow-none"/></label><label><span className="mb-1.5 block text-[11px] font-medium text-[#587066]">現在残高（円）</span><Input type="number" min="0" value={account.balance} onChange={event => update(account.id, { balance: Math.max(0, Number(event.target.value)) })} className="h-10 rounded-xl text-right shadow-none"/></label><label><span className="mb-1.5 block text-[11px] font-medium text-[#587066]">残高の基準日</span><Input type="date" value={account.asOf ?? ""} onChange={event => update(account.id, { asOf: event.target.value || undefined })} className="h-10 rounded-xl shadow-none"/></label></div>
        <p className="mt-3 rounded-xl bg-[#F6F9F6] px-4 py-3 text-[11px] leading-5 text-[#61756B]"><span className="font-semibold text-[#2C624B]">この目的の役割: </span>{purposeHint(account.purpose)}</p></article>)}</section>

    <section className="flex flex-col gap-3 rounded-2xl border border-[#C9DFD0] bg-white p-4 shadow-lg sm:sticky sm:bottom-4 sm:z-10 sm:flex-row sm:items-center sm:justify-between sm:bg-white/95 sm:backdrop-blur"><div className="flex items-center gap-3"><WalletCards className="text-[#367D5C]"/><p className="text-xs leading-5 text-[#5E7168]">保存すると、今月の口座操作・目的別現金・投資余力を再計算します。銀行への振込、証券会社への注文、設定変更は実行しません。</p></div><Button onClick={save} disabled={saveMutation.isPending} className="shrink-0 rounded-xl bg-[#17362C] hover:bg-[#284B42]">{saveMutation.isPending ? <Loader2 className="animate-spin"/> : <Save size={16}/>}口座台帳を保存</Button></section>
  </main></DashboardLayout>;
}
