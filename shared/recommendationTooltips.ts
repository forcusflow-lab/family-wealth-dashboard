import type { NormalizedIdecoFund, IdecoFundDecision } from "./idecoComparison";
import type { NisaReview } from "./nisaComparison";

export type RecommendationTooltipEvidence = { title: string; sections: Array<{ label: string; text: string }>; safety: string };
export const TOOLTIP_ORDER_SAFETY = "比較・判断材料の説明であり、このアプリは注文・売買を実行しません。将来の成果も保証しません。";
export function toggleRecommendationTooltip(open: boolean) { return !open; }

export function buildNisaTooltipEvidence(item: NisaReview): RecommendationTooltipEvidence {
  const fee = item.feeRate === undefined ? item.feeAsOf : `年${(item.feeRate * 100).toFixed(4)}%（${item.feeAsOf}）`;
  const alternatives = item.id === "2559" || item.id === "emaxis-ac"
    ? "2559とeMAXIS Slim 全世界株式は投資対象が近く、両方を増やしても分散の追加は限定的です。新規積立の利便性・費用差と既存保有を比較します。"
    : `全世界株式コアとの重複を確認し、${item.assetClass}の役割をサテライトとして限定できる場合だけ比較対象にします。`;
  return { title: `${item.name}を${item.decision}とする理由`, sections: [
    { label: "家計への役割", text: item.rationale },
    { label: "比較した代替案・重複", text: alternatives },
    { label: "費用・指数・為替", text: `${fee}。${item.benchmark} / ${item.currencyPolicy}。` },
    { label: "流動性・注意点", text: `${item.liquidity}。教育・生活防衛・住宅維持のための安全資産とは交換せず、NISA適格性・目論見書・証券会社の取扱いを買付前に確認します。` },
  ], safety: TOOLTIP_ORDER_SAFETY };
}

type IdecoTooltipInput = Pick<NormalizedIdecoFund, "name" | "feeNote" | "indexOrPolicy" | "category" | "region" | "liquidity" | "sourceAsOf"> & { decision: IdecoFundDecision; rationale: string };
export function buildIdecoTooltipEvidence(item: IdecoTooltipInput): RecommendationTooltipEvidence {
  const alternative = item.decision === "定額候補"
    ? "日本を含む全世界株式、米国株式、先進国株式、バランス型と比べ、既存の国内高配当株との重複、分散、費用を確認しています。"
    : "低コストの世界株式コア、地域集中型、バランス型、テーマ型を、既存NISAとの重複と資産クラスの役割で比較しています。";
  return { title: `${item.name}を${item.decision}とする理由`, sections: [
    { label: "家計への役割", text: item.rationale },
    { label: "比較した代替案・重複", text: alternative },
    { label: "費用・投資方針", text: `${item.feeNote}。${item.category} / ${item.region} / ${item.indexOrPolicy}。参照日 ${item.sourceAsOf}。` },
    { label: "引出制限・注意点", text: `流動性は${item.liquidity}。iDeCoは原則60歳まで引き出せないため、教育費・生活防衛資金・住宅維持資金には使いません。` },
  ], safety: TOOLTIP_ORDER_SAFETY };
}
