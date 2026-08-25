import { describe, expect, it, vi } from "vitest";
import { ProtectedAppRoute } from "../client/src/components/ProtectedAppRoute";

describe("ProtectedAppRoute", () => {
  it("keeps protected page content unmounted until a user is available", () => {
    const fallback = "ログイン導線";
    const protectedContent = "保護されたプロフィール取得ページ";
    const renderProtected = vi.fn(() => protectedContent);
    expect(ProtectedAppRoute({ user: null, fallback, renderProtected })).toBe(fallback);
    expect(renderProtected).not.toHaveBeenCalled();
  });

  it("mounts protected content only after authentication", () => {
    const fallback = "ログイン導線";
    const protectedContent = "保護されたプロフィール取得ページ";
    const renderProtected = vi.fn(() => protectedContent);
    expect(ProtectedAppRoute({ user: { id: 1 }, fallback, renderProtected })).toBe(protectedContent);
    expect(renderProtected).toHaveBeenCalledTimes(1);
  });
});
