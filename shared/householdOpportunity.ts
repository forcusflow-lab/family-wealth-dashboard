import { buildFundingComparison } from "./fundingComparison";
import { buildMonthlyFundingStatus } from "./fundingStatus";
import { buildReturnComparison } from "./returnComparison";
import { calculateWealthPlan, type WealthProfile } from "./wealth";

export type Opportunity = { id: string; label: string; monthlyAmount: number; tenYearNominalValue: number; downsideTenYearValue: number; downsideRisk: string; liquidity: "高" | "中" | "低"; priority: "最優先" | "優先" | "比較"; action: string; caveat: string };

function futureValue(monthly: number, annualRate: number, years = 10) {
  const monthlyRate = annualRate / 12;
  const periods = years * 12;
  if (monthlyRate === 0) return monthly * periods;
  return Math.round(monthly * ((Math.pow(1 + monthlyRate, periods) - 1) / monthlyRate));
}

export function buildHouseholdOpportunity(profile: WealthProfile) {
  const plan = calculateWealthPlan(profile);
  const funding = buildFundingComparison(profile);
  const monthlyFunding = buildMonthlyFundingStatus(profile);
  const returns = buildReturnComparison(profile, { equity: 0.75, bonds: 0.15, gold: 0.1 });
  const monthlyKnownSpend = plan.monthlyKnownSpend;
  const cashShortfall = monthlyFunding.cashPurposes.find(purpose => purpose.id === "emergency")?.gap ?? 0;
  const nearTermEducation = monthlyFunding.cashPurposes.find(purpose => purpose.id === "education");
  const educationShortfall = nearTermEducation?.gap ?? 0;
  const testMonthlyAmount = 10_000;
  const nisaRate = returns.vehicles.find(vehicle => vehicle.id === "NISA")!.expectedAnnualAfterTax;
  const idecoRate = returns.vehicles.find(vehicle => vehicle.id === "iDeCo")!.expectedAnnualAfterTax;
  const downsideRate = returns.bands.find(band => band.horizonYears === 10)!.p10Annualized;
  const effectivePrepayRate = returns.prepayment.find(item => item.label === "現状・控除中")!.effectiveAnnualReturn;
  const educationFirst = cashShortfall > 0 || educationShortfall > 0;
  const opportunities: Opportunity[] = [
    { id: "cash", label: "生活防衛資金の回復", monthlyAmount: testMonthlyAmount, tenYearNominalValue: futureValue(testMonthlyAmount, 0.005), downsideTenYearValue: futureValue(testMonthlyAmount, 0), downsideRisk: "市場価格の下落は想定しない一方、インフレで実質購買力が低下する。", liquidity: "高", priority: cashShortfall > 0 ? "最優先" : "比較", action: cashShortfall > 0 ? `防衛資金の不足約${Math.round(cashShortfall / 10_000)}万円を優先して補う。` : "12か月分の防衛資金は充足。預金金利・口座分散を定期確認。", caveat: "預金金利は変動し、預金保険制度の範囲や金融機関ごとの条件を確認する。" },
    { id: "education", label: nearTermEducation ? "近期限教育費の現金積立" : "長期教育計画の年次見直し", monthlyAmount: nearTermEducation ? Math.max(testMonthlyAmount, nearTermEducation.monthlyTransfer) : 0, tenYearNominalValue: futureValue(nearTermEducation ? Math.max(testMonthlyAmount, nearTermEducation.monthlyTransfer) : 0, 0.005), downsideTenYearValue: futureValue(nearTermEducation ? Math.max(testMonthlyAmount, nearTermEducation.monthlyTransfer) : 0, 0), downsideRisk: "市場価格の下落は想定しない一方、学費上昇による実質不足が起こり得る。", liquidity: "高", priority: educationShortfall > 0 ? "最優先" : "比較", action: educationShortfall > 0 ? `近期限教育費の現金不足約${Math.round(educationShortfall / 10_000)}万円を、支払時期に合わせて安全資産で積立。` : "現金化開始前の教育費は長期計画です。進学開始5年前になったら、必要額を現金へ移す計画に切り替えます。", caveat: "私立・自宅通学の仮定。進路・物価・奨学金で必要額は変動する。" },
    { id: "ideco", label: "iDeCo長期積立", monthlyAmount: testMonthlyAmount, tenYearNominalValue: futureValue(testMonthlyAmount, idecoRate), downsideTenYearValue: futureValue(testMonthlyAmount, downsideRate), downsideRisk: "10年年率換算の10%点レンジを使用。市場下落に加え、原則60歳まで引き出せない。", liquidity: "低", priority: educationFirst ? "比較" : "優先", action: educationFirst ? "掛金設定済み分を維持するかは年次税額と教育資金の不足を確認して再判定。追加拠出は急がない。" : "控除レンジと60歳までの引出制限を確認し、長期資金に限って検討。", caveat: "原則60歳まで引出せず、受取時課税もある。税額は年次書類の入力後に確認する。" },
    { id: "nisa", label: "NISAの長期分散投資", monthlyAmount: testMonthlyAmount, tenYearNominalValue: futureValue(testMonthlyAmount, nisaRate), downsideTenYearValue: futureValue(testMonthlyAmount, downsideRate), downsideRisk: "10年年率換算の10%点レンジを使用。途中売却は可能だが、市場下落時の売却は損失確定となり得る。", liquidity: "中", priority: educationFirst ? "比較" : "優先", action: educationFirst ? "生活防衛・教育資金が未充足のため、商品比較に留め新規買付は保留。" : "全世界株式など広範囲コアの重複を避け、定額積立候補を比較。", caveat: "期待年率はモデル仮定であり、10年後の元本・利益を保証しない。NISA枠・対象可否は注文前に再確認する。" },
    { id: "prepay", label: "住宅ローン繰上返済", monthlyAmount: testMonthlyAmount, tenYearNominalValue: futureValue(testMonthlyAmount, effectivePrepayRate), downsideTenYearValue: futureValue(testMonthlyAmount, 0), downsideRisk: "金利削減効果は比較的確定的だが、控除額・将来金利の変化と資金の再引出し不能が主なリスク。", liquidity: "低", priority: educationFirst ? "比較" : "比較", action: educationFirst ? "教育・防衛資金を確保するまで繰上返済へ現金を固定しない。" : "住宅ローン控除終了時、適用金利・教育資金・税後投資と再比較。", caveat: "控除中の実質利回りは控除額で低下し、繰上返済後の資金は再引出しできない。" },
    { id: "spending", label: "固定費・変動費の恒久的な改善", monthlyAmount: testMonthlyAmount, tenYearNominalValue: testMonthlyAmount * 120, downsideTenYearValue: testMonthlyAmount * 120, downsideRisk: "市場下落リスクはないが、家族の満足度・時間価値を損なう削減は逆効果になり得る。", liquidity: "高", priority: "優先", action: "通信・保険・サブスク・食費を、生活の満足度を落とさない範囲で年1回棚卸し。削減額は目的別バケツへ自動振替。", caveat: "削減は強制しない。家族の満足度・時間価値が下がる支出は対象外にする。" },
  ];
  const recommendation = cashShortfall > 0 ? "新規のNISA・繰上返済より生活防衛資金を優先" : educationShortfall > 0 ? "教育資金の安全資産積立を優先し、NISAの追加買付は資金計画再確認後" : "iDeCoの税額確認、NISAコアの重複回避、月次の定額積立を優先";
  return { opportunities, recommendation, cashShortfall, educationShortfall, monthlyKnownSpend, methodology: "各選択肢は同額（月1万円）の10年後名目値を、現金年0.5%、既存の資産配分モデルのNISA/iDeCo税後期待年率、控除後の繰上返済実質年率で比較する。実現損益・税金・金利は保証されない。" };
}
