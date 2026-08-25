import { calculateWealthPlan, type NisaPurchaseRecord, type NisaRecords, type WealthProfile } from "./wealth";

export type NisaPurpose = "生活防衛" | "教育" | "住宅" | "老後" | "長期成長" | "分散補完";
export type NisaCandidate = {
  id: string;
  name: string;
  status: "保有" | "比較候補";
  nisaEligibility: "成長投資枠" | "つみたて・成長投資枠";
  assetClass: "株式" | "債券" | "金" | "バランス";
  benchmark: string;
  currencyPolicy: string;
  feeRate?: number;
  feeAsOf: string;
  sourceUrl: string;
  purposeFit: NisaPurpose[];
  concentration: string;
  liquidity: "市場売買" | "投信解約";
  overlap: string;
  evidence: string;
};

export const NISA_UNIVERSE_SCOPE = {
  asOf: "2026-08-18 JST",
  tsumitateCount: 361,
  breakdown: "指定インデックス投信286本、指定インデックス以外のアクティブ投信等66本、ETF9本（金融庁2026-08-10更新の届出一覧から集計）",
  growthScope: "資産運用業協会・東京証券取引所の届出一覧を適格性の母集団とし、実際の取扱可否は証券会社画面で再確認する。",
  coverage: "全適格商品の将来収益を予測して順位付けはしない。広範囲分散コア、既存保有の代替、為替ヘッジ、長期債、金を代表する比較候補を、目的・重複・費用・流動性で比較する。",
};

export const NISA_ORDER_SAFETY_COPY = "残枠・買付履歴は記録と判断材料にのみ使用し、このアプリは注文・売買を実行しません。";
export const RECOMMENDATION_HUB_LINKS = [
  { id: "current", label: "現在の推奨プラン", path: "/recommendation" },
  { id: "allocation", label: "保有商品・配分根拠", path: "/portfolio-audit" },
  { id: "returns", label: "実質年利・選定根拠", path: "/decision-evidence" },
  { id: "projection", label: "将来資産推移シミュレーション", path: "/asset-projection" },
] as const;

export type NisaAllowanceStatus = {
  state: "未入力" | "入力済み";
  taxYear?: number;
  tsumitateRemaining?: number;
  growthRemaining?: number;
  totalRemaining?: number;
  purchaseCount: number;
  recordedPurchaseTotal: number;
  latestPurchase?: { tradeDate: string; name: string; amount: number };
  errors: string[];
};

export function validateNisaRecords(records: NisaRecords) {
  const errors: string[] = [];
  const entries: Array<["つみたて投資枠" | "成長投資枠", number, number]> = [["つみたて投資枠", records.tsumitateAllowance, records.tsumitateUsed], ["成長投資枠", records.growthAllowance, records.growthUsed]];
  entries.forEach(([label, allowance, used]) => {
    if (allowance < 0 || used < 0) errors.push(`${label}の金額は0円以上で入力してください。`);
    if (used > allowance) errors.push(`${label}の利用額が年間枠を超えています。証券会社画面で確認してください。`);
  });
  ([records.tsumitateRemainingOverride, records.growthRemainingOverride] as const).forEach((remaining, index) => {
    const label = index === 0 ? "つみたて投資枠" : "成長投資枠";
    if (remaining !== undefined && remaining < 0) errors.push(`${label}の証券会社表示残枠は0円以上で入力してください。`);
  });
  records.purchases.forEach(purchase => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchase.tradeDate)) errors.push("買付日の形式をYYYY-MM-DDで入力してください。");
    if (!purchase.codeOrFund.trim() || !purchase.name.trim() || purchase.amount <= 0) errors.push("買付履歴は銘柄・名称・金額をすべて入力してください。");
  });
  return errors;
}

export function getNisaAllowanceStatus(profile: WealthProfile): NisaAllowanceStatus {
  if (!profile.nisaRecords) return { state: "未入力", purchaseCount: 0, recordedPurchaseTotal: 0, errors: [] };
  const records = profile.nisaRecords;
  const errors = validateNisaRecords(records);
  const tsumitatePurchases = records.purchases.filter(purchase => purchase.allowance === "つみたて投資枠").reduce((sum, purchase) => sum + purchase.amount, 0);
  const growthPurchases = records.purchases.filter(purchase => purchase.allowance === "成長投資枠").reduce((sum, purchase) => sum + purchase.amount, 0);
  const tsumitateRemaining = records.tsumitateRemainingOverride ?? Math.max(0, records.tsumitateAllowance - Math.max(records.tsumitateUsed, tsumitatePurchases));
  const growthRemaining = records.growthRemainingOverride ?? Math.max(0, records.growthAllowance - Math.max(records.growthUsed, growthPurchases));
  const latestPurchase = [...records.purchases].sort((left, right) => right.tradeDate.localeCompare(left.tradeDate))[0];
  const recordedPurchaseTotal = tsumitatePurchases + growthPurchases;
  return { state: "入力済み", taxYear: records.taxYear, tsumitateRemaining, growthRemaining, totalRemaining: tsumitateRemaining + growthRemaining, purchaseCount: records.purchases.length, recordedPurchaseTotal, latestPurchase: latestPurchase ? { tradeDate: latestPurchase.tradeDate, name: latestPurchase.name, amount: latestPurchase.amount } : undefined, errors };
}

export const NISA_CANDIDATES: NisaCandidate[] = [
  { id: "1489", name: "NF・日経高配当50 ETF", status: "保有", nisaEligibility: "成長投資枠", assetClass: "株式", benchmark: "日経平均高配当株50（トータルリターン）", currencyPolicy: "円建て・国内株", feeRate: 0.00308, feeAsOf: "2026-08-17", sourceUrl: "https://nextfunds.jp/lineup/1489/", purposeFit: ["長期成長", "分散補完"], concentration: "日本・高配当50銘柄", liquidity: "市場売買", overlap: "全世界株式コアの日本株部分と重複", evidence: "年4回分配の国内高配当サテライト。分配利回りを将来年利と扱わない。" },
  { id: "2514", name: "NF・外国株ヘッジ有ETF", status: "保有", nisaEligibility: "成長投資枠", assetClass: "株式", benchmark: "MSCI KOKUSAI（円ヘッジあり）", currencyPolicy: "為替ヘッジあり", feeRate: 0.00187, feeAsOf: "2026-08-17", sourceUrl: "https://nextfunds.jp/lineup/2514/", purposeFit: ["長期成長", "分散補完"], concentration: "日本除く先進国、米国比率70%超", liquidity: "市場売買", overlap: "全世界株式コアの先進国株部分と重複", evidence: "円建て変動を抑える設計だが、金利差等のヘッジコスト／プレミアムの影響を受ける。" },
  { id: "2559", name: "MAXIS全世界株式（オール・カントリー）", status: "保有", nisaEligibility: "成長投資枠", assetClass: "株式", benchmark: "MSCI ACWI", currencyPolicy: "為替ヘッジなし", feeRate: 0.000858, feeAsOf: "交付目論見書2026-03-07", sourceUrl: "https://www.am.mufg.jp/fund/182559.html", purposeFit: ["老後", "長期成長"], concentration: "日本を含む先進国・新興国の株式", liquidity: "市場売買", overlap: "全世界株式投信候補と大きく重複", evidence: "既存の広範囲株式コア。追加投資で投信型全世界株式へ切替える経済的メリットは、費用差と積立利便性を除くと限定的。" },
  { id: "2621", name: "iシェアーズ 米国債20年超ETF（為替ヘッジあり）", status: "保有", nisaEligibility: "成長投資枠", assetClass: "債券", benchmark: "FTSE米国債20年超セレクト（円ヘッジ）", currencyPolicy: "為替ヘッジあり", feeRate: 0.00154, feeAsOf: "2026-08-14", sourceUrl: "https://www.blackrock.com/jp/individual/ja/products/316089/", purposeFit: ["分散補完"], concentration: "米国債20年超・実効デュレーション14.7441年", liquidity: "市場売買", overlap: "生活防衛・教育現金とは代替しない", evidence: "金利感応度が大きい長期債サテライト。現金同等物や短期教育資金としては扱わない。" },
  { id: "424A", name: "グローバルX ゴールドETF（為替ヘッジあり）", status: "保有", nisaEligibility: "成長投資枠", assetClass: "金", benchmark: "Mirae Asset Gold Bullion ETF Hedged Index", currencyPolicy: "為替ヘッジあり", feeRate: 0.001775, feeAsOf: "2026-08-17", sourceUrl: "https://globalxetfs.co.jp/funds/424A/index.html", purposeFit: ["分散補完"], concentration: "金現物連動ETFへの投資を通じた金価格エクスポージャー", liquidity: "市場売買", overlap: "株式・債券とは値動きが異なり得るが、価格変動資産", evidence: "実質費用は年0.1775%程度。危機耐性を期待するサテライトであり、元本保全資金ではない。" },
  { id: "emaxis-ac", name: "eMAXIS Slim 全世界株式（オール・カントリー）", status: "比較候補", nisaEligibility: "つみたて・成長投資枠", assetClass: "株式", benchmark: "MSCI ACWI", currencyPolicy: "為替ヘッジなし", feeRate: 0.0005775, feeAsOf: "2026-07-31", sourceUrl: "https://emaxis.am.mufg.jp/fund/253425.html", purposeFit: ["老後", "長期成長"], concentration: "日本を含む先進国・新興国の株式", liquidity: "投信解約", overlap: "2559と投資対象が近い", evidence: "低コスト・広範囲分散の投信コア候補。既存2559を売却して置換する根拠にはならず、新規積立の利便性比較に限る。" },
  { id: "emaxis-sp500", name: "eMAXIS Slim 米国株式（S&P500）", status: "比較候補", nisaEligibility: "つみたて・成長投資枠", assetClass: "株式", benchmark: "S&P500", currencyPolicy: "為替ヘッジなし", feeRate: 0.000814, feeAsOf: "2026-07-31", sourceUrl: "https://emaxis.am.mufg.jp/fund/253266.html", purposeFit: ["長期成長"], concentration: "米国大型株500社", liquidity: "投信解約", overlap: "2559・2514の米国株部分と重複", evidence: "米国比率を意図的に高める比較候補。全世界コアと併用する場合は、分散の追加ではなく米国集中の選択となる。" },
  { id: "emaxis-8", name: "eMAXIS Slim バランス（8資産均等型）", status: "比較候補", nisaEligibility: "つみたて・成長投資枠", assetClass: "バランス", benchmark: "国内外の株式・債券・REITを8資産均等", currencyPolicy: "資産ごとに異なる", feeRate: 0.00143, feeAsOf: "2026-07-31", sourceUrl: "https://emaxis.am.mufg.jp/lp/slim/pr1/", purposeFit: ["分散補完"], concentration: "8資産均等", liquidity: "投信解約", overlap: "株式・債券・REITを既存保有と組み合わせると重複が複雑化", evidence: "値動きを均す比較候補。生活防衛資金の代替ではなく、既存ETFを単純化したい場合の検討対象。" },
];

export type NisaReview = NisaCandidate & { decision: "コア候補" | "保有継続の役割確認" | "追加買付は保留" | "新規積立の比較候補"; rationale: string };
export type PurposeSelection = { purpose: NisaPurpose; nisaRole: "対象外" | "安全資産を優先" | "広範囲コア候補" | "サテライト上限を確認"; selectedIds: string[]; rationale: string };

export function buildNisaReview(profile: WealthProfile) {
  const heldCodes = new Set(profile.holdings.map(holding => holding.code));
  const plan = calculateWealthPlan(profile);
  const emergencyShortfall = Math.max(0, plan.emergencyTarget - plan.cashPosition.flexibleCashTotal);
  const allowance = getNisaAllowanceStatus(profile);
  const historyNote = allowance.purchaseCount > 0 ? ` 当年の買付履歴${allowance.purchaseCount}件・合計${Math.round(allowance.recordedPurchaseTotal / 10_000)}万円を残枠判定へ反映。` : "";
  const newPurchaseOnHold = emergencyShortfall > 0 || allowance.totalRemaining === 0;
  const reviews: NisaReview[] = NISA_CANDIDATES.map(candidate => {
    const growthAllowanceBlocked = candidate.nisaEligibility === "成長投資枠" && allowance.growthRemaining === 0;
    const candidatePurchaseOnHold = newPurchaseOnHold || growthAllowanceBlocked;
    if (candidate.status === "保有") {
      const decision = candidatePurchaseOnHold ? "追加買付は保留" : "保有継続の役割確認";
      const holdReason = emergencyShortfall > 0 ? "生活防衛資金が未充足。" : allowance.totalRemaining === 0 ? "入力済みのNISA残枠が0円。" : growthAllowanceBlocked ? "成長投資枠の残枠が0円。" : "";
      return { ...candidate, decision, rationale: `${heldCodes.has(candidate.id) ? `${candidate.evidence} 現在保有として検出。` : `${candidate.evidence} 入力資産台帳との照合を要確認。`} ${holdReason}${historyNote}` };
    }
    if (candidate.id === "emaxis-ac") return { ...candidate, decision: newPurchaseOnHold ? "追加買付は保留" : "コア候補", rationale: `${newPurchaseOnHold ? emergencyShortfall > 0 ? "生活防衛資金が未充足のため、商品比較は行うが新規リスク資産の買付判断は保留。" : "入力済みのNISA残枠が0円のため、当年の新規買付は保留。" : candidate.evidence}${historyNote}` };
    return { ...candidate, decision: newPurchaseOnHold ? "追加買付は保留" : "新規積立の比較候補", rationale: `${candidate.evidence}${historyNote}` };
  });
  const homeShortfall = planPurposeShortfall(profile, "住宅");
  const educationShortfall = planPurposeShortfall(profile, "教育");
  const educationNeedsCash = plan.nearTermEducationTarget > 0;
  const purposeSelections: PurposeSelection[] = [
    { purpose: "生活防衛", nisaRole: "対象外", selectedIds: [], rationale: "12か月の既知支出は預金等の高流動性資産で確保する。NISAの価格変動資産は代替しない。" },
    { purpose: "教育", nisaRole: educationNeedsCash ? "安全資産を優先" : "広範囲コア候補", selectedIds: educationNeedsCash ? [] : ["2559", "emaxis-ac"], rationale: educationNeedsCash ? (educationShortfall > 0 ? "支出開始まで5年以内の教育バケツが未充足のため、学費支払資金はNISAではなく安全資産を先に積み立てる。" : "支出開始まで5年以内の教育費は現金目標を満たしており、NISAの価格変動資産で置き換えない。" ) : "直近5年の教育現金目標はないため、より先の教育費に充てる長期資金だけを、広範囲コアとして再検討する。" },
    { purpose: "住宅", nisaRole: homeShortfall > 0 ? "安全資産を優先" : "対象外", selectedIds: [], rationale: "修繕・設備更新・変動金利への備えは現金バケツで管理し、NISAと交換可能な資金とみなさない。" },
    { purpose: "老後", nisaRole: "広範囲コア候補", selectedIds: ["2559", "emaxis-ac"], rationale: "60歳以降の長期目的には、既存全世界株ETFまたは低コスト全世界株投信を一つのコアとして比較する。両方を同時に増やしても分散の追加は小さい。" },
    { purpose: "長期成長", nisaRole: "広範囲コア候補", selectedIds: ["2559", "emaxis-ac"], rationale: "全世界コアを優先。米国株投信を追加するなら、分散ではなく米国比率を高める明示的な選択として扱う。" },
    { purpose: "分散補完", nisaRole: "サテライト上限を確認", selectedIds: ["1489", "2514", "2621", "424A"], rationale: "高配当・為替ヘッジ株・長期債・金は役割を限定したサテライト。生活防衛・教育資金の代替ではなく、合計比率と重複を先に確認する。" },
  ];
  return { universe: NISA_UNIVERSE_SCOPE, emergencyShortfall, allowance, reviews, purposeSelections, disclaimer: `これは適格性・資産配分・費用・重複の比較であり、全NISA商品の将来成績を順位付けするものではありません。${NISA_ORDER_SAFETY_COPY}` };
}

function planPurposeShortfall(profile: WealthProfile, purpose: "教育" | "住宅") {
  const plan = calculateWealthPlan(profile);
  return plan.buckets.find(bucket => bucket.id === (purpose === "教育" ? "education" : "home"))?.shortfall ?? 0;
}
