import type { ReactNode } from "react";

export function ProtectedAppRoute({ user, fallback, renderProtected }: { user: unknown | null; fallback: ReactNode; renderProtected: () => ReactNode }) {
  return user ? renderProtected() : fallback;
}
