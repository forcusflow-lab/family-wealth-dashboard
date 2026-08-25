import { describe, expect, it } from "vitest";
import { getLatestValidWithholdingStatement, validateWithholdingStatement } from "../shared/withholdingStatement";
import { INITIAL_OWNER_PROFILE } from "./initialProfile";

describe("withholding statement validation", () => {
  const verified = INITIAL_OWNER_PROFILE.withholdingStatements![0]!;

  it("accepts the non-identifying 2025 transcription and preserves tax-year selection", () => {
    expect(validateWithholdingStatement(verified)).toEqual([]);
    expect(getLatestValidWithholdingStatement([verified])).toMatchObject({ taxYear: verified.taxYear, salaryPayment: verified.salaryPayment });
  });

  it("rejects inconsistent taxable income and ignores an invalid newer record", () => {
    const invalidNewer = { ...verified, taxYear: 2026, taxableIncomeEstimate: 1 };
    expect(validateWithholdingStatement(invalidNewer)).toContain("課税所得（参考）は給与所得控除後の金額から所得控除合計を差し引いた値と一致させてください。");
    expect(getLatestValidWithholdingStatement([verified, invalidNewer])).toMatchObject({ taxYear: 2025 });
  });
});
