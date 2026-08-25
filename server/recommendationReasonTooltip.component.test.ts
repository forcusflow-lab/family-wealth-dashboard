// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import RecommendationReasonTooltip from "../client/src/components/RecommendationReasonTooltip";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

const evidence = {
  title: "NISAコア候補を選ぶ理由",
  sections: [
    { label: "家計への役割", text: "長期の全世界株式コアとして比較する。" },
    { label: "比較した代替案・重複", text: "既存保有との重複を確認する。" },
  ],
  safety: "比較・判断材料の説明であり、このアプリは注文・売買を実行しません。将来の成果も保証しません。",
};

describe("RecommendationReasonTooltip", () => {
  it("opens and closes by click or tap, updates aria-expanded, and renders the safety disclosure", () => {
    render(createElement(RecommendationReasonTooltip, { evidence }));
    const trigger = screen.getByRole("button", { name: /詳細を表示/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByText("NISAコア候補を選ぶ理由").some(node => node.textContent === "NISAコア候補を選ぶ理由")).toBe(true);
    expect(screen.getAllByText(/注文・売買を実行しません/).some(node => node.textContent?.includes("注文・売買を実行しません"))).toBe(true);
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
});
