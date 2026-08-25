import { calculateWealthPlan, type WealthProfile } from "./wealth";
import { buildMonthlyFundingStatus } from "./fundingStatus";

export type AnnualAction = { month: number; category: "積立" | "税制" | "教育" | "住宅" | "見直し" | "保留"; action: string; trigger?: string };
export type RecommendationEffect = "定額積立継続" | "新規買付保留" | "新規資金で調整" | "再試算";
export type AutoTrigger = { id: string; label: string; status: "実行" | "確認" | "待機"; action: string; threshold: string; effect: RecommendationEffect; detail: string };
export type AnnualPlanContext = { asOf?: Date; lastMarketRefreshAt?: Date | string | null };

function normalizeContext(context: Date | AnnualPlanContext | undefined) {
  if (context instanceof Date) return { asOf: context, lastMarketRefreshAt: null };
  return { asOf: context?.asOf ?? new Date(), lastMarketRefreshAt: context?.lastMarketRefreshAt ?? null };
}

export function buildAnnualPlan(profile: WealthProfile, context?: Date | AnnualPlanContext) {
  const { asOf, lastMarketRefreshAt } = normalizeContext(context);
  const plan = calculateWealthPlan(profile);
  const funding = buildMonthlyFundingStatus(profile);
  const emergencyShortfall = funding.cashPurposes.find(purpose => purpose.id === "emergency")?.gap ?? 0;
  const nearTermEducation = funding.cashPurposes.find(purpose => purpose.id === "education");
  const educationShortfall = nearTermEducation?.gap ?? 0;
  const longTermEducation = funding.longTermPlans.find(item => item.id === "education");
  const driftedAssets = plan.drift.filter(item => Math.abs(item.drift) > profile.rebalanceThreshold);
  const rateReference = profile.loanRateReference ?? profile.loanRate;
  const rateRise = profile.loanRate - rateReference;
  const parsedRefreshAt = lastMarketRefreshAt ? new Date(lastMarketRefreshAt) : null;
  const macroAgeDays = parsedRefreshAt && !Number.isNaN(parsedRefreshAt.getTime()) ? Math.floor((asOf.getTime() - parsedRefreshAt.getTime()) / 86_400_000) : Infinity;
  const firstChildHighStartYears = Math.max(0, 15 - profile.childOneAge);
  const annualActions: AnnualAction[] = [
    { month: 1, category: "税制", action: "iDeCo掛金証明・源泉徴収票・住宅ローン年末残高を保管し、控除の適用漏れを確認。NISA/iDeCoの定額積立は安全条件を満たす場合のみ継続。" },
    { month: 2, category: "積立", action: "現金バッファと教育資金の不足額を再確認。充足していればNISA/iDeCoを定額積立、未充足ならNISAの追加買付を保留。" },
    { month: 3, category: "見直し", action: "年度末の生活費・保険料・習い事を更新し、前年との差異を年次余剰へ反映。" },
    { month: 4, category: "教育", action: "新年度の学費・習い事・教育方針を入力。第一子の高校開始までの年数に応じ、教育資金を安全資産へ移す。", trigger: `第一子の高校開始まで約${firstChildHighStartYears}年` },
    { month: 5, category: "保留", action: "配分乖離が閾値内なら売買はせず定額積立のみ。閾値超の資産は売却せず、新規資金の配分で調整。" },
    { month: 6, category: "税制", action: "住民税決定通知で所得割額・住宅ローン控除後の税額を確認し、ふるさと納税の上限見込みを更新。" },
    { month: 7, category: "見直し", action: "上半期の資産配分・現金バッファ・教育資金を再計算。金利、収入、支出が変われば月次投資判断を再判定。" },
    { month: 8, category: "積立", action: "夏季支出を反映後、生活防衛資金を割り込まない範囲でNISA/iDeCoの定額積立を継続。" },
    { month: 9, category: "住宅", action: `変動金利を確認。基準${(rateReference * 100).toFixed(3)}%から+1.0%超なら、繰上返済ではなく教育・防衛資金・月次余剰への影響を先に再試算。` },
    { month: 10, category: "保留", action: "年末の臨時支出に備え、教育・生活防衛資金が未達ならリスク資産の追加買付を保留。" },
    { month: 11, category: "税制", action: "NISA/iDeCoの年間拠出額、ふるさと納税の申請方法、医療費控除など年内手続きの要否を確認。" },
    { month: 12, category: "見直し", action: "保有ETFの資産配分、教育資金、年間支出、保険、翌年のNISA/iDeCo設定を年次見直し。" },
  ];
  const triggers: AutoTrigger[] = [
    { id: "cash", label: "生活防衛資金", status: emergencyShortfall > 0 ? "実行" : "待機", effect: emergencyShortfall > 0 ? "新規買付保留" : "定額積立継続", action: emergencyShortfall > 0 ? "NISAの追加買付を保留し、現金バケツの回復を優先。" : "現金目標は充足。定額積立を継続可能。", detail: `不足 ${Math.round(emergencyShortfall / 10_000)}万円`, threshold: `${Math.round(plan.emergencyTarget / 10_000)}万円未満` },
    { id: "education", label: "教育資金", status: educationShortfall > 0 ? "確認" : "待機", effect: educationShortfall > 0 ? "再試算" : "定額積立継続", action: educationShortfall > 0 ? `近期限教育費の現金不足${Math.round(educationShortfall / 10_000)}万円を、年次余剰・安全資産・教育方針を含めて再試算。` : "近期限の教育現金は追加不要。進路・教育費実績を年次更新。", detail: nearTermEducation ? `現在 ${Math.round(nearTermEducation.currentAllocated / 10_000)}万円 / 現金目標 ${Math.round(nearTermEducation.cashTarget / 10_000)}万円` : `${longTermEducation?.timing ?? "次の進学時期"}の長期教育計画`, threshold: "教育費は支出開始5年前から必要額を安全資産へ移す" },
    { id: "rate", label: "変動金利", status: rateRise >= 0.009999 ? "実行" : rateRise > 0 ? "確認" : "待機", effect: rateRise > 0 ? "再試算" : "定額積立継続", action: rateRise >= 0.009999 ? "金利上昇を検知。繰上返済、教育資金、月次余剰の比較を再計算し、追加買付は結果確認まで保留。" : rateRise > 0 ? "基準金利から上昇。+1.0%ストレスの返済額を確認。" : "基準金利からの上昇は未検知。", detail: `基準 ${(rateReference * 100).toFixed(3)}% / 現在 ${(profile.loanRate * 100).toFixed(3)}%`, threshold: `基準から +1.0%` },
    { id: "allocation", label: "資産配分", status: driftedAssets.length ? "確認" : "待機", effect: driftedAssets.length ? "新規資金で調整" : "定額積立継続", action: driftedAssets.length ? `${driftedAssets.map(item => item.assetClass).join("・")}の実配分が目標から乖離。売却ではなく、新規資金の配分で調整。` : "実配分の乖離は閾値内。定額積立を継続。", detail: driftedAssets.length ? driftedAssets.map(item => `${item.assetClass} ${(item.drift * 100).toFixed(1)}pt`).join(" / ") : "全資産クラスが閾値内", threshold: `実配分の乖離幅 ±${Math.round(profile.rebalanceThreshold * 100)}pt` },
    { id: "macro", label: "マクロデータ", status: macroAgeDays > 40 ? "実行" : macroAgeDays > 31 ? "確認" : "待機", effect: macroAgeDays > 40 ? "新規買付保留" : "定額積立継続", action: macroAgeDays > 40 ? "市場データが40日超未更新。追加買付の提案を保留し、更新後に再判定。" : macroAgeDays > 31 ? "市場データの鮮度が低下。次回更新を確認。" : "市場データの鮮度は基準内。", detail: Number.isFinite(macroAgeDays) ? `最終更新から${Math.max(0, macroAgeDays)}日` : "更新記録なし", threshold: "最終更新から40日" },
  ];
  const executionPriority: RecommendationEffect = triggers.some(trigger => trigger.effect === "新規買付保留") ? "新規買付保留" : triggers.some(trigger => trigger.effect === "再試算") ? "再試算" : triggers.some(trigger => trigger.effect === "新規資金で調整") ? "新規資金で調整" : "定額積立継続";
  return { annualActions, triggers, executionPriority, asOf, macroAgeDays };
}
