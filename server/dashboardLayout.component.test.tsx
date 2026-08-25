/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import DashboardLayout from "../client/src/components/DashboardLayout";

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: 1, name: "テスト利用者" }, logout: vi.fn() }),
  startLogin: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: { profile: { get: { useQuery: () => ({ data: { payload: "{}" } }) } } },
}));

describe("DashboardLayout mobile navigation", () => {
  it("provides a keyboard-reachable mobile menu containing every primary route", () => {
    render(createElement(DashboardLayout, null, createElement("p", null, "画面の内容")));
    const trigger = screen.getByRole("button", { name: "メニューを開く" });
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);
    expect(screen.getByRole("navigation", { name: "主な画面" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /今月の判断/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /口座・現金/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /保有・配分/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /提案の根拠/ })).toBeTruthy();
  });
});
