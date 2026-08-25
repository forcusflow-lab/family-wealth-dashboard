import { calculateWealthPlan, type Holding, type WealthProfile } from "./wealth";

export type HoldingAudit = { code: string; name: string; role: string; status: "コア" | "保有" | "追加停止"; reason: string; nextAction: string };

const roles: Record<string, Omit<HoldingAudit, "code" | "name">> = {
  "1489": { role: "国内高配当・サテライト", status: "追加停止", reason: "全世界株式の日本株部分と重複し、国内・高配当への傾斜を強めます。", nextAction: "売却を急がず保有。新規資金は全世界株式コアへ回す。" },
  "2514": { role: "先進国株・円ヘッジのサテライト", status: "追加停止", reason: "全世界株式と先進国株部分が重複します。ヘッジコスト/プレミアムも運用成果へ影響します。", nextAction: "為替ヘッジを明確に持ちたい範囲だけ保有し、新規買付は止める。" },
  "2559": { role: "全世界株式コア", status: "コア", reason: "地域・国を1本で広く持つ長期株式の基礎資産として扱います。", nextAction: "NISAの新規株式枠は原則ここへ集約する。" },
  "2621": { role: "長期米国債・円ヘッジのサテライト", status: "保有", reason: "長期金利低下局面の分散候補ですが、実効デュレーションが長く金利上昇には弱い性質があります。", nextAction: "生活防衛・教育資金の代替にはせず、目標債券比率の範囲だけ保有する。" },
  "424A": { role: "金・円ヘッジのサテライト", status: "保有", reason: "株式・債券と異なる値動きを期待する分散枠ですが、インカムは生みません。", nextAction: "目標10%を上回る追加買付はせず、リバランス待ちにする。" },
};

export function buildPortfolioAudit(profile: WealthProfile) {
  const plan = calculateWealthPlan(profile);
  const audits: HoldingAudit[] = profile.holdings.map((holding: Holding) => ({ code: holding.code, name: holding.name, ...(roles[holding.code] ?? { role: holding.assetClass, status: "保有" as const, reason: "個別の指数・費用・資産クラスを確認してください。", nextAction: "新規資金を投じる前に役割を定義する。" }) }));
  const total = Math.max(1, plan.totalInvested);
  const current = { equity: (plan.allocation["株式"] ?? 0) / total, bonds: (plan.allocation["債券"] ?? 0) / total, gold: (plan.allocation["金"] ?? 0) / total };
  const target = { equity: 0.7, bonds: 0.2, gold: 0.1 };
  const annualFreeCash = Math.max(0, plan.annualSurplusAfterInvesting);
  const educationShortfall = plan.buckets.find(bucket => bucket.id === "education")?.shortfall ?? 0;
  const monthlyEducationReserve = Math.floor(Math.min(annualFreeCash, Math.max(0, educationShortfall / Math.max(1, 15 - profile.childOneAge))) / 12 / 1_000) * 1_000;
  return {
    audits,
    current,
    target,
    annualFreeCash,
    monthlyEducationReserve,
    educationShortfall,
    purchasePlan: [
      { item: "iDeCo", amount: profile.idecoMonthly, action: "SBI証券の全世界株式インデックス候補へ定額", note: "所得控除を優先。ただし原則60歳まで引出不可。" },
      { item: "NISA", amount: profile.nisaMonthly, action: "株式の新規買付は2559をコアとして実行", note: "1489・2514の追加は停止。2621・424Aは目標比率と金利状況の確認後のみ。" },
      { item: "教育資金", amount: monthlyEducationReserve, action: "預金・個人向け国債等の安全資産として別管理", note: "高校開始5年前から安全資産の比率を上げ、株式と混在させない。" },
    ],
  };
}
