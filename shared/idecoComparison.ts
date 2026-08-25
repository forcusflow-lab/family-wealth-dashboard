import type { WealthProfile } from "./wealth";

export type IdecoFundStatus = "現行候補" | "追加予定" | "除外予定";
export type IdecoFundDecision = "定額候補" | "代替候補" | "サテライト" | "見送り" | "移行確認";
export type IdecoFund = {
  id: string;
  name: string;
  category: string;
  region: string;
  feeRate: number | null;
  feeNote: string;
  indexOrPolicy: string;
  status: IdecoFundStatus;
};

export type NormalizedIdecoFund = IdecoFund & {
  liquidity: "低";
  sourceUrl: string;
  sourceAsOf: string;
  selectPlanEligibility: "対象" | "対象外";
};

const SBI_SOURCE = "https://www.sbisec.co.jp/ETGate/?OutSide=on&_ControlID=WPLETmgR001Control&_PageID=WPLETmgR001Mdtl30&_DataStoreID=DSWPLETmgR001Control&_ActionID=DefaultAID&getFlg=on&burl=search_dc&cat1=dc&cat2=none&dir=info&file=dc_info251226_ideco_selectplan.html";

const currentFunds: IdecoFund[] = [
  { id: "emaxis-world-ex-jp", name: "eMAXIS Slim 全世界株式（除く日本）", category: "国際株式", region: "グローバル", feeRate: 0.0005775, feeNote: "年0.05775%以内", indexOrPolicy: "日本を除く世界株式", status: "現行候補" },
  { id: "emaxis-sp500", name: "eMAXIS Slim 米国株式（S&P500）", category: "国際株式", region: "北米", feeRate: 0.000814, feeNote: "年0.0814%以内", indexOrPolicy: "S&P500", status: "現行候補" },
  { id: "sbi-global-balance", name: "SBIグローバル・バランス・ファンド", category: "バランス", region: "グローバル", feeRate: 0.002525, feeNote: "年0.2525%程度", indexOrPolicy: "世界株式・債券のバランス", status: "現行候補" },
  { id: "nissay-nikkei", name: "ニッセイ日経平均インデックスファンド＜購入・換金手数料なし＞", category: "国内株式", region: "日本", feeRate: 0.00143, feeNote: "年0.143%以内", indexOrPolicy: "日経平均", status: "現行候補" },
  { id: "sbi-global-equity", name: "SBI・全世界株式インデックス・ファンド（雪だるま）", category: "国際株式", region: "グローバル", feeRate: 0.001022, feeNote: "年0.1022%程度", indexOrPolicy: "FTSE Global All Cap（日本含む）", status: "現行候補" },
  { id: "emaxis-topix", name: "eMAXIS Slim 国内株式（TOPIX）", category: "国内株式", region: "日本", feeRate: 0.00143, feeNote: "年0.143%以内", indexOrPolicy: "TOPIX", status: "現行候補" },
  { id: "emaxis-developed", name: "eMAXIS Slim 先進国株式インデックス（除く日本）", category: "国際株式", region: "グローバル", feeRate: 0.0009889, feeNote: "年0.09889%以内", indexOrPolicy: "MSCI Kokusai", status: "現行候補" },
  { id: "emaxis-emerging", name: "eMAXIS Slim 新興国株式インデックス", category: "国際株式", region: "新興国", feeRate: 0.001518, feeNote: "年0.1518%以内", indexOrPolicy: "MSCI Emerging Markets", status: "現行候補" },
  { id: "emaxis-8asset", name: "eMAXIS Slim バランス（8資産均等型）", category: "バランス", region: "グローバル", feeRate: 0.00143, feeNote: "年0.143%以内", indexOrPolicy: "8資産均等", status: "現行候補" },
  { id: "nissay-foreign", name: "ニッセイ外国株式インデックスファンド＜購入・換金手数料なし＞", category: "国際株式", region: "グローバル", feeRate: 0.0009889, feeNote: "年0.09889%以内", indexOrPolicy: "MSCI Kokusai", status: "現行候補" },
  { id: "jrevive", name: "SBI中小型割安成長株ファンド ジェイリバイブ＜DC年金＞", category: "国内株式", region: "日本", feeRate: 0.0165, feeNote: "年1.65%", indexOrPolicy: "国内中小型アクティブ", status: "現行候補" },
  { id: "emaxis-developed-bond", name: "eMAXIS Slim 先進国債券インデックス（除く日本）", category: "国際債券", region: "グローバル", feeRate: 0.00154, feeNote: "年0.154%以内", indexOrPolicy: "FTSE世界国債（除く日本）", status: "現行候補" },
  { id: "saison-master", name: "セゾン資産形成の達人ファンド", category: "国際株式", region: "グローバル", feeRate: 0.0134, feeNote: "年1.34%±0.2%程度", indexOrPolicy: "世界株式アクティブ", status: "現行候補" },
  { id: "foreign-reit", name: "三井住友・DC外国リートインデックスファンド", category: "国際REIT", region: "グローバル", feeRate: 0.00297, feeNote: "年0.297%以内", indexOrPolicy: "先進国REIT", status: "現行候補" },
  { id: "ifree-pension", name: "iFree 年金バランス", category: "バランス", region: "グローバル", feeRate: 0.001749, feeNote: "年0.1749%", indexOrPolicy: "年金基本ポートフォリオ近似", status: "現行候補" },
  { id: "pimco-world-bond", name: "SBI-PIMCO 世界債券アクティブファンド（DC）", category: "国際債券", region: "グローバル", feeRate: 0.008294, feeNote: "年0.8294%", indexOrPolicy: "世界債券アクティブ", status: "現行候補" },
  { id: "ifree-emerging-bond", name: "iFree 新興国債券インデックス", category: "国際債券", region: "新興国", feeRate: 0.00242, feeNote: "年0.242%", indexOrPolicy: "新興国債券", status: "現行候補" },
  { id: "nissay-jreit", name: "ニッセイJリートインデックスファンド＜購入・換金手数料なし＞", category: "国内REIT", region: "日本", feeRate: 0.00275, feeNote: "年0.275%以内", indexOrPolicy: "東証REIT", status: "現行候補" },
  { id: "celeblife-2025", name: "セレブライフ・ストーリー2025", category: "バランス", region: "グローバル", feeRate: 0.006445, feeNote: "年0.6445%程度", indexOrPolicy: "ターゲットイヤー", status: "現行候補" },
  { id: "celeblife-2035", name: "セレブライフ・ストーリー2035", category: "バランス", region: "グローバル", feeRate: 0.00646, feeNote: "年0.646%程度", indexOrPolicy: "ターゲットイヤー", status: "現行候補" },
  { id: "celeblife-2045", name: "セレブライフ・ストーリー2045", category: "バランス", region: "グローバル", feeRate: 0.006369, feeNote: "年0.6369%程度", indexOrPolicy: "ターゲットイヤー", status: "現行候補" },
  { id: "celeblife-2055", name: "セレブライフ・ストーリー2055", category: "バランス", region: "グローバル", feeRate: 0.006293, feeNote: "年0.6293%程度", indexOrPolicy: "ターゲットイヤー", status: "現行候補" },
  { id: "russell-foreign", name: "ラッセル・インベストメント外国株式ファンド（DC向け）", category: "国際株式", region: "グローバル", feeRate: 0.01463, feeNote: "年1.463%", indexOrPolicy: "先進国株式マルチマネージャー", status: "現行候補" },
  { id: "hedged-foreign", name: "インデックスファンド海外株式ヘッジあり（DC専用）", category: "国際株式", region: "グローバル", feeRate: 0.00176, feeNote: "年0.176%", indexOrPolicy: "先進国株式・為替ヘッジ", status: "現行候補" },
  { id: "saison-global-balance", name: "セゾン・グローバルバランスファンド", category: "バランス", region: "グローバル", feeRate: 0.0056, feeNote: "年0.56%±0.02%程度", indexOrPolicy: "世界株式・債券 50:50", status: "現行候補" },
  { id: "oobune", name: "農林中金＜パートナーズ＞長期厳選投資 おおぶね", category: "国際株式", region: "北米", feeRate: 0.0099, feeNote: "年0.99%", indexOrPolicy: "米国厳選株式アクティブ", status: "現行候補" },
  { id: "fine-gold", name: "三菱UFJ 純金ファンド（ファインゴールド）", category: "コモディティ", region: "グローバル", feeRate: 0.0099, feeNote: "年0.99%程度", indexOrPolicy: "金価格連動を目指す", status: "現行候補" },
];

const futureFunds: IdecoFund[] = [
  { id: "nasdaq100", name: "SBI NASDAQ100インデックス・ファンド", category: "国際株式", region: "北米", feeRate: 0.001958, feeNote: "年0.1958%", indexOrPolicy: "NASDAQ100", status: "追加予定" },
  { id: "fangplus", name: "iFreeNEXT FANG+インデックス", category: "国際株式", region: "北米", feeRate: 0.007755, feeNote: "年0.7755%", indexOrPolicy: "NYSE FANG+", status: "追加予定" },
  { id: "semiconductor", name: "野村世界業種別投資シリーズ（世界半導体株投資）", category: "国際株式", region: "グローバル", feeRate: 0.0165, feeNote: "年1.65%", indexOrPolicy: "世界半導体テーマ", status: "追加予定" },
  { id: "wcm-growth", name: "WCM 世界成長株厳選ファンド（資産成長型）", category: "国際株式", region: "グローバル", feeRate: 0.01958, feeNote: "年1.958%", indexOrPolicy: "世界成長株アクティブ", status: "追加予定" },
  { id: "india-core", name: "イーストスプリング・インド・コア株式ファンド", category: "国際株式", region: "新興国", feeRate: 0.009575, feeNote: "年0.9575%程度", indexOrPolicy: "インド株式", status: "追加予定" },
  { id: "japan-electronics", name: "情報エレクトロニクスファンド", category: "国内株式", region: "日本", feeRate: 0.0165, feeNote: "年1.65%＋実績連動", indexOrPolicy: "国内情報・電機テーマ", status: "追加予定" },
  { id: "japan-value", name: "大和住銀DC国内株式ファンド", category: "国内株式", region: "日本", feeRate: 0.01045, feeNote: "年1.045%", indexOrPolicy: "国内バリューアクティブ", status: "追加予定" },
  { id: "robopro", name: "DC ROBOPROファンド", category: "バランス", region: "グローバル", feeRate: 0.01122, feeNote: "年1.122%", indexOrPolicy: "ETFを通じた多資産配分", status: "追加予定" },
  { id: "gold-unhedged", name: "SBI・iシェアーズ・ゴールドファンド（為替ヘッジなし）", category: "コモディティ", region: "グローバル", feeRate: 0.001838, feeNote: "年0.1538〜0.1838%程度", indexOrPolicy: "LBMA金価格指数", status: "追加予定" },
  { id: "sbi-shinsei-1y", name: "SBI新生DC定期（1年）", category: "元本確保", region: "日本", feeRate: null, feeNote: "信託報酬なし", indexOrPolicy: "1年定期預金", status: "追加予定" },
];

const scheduledRemoval: IdecoFund[] = [
  { id: "ifree-nydow", name: "iFree NYダウ・インデックス", category: "国際株式", region: "北米", feeRate: 0.002475, feeNote: "年0.2475%", indexOrPolicy: "NYダウ", status: "除外予定" },
  { id: "hifumi-world", name: "ひふみワールド年金", category: "国際株式", region: "グローバル", feeRate: 0.011, feeNote: "年1.10%", indexOrPolicy: "世界株式アクティブ", status: "除外予定" },
  { id: "harris-global-value", name: "ハリス グローバル バリュー株ファンド（年1回決算型）", category: "国際株式", region: "グローバル", feeRate: 0.0198, feeNote: "年1.98%", indexOrPolicy: "世界バリュー株アクティブ", status: "除外予定" },
  { id: "exei-world-small", name: "EXE-i 全世界中小型株式ファンド", category: "国際株式", region: "グローバル", feeRate: 0.00233, feeNote: "年0.233%程度", indexOrPolicy: "全世界中小型株式", status: "除外予定" },
  { id: "harvest-frontier", name: "ハーベスト アジア フロンティア株式ファンド", category: "国際株式", region: "アジア", feeRate: 0.02124, feeNote: "年2.124%程度", indexOrPolicy: "アジア・フロンティア株式", status: "除外予定" },
  { id: "hifumi-japan", name: "ひふみ年金", category: "国内株式", region: "日本", feeRate: 0.00836, feeNote: "年0.836%", indexOrPolicy: "国内株式アクティブ", status: "除外予定" },
  { id: "tsumitate-tsubaki", name: "つみたて椿", category: "国内株式", region: "日本", feeRate: 0.0099, feeNote: "年0.99%", indexOrPolicy: "女性活躍テーマ株式", status: "除外予定" },
  { id: "nomura-real-growth", name: "野村リアルグロース・オープン（確定拠出年金向け）", category: "国内株式", region: "日本", feeRate: 0.00935, feeNote: "年0.935%", indexOrPolicy: "国内成長株アクティブ", status: "除外予定" },
  { id: "emaxis-domestic-bond", name: "eMAXIS Slim 国内債券インデックス", category: "国内債券", region: "日本", feeRate: 0.00132, feeNote: "年0.132%以内", indexOrPolicy: "NOMURA-BPI総合", status: "除外予定" },
  { id: "hedged-foreign-bond", name: "インデックスファンド海外債券ヘッジあり（DC専用）", category: "国際債券", region: "グローバル", feeRate: 0.00176, feeNote: "年0.176%", indexOrPolicy: "先進国債券・為替ヘッジ", status: "除外予定" },
  { id: "aozora-deposit", name: "あおぞらDC定期（1年）", category: "元本確保", region: "日本", feeRate: null, feeNote: "信託報酬なし", indexOrPolicy: "1年定期預金", status: "除外予定" },
];

function normalizeFund(fund: IdecoFund): NormalizedIdecoFund {
  return { ...fund, liquidity: "低", sourceUrl: SBI_SOURCE, sourceAsOf: "2026-08-18", selectPlanEligibility: fund.id === "aozora-deposit" ? "対象外" : "対象" };
}

function containsExistingJapanEquity(profile: WealthProfile) {
  return profile.holdings.some(holding => holding.code === "1489" || holding.note.includes("日本"));
}

function decisionForFund(fund: IdecoFund, profile: WealthProfile): { decision: IdecoFundDecision; rationale: string; score: number } {
  if (fund.status === "追加予定") return { decision: "移行確認", rationale: "2026年10月16日の追加予定。現時点では配分先として選択せず、追加後に費用・目論見書・既存保有との重複を再確認。", score: 0 };
  if (fund.id === "emaxis-world-ex-jp") return { decision: "定額候補", rationale: "既存の国内高配当株を保有しているため、日本を除く世界株式を低コストで補う用途に最も整合的。iDeCoの60歳までの引出制限を許容する長期資金に限定。", score: 100 };
  if (fund.id === "sbi-global-equity") return { decision: "代替候補", rationale: "日本を含む全世界株式を一本化したい場合の低コスト代替。ただし既存の国内株式保有と重複する。", score: containsExistingJapanEquity(profile) ? 82 : 93 };
  if (["emaxis-sp500", "emaxis-developed", "nissay-foreign"].includes(fund.id)) return { decision: "代替候補", rationale: "低コストの株式インデックスだが、地域を絞るため、世界株式コアより集中・重複管理が必要。", score: 74 };
  if (["emaxis-8asset", "ifree-pension", "sbi-global-balance", "saison-global-balance"].includes(fund.id)) return { decision: "代替候補", rationale: "一本で配分管理できる一方、家計全体ですでにNISA・債券・金を持つため、資産配分が不透明になりやすい。", score: 58 };
  if (fund.category === "元本確保") return { decision: "サテライト", rationale: "iDeCo内で元本確保を優先する場合の候補。ただし教育・生活防衛資金はiDeCo外の流動性資産で確保する。", score: 45 };
  if (fund.category.includes("債券") || fund.category.includes("REIT") || fund.category === "コモディティ") return { decision: "サテライト", rationale: "既存の長期米国債・金と役割が重なりやすい。目標配分を先に決め、コアへの追加積立を妨げない範囲に限定。", score: 35 };
  return { decision: "見送り", rationale: "テーマ・単一地域・アクティブ運用または高コストのため、既存保有との重複に対する追加の分散効果を個別に説明できる場合を除き、定額コアには採用しない。", score: Math.max(5, 30 - Math.round((fund.feeRate ?? 0.02) * 1_000)) };
}

export function buildIdecoComparison(profile: WealthProfile) {
  const ranked = currentFunds.map(fund => ({ ...normalizeFund(fund), ...decisionForFund(fund, profile) })).sort((a, b) => b.score - a.score || (a.feeRate ?? 1) - (b.feeRate ?? 1));
  const additional = futureFunds.map(fund => ({ ...normalizeFund(fund), ...decisionForFund(fund, profile) }));
  const removal = scheduledRemoval.map(fund => ({ ...normalizeFund(fund), decision: "移行確認" as const, score: 0, rationale: "2026年10月16日以降は新規買付停止予定。既保有は継続保有・スイッチング可能だが、掛金配分に含む場合は変更期限を確認。" }));
  return {
    asOf: "2026-08-18",
    currentFunds: ranked,
    additional,
    scheduledRemoval: removal,
    currentCount: currentFunds.length,
    totalSelectUniverseCount: currentFunds.length + removal.filter(fund => fund.selectPlanEligibility === "対象").length,
    activeCountAfterRemoval: 27,
    sourceUrl: SBI_SOURCE,
    methodology: "現行候補は、公式公開一覧でセレクトプラン対象と表示された27本。費用、資産クラス、地域、既存NISAとの重複、iDeCoの引出制限を評価し、異なる資産クラスを単純な期待リターンだけで横並びには順位付けしない。",
  };
}
