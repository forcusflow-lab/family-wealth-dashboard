// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ProductPerformanceModal } from "../client/src/components/ProductPerformanceDialog";

class ResizeObserverMock { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

const data = { methodology: "分配金再投資基準価額で比較。", disclosure: "過去の実績は将来の運用成果を示唆・保証しません。このアプリは注文・売買を実行しません。", items: [
  { id: "2559", name: "MAXIS 全世界株式", account: "NISA" as const, feeRate: 0.000858, benchmark: "MSCI ACWI", assetClass: "全世界株式", currencyPolicy: "為替ヘッジなし", liquidity: "市場取引", sourceUrl: "https://example.com/2559-performance", feeSourceUrl: "https://example.com/2559-fee", asOf: "2026-08-17", returns: { oneYear: 0.12, threeYear: 0.4, fiveYear: null } },
  { id: "emaxis-ac", name: "eMAXIS Slim 全世界株式", account: "NISA" as const, feeRate: 0.0005775, benchmark: "MSCI ACWI", assetClass: "全世界株式", currencyPolicy: "為替ヘッジなし", liquidity: "投資信託取引", sourceUrl: "https://example.com/ac-performance", feeSourceUrl: "https://example.com/ac-fee", asOf: "2026-08-16", returns: { oneYear: 0.11, threeYear: 0.35, fiveYear: 0.7 } },
  { id: "emaxis-ex-japan", name: "eMAXIS Slim 全世界株式（除く日本）", account: "iDeCo" as const, feeRate: 0.0005775, benchmark: "MSCI ACWI ex Japan", assetClass: "全世界株式（除く日本）", currencyPolicy: "為替ヘッジなし", liquidity: "原則60歳まで引出不可", sourceUrl: "https://example.com/ex-performance", feeSourceUrl: "https://example.com/ex-fee", asOf: "2026-08-15", returns: { oneYear: 0.1, threeYear: 0.32, fiveYear: 0.62 } },
] };

describe("ProductPerformanceModal", () => {
  it("opens by click and renders performance, fee, source date, and safety disclosure", () => {
    const view = render(createElement(ProductPerformanceModal, { focusId: "2559", data }));
    const trigger = screen.getByRole("button", { name: /実績・費用を比較/ });
    fireEvent.click(trigger);
    expect(screen.getAllByText("推奨商品の実績・費用比較").length).toBeGreaterThan(0);
    expect(screen.getByText("2026-08-17").textContent).toBe("2026-08-17");
    expect(screen.getAllByText(/注文・売買を実行しません/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("年0.1%").length).toBe(3);
    expect(screen.getAllByText("eMAXIS Slim 全世界株式").length).toBeGreaterThan(0);
    expect(screen.getAllByText("eMAXIS Slim 全世界株式（除く日本）").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MSCI ACWI/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MSCI ACWI ex Japan/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/全世界株式（除く日本）/).length).toBeGreaterThan(0);
    expect(screen.getByText("原則60歳まで引出不可").textContent).toBe("原則60歳まで引出不可");
    expect(screen.getAllByRole("link", { name: /実績CSV/ }).length).toBe(3);
    expect(screen.getAllByRole("link", { name: /費用・商品情報/ }).length).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    view.rerender(createElement(ProductPerformanceModal, { focusId: "emaxis-ex-japan", data }));
    fireEvent.click(screen.getByRole("button", { name: /実績・費用を比較/ }));
    expect(screen.getAllByText(/eMAXIS Slim 全世界株式（除く日本）を起点/).length).toBeGreaterThan(0);
  });
});
