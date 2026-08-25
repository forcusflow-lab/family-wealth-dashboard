/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "../client/src/components/ErrorBoundary";

function BrokenView(): never {
  throw new Error("private stack details must not be rendered");
}

describe("ErrorBoundary", () => {
  it("shows a Japanese recovery screen without exposing internal error details", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(createElement(ErrorBoundary, null, createElement(BrokenView)));
    expect(screen.getByRole("heading", { name: "画面の表示で問題が起きました" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "ページを再読み込み" })).toBeTruthy();
    expect(screen.queryByText("private stack details must not be rendered")).toBeNull();
    consoleError.mockRestore();
  });
});
