export type ProductPerformance = { id: string; name: string; account: "NISA" | "iDeCo"; feeRate: number; benchmark: string; assetClass: string; currencyPolicy: string; liquidity: string; sourceUrl: string; feeSourceUrl: string; asOf: string | null; nav: number | null; returns: { oneYear: number | null; threeYear: number | null; fiveYear: number | null }; status: "取得済み" | "取得不可" };
type HistoryPoint = { date: Date; nav: number };

const PRODUCT_SOURCES = [
  { id: "2559", name: "MAXIS 全世界株式（オール・カントリー）上場投信", account: "NISA" as const, feeRate: 0.000858, benchmark: "MSCI ACWI（配当込み、円換算ベース）", assetClass: "全世界株式", currencyPolicy: "為替ヘッジなし", liquidity: "東京証券取引所で市場取引。価格乖離・売買コストに注意。", sourceUrl: "https://www.am.mufg.jp/fund_file/setteirai/182559.csv", feeSourceUrl: "https://www.am.mufg.jp/fund/182559.html", csvEncoding: "utf-8" as const },
  { id: "emaxis-ac", name: "eMAXIS Slim 全世界株式（オール・カントリー）", account: "NISA" as const, feeRate: 0.0005775, benchmark: "MSCI ACWI（配当込み、円換算ベース）", assetClass: "全世界株式", currencyPolicy: "為替ヘッジなし", liquidity: "投資信託の基準価額で取引。申込締切・約定日を販売会社で確認。", sourceUrl: "https://www.am.mufg.jp/fund_file/setteirai/253425.csv", feeSourceUrl: "https://emaxis.am.mufg.jp/fund/253425.html", csvEncoding: "shift_jis" as const },
  { id: "emaxis-ex-japan", name: "eMAXIS Slim 全世界株式（除く日本）", account: "iDeCo" as const, feeRate: 0.0005775, benchmark: "MSCI ACWI ex Japan（配当込み、円換算ベース）", assetClass: "全世界株式（除く日本）", currencyPolicy: "為替ヘッジなし", liquidity: "iDeCoは原則60歳まで引出不可。教育・生活防衛・住宅維持資金には充当しない。", sourceUrl: "https://www.am.mufg.jp/fund_file/setteirai/253209.csv", feeSourceUrl: "https://emaxis.am.mufg.jp/fund/253209.html", csvEncoding: "shift_jis" as const },
] as const;

function parseDate(value: string) {
  const match = value.trim().match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
}

export function parseOfficialNavCsv(content: string): HistoryPoint[] {
  return content.split(/\r?\n/).map(line => line.split(",")).map(columns => {
    const date = parseDate(columns[0] ?? "");
    const reinvestedNav = Number((columns[2] ?? columns[1] ?? "").replace(/,/g, ""));
    return date && Number.isFinite(reinvestedNav) ? { date, nav: reinvestedNav } : null;
  }).filter((item): item is HistoryPoint => item !== null).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function returnForYears(history: HistoryPoint[], years: number) {
  const end = history.at(-1);
  if (!end) return null;
  const cutoff = new Date(end.date);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
  const start = history.find(point => point.date >= cutoff);
  return start && start.date.getTime() < end.date.getTime() ? end.nav / start.nav - 1 : null;
}

export function summarizeOfficialHistory(history: HistoryPoint[]) {
  const latest = history.at(-1);
  return { asOf: latest ? latest.date.toISOString().slice(0, 10) : null, nav: latest?.nav ?? null, returns: { oneYear: returnForYears(history, 1), threeYear: returnForYears(history, 3), fiveYear: returnForYears(history, 5) } };
}

async function fetchOfficialHistory(url: string, encoding: "utf-8" | "shift_jis") {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 family-wealth-dashboard" } });
  if (!response.ok) throw new Error(`Official performance data request failed: ${response.status}`);
  const bytes = await response.arrayBuffer();
  return parseOfficialNavCsv(new TextDecoder(encoding).decode(bytes));
}

export async function getRecommendedProductPerformance() {
  const items = await Promise.all(PRODUCT_SOURCES.map(async source => {
    try {
      const history = await fetchOfficialHistory(source.sourceUrl, source.csvEncoding);
      return { ...source, ...summarizeOfficialHistory(history), status: "取得済み" as const } satisfies ProductPerformance;
    } catch {
      return { ...source, asOf: null, nav: null, returns: { oneYear: null, threeYear: null, fiveYear: null }, status: "取得不可" as const } satisfies ProductPerformance;
    }
  }));
  return { asOf: new Date().toISOString(), items, methodology: "運用会社の設定来CSVにある基準価額（分配金再投資欄）から、直近観測日以前の同期間起点を用いて1年・3年・5年の単純累積騰落率を算出。基準価額は信託報酬控除後だが、税金、売買手数料、ETFの市場価格乖離は反映しない。", disclosure: "過去の実績は将来の運用成果を示唆・保証しません。比較は判断材料であり、このアプリは注文・売買を実行しません。" };
}
