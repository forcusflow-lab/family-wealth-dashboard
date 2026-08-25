import { INITIAL_OWNER_PROFILE } from "../server/initialProfile";
import { buildRecommendation } from "../shared/recommendation";

const result = buildRecommendation(INITIAL_OWNER_PROFILE, "2026-08-19T00:00:00.000Z");
console.log(JSON.stringify({
  asOf: result.asOf,
  paths: result.paths,
  years: result.years,
  recommended: result.recommended,
  candidates: result.candidates,
}, null, 2));
