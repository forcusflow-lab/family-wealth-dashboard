type YahooChartResponse = {
  chart?: { result?: Array<{ timestamp?: number[]; indicators?: { adjclose?: Array<{ adjclose?: Array<number | null> }>; quote?: Array<{ close?: Array<number | null> }> } }> };
};

type HistoryPoint = { timestamp: number; price: number };
type ProxyKey = "world" | "japan" | "bond" | "gold";
type ProxyHistory = Record<ProxyKey, Array<{ date: string; value: number }>>;
type BacktestWeights = Record<ProxyKey, number>;

async function yahooHistory(symbol: string, period1: number, interval = "1mo"): Promise<HistoryPoint[]> {
  const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  url.searchParams.set("period1", String(period1));
  url.searchParams.set("period2", String(Math.floor(Date.now() / 1000)));
  url.searchParams.set("interval", interval);
  url.searchParams.set("events", "history");
  url.searchParams.set("includeAdjustedClose", "true");
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`Market data request failed for ${symbol}: ${response.status}`);
  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const prices = result?.indicators?.adjclose?.[0]?.adjclose ?? result?.indicators?.quote?.[0]?.close ?? [];
  return timestamps.map((timestamp, index) => ({ timestamp, price: prices[index] ?? null })).filter((point): point is HistoryPoint => typeof point.price === "number" && Number.isFinite(point.price));
}

function monthKey(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function calculateMetrics(values: Array<{ date: string; value: number }>) {
  if (values.length < 2) throw new Error("Insufficient proxy history for calculation");
  const start = values[0]?.value ?? 1;
  const end = values.at(-1)?.value ?? 1;
  const years = Math.max((values.length - 1) / 12, 1 / 12);
  const cagr = Math.pow(end / start, 1 / years) - 1;
  let peak = start;
  let maxDrawdown = 0;
  values.forEach(item => { peak = Math.max(peak, item.value); maxDrawdown = Math.min(maxDrawdown, item.value / peak - 1); });
  return { cagr, maxDrawdown, start, end, months: values.length };
}

export function validateBacktestWeights(weights: BacktestWeights) {
  const total = Object.values(weights).reduce((sum, item) => sum + item, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error("Backtest weights must sum to 1");
  return weights;
}

function portfolioSeries(histories: ProxyHistory, weights: BacktestWeights, annualFeeRate: number) {
  validateBacktestWeights(weights);
  const maps = Object.fromEntries(Object.entries(histories).map(([key, series]) => [key, new Map(series.map(item => [item.date, item.value]))])) as Record<ProxyKey, Map<string, number>>;
  const keys = Array.from(maps.world.keys()).filter(key => (Object.keys(maps) as ProxyKey[]).every(asset => maps[asset].has(key))).sort();
  if (keys.length < 36) throw new Error("Insufficient common proxy history for backtest");
  let value = 1;
  return keys.map((date, index) => {
    if (index > 0) {
      const prior = keys[index - 1] as string;
      const gross = (Object.keys(weights) as ProxyKey[]).reduce((sum, asset) => sum + weights[asset] * ((maps[asset].get(date) as number) / (maps[asset].get(prior) as number)), 0);
      value *= gross * (1 - annualFeeRate / 12);
    }
    return { date, value };
  });
}

const strategyDefinitions: Array<{ id: "core" | "current" | "defensive"; name: string; description: string; weights: BacktestWeights }> = [
  { id: "core", name: "世界株コア", description: "世界株式70%・長期債20%・金10%。新規資金をコアへ集約する比較配分。", weights: { world: 0.7, japan: 0, bond: 0.2, gold: 0.1 } },
  { id: "current", name: "現保有に近い代理配分", description: "世界株44%・日本株26%・長期債18%・金12%。既存保有を資産クラスへ単純化した代理。", weights: { world: 0.44, japan: 0.26, bond: 0.18, gold: 0.12 } },
  { id: "defensive", name: "防御型", description: "世界株40%・長期債40%・金20%。長期債と金を増やした比較配分。", weights: { world: 0.4, japan: 0, bond: 0.4, gold: 0.2 } },
];

export function buildExpandedProxyBacktest(histories: ProxyHistory, annualFeeRate = 0.002) {
  const strategySeries = Object.fromEntries(strategyDefinitions.map(strategy => [strategy.id, portfolioSeries(histories, strategy.weights, annualFeeRate)])) as Record<"core" | "current" | "defensive", Array<{ date: string; value: number }>>;
  const world = histories.world;
  const chart = strategySeries.current.map((item, index) => ({
    date: item.date,
    portfolio: item.value,
    benchmark: world[index]?.value ?? 1,
    core: strategySeries.core[index]?.value ?? 1,
    defensive: strategySeries.defensive[index]?.value ?? 1,
  })).filter((_, index, all) => index % 6 === 0 || index === all.length - 1);
  return {
    start: strategySeries.current[0]?.date,
    asOf: strategySeries.current.at(-1)?.date,
    annualFeeRate,
    comparisons: strategyDefinitions.map(strategy => ({ ...strategy, metrics: calculateMetrics(strategySeries[strategy.id]) })),
    chart,
    portfolio: calculateMetrics(strategySeries.current),
    benchmark: calculateMetrics(world),
  };
}

export async function getProxyBacktest() {
  const period1 = 1262304000;
  const [world, japan, bond, gold] = await Promise.all([yahooHistory("VT", period1), yahooHistory("EWJ", period1), yahooHistory("TLT", period1), yahooHistory("GLD", period1)]);
  const histories: ProxyHistory = {
    world: world.map(point => ({ date: monthKey(point.timestamp), value: point.price })),
    japan: japan.map(point => ({ date: monthKey(point.timestamp), value: point.price })),
    bond: bond.map(point => ({ date: monthKey(point.timestamp), value: point.price })),
    gold: gold.map(point => ({ date: monthKey(point.timestamp), value: point.price })),
  };
  const result = buildExpandedProxyBacktest(histories);
  return {
    ...result,
    proxyWeights: [
      { proxy: "VT", label: "世界株式の代理", weight: 0.44 },
      { proxy: "EWJ", label: "日本株の代理", weight: 0.26 },
      { proxy: "TLT", label: "米国長期債の代理", weight: 0.18 },
      { proxy: "GLD", label: "金の代理", weight: 0.12 },
    ],
    methodology: {
      rebalancing: "月次。月末価格を観測し、翌月の運用へ反映する1か月の情報ラグを置く。",
      annualFeeRate: result.annualFeeRate,
      informationLag: "各月の価格を見て同月内に配分変更したものとしていない。固定ウェイトを翌月から月次で再構成。",
      sourceUrl: "https://query1.finance.yahoo.com/v8/finance/chart/",
    },
    limitations: [
      "比較対象は固定の3資産配分であり、商品選択・相場予測・タイミング売買の有効性を検証するものではありません。",
      "VT・EWJ・TLT・GLDは実保有の国内ETF・投信とは異なる米国上場代理資産です。為替ヘッジ、信託報酬差、税金、売買コスト、NISA/iDeCoは反映していません。",
      "年率0.20%の共通モデル費用を各配分に控除し、費用差ではなく資産配分の比較に限定しています。",
      "現在も取引される代理ETFだけを使うため生存者バイアスがあり、急落時には相関が上がり分散効果が弱まる可能性があります。",
      "月次の公開価格を用いた過去検証であり、将来の収益・損失・優劣を予測または保証しません。",
    ],
  };
}

export async function getMacroSnapshot() {
  const history = await yahooHistory("JPY=X", Math.floor(Date.now() / 1000) - 35 * 86400, "1d");
  const latest = history.at(-1);
  const prior = history[0];
  if (!latest || !prior) throw new Error("USD/JPY data unavailable");
  return { asOf: new Date(latest.timestamp * 1000).toISOString(), usdJpy: latest.price, change1m: latest.price / prior.price - 1, source: "Yahoo Finance chart endpoint (JPY=X)", sourceUrl: "https://query1.finance.yahoo.com/v8/finance/chart/JPY%3DX", inflationStatus: "手動確認が必要", inflationSource: "総務省統計局・日本銀行の最新公表値を入力して反映してください。" };
}
