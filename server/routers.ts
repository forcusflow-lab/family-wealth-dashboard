import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getFinancialProfile, saveFinancialProfile } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";
import { hydrateStoredProfile } from "./profileHydration";
import { getMacroSnapshot, getProxyBacktest } from "./marketData";
import { getRecommendedProductPerformance } from "./productPerformance";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const stored = await getFinancialProfile(ctx.user.id);
      if (stored) {
        try {
          const payload = JSON.parse(stored.payload) as typeof INITIAL_OWNER_PROFILE;
          const hydrated = hydrateStoredProfile(payload);
          if (hydrated.changed) return saveFinancialProfile(ctx.user.id, JSON.stringify(hydrated.profile));
        } catch {
          // Keep the original payload so the existing validation behavior remains unchanged.
        }
        return stored;
      }
      if (ctx.user.openId === ENV.ownerOpenId) {
        return saveFinancialProfile(ctx.user.id, JSON.stringify(INITIAL_OWNER_PROFILE));
      }
      return null;
    }),
    save: protectedProcedure.input(z.object({ payload: z.string().min(2).max(40_000) })).mutation(async ({ ctx, input }) => {
      try {
        JSON.parse(input.payload);
      } catch {
        throw new Error("Profile payload must be valid JSON");
      }
      return saveFinancialProfile(ctx.user.id, input.payload);
    }),
  }),
  market: router({
    macro: protectedProcedure.query(() => getMacroSnapshot()),
    backtest: protectedProcedure.query(() => getProxyBacktest()),
    productPerformance: protectedProcedure.query(() => getRecommendedProductPerformance()),
  }),
});

export type AppRouter = typeof appRouter;
