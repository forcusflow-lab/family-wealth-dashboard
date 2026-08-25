import type { Bucket, WealthProfile } from "@shared/wealth";
import { calculateWealthPlan, EDUCATION_CASH_HORIZON_YEARS, formatCompactYen, formatPercent } from "@shared/wealth";
import { buildMonthlyFundingStatus } from "@shared/fundingStatus";

export type DecisionStep = {
  label: string;
  detail: string;
  status: "pass" | "watch" | "hold";
};

export function buildMonthlyDecision(profile: WealthProfile, marketDataAvailable = true) {
  const plan = calculateWealthPlan(profile);
  const funding = buildMonthlyFundingStatus(profile);
  const emergency = plan.buckets.find(bucket => bucket.id === "emergency") as Bucket;
  const nearTermEducation = funding.cashPurposes.find(purpose => purpose.id === "education");
  const longTermEducation = funding.longTermPlans.find(item => item.id === "education");
  const equity = plan.drift.find(item => item.assetClass === "株式");
  const steps: DecisionStep[] = [
    {
      label: "生活防衛資金の充足",
      detail: `${formatCompactYen(emergency.allocated)}を確保。既知支出の${plan.cashCoverageMonths.toFixed(1)}か月分です。`,
      status: emergency.allocated >= emergency.target ? "pass" : "hold",
    },
    {
      label: "高金利負債の確認",
      detail: "住宅ローン以外の借入は登録なし。住宅ローンは変動年1.295%です。",
      status: "pass",
    },
    {
      label: "近い目的資金の安全化",
      detail: nearTermEducation ? `支出開始まで${EDUCATION_CASH_HORIZON_YEARS}年以内の教育現金は、現在${formatCompactYen(nearTermEducation.currentAllocated)} / 目標${formatCompactYen(nearTermEducation.cashTarget)}です。` : `${longTermEducation?.timing ?? "次の進学時期"}の教育費は長期計画として扱い、現金化開始前の今月は現金不足にしません。`,
      status: nearTermEducation?.gap ? "watch" : "pass",
    },
    {
      label: "現金確保後のiDeCo・NISAつみたて",
      detail: `毎月の現金移動後、iDeCo候補は月${formatCompactYen(funding.recommendedIdeco)}、NISAつみたて候補は月${formatCompactYen(funding.recommendedNisa)}です。未配分余剰${formatCompactYen(funding.unallocatedMonthlySurplus)}は追加投資の指示ではありません。`,
      status: funding.fundingGap > 0 ? "hold" : funding.investmentAllowed ? "pass" : "watch",
    },
    {
      label: "資産配分の乖離",
      detail: `株式は目標比率75%に対し現状${formatPercent(equity?.currentWeight ?? 0)}。新規買付は株式コアを優先します。`,
      status: Math.abs(equity?.drift ?? 0) > 0.08 ? "watch" : "pass",
    },
    {
      label: "市場急変ルール",
      detail: "急落時も目的資金を売却せず、毎月の定額積立のみ継続。高値追い・一括追加は別途資金余力を確認します。",
      status: "pass",
    },
  ];

  const recommendation = !marketDataAvailable
    ? {
      nisa: 0,
      ideco: 0,
      action: "市場データ更新待ち",
      reason: "市場データを取得できないため、追加買付は保留します。手動更新が成功した後に定額積立の条件を再判定してください。",
    }
    : funding.fundingGap === 0
    ? {
      nisa: funding.recommendedNisa,
      ideco: funding.recommendedIdeco,
      action: funding.recommendedNisa > 0 ? "iDeCo・NISAの設定額を継続" : funding.recommendedIdeco > 0 ? "iDeCoのみ継続を検討" : "今月の追加運用は見送り",
      reason: `近期限の現金目標を優先した後の設定額です。毎月の世帯手取り${formatCompactYen(funding.monthlyRegularTakeHome)}から、毎月の余裕資金${formatCompactYen(funding.monthlyFlexBuffer)}を残しています。`,
    }
    : {
      nisa: 0,
      ideco: 0,
      action: "新規買付を見送り",
      reason: `生活費・期限付き資金・余裕資金を差し引くと、毎月${formatCompactYen(funding.fundingGap)}の不足です。追加投資より現金計画の見直しを優先します。`,
    };
  return { plan, steps, recommendation };
}
