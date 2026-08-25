import { getNisaAllowanceStatus } from "./nisaComparison";
import { getLatestValidWithholdingStatement } from "./withholdingStatement";
import { calculateWealthPlan, type WealthProfile } from "./wealth";

export type ProjectionScenarioId = "base" | "downside" | "upside" | "incomeShock" | "educationShock" | "mortgageShock";
export type ProjectionPoint = { year: number; age: number; nisa: number; ideco: number; liquidReserve: number; totalAssets: number; nisaContribution: number; idecoContribution: number; cashSafetyMet: boolean };
export type ProjectionScenario = { id: ProjectionScenarioId; label: string; annualReturn: number; points: ProjectionPoint[]; endAssets: number; lowestLiquidReserve: number; cashSafetyBreach: boolean; explanation: string };
export const PROJECTION_NON_GUARANTEE_COPY = "結果は保証・注文指示ではありません。";

const scenarioDefinitions: Array<{ id: ProjectionScenarioId; label: string; returnShift: number; contributionFactor: number; educationShock: boolean; mortgageShock: boolean; explanation: string }> = [
  { id: "base", label: "基準", returnShift: 0, contributionFactor: 1, educationShock: false, mortgageShock: false, explanation: "現在の期待リターン、NISA/iDeCo掛金、教育費・住宅費の基準入力を使用。" },
  { id: "downside", label: "下振れ", returnShift: -0.03, contributionFactor: 0.85, educationShock: false, mortgageShock: false, explanation: "年率を基準より3ポイント低く、投資拠出を15%縮小する保守シナリオ。" },
  { id: "upside", label: "上振れ", returnShift: 0.02, contributionFactor: 1, educationShock: false, mortgageShock: false, explanation: "年率を基準より2ポイント高く置く参考シナリオ。将来の成果を示すものではない。" },
  { id: "incomeShock", label: "収入減少", returnShift: -0.01, contributionFactor: 0.7, educationShock: false, mortgageShock: false, explanation: "2年目以降の投資拠出を30%縮小し、年率も1ポイント低く置く。" },
  { id: "educationShock", label: "教育費上振れ", returnShift: -0.01, contributionFactor: 0.85, educationShock: true, mortgageShock: false, explanation: "教育費基準額の20%を5年目に追加支出し、投資拠出を15%縮小する。" },
  { id: "mortgageShock", label: "金利+1.0%", returnShift: -0.01, contributionFactor: 0.85, educationShock: false, mortgageShock: true, explanation: "変動金利が+1.0%となった場合の推計返済増を、2年目以降の流動性資産から差し引く。" },
];

function mortgagePayment(balance: number, rate: number, years: number) {
  const monthlyRate = rate / 12;
  const months = Math.max(1, years * 12);
  if (monthlyRate === 0) return balance / months;
  return balance * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
}

export function buildAssetProjection(profile: WealthProfile, horizonYears = Math.max(1, profile.retirementAge - profile.currentAge)) {
  const sourceStatement = getLatestValidWithholdingStatement(profile.withholdingStatements);
  const effectiveProfile = sourceStatement ? { ...profile, annualIncome: sourceStatement.salaryPayment } : profile;
  profile = effectiveProfile;
  const plan = calculateWealthPlan(profile);
  const allowance = getNisaAllowanceStatus(profile);
  const holdingsTotal = plan.totalInvested;
  // This household has only NISA-reported securities; do not turn a quote-timing rounding difference into a fictitious "other holding".
  const nisaStarting = profile.nisaValue > 0 ? profile.nisaValue : holdingsTotal;
  const annualNisaContribution = Math.max(0, profile.nisaMonthly * 12);
  const annualIdecoContribution = Math.max(0, profile.idecoMonthly * 12);
  const annualNisaCapacity = profile.nisaRecords ? profile.nisaRecords.tsumitateAllowance + profile.nisaRecords.growthAllowance : annualNisaContribution;
  const currentYearNisaCapacity = allowance.totalRemaining ?? annualNisaCapacity;
  const educationShock = profile.privateHighSchoolAnnual * 3 * 2 * 0.2 + profile.privateUniversityAtHomeAnnual * 4 * 2 * 0.2;
  const mortgageIncrement = Math.max(0, mortgagePayment(profile.loanBalance, profile.loanRate + 0.01, profile.loanRemainingYears) - mortgagePayment(profile.loanBalance, profile.loanRate, profile.loanRemainingYears)) * 12;

  const scenarios: ProjectionScenario[] = scenarioDefinitions.map(definition => {
    const annualReturn = Math.max(-0.3, profile.expectedReturn + definition.returnShift);
    let nisa = nisaStarting;
    let ideco = 0;
    let liquidReserve = plan.cashPosition.flexibleCashTotal;
    const points: ProjectionPoint[] = [];
    for (let year = 0; year <= horizonYears; year += 1) {
      const contributionFactor = year >= 2 && definition.id === "incomeShock" ? definition.contributionFactor : definition.contributionFactor;
      const nisaContribution = year === 0 ? 0 : Math.min(annualNisaContribution * contributionFactor, year === 1 ? currentYearNisaCapacity : annualNisaCapacity);
      const idecoContribution = year === 0 ? 0 : annualIdecoContribution * contributionFactor;
      if (year > 0) {
        nisa = nisa * (1 + annualReturn) + nisaContribution;
        ideco = ideco * (1 + annualReturn) + idecoContribution;
        const educationOutflow = definition.educationShock && year === 5 ? educationShock : 0;
        const mortgageOutflow = definition.mortgageShock && year >= 2 ? mortgageIncrement : 0;
        liquidReserve = Math.max(0, liquidReserve - educationOutflow - mortgageOutflow);
      }
      const totalAssets = nisa + ideco + liquidReserve;
      points.push({ year, age: profile.currentAge + year, nisa: Math.round(nisa), ideco: Math.round(ideco), liquidReserve: Math.round(liquidReserve), totalAssets: Math.round(totalAssets), nisaContribution: Math.round(nisaContribution), idecoContribution: Math.round(idecoContribution), cashSafetyMet: liquidReserve >= plan.emergencyTarget });
    }
    const endAssets = points.at(-1)?.totalAssets ?? 0;
    const lowestLiquidReserve = Math.min(...points.map(point => point.liquidReserve));
    return { id: definition.id, label: definition.label, annualReturn, points, endAssets, lowestLiquidReserve, cashSafetyBreach: lowestLiquidReserve < plan.emergencyTarget, explanation: definition.explanation };
  });
  return {
    asOf: new Date().toISOString(),
    horizonYears,
    startingAssets: { nisa: nisaStarting, ideco: 0, liquidReserve: plan.cashPosition.flexibleCashTotal, totalAssets: nisaStarting + plan.cashPosition.flexibleCashTotal },
    nisaContext: { currentYearRemaining: currentYearNisaCapacity, annualContribution: annualNisaContribution, recordedPurchases: allowance.recordedPurchaseTotal, purchaseCount: allowance.purchaseCount, source: allowance.state === "入力済み" ? "保存済みの年間枠・利用額・証券会社表示残枠・買付履歴" : "NISA残枠・買付履歴は未入力。月次設定額を年間上限として仮置き。" },
    idecoContext: { annualContribution: annualIdecoContribution, lockUp: "iDeCo資産は原則60歳まで引出せないため、流動性資産・教育資金には算入しない。" },
    liquidReserveContext: { startingBalance: plan.cashPosition.flexibleCashTotal, behavior: "基準シナリオでは、生活防衛・年払い・住宅維持に充てる開始時の現金残高を据え置きます。毎月の収入・通常支出は投資額を計算した時点で織り込み済みのため、年ごとの預金残高の増減は予測しません。教育費・金利のストレスシナリオだけは、この現金から差し引きます。" },
    incomeContext: sourceStatement ? { annualIncome: sourceStatement.salaryPayment, sourceTaxYear: sourceStatement.taxYear, source: "源泉徴収票の支払金額を、将来の増減を織り込まない履歴ベースラインとして使用。" } : { annualIncome: profile.annualIncome, sourceTaxYear: null, source: "保存済みの年収入力を使用。" },
    scenarios,
    methodology: [
      "現在のNISA評価額、NISA残枠・買付履歴、月次NISA/iDeCo設定、生活防衛・目的別現金を出発点にした決定論的な年次試算です。保有銘柄台帳とNISA評価額の小さな時価差は、独立した『その他保有』として扱いません。",
      "NISA/iDeCoの運用部分は各シナリオの年率で複利計算し、NISAは今年の保存済み残枠、以後は入力した年間枠を上限にします。",
      "基準シナリオの生活防衛・目的別現金は開始時残高で据え置きます。教育費上振れ・住宅ローン金利上昇だけはこの現金から差し引きます。iDeCoは資産額に含む一方、生活防衛・教育資金として使えない前提です。",
      sourceStatement ? `令和${sourceStatement.taxYear - 2018}年分の源泉徴収票の支払金額を収入ベースラインに使用します。昇給・転職・賞与・税制の将来変化は予測していません。` : "収入は保存済み入力を基準にし、将来の昇給・転職・賞与・税制の変化は予測していません。",
      `税制改正、実際の価格、分配金、売買コスト、iDeCo受取時課税、将来のNISA制度変更は予測していません。${PROJECTION_NON_GUARANTEE_COPY}`,
    ],
  };
}
