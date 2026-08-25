import { describe, expect, it } from "vitest";
import { buildIdecoComparison } from "../shared/idecoComparison";
import { buildNisaReview } from "../shared/nisaComparison";
import { buildIdecoTooltipEvidence, buildNisaTooltipEvidence, TOOLTIP_ORDER_SAFETY, toggleRecommendationTooltip } from "../shared/recommendationTooltips";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("recommendation explanation tooltips", () => {
  it("includes rationale, alternatives, cost, overlap, liquidity, and order safety for the NISA core", () => {
    const item = buildNisaReview(INITIAL_OWNER_PROFILE).reviews.find(candidate => candidate.id === "2559")!;
    const evidence = buildNisaTooltipEvidence(item);
    expect(evidence.sections.map(section => section.label)).toEqual(["家計への役割", "比較した代替案・重複", "費用・指数・為替", "流動性・注意点"]);
    expect(evidence.sections[2]?.text).toContain("年");
    expect(evidence.safety).toBe(TOOLTIP_ORDER_SAFETY);
  });

  it("includes iDeCo lock-up and alternatives for the current recurring-contribution candidate", () => {
    const item = buildIdecoComparison(INITIAL_OWNER_PROFILE).currentFunds.find(candidate => candidate.decision === "定額候補")!;
    const evidence = buildIdecoTooltipEvidence(item);
    expect(evidence.title).toContain(item.name);
    expect(evidence.sections.find(section => section.label === "引出制限・注意点")?.text).toContain("60歳");
    expect(evidence.safety).toContain("注文・売買を実行しません");
  });

  it("supports an explicit touch or click toggle rather than relying only on hover", () => {
    expect(toggleRecommendationTooltip(false)).toBe(true);
    expect(toggleRecommendationTooltip(true)).toBe(false);
  });
});
