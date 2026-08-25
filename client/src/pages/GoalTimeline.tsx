import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { buildGoalTimeline } from "@shared/goalTimeline";
import { EMPTY_PROFILE, formatCompactYen, formatPercent, formatYen, type WealthProfile } from "@shared/wealth";
import { CalendarClock, CircleAlert, CircleCheck, Landmark, Link2, Loader2, LockKeyhole, PauseCircle, RefreshCw, ShieldCheck, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const styles = {
  action: "border-[#B7E3C7] bg-[#F0FBF3] text-[#1D6B46]",
  hold: "border-[#F1D6B2] bg-[#FFF8ED] text-[#925E17]",
  review: "border-[#D9E4EE] bg-[#F5F9FC] text-[#386486]",
} as const;

export default function GoalTimeline() {
  const utils = trpc.useUtils();
  const profileQuery = trpc.profile.get.useQuery();
  const profile = profileQuery.data?.payload ? JSON.parse(profileQuery.data.payload) as WealthProfile : EMPTY_PROFILE;
  const timeline = buildGoalTimeline(profile);
  const [rateInput, setRateInput] = useState("");

  useEffect(() => {
    if (profileQuery.data?.payload) setRateInput((profile.loanRate * 100).toFixed(3));
  }, [profileQuery.data?.payload, profile.loanRate]);

  const saveRate = trpc.profile.save.useMutation({
    onSuccess: async () => {
      await utils.profile.get.invalidate();
      toast.success("適用金利を保存し、資金計画を再計算しました");
    },
    onError: () => toast.error("金利を保存できませんでした。入力値と通信状態を確認してください。"),
  });

  const updateRate = () => {
    const value = Number(rateInput);
    if (!Number.isFinite(value) || value < 0 || value > 20) {
      toast.error("年利は0%から20%の範囲で入力してください。");
      return;
    }
    saveRate.mutate({
      payload: JSON.stringify({
        ...profile,
        loanRate: value / 100,
        mortgageRateUpdatedAt: new Date().toISOString().slice(0, 10),
      }),
    });
  };

  return (
    <DashboardLayout>
      <main className="space-y-6">
        <header className="flex flex-col justify-between gap-4 border-b border-[#DADFD9] pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-[#5A7970]">MONTHLY ACTION TIMELINE</p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight text-[#152524]">今月・将来の行動計画</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#68756F]">今月守る資金、教育・住宅で必要になる時期、金利が変わったときの家計への影響を、保存済み前提から再計算します。注文・振込・返済は実行しません。</p>
          </div>
          <div className="rounded-xl bg-[#E5F4EA] px-4 py-3 text-xs text-[#356B56]">基準日: {new Date(timeline.asOf).toLocaleDateString("ja-JP")}</div>
        </header>

        {profileQuery.isLoading ? <div className="grid h-[420px] place-items-center"><Loader2 className="animate-spin text-[#579178]" /></div> : profileQuery.isError ? (
          <section className="rounded-[1.5rem] border border-[#F0D4D0] bg-[#FFF7F5] p-6 text-[#8B4C43]">
            <div className="flex items-start gap-3"><CircleAlert className="mt-0.5 shrink-0" /><div><h2 className="font-serif text-2xl">計画を読み込めませんでした</h2><p className="mt-2 text-sm leading-6">一時的な通信または認証状態の問題の可能性があります。再読み込み後も続く場合は、ログインをし直してください。</p><Button variant="outline" onClick={() => profileQuery.refetch()} className="mt-4 border-[#DDA69D]">再試行</Button></div></div>
          </section>
        ) : <>
          <section className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
            <section className="rounded-[2rem] bg-[#142725] p-7 text-white sm:p-8">
              <div className="flex items-start gap-4"><CalendarClock className="mt-1 text-[#A9EDCE]" /><div><p className="eyebrow text-[#A9EDCE]">THIS MONTH</p><h2 className="mt-2 font-serif text-3xl">今月の優先順位</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">生活防衛、年払い、教育、住宅維持を先に確保し、その残余だけを投資・繰上返済の比較対象にします。</p></div></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">{timeline.priorities.filter(item => item.cadence === "今月" || item.cadence === "条件付き").map(item => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><div className="flex items-center gap-2 text-xs text-[#A9EDCE]">{item.tone === "hold" ? <PauseCircle size={15} /> : <CircleCheck size={15} />}{item.cadence}</div><h3 className="mt-3 text-sm font-semibold leading-6">{item.title}</h3>{item.amount !== undefined && <p className="mt-2 font-serif text-2xl text-[#A9EDCE]">{formatCompactYen(item.amount)}</p>}<p className="mt-3 text-xs leading-5 text-white/60">{item.detail}</p></article>)}</div>
            </section>
            <aside className="rounded-[2rem] border border-[#DCE5DE] bg-white p-6"><div className="flex gap-3"><WalletCards className="shrink-0 text-[#3C8A68]" /><div><p className="text-xs text-[#6B7B73]">NISA 2026</p><h2 className="mt-1 font-serif text-2xl text-[#1B2E2B]">枠を分けて管理</h2></div></div><dl className="mt-5 space-y-4 text-sm"><div className="flex justify-between gap-4 border-b border-[#EEF2EE] pb-3"><dt className="text-[#6F7E75]">成長投資枠の残り</dt><dd className="font-semibold text-[#9A5D19]">{formatCompactYen(timeline.nisa.growthRemaining ?? 0)}</dd></div><div className="flex justify-between gap-4 border-b border-[#EEF2EE] pb-3"><dt className="text-[#6F7E75]">つみたて投資枠の残り</dt><dd className="font-semibold text-[#276B4E]">{formatCompactYen(timeline.nisa.tsumitateRemaining ?? 0)}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#6F7E75]">確認済みNISA評価額</dt><dd className="font-semibold">{formatCompactYen(profile.nisaValue)}</dd></div></dl><p className="mt-5 rounded-xl bg-[#FFF8ED] p-3 text-xs leading-5 text-[#865B22]">成長投資枠は利用者申告に基づき残枠0円として反映しています。翌年の枠を使う前に証券会社画面で再確認してください。</p></aside>
          </section>

          <section className="rounded-[1.5rem] border border-[#CFE2D4] bg-[#F4FAF5] p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="eyebrow text-[#397458]">MONTHLY FUNDING WATERFALL</p><h2 className="mt-2 font-serif text-2xl text-[#1B2E2B]">今月の資金配分</h2><p className="mt-2 max-w-3xl text-xs leading-6 text-[#5E7368]">毎月の世帯手取りだけを基礎に、生活費、目的別現金への移動、余裕資金を順に差し引きます。その後にiDeCoとNISAつみたての設定額だけを候補にします。賞与は毎月の計画に混ぜず、実際に受け取った月に見直します。</p></div><span className={`rounded-full px-3 py-1 text-xs ${timeline.monthlyFunding.status === "conditional-invest" ? "bg-[#DDF3E4] text-[#276B4E]" : "bg-[#FFF1DD] text-[#8A5B20]"}`}>{timeline.monthlyFunding.status === "conditional-invest" ? "現金確保後に設定額を継続" : "現金積立を優先"}</span></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><article className="rounded-xl bg-white p-4"><p className="text-[11px] text-[#718078]">毎月の世帯手取り</p><p className="mt-2 font-serif text-xl text-[#1B312C]">{formatYen(timeline.monthlyFunding.monthlyIncomeBasis)}</p></article><article className="rounded-xl bg-white p-4"><p className="text-[11px] text-[#718078]">生活・住宅ローン</p><p className="mt-2 font-serif text-xl text-[#1B312C]">−{formatYen(timeline.monthlyFunding.monthlyBaseSpending)}</p></article><article className="rounded-xl bg-white p-4"><p className="text-[11px] text-[#718078]">目的別現金へ移す額</p><p className="mt-2 font-serif text-xl text-[#1B312C]">−{formatYen(timeline.monthlyFunding.monthlyAnnualSinking + timeline.monthlyFunding.monthlyEmergencyRepair + timeline.monthlyFunding.monthlyEducationReserve + timeline.monthlyFunding.monthlyHomeMaintenance)}</p><p className="mt-1 text-[10px] text-[#718078]">不足分だけを月割り</p></article><article className="rounded-xl bg-white p-4"><p className="text-[11px] text-[#718078]">iDeCo / NISAつみたて</p><p className="mt-2 font-serif text-xl text-[#1B312C]">{formatYen(timeline.monthlyFunding.recommendedIdeco)} / {formatYen(timeline.monthlyFunding.recommendedNisa)}</p><p className="mt-1 text-[10px] text-[#718078]">設定額のみを候補化</p></article><article className="rounded-xl bg-[#17362C] p-4 text-white"><p className="text-[11px] text-[#B9E7CD]">月内に残す余剰</p><p className="mt-2 font-serif text-xl text-[#B9E7CD]">{formatYen(timeline.monthlyFunding.unallocatedMonthlySurplus)}</p><p className="mt-1 text-[10px] text-white/60">追加投資の指示ではありません</p></article></div><p className="mt-4 text-[11px] leading-5 text-[#61746B]">教育の現金化: {timeline.monthlyFunding.educationDeadlineDetail}。期限付き資金を投資に回す設計ではありません。</p></section>

          <section className="grid gap-5 xl:grid-cols-[1fr_.95fr]">
            <section className="rounded-[1.5rem] border border-[#DDE5DE] bg-white p-5 sm:p-6"><div className="flex gap-3"><CircleCheck className="shrink-0 text-[#3C8A68]" /><div><h2 className="font-serif text-2xl text-[#1B2E2B]">毎月の必要資金</h2><p className="mt-1 text-xs leading-5 text-[#718078]">年払い、住宅維持、教育の前提を現金バケツとして先に確保するための月額目安です。</p></div></div><div className="mt-5 space-y-3">{timeline.priorities.filter(item => item.cadence === "毎月").map(item => <article key={item.id} className={`rounded-2xl border p-4 ${styles[item.tone]}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-medium">{item.cadence}</p><h3 className="mt-1 text-sm font-semibold">{item.title}</h3></div>{item.amount !== undefined && <p className="font-serif text-2xl">{formatCompactYen(item.amount)}<span className="ml-1 text-xs">/月目安</span></p>}</div><p className="mt-3 text-xs leading-5 opacity-80">{item.detail}</p></article>)}</div></section>
            <section className="rounded-[1.5rem] border border-[#DDE5DE] bg-white p-5 sm:p-6"><div className="flex gap-3"><RefreshCw className="shrink-0 text-[#3C8A68]" /><div><h2 className="font-serif text-2xl text-[#1B2E2B]">住宅ローン金利を更新して再計算</h2><p className="mt-1 text-xs leading-5 text-[#718078]">金利通知・返済予定表を確認して、実際の適用金利だけを入力してください。外部口座連携は行いません。</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#F6F8F5] p-4"><p className="text-[11px] text-[#718078]">現在の適用金利</p><p className="mt-2 font-serif text-2xl text-[#1B312C]">{formatPercent(timeline.mortgageRateUpdate.currentRate)}</p><p className="mt-2 text-[10px] text-[#718078]">最終更新: {timeline.mortgageRateUpdate.lastUpdatedAt ?? "未記録"}</p></div><div className="rounded-xl bg-[#F6F8F5] p-4"><p className="text-[11px] text-[#718078]">単純再計算の返済額</p><p className="mt-2 font-serif text-2xl text-[#1B312C]">{formatYen(timeline.mortgageRateUpdate.theoreticalPayment)}/月</p><p className="mt-2 text-[10px] text-[#718078]">契約返済額 {formatYen(timeline.mortgageRateUpdate.currentContractPayment)}/月</p></div></div><div className="mt-4 rounded-xl border border-[#E4EAE4] p-4"><label className="block text-xs font-medium text-[#3E554C]">適用金利（年率）<Input type="number" min="0" max="20" step="0.001" value={rateInput} onChange={event => setRateInput(event.target.value)} className="mt-2 h-10 rounded-lg" /></label><Button onClick={updateRate} disabled={saveRate.isPending} className="mt-3 w-full rounded-xl bg-[#17362C] hover:bg-[#284B42]">{saveRate.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}金利を保存して再計算</Button></div><p className="mt-4 text-xs leading-6 text-[#6D7872]">次回の金利見直し目安は<strong>{timeline.mortgageRateUpdate.nextReview.review}</strong>、適用は<strong>{timeline.mortgageRateUpdate.nextReview.effective}</strong>です。金利上昇時も、5年・125%ルール等の契約条件により当月の返済額が単純計算どおりに変わるとは限りません。5年見直し上限の参考額は {formatYen(timeline.mortgageRateUpdate.fiveYearCap)}/月です。</p></section>
          </section>

          <section className="rounded-[1.5rem] border border-[#DDE5DE] bg-white p-5 sm:p-6"><div className="flex gap-3"><CircleAlert className="shrink-0 text-[#A66A25]" /><div><h2 className="font-serif text-2xl text-[#1B2E2B]">費用の仮置きレンジ</h2><p className="mt-1 text-xs leading-5 text-[#718078]">基準額は計画の出発点、ストレス額は余裕をみる比較用です。実際の進路・見積り・支援制度が判明したら前提条件画面で上書きしてください。</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-3">{timeline.provisionalCostRanges.map(range => <article key={range.id} className="rounded-2xl bg-[#F8FAF8] p-4"><p className="text-xs font-semibold text-[#28483D]">{range.label}</p><div className="mt-3 flex items-end justify-between gap-3"><div><p className="text-[10px] text-[#718078]">基準</p><p className="mt-1 font-serif text-xl text-[#1B312C]">{formatCompactYen(range.base)}</p></div><div className="text-right"><p className="text-[10px] text-[#9A6B2D]">ストレス</p><p className="mt-1 font-serif text-xl text-[#8A5B20]">{formatCompactYen(range.stress)}</p></div></div><p className="mt-3 text-[11px] leading-5 text-[#718078]">{range.detail}</p></article>)}</div></section>

          <section className="rounded-[1.5rem] border border-[#DDE5DE] bg-white p-5 sm:p-6"><div className="flex gap-3"><Landmark className="shrink-0 text-[#3C8A68]" /><div><h2 className="font-serif text-2xl text-[#1B2E2B]">いつ何が必要になるか</h2><p className="mt-1 text-xs leading-5 text-[#718078]">時期は年齢・保存済みの教育費／住宅維持目標・制度からの概算です。通知書、見積り、進路が確定したら更新してください。</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{timeline.futureNeeds.map(need => <article key={need.id} className="rounded-2xl border border-[#E4EAE4] p-4"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#EEF5F0] px-2 py-1 text-[10px] text-[#317051]">{need.category}</span><span className="text-[11px] text-[#76837D]">{need.timing}</span></div><h3 className="mt-3 text-sm font-semibold leading-6 text-[#20352F]">{need.title}</h3>{need.estimate !== undefined && <p className="mt-3 font-serif text-2xl text-[#1B312C]">{formatCompactYen(need.estimate)}</p>}<p className="mt-3 text-xs leading-5 text-[#718078]">{need.detail}</p></article>)}</div></section>

          <section className="grid gap-5 xl:grid-cols-[.92fr_1.08fr]">
            <section className="rounded-[1.5rem] border border-[#DDE5DE] bg-white p-5 sm:p-6"><div className="flex gap-3"><Link2 className="shrink-0 text-[#3C8A68]" /><div><h2 className="font-serif text-2xl text-[#1B2E2B]">金融データの手動更新</h2><p className="mt-1 text-xs leading-5 text-[#718078]">各社の公式画面で確認・出力したCSV、PDF、集計値を使います。ID・パスワード・ワンタイム認証は入力・保存しません。</p></div></div><div className="mt-5 space-y-3">{timeline.connections.map(connection => <article key={connection.id} className="rounded-xl bg-[#F6F8F5] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium text-[#1C332D]">{connection.name}</h3><span className="rounded-full bg-white px-2 py-1 text-[10px] text-[#587166]">{connection.status}</span></div><p className="mt-2 text-xs font-medium text-[#347054]">{connection.capability}</p><p className="mt-2 text-[11px] leading-5 text-[#718078]">{connection.action}</p><a href={connection.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-medium text-[#267057] underline underline-offset-2">公式の確認手順</a></article>)}</div></section>
            <section className="rounded-[1.5rem] border border-[#DCE5DE] bg-[#F0F7F2] p-5 sm:p-6"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-[#347054]" /><div><h2 className="font-serif text-xl text-[#1B312C]">調査の出所と限界</h2><p className="mt-1 text-xs leading-5 text-[#5D7166]">費用・時期は公的資料を参照しつつ、ご家庭の保存済み前提で計算します。将来の支出や金利を保証するものではありません。</p></div></div><div className="mt-5 space-y-3">{timeline.planningSources.map(source => <article key={source.id} className="rounded-xl bg-white/70 p-4"><p className="text-xs font-semibold text-[#204A3C]">{source.title}</p><p className="mt-1 text-[10px] text-[#668076]">基準: {source.asOf}</p><p className="mt-2 text-[11px] leading-5 text-[#5D7166]">{source.detail}</p><a href={source.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[11px] font-medium text-[#267057] underline underline-offset-2">公式資料を見る</a></article>)}</div></section>
          </section>

          <section className="rounded-[1.5rem] border border-[#DCE5DE] bg-[#F9FAF8] p-5 sm:p-6"><div className="flex gap-3"><LockKeyhole className="mt-0.5 shrink-0 text-[#347054]" size={18} /><div><h2 className="font-serif text-xl text-[#1B312C]">前提と安全性</h2><ul className="mt-3 space-y-2 text-xs leading-6 text-[#5D7166]">{timeline.methodology.map(item => <li key={item}>・{item}</li>)}</ul><p className="mt-3 text-xs leading-5 text-[#5D7166]">本アプリは投資助言・税務判断・金融機関の返済予定表の代替ではありません。確定税額、納付期限、契約条件は各機関・税務署または税理士に確認してください。</p></div></div></section>
        </>}
      </main>
    </DashboardLayout>
  );
}
