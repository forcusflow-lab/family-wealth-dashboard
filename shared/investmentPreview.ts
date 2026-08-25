import { buildAssetProjection } from "./assetProjection";
import { buildMonthlyFundingStatus } from "./fundingStatus";
import { buildRecommendation } from "./recommendation";
import type { WealthProfile } from "./wealth";

export type InvestmentPreviewInput = {
  nisaMonthly: number;
  idecoMonthly: number;
};

const NISA_MONTHLY_SLIDER_MAX = 100_000;
const IDECO_MONTHLY_SLIDER_MAX = 23_000;

function roundToThousand(value: number) {
  return Math.max(0, Math.round(value / 1_000) * 1_000);
}

function monthsRemainingInTaxYear(asOf: Date) {
  return Math.max(1, 12 - asOf.getUTCMonth());
}

/**
 * Builds a non-persistent household-profile variation for the investment amount sliders.
 * It never places an order or changes the saved profile; the caller must explicitly save it.
 */
export function buildInvestmentPreview(profile: WealthProfile, input: InvestmentPreviewInput, asOf = new Date()) {
  const nisaRemaining = profile.nisaRecords?.tsumitateRemainingOverride
    ?? (profile.nisaRecords ? Math.max(0, profile.nisaRecords.tsumitateAllowance - profile.nisaRecords.tsumitateUsed) : NISA_MONTHLY_SLIDER_MAX * 12);
  const nisaMonthlyLimit = Math.min(NISA_MONTHLY_SLIDER_MAX, Math.floor(nisaRemaining / monthsRemainingInTaxYear(asOf) / 1_000) * 1_000);
  const nisaMonthly = Math.min(nisaMonthlyLimit, roundToThousand(input.nisaMonthly));
  const idecoMonthly = Math.min(IDECO_MONTHLY_SLIDER_MAX, roundToThousand(input.idecoMonthly));
  const previewProfile: WealthProfile = { ...profile, nisaMonthly, idecoMonthly };
  const funding = buildMonthlyFundingStatus(previewProfile);
  const requestedMonthlyInvestment = nisaMonthly + idecoMonthly;
  const monthlyCapacity = Math.max(0, funding.afterCashTransfers);
  const withinMonthlyCapacity = requestedMonthlyInvestment <= monthlyCapacity;
  const recommendation = buildRecommendation(previewProfile, asOf.toISOString());
  const projection = buildAssetProjection(previewProfile);
  const baseScenario = projection.scenarios.find(scenario => scenario.id === "base")!;

  return {
    previewProfile,
    input: { nisaMonthly, idecoMonthly },
    limits: {
      nisaMonthly: nisaMonthlyLimit,
      idecoMonthly: IDECO_MONTHLY_SLIDER_MAX,
      nisaRemaining,
      idecoLimitNote: "iDeCoの実際の拠出上限は勤務先の企業年金等で変わります。これは家計試算用の上限であり、SBI証券の加入者サイトで確認が必要です。",
    },
    funding,
    recommendation,
    projection,
    baseEndAssets: baseScenario.endAssets,
    requestedMonthlyInvestment,
    monthlyCapacity,
    withinMonthlyCapacity,
    canSave: withinMonthlyCapacity,
    status: withinMonthlyCapacity ? "余力の範囲内" as const : "月次余力を超過" as const,
    saveBoundary: "この画面で金額を変えても、保存を選ぶまで家計設定・証券会社・iDeCo加入者サイトの設定は変更されません。注文・買付・振替は実行しません。",
  };
}
