import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { buildInvestmentPreview } from "@shared/investmentPreview";
import { PROJECTION_NON_GUARANTEE_COPY, type ProjectionScenario } from "@shared/assetProjection";
import { EMPTY_PROFILE, formatCompactYen, type WealthProfile } from "@shared/wealth";
import { AlertTriangle, ChartNoAxesCombined, Loader2, LockKeyhole, RotateCcw, Save, ShieldCheck, SlidersHorizontal, WalletCards } from "lucide-react";
import { toast } from "sonner";

const colors: Record<string, string> = { base: "#22865F", downside: "#C76043", upside: "#3E73B8", incomeShock: "#A66D28", educationShock: "#975EAD", mortgageShock: "#526E8B" };

function chartPath(scenario: ProjectionScenario, maxValue: number) {
  const width = 900; const height = 280; const padding = 18;
  return scenario.points.map((point, index) => {
    const x = padding + (index / Math.max(1, scenario.points.length - 1)) * (width - padding * 2);
    const y = height - padding - (point.totalAssets / Math.max(1, maxValue)) * (height - padding * 2);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <section className="rounded-[1.5rem] border border-[#DEE5DE] bg-white p-5"><p className="text-xs text-[#708078]">{label}</p><p className="mt-3 font-serif text-2xl text-[#1B312C]">{value}</p><p className="mt-3 text-xs leading-5 text-[#6E7E75]">{note}</p></section>;
}

function roundThousand(value: number) {
  return Math.max(0, Math.round(value / 1_000) * 1_000);
}

export default function AssetProjection() {
  const profileQuery = trpc.profile.get.useQuery();
  const [profile, setProfile] = useState<WealthProfile>(EMPTY_PROFILE);
  const [previewAsOf] = useState(() => new Date());
  const [previewInput, setPreviewInput] = useState({ nisaMonthly: 0, idecoMonthly: 0 });
  const [selected, setSelected] = useState("base");
  const saveMutation = trpc.profile.save.useMutation();

  useEffect(() => {
    if (!profileQuery.data?.payload) return;
    try {
      const next = JSON.parse(profileQuery.data.payload) as WealthProfile;
      setProfile(next);
      setPreviewInput({ nisaMonthly: next.nisaMonthly, idecoMonthly: next.idecoMonthly });
    } catch {
      toast.error("プロフィールの読み込みに失敗しました");
    }
  }, [profileQuery.data?.payload]);

  const preview = useMemo(() => buildInvestmentPreview(profile, previewInput, previewAsOf), [profile, previewInput, previewAsOf]);
  const savedPreview = useMemo(() => buildInvestmentPreview(profile, { nisaMonthly: profile.nisaMonthly, idecoMonthly: profile.idecoMonthly }, previewAsOf), [profile, previewAsOf]);
  const projection = preview.projection;
  const selectedScenario = projection.scenarios.find(scenario => scenario.id === selected) ?? projection.scenarios[0]!;
  const maxValue = Math.max(...projection.scenarios.flatMap(scenario => scenario.points.map(point => point.totalAssets)));
  const hasUnsavedPreview = preview.input.nisaMonthly !== profile.nisaMonthly || preview.input.idecoMonthly !== profile.idecoMonthly;
  const endAssetDelta = preview.baseEndAssets - savedPreview.baseEndAssets;

  const updateNisa = (value: number) => setPreviewInput(current => ({ ...current, nisaMonthly: Math.min(preview.limits.nisaMonthly, roundThousand(value)) }));
  const updateIdeco = (value: number) => setPreviewInput(current => ({ ...current, idecoMonthly: Math.min(preview.limits.idecoMonthly, roundThousand(value)) }));
  const resetPreview = () => setPreviewInput({ nisaMonthly: profile.nisaMonthly, idecoMonthly: profile.idecoMonthly });
  const savePreview = () => {
    if (!preview.canSave) {
      toast.error("月次余力を超えているため、保存できません。現金目標を優先してください。");
      return;
    }
    const next = preview.previewProfile;
    setProfile(next);
    saveMutation.mutate({ payload: JSON.stringify(next) }, {
      onSuccess: () => {
        toast.success("月次投資額を家計設定へ保存しました。証券会社・iDeCoの設定は変更されません。");
        profileQuery.refetch();
      },
      onError: () => toast.error("保存に失敗しました。試算値は画面に残っています。"),
    });
  };

  return <DashboardLayout><main className="space-y-6"><header className="border-b border-[#DADFD9] pb-6"><p className="eyebrow text-[#5A7970]">FUTURE ASSET PATHS</p><h1 className="mt-2 font-serif text-4xl tracking-tight text-[#152524]">将来の資産推移</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#66756E]">月次のNISA・iDeCo金額をここで試算すると、商品提案、月次余力、将来資産推移をリアルタイムで更新します。保存前の試算は、家計設定や証券会社の設定を変えません。</p></header>
  {profileQuery.isLoading ? <div className="grid h-[420px] place-items-center"><Loader2 className="animate-spin text-[#579178]"/></div> : <>
    <section className="rounded-[1.5rem] border border-[#C9E1D1] bg-[#F2FBF5] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><SlidersHorizontal className="mt-1 shrink-0 text-[#2E865D]"/><div><p className="eyebrow text-[#39735C]">LIVE INVESTMENT PREVIEW</p><h2 className="mt-2 font-serif text-2xl text-[#1B312C]">毎月の投資額を試算する</h2><p className="mt-1 max-w-2xl text-xs leading-6 text-[#526B5E]">1,000円単位で金額を動かすと、画面内のすべての数値が即時に切り替わります。採用する場合だけ、下の「家計設定に保存」を選びます。</p></div></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${hasUnsavedPreview ? "bg-[#FFF0D3] text-[#946019]" : "bg-[#E0F4E6] text-[#21704F]"}`}>{hasUnsavedPreview ? "未保存の試算中" : "保存済み設定と同じ"}</span></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#D6E6DA] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold tracking-wide text-[#4D7C68]">NISA つみたて投資枠</p><p className="mt-1 text-sm font-semibold text-[#19372D]">eMAXIS Slim 全世界株式（オール・カントリー）</p></div><output className="font-serif text-2xl text-[#17362C]">{preview.input.nisaMonthly.toLocaleString("ja-JP")}円</output></div><Slider aria-label="NISAの月次積立額" className="mt-6" min={0} max={Math.max(1_000, preview.limits.nisaMonthly)} step={1_000} disabled={preview.limits.nisaMonthly === 0} value={[preview.input.nisaMonthly]} onValueChange={value => updateNisa(value[0] ?? 0)}/><div className="mt-3 flex items-center gap-3"><Input aria-label="NISAの月次積立額を直接入力" type="number" min={0} max={preview.limits.nisaMonthly} step={1_000} value={preview.input.nisaMonthly} onChange={event => updateNisa(Number(event.target.value))} className="h-9 max-w-40 rounded-lg border-[#D8E4DB] shadow-none"/><span className="text-[11px] leading-5 text-[#65766E]">今月以降の上限: {preview.limits.nisaMonthly.toLocaleString("ja-JP")}円/月<br/>今年の残枠: {formatCompactYen(preview.limits.nisaRemaining)}</span></div></section>
        <section className="rounded-2xl border border-[#D6E6DA] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold tracking-wide text-[#4D7C68]">SBI証券 iDeCo</p><p className="mt-1 text-sm font-semibold text-[#19372D]">eMAXIS Slim 全世界株式（除く日本）</p></div><output className="font-serif text-2xl text-[#17362C]">{preview.input.idecoMonthly.toLocaleString("ja-JP")}円</output></div><Slider aria-label="iDeCoの月次拠出額" className="mt-6" min={0} max={preview.limits.idecoMonthly} step={1_000} value={[preview.input.idecoMonthly]} onValueChange={value => updateIdeco(value[0] ?? 0)}/><div className="mt-3 flex items-center gap-3"><Input aria-label="iDeCoの月次拠出額を直接入力" type="number" min={0} max={preview.limits.idecoMonthly} step={1_000} value={preview.input.idecoMonthly} onChange={event => updateIdeco(Number(event.target.value))} className="h-9 max-w-40 rounded-lg border-[#D8E4DB] shadow-none"/><span className="text-[11px] leading-5 text-[#65766E]">家計試算上の上限: {preview.limits.idecoMonthly.toLocaleString("ja-JP")}円/月<br/>実際の上限は加入者サイトで確認</span></div></section>
      </div>
      <div className={`mt-4 rounded-xl p-4 text-xs leading-6 ${preview.withinMonthlyCapacity ? "bg-[#E7F6EB] text-[#286348]" : "bg-[#FFF0EA] text-[#8A4939]"}`}><p className="font-semibold">{preview.status}</p><p className="mt-1">目的別現金の積立後に使える月次余力は {formatCompactYen(preview.monthlyCapacity)}。この試算の投資額は {formatCompactYen(preview.requestedMonthlyInvestment)} です。{preview.withinMonthlyCapacity ? `余力の範囲内で${formatCompactYen(Math.max(0, preview.monthlyCapacity - preview.requestedMonthlyInvestment))}を生活口座へ残します。` : "現金目標を削って投資する設定のため、保存・設定変更を止めます。"}</p></div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row"><Button onClick={savePreview} disabled={!hasUnsavedPreview || !preview.canSave || saveMutation.isPending} className="rounded-xl bg-[#17362C] hover:bg-[#284B42]">{saveMutation.isPending ? <Loader2 className="animate-spin"/> : <Save/>}家計設定に保存する</Button><Button onClick={resetPreview} variant="outline" disabled={!hasUnsavedPreview} className="rounded-xl border-[#C7D8CD] bg-white"><RotateCcw/>保存済みの金額に戻す</Button></div>
      <p className="mt-4 text-[11px] leading-5 text-[#61756A]">{preview.saveBoundary} {preview.limits.idecoLimitNote}</p>
    </section>

    <section className="grid gap-4 lg:grid-cols-4"><Metric label="試算中の月次投資額" value={formatCompactYen(preview.requestedMonthlyInvestment)} note={`NISA ${formatCompactYen(preview.input.nisaMonthly)} / iDeCo ${formatCompactYen(preview.input.idecoMonthly)}`}/><Metric label="試算時の基準シナリオ終点" value={formatCompactYen(preview.baseEndAssets)} note={endAssetDelta === 0 ? "保存済み設定と同じ" : `保存済み設定との差: ${endAssetDelta > 0 ? "+" : "−"}${formatCompactYen(Math.abs(endAssetDelta))}`}/><Metric label="NISA今年の残枠" value={formatCompactYen(preview.projection.nisaContext.currentYearRemaining)} note={`買付履歴 ${preview.projection.nisaContext.purchaseCount}件・${formatCompactYen(preview.projection.nisaContext.recordedPurchases)}`}/><Metric label="iDeCo年額（試算）" value={formatCompactYen(preview.projection.idecoContext.annualContribution)} note="資産推移に含めますが、流動性資産には含めません。"/></section>

    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="rounded-[1.5rem] border border-[#D6E6DA] bg-white p-5 sm:p-6"><div className="flex gap-3"><WalletCards className="mt-1 shrink-0 text-[#3C8A68]"/><div><p className="eyebrow text-[#39735C]">LIVE MONTHLY PROPOSAL</p><h2 className="mt-2 font-serif text-2xl text-[#1B2E2B]">この金額での今月の提案</h2><p className="mt-1 text-xs leading-5 text-[#718078]">スライダーの試算額を基に、既存保有との重複・現金余力・制度枠を再判定しています。</p></div></div><div className="mt-5 space-y-3">{preview.recommendation.monthlyProductRecommendations.map(item => <article key={item.id} className="rounded-2xl bg-[#F6FAF7] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold tracking-wide text-[#4D7C68]">{item.account}</p><p className="mt-1 text-sm font-semibold text-[#1B342B]">{item.fundName}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === "積立を提案" ? "bg-[#E0F4E6] text-[#21704F]" : "bg-[#FFF0D3] text-[#946019]"}`}>{item.status}</span></div><p className="mt-3 font-serif text-2xl text-[#17362C]">{item.monthlyAmount.toLocaleString("ja-JP")}円 <span className="font-sans text-xs text-[#60736A]">/ 月・配分{item.allocationPercent}%</span></p><p className="mt-2 text-xs leading-5 text-[#566A60]">{item.instruction}</p><p className="mt-2 text-[11px] leading-5 text-[#65766E]">変更条件: {item.changesWhen}</p></article>)}</div></section>
      <aside className="space-y-5"><section className={`rounded-[1.5rem] p-6 ${preview.projection.scenarios.find(item => item.id === "base")?.cashSafetyBreach ? "bg-[#FFF1EC] text-[#7C382A]" : "bg-[#EAF7EE] text-[#225F44]"}`}><div className="flex gap-3"><AlertTriangle className="shrink-0"/><div><p className="text-xs">生活防衛・目的別現金の安全判定</p><h2 className="mt-2 font-serif text-2xl">{preview.projection.scenarios.find(item => item.id === "base")?.cashSafetyBreach ? "生活防衛水準を下回る年あり" : "生活防衛水準を維持"}</h2><p className="mt-3 text-xs leading-6">最小の生活防衛・目的別現金: {formatCompactYen(preview.projection.scenarios.find(item => item.id === "base")?.lowestLiquidReserve ?? 0)}。{preview.projection.liquidReserveContext.behavior}</p></div></div></section><section className="rounded-[1.5rem] bg-[#142725] p-6 text-white"><LockKeyhole className="text-[#A9EDCE]"/><h2 className="mt-4 font-serif text-2xl">iDeCoは別管理</h2><p className="mt-3 text-sm leading-7 text-white/75">{preview.projection.idecoContext.lockUp}</p></section></aside></section>

    <section className="rounded-[1.5rem] border border-[#DDE5DE] bg-white p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="font-serif text-2xl text-[#1B2E2B]">総資産のシナリオ比較</h2><p className="mt-1 text-xs leading-5 text-[#718078]">スライダーを動かすたびに、年齢{profile.currentAge}歳から{profile.retirementAge}歳までの全シナリオを更新します。iDeCoは資産に含みますが途中使用できません。</p></div><div className="flex flex-wrap gap-2">{projection.scenarios.map(scenario => <button key={scenario.id} onClick={() => setSelected(scenario.id)} className={`rounded-full px-3 py-1.5 text-xs transition ${selected === scenario.id ? "bg-[#17362C] text-white" : "bg-[#F1F4F1] text-[#5F7068] hover:bg-[#E2EAE3]"}`}>{scenario.label}</button>)}</div></div><div className="mt-5 overflow-x-auto"><svg viewBox="0 0 900 280" className="h-[280px] min-w-[680px] w-full rounded-2xl bg-[#F8FAF8]" role="img" aria-label="試算中の将来資産推移の比較グラフ"><line x1="18" y1="262" x2="882" y2="262" stroke="#D7E0D8"/><line x1="18" y1="140" x2="882" y2="140" stroke="#E7EEE8" strokeDasharray="4 5"/>{projection.scenarios.map(scenario => <path key={scenario.id} d={chartPath(scenario, maxValue)} fill="none" stroke={colors[scenario.id]} strokeWidth={scenario.id === selected ? 4 : 2} opacity={scenario.id === selected ? 1 : .5}/>)}</svg></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">{projection.scenarios.map(scenario => <div key={scenario.id} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[scenario.id] }}/>{scenario.label}: {formatCompactYen(scenario.endAssets)}</div>)}</div></section>

    <section className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><section className="rounded-[1.5rem] border border-[#DDE5DE] bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><ChartNoAxesCombined className="shrink-0 text-[#3C8A68]"/><div><h2 className="font-serif text-2xl text-[#1B2E2B]">{selectedScenario.label}シナリオの年次内訳</h2><p className="mt-1 text-xs leading-5 text-[#718078]">{selectedScenario.explanation} 年ごとのNISA・iDeCo・生活防衛／目的別現金・合計を表示します。その他保有は、独立した資産として計上しません。</p></div></div><div className="mt-5 max-h-[720px] overflow-auto"><table className="w-full min-w-[540px] text-left text-xs"><thead className="sticky top-0 border-b border-[#DDE5DE] bg-white text-[#718078]"><tr><th className="pb-3">年齢</th><th className="pb-3">NISA</th><th className="pb-3">iDeCo</th><th className="pb-3">生活防衛・目的別現金</th><th className="pb-3">合計</th></tr></thead><tbody>{selectedScenario.points.map(point => <tr key={point.year} className={`border-b border-[#EEF2EE] text-[#365047] ${point.cashSafetyMet ? "" : "bg-[#FFF5F1]"}`}><td className="py-3">{point.age}歳</td><td className="py-3">{formatCompactYen(point.nisa)}</td><td className="py-3">{formatCompactYen(point.ideco)}</td><td className="py-3">{formatCompactYen(point.liquidReserve)}</td><td className="py-3 font-medium text-[#246345]">{formatCompactYen(point.totalAssets)}</td></tr>)}</tbody></table></div></section><aside className="rounded-[1.5rem] border border-[#DDE5DE] bg-white p-6"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-[#3C8A68]"/><p className="text-xs leading-6 text-[#61736A]">収入前提: {preview.projection.incomeContext.sourceTaxYear ? `令和${preview.projection.incomeContext.sourceTaxYear - 2018}年分の源泉徴収票` : "保存済みの年収入力"}（{formatCompactYen(preview.projection.incomeContext.annualIncome)}）。{preview.projection.incomeContext.source} {preview.projection.nisaContext.source} NISA残枠と買付履歴は、今年の拠出上限にのみ反映します。翌年以降の制度枠、運用成績、税制、収入、支出は変わり得ます。{PROJECTION_NON_GUARANTEE_COPY}</p></div></aside></section>
    <section className="rounded-[1.5rem] border border-[#F0D8B4] bg-[#FFF9EF] p-5 sm:p-6"><h2 className="font-serif text-xl text-[#604716]">モデル前提と限界</h2><ul className="mt-3 space-y-2 text-xs leading-6 text-[#745D2E]">{projection.methodology.map(item => <li key={item}>・{item}</li>)}</ul></section>
  </>}
  </main></DashboardLayout>;
}
