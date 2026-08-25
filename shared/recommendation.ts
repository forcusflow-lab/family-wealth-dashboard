import { calculateWealthPlan, type WealthProfile } from "./wealth";
import { buildMonthlyFundingStatus } from "./fundingStatus";
import { buildReturnComparison } from "./returnComparison";
import { getLatestValidWithholdingStatement } from "./withholdingStatement";

export type PortfolioCandidate = {
  id: string;
  name: string;
  weights: { equity: number; bonds: number; gold: number };
  successRate: number;
  medianAtRetirement: number;
  percentile10AtRetirement: number;
  medianMaxDrawdown: number;
  score: number;
};

export type MonthlyProductRecommendation = {
  id: "nisa-core" | "ideco-core";
  account: "NISAつみたて投資枠" | "SBI証券 iDeCo";
  fundName: string;
  monthlyAmount: number;
  allocationPercent: number;
  status: "積立を提案" | "今月は保留";
  instruction: string;
  holdingsRelationship: string;
  rationale: string;
  changesWhen: string;
  sourceUrl: string;
};

export type ExistingHoldingInstruction = {
  code: string;
  name: string;
  monthlyAmount: 0;
  instruction: string;
};

export type RecommendationResult = {
  asOf: string;
  paths: number;
  years: number;
  recommended: PortfolioCandidate;
  candidates: PortfolioCandidate[];
  actionPlan: Array<{ priority: "今月" | "年内" | "条件付き"; action: string; reason: string; tradeoff: string }>;
  implementationCandidates: string[];
  monthlyProductRecommendations: MonthlyProductRecommendation[];
  existingHoldingInstructions: ExistingHoldingInstruction[];
  taxComparison: Array<{ action: string; liquidity: "高" | "中" | "低"; estimatedBenefit: string; caveat: string }>;
  returnComparison: ReturnType<typeof buildReturnComparison>;
  productEvidence: Array<{ id: string; name: string; decision: "長期コア候補" | "定額候補" | "追加停止" | "保有のみ"; rationale: string; comparedWith: string; excludedReason: string; sourceUrl: string }>;
  comparisonScope: { analyzed: string; exclusions: string; selectionRule: string; sourceAsOf: string };
  assumptions: string[];
  incomeContext: { annualIncome: number; sourceTaxYear: number | null; source: string };
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function gaussian(random: () => number) {
  const left = Math.max(random(), 1e-12);
  const right = random();
  return Math.sqrt(-2 * Math.log(left)) * Math.cos(2 * Math.PI * right);
}

function percentile(sorted: number[], p: number) {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index] ?? 0;
}

function simulateCandidate(profile: WealthProfile, candidate: Omit<PortfolioCandidate, "successRate" | "medianAtRetirement" | "percentile10AtRetirement" | "medianMaxDrawdown" | "score">, paths: number): PortfolioCandidate {
  const plan = calculateWealthPlan(profile);
  const years = Math.max(1, profile.retirementAge - profile.currentAge);
  const startingAssets = plan.totalInvested;
  const annualContribution = (profile.nisaMonthly + profile.idecoMonthly) * 12;
  const random = seededRandom(20260817 + candidate.id.length * 97);
  const endValues: number[] = [];
  const maxDrawdowns: number[] = [];
  const target = plan.retirementTarget;

  for (let path = 0; path < paths; path += 1) {
    let value = startingAssets;
    let peak = value;
    let maxDrawdown = 0;
    let contribution = annualContribution;
    for (let year = 0; year < years; year += 1) {
      const equityReturn = 0.06 + 0.18 * gaussian(random);
      const bondReturn = 0.025 + 0.07 * gaussian(random);
      const goldReturn = 0.03 + 0.17 * gaussian(random);
      const inflation = Math.max(-0.01, 0.02 + 0.012 * gaussian(random));
      const incomeShock = random() < 0.10 ? 0.70 : 1;
      const mortgageShockCost = random() < 0.16 ? 90_000 : 0;
      const educationShockCost = random() < 0.14 ? (profile.privateHighSchoolAnnual + profile.privateUniversityAtHomeAnnual) * 0.2 : 0;
      const portfolioReturn = candidate.weights.equity * equityReturn + candidate.weights.bonds * bondReturn + candidate.weights.gold * goldReturn;
      value = value * (1 + portfolioReturn) + Math.max(0, contribution * incomeShock - mortgageShockCost - educationShockCost);
      contribution *= 1 + Math.min(0.03, inflation);
      peak = Math.max(peak, value);
      maxDrawdown = Math.min(maxDrawdown, peak === 0 ? 0 : value / peak - 1);
    }
    endValues.push(value);
    maxDrawdowns.push(maxDrawdown);
  }

  const sortedEnd = [...endValues].sort((a, b) => a - b);
  const sortedDrawdowns = [...maxDrawdowns].sort((a, b) => a - b);
  const successRate = endValues.filter(value => value >= target).length / paths;
  const medianAtRetirement = percentile(sortedEnd, 0.5);
  const percentile10AtRetirement = percentile(sortedEnd, 0.1);
  const medianMaxDrawdown = percentile(sortedDrawdowns, 0.5);
  const score = successRate * 100 + Math.min(20, medianAtRetirement / Math.max(target, 1) * 10) + medianMaxDrawdown * 30;
  return { ...candidate, successRate, medianAtRetirement, percentile10AtRetirement, medianMaxDrawdown, score };
}

export function buildRecommendation(profile: WealthProfile, asOf = new Date().toISOString()): RecommendationResult {
  const sourceStatement = getLatestValidWithholdingStatement(profile.withholdingStatements);
  if (sourceStatement) profile = { ...profile, annualIncome: sourceStatement.salaryPayment };
  const plan = calculateWealthPlan(profile);
  const nisaTsumitatePurchase = profile.nisaRecords?.purchases.filter(purchase => purchase.allowance === "つみたて投資枠").reduce((sum, purchase) => sum + purchase.amount, 0) ?? 0;
  const nisaGrowthPurchase = profile.nisaRecords?.purchases.filter(purchase => purchase.allowance === "成長投資枠").reduce((sum, purchase) => sum + purchase.amount, 0) ?? 0;
  const nisaTsumitateRemaining = profile.nisaRecords ? (profile.nisaRecords.tsumitateRemainingOverride ?? Math.max(0, profile.nisaRecords.tsumitateAllowance - Math.max(profile.nisaRecords.tsumitateUsed, nisaTsumitatePurchase))) : null;
  const nisaGrowthRemaining = profile.nisaRecords ? (profile.nisaRecords.growthRemainingOverride ?? Math.max(0, profile.nisaRecords.growthAllowance - Math.max(profile.nisaRecords.growthUsed, nisaGrowthPurchase))) : null;
  const nisaRemaining = nisaTsumitateRemaining === null || nisaGrowthRemaining === null ? null : nisaTsumitateRemaining + nisaGrowthRemaining;
  const currentMonth = asOf.slice(0, 7);
  const currentMonthPurchases = profile.nisaRecords?.purchases.filter(purchase => purchase.tradeDate.startsWith(currentMonth)).reduce((sum, purchase) => sum + purchase.amount, 0) ?? 0;
  const funding = buildMonthlyFundingStatus(profile);
  const nisaMonthlyAction = nisaRemaining !== null && nisaRemaining <= 0
    ? "NISA残枠の入力値が0円のため、当年の新規買付は保留し、翌年の枠・家計状態を確認する。"
    : nisaGrowthRemaining === 0
      ? `NISA成長投資枠は残枠0円。つみたて投資枠の残り${Math.round((nisaTsumitateRemaining ?? 0) / 10_000)}万円は、現金バケツを満たす場合だけ定額積立の候補として再確認する。`
    : currentMonthPurchases > 0
      ? `当月の買付履歴${Math.round(currentMonthPurchases / 10_000)}万円を確認。重複する追加買付は次回の月次見直しまで保留する。`
    : `NISA月${Math.round(profile.nisaMonthly / 10_000)}万円を定額設定する。`;
  const candidates = [
    { id: "defensive", name: "防衛重視", weights: { equity: 0.55, bonds: 0.35, gold: 0.10 } },
    { id: "balanced", name: "成長・防衛バランス", weights: { equity: 0.70, bonds: 0.20, gold: 0.10 } },
    { id: "growth", name: "成長重視", weights: { equity: 0.80, bonds: 0.10, gold: 0.10 } },
  ].map(candidate => simulateCandidate(profile, candidate, 5_000));
  const recommended = [...candidates].sort((left, right) => right.score - left.score)[0] as PortfolioCandidate;
  const idecoAnnual = profile.idecoMonthly * 12;
  const annualCreditUpper = profile.loanBalance * profile.loanCreditRate;
  const returnComparison = buildReturnComparison(profile, recommended.weights);
  const nisaMonthlyAmount = nisaTsumitateRemaining !== null && nisaTsumitateRemaining > 0
    ? Math.min(funding.recommendedNisa, nisaTsumitateRemaining)
    : 0;
  const idecoMonthlyAmount = funding.recommendedIdeco;
  const monthlyProductRecommendations: MonthlyProductRecommendation[] = [
    {
      id: "nisa-core",
      account: "NISAつみたて投資枠",
      fundName: "eMAXIS Slim 全世界株式（オール・カントリー）",
      monthlyAmount: nisaMonthlyAmount,
      allocationPercent: nisaMonthlyAmount > 0 ? 100 : 0,
      status: nisaMonthlyAmount > 0 ? "積立を提案" : "今月は保留",
      instruction: nisaMonthlyAmount > 0 ? `つみたて投資枠で毎月${Math.round(nisaMonthlyAmount).toLocaleString("ja-JP")}円を100%設定する。成長投資枠では買わない。` : "今月のNISA新規買付は0円。つみたて投資枠の残額と現金バケツを確認するまで設定・増額しない。",
      holdingsRelationship: "既存2559とMSCI ACWIの投資対象が近い。2559を売却して置き換えるのではなく、新規積立だけを投信型の全世界株式コアへ集約する。1489・2514の地域・高配当傾斜は追加しない。",
      rationale: "既存保有の日本高配当・為替ヘッジ先進国株の偏りを、新規資金で増やさず、低コストの広範囲株式コアへ集約するため。",
      changesWhen: "生活防衛・年払い・近期限教育・住宅維持の現金目標が不足する、つみたて投資枠が尽きる、または収入・大口支出が変わる場合は0円へ切り替える。",
      sourceUrl: "https://emaxis.am.mufg.jp/fund/253425.html",
    },
    {
      id: "ideco-core",
      account: "SBI証券 iDeCo",
      fundName: "eMAXIS Slim 全世界株式（除く日本）",
      monthlyAmount: idecoMonthlyAmount,
      allocationPercent: idecoMonthlyAmount > 0 ? 100 : 0,
      status: idecoMonthlyAmount > 0 ? "積立を提案" : "今月は保留",
      instruction: idecoMonthlyAmount > 0 ? `SBI証券iDeCoで毎月${Math.round(idecoMonthlyAmount).toLocaleString("ja-JP")}円を100%設定する。` : "今月のiDeCo新規設定・増額は0円。現金バケツと月次余力を満たすまで保留する。",
      holdingsRelationship: "既存1489の国内株保有があるため、日本を除く全世界株式をiDeCoの長期コアにする。S&P500・テーマ株・バランス型を重ねて買わず、地域重複と費用を増やさない。",
      rationale: "iDeCoの引出制限を許容できる老後資金に限定し、日本株サテライトをすでに持つ家計全体での地域分散を補うため。",
      changesWhen: "生活防衛・教育・住宅資金が不足する、掛金上限や勤務先制度が変わる、または60歳までの資金拘束を許容できなくなった場合は0円へ切り替える。",
      sourceUrl: "https://go.sbisec.co.jp/prd/ideco/howto_item.html",
    },
  ];
  const existingHoldingInstructions: ExistingHoldingInstruction[] = profile.holdings.map(holding => ({
    code: holding.code,
    name: holding.name,
    monthlyAmount: 0,
    instruction: holding.code === "1489" || holding.code === "2514"
      ? "追加買付は0円。既存の地域・高配当・為替ヘッジ傾斜を新規積立で増やさない。"
      : holding.code === "2621" || holding.code === "424A"
        ? "追加買付は0円。債券・金のサテライトは現金資金の代替にせず、年次リバランス時だけ確認する。"
        : "追加買付は0円。売却せず保有し、新規積立は投信型の全世界株式コアへ集約する。"
  }));

  const actionPlan: RecommendationResult["actionPlan"] = [
    {
      priority: "今月",
      action: `現金${Math.round(plan.emergencyTarget / 10_000)}万円を生活防衛資金として確保し、${nisaMonthlyAction} iDeCo月${Math.round(profile.idecoMonthly / 10_000)}万円は年次税額と教育資金を確認して定額設定する。`,
      reason: "既知支出12か月分と年間積立額を同時に満たすことを、推奨条件の第一順位としています。",
      tradeoff: "手元現金を維持するため、一括投資や繰上返済より期待収益は抑えられる可能性があります。",
    },
    {
      priority: "年内",
      action: `投資資産は株式${Math.round(recommended.weights.equity * 100)}%・債券${Math.round(recommended.weights.bonds * 100)}%・金${Math.round(recommended.weights.gold * 100)}%を目標に、乖離幅${Math.round(profile.rebalanceThreshold * 100)}%超の資産だけを追加買付で調整する。`,
      reason: "5,000経路の資産配分モデルで、目標達成確率と中央値の残高、下落耐性のスコアを比較しました。全金融商品を網羅したランキングではありません。",
      tradeoff: "最も高い期待残高だけを狙う株式比率ではありません。目標達成を保証するものでもありません。",
    },
    {
      priority: "条件付き",
      action: "住宅ローン控除期間中は、繰上返済を実行する前に控除減少分と残金利を再計算する。金利上昇・現金余剰・控除終了後の3条件がそろった時だけ比較する。",
      reason: `単純上限では住宅ローン控除は年${Math.round(annualCreditUpper / 10_000)}万円相当であり、繰上返済はこの価値を減らす可能性があります。`,
      tradeoff: "投資のリターンは不確実ですが、繰上返済の利息削減は金利相当で確定します。",
    },
  ];

  return {
    asOf,
    paths: 5_000,
    years: Math.max(1, profile.retirementAge - profile.currentAge),
    recommended,
    candidates,
    actionPlan,
    returnComparison,
    productEvidence: [
      { id: "2559", name: "2559 MAXIS全世界株式（オール・カントリー）", decision: "長期コア候補", rationale: "既存NISAの中で、全世界株式を一本で担うコアとして地域重複を最も減らせます。", comparedWith: "1489の国内高配当傾斜、2514の先進国・円ヘッジ傾斜と比較。", excludedReason: "全世界株式ETF・投信の全銘柄を費用・追跡差・売買コストまで横断比較した結果ではありません。", sourceUrl: "https://www.am.mufg.jp/fund/182559.html" },
      { id: "ideco-global", name: "iDeCo: eMAXIS Slim 全世界株式（除く日本）", decision: "定額候補", rationale: "SBI iDeCoの確認済み取扱範囲で、日本を除く世界株式に広く投資する低コスト候補です。", comparedWith: "同セレクトプランの米国株・先進国株・バランス・アクティブ候補と、費用・分散・既存の日本株保有を比較。", excludedReason: "SBIセレクトプラン外の商品、将来の取扱変更、受取時の税額は比較対象外です。", sourceUrl: "https://go.sbisec.co.jp/prd/ideco/howto_item_select.html" },
      { id: "1489", name: "1489 NF・日経高配当50 ETF", decision: "追加停止", rationale: "日本高配当50銘柄への明確なサテライトです。全世界株式コアと日本株部分が重なります。", comparedWith: "2559の全世界株式コアと比較し、分散の追加効果より国内・高配当への集中を重視する商品です。", excludedReason: "過去の分配金利回りを将来年利として扱わず、分配金・値上がりの予測比較はしていません。", sourceUrl: "https://nextfunds.jp/lineup/1489/" },
      { id: "2514", name: "2514 NF・外国株ヘッジ有ETF", decision: "追加停止", rationale: "日本除く先進国株へ円ヘッジ付きで投資しますが、2559との地域重複とヘッジコストの影響があります。", comparedWith: "2559と、ヘッジなし・ありの為替リスクを比較。", excludedReason: "将来の為替・金利差・ヘッジコストを精密に予測する比較は行っていません。", sourceUrl: "https://nextfunds.jp/lineup/2514/" },
      { id: "2621", name: "2621 iShares米国債20年超ヘッジ有", decision: "保有のみ", rationale: "株式と異なる値動きが期待される一方、長期デュレーションゆえ金利上昇の影響が大きい債券サテライトです。", comparedWith: "現金・短中期債・全世界株式との役割比較。", excludedReason: "教育資金の安全資産代替や、債券ETF全銘柄の最適化としては扱いません。", sourceUrl: "https://www.blackrock.com/jp/individual/ja/products/316089/" },
      { id: "424A", name: "424A GX ゴールド ETF", decision: "保有のみ", rationale: "非インカムの分散サテライトとして目標10%までに限定します。", comparedWith: "株式・債券との役割分担を比較。", excludedReason: "金価格の将来年利や全コモディティの優劣を予測する比較ではありません。", sourceUrl: "https://globalxetfs.co.jp/funds/424a/" },
    ],
    comparisonScope: {
      analyzed: "保有5銘柄、SBI iDeCoセレクトプランの代表的な低コスト全世界株式候補、現金・NISA・iDeCo・繰上返済、株式／債券／金の3資産配分候補。",
      exclusions: "全ETF・全投資信託・個別株・保険・外貨・暗号資産・レバレッジ商品を横断して最適化した結果ではありません。",
      selectionRule: "家計の流動性、既存保有との重複、商品目的、費用、制度適合性、5,000経路の資産配分モデルを順に確認。商品固有の将来年利で順位付けはしません。",
      sourceAsOf: asOf,
    },
    implementationCandidates: [
      "iDeCo: SBI証券のeMAXIS Slim 全世界株式（除く日本）を月2万円の候補とし、加入者サイトで商品改定を確認してから設定する。",
      "NISA: 全世界株式を長期コアにし、日本高配当・長期米国債・金は目標比率からの乖離が閾値を超えた場合だけ追加買付で調整する。",
      `リバランス: 目標比率から±${Math.round(profile.rebalanceThreshold * 100)}%を超えた資産だけを新規資金で調整し、売却を第一手段にしない。`,
    ],
    monthlyProductRecommendations,
    existingHoldingInstructions,
    taxComparison: [
      { action: "現金を目的別バケツで保持", liquidity: "高", estimatedBenefit: "生活防衛・教育・住宅維持の資金を売却せずに確保", caveat: "実質価値はインフレで低下し得るため、長期投資資金と混在させません。" },
      { action: `iDeCo月${Math.round(profile.idecoMonthly / 10_000)}万円`, liquidity: "低", estimatedBenefit: `年${Math.round(idecoAnnual / 10_000)}万円の掛金が所得控除の対象`, caveat: "実際の税効果は課税所得、住宅ローン控除、受取時課税等により異なり、原則60歳まで引き出せません。" },
      { action: nisaRemaining !== null && nisaRemaining <= 0 ? "NISA残枠0円：翌年まで新規買付を保留" : nisaGrowthRemaining === 0 ? `NISA成長投資枠0円／つみたて投資枠残${Math.round((nisaTsumitateRemaining ?? 0) / 10_000)}万円` : `NISA月${Math.round(profile.nisaMonthly / 10_000)}万円`, liquidity: "中", estimatedBenefit: "運用益を非課税で保有できる枠を活用", caveat: nisaRemaining === null ? "残枠・買付履歴は統合推奨画面で入力してください。相場下落リスクがあり、教育費・防衛資金を投入しません。" : nisaGrowthRemaining === 0 ? "成長投資枠での追加買付は保留。つみたて投資枠を使う前に、生活防衛・教育・年払いの現金を確認します。" : "残枠は入力値を参照。証券会社画面と照合し、相場下落リスクがある資金を教育費・防衛資金へ充てません。" },
      { action: "繰上返済", liquidity: "低", estimatedBenefit: `年${(profile.loanRate * 100).toFixed(3)}%相当の金利削減`, caveat: "控除期間中は住宅ローン控除の減少を含めて比較します。" },
    ],
    incomeContext: sourceStatement ? { annualIncome: sourceStatement.salaryPayment, sourceTaxYear: sourceStatement.taxYear, source: "源泉徴収票の支払金額を、将来の増減を織り込まない履歴ベースラインとして使用。" } : { annualIncome: profile.annualIncome, sourceTaxYear: null, source: "保存済みの年収入力を使用。" },
    assumptions: [
      "株式・債券・金の年次リターンは、それぞれ平均6.0%・2.5%・3.0%、変動率18%・7%・17%のモデル仮定です。",
      "各経路でインフレ、10%確率の収入減少、16%確率の住宅ローン費用ショック、14%確率の教育費上振れを含めます。過去データに基づく予測ではありません。",
      "iDeCoは拠出額全額が小規模企業共済等掛金控除の対象となる制度設計を前提にします。税額・ふるさと納税上限は源泉徴収票・住民税決定通知で年次確認が必要です。",
      "個別商品の実績・分配金・過去リターンは、将来年利の根拠として用いません。期待年利は資産配分モデルの入力値であり、予測・保証ではありません。",
    ],
  };
}
