import { buildMonthlyFundingStatus } from "./fundingStatus";
import type { WealthProfile } from "./wealth";

/** Separates a deliberately retained living-cash buffer from a genuine monthly deficit. */
export function buildMonthlyCashFlowPresentation(profile: WealthProfile) {
  const funding = buildMonthlyFundingStatus(profile);
  const beforeInvestmentRemainder = funding.afterCashTransfers;
  return {
    livingReserve: funding.monthlyFlexBuffer,
    livingReserveLabel: "生活口座に残す安全余力",
    beforeInvestmentRemainder,
    isCashFlowDeficit: beforeInvestmentRemainder < 0,
    deficitAmount: Math.max(0, -beforeInvestmentRemainder),
    statusLabel: beforeInvestmentRemainder < 0 ? "月次の資金不足" : "投資前の月内残余",
  };
}
