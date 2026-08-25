import type { WithholdingStatementRecord } from "./wealth";

const monetaryFields: Array<keyof Pick<WithholdingStatementRecord, "salaryPayment" | "salaryIncomeAfterEmploymentDeduction" | "totalIncomeDeductions" | "taxableIncomeEstimate" | "incomeTaxWithheld" | "socialInsuranceContributions" | "lifeInsuranceDeduction" | "earthquakeInsuranceDeduction" | "basicDeduction" | "spouseSpecialDeduction" | "mortgageCreditApplied">> = [
  "salaryPayment", "salaryIncomeAfterEmploymentDeduction", "totalIncomeDeductions", "taxableIncomeEstimate", "incomeTaxWithheld", "socialInsuranceContributions", "lifeInsuranceDeduction", "earthquakeInsuranceDeduction", "basicDeduction", "spouseSpecialDeduction", "mortgageCreditApplied",
];

export function validateWithholdingStatement(statement: WithholdingStatementRecord) {
  const errors: string[] = [];
  if (!Number.isInteger(statement.taxYear) || statement.taxYear < 2019 || statement.taxYear > 2100) errors.push("税年は2019年から2100年までの整数で入力してください。");
  if (statement.sourceLabel !== "給与所得の源泉徴収票") errors.push("書類区分は給与所得の源泉徴収票に限定します。");
  monetaryFields.forEach(field => {
    if (!Number.isFinite(statement[field]) || statement[field] < 0) errors.push(`${field}は0円以上の金額で入力してください。`);
  });
  if (statement.salaryPayment <= 0) errors.push("支払金額は0円より大きい値で入力してください。");
  if (statement.salaryIncomeAfterEmploymentDeduction > statement.salaryPayment) errors.push("給与所得控除後の金額は支払金額を超えられません。");
  if (statement.totalIncomeDeductions > statement.salaryIncomeAfterEmploymentDeduction) errors.push("所得控除合計は給与所得控除後の金額を超えられません。");
  if (Math.abs(statement.salaryIncomeAfterEmploymentDeduction - statement.totalIncomeDeductions - statement.taxableIncomeEstimate) > 1) errors.push("課税所得（参考）は給与所得控除後の金額から所得控除合計を差し引いた値と一致させてください。");
  if (!Number.isInteger(statement.dependentCount) || statement.dependentCount < 0 || statement.dependentCount > 20) errors.push("扶養親族数は0から20の整数で入力してください。");
  if (!Number.isFinite(statement.derivedIncomeTaxMarginalRate) || statement.derivedIncomeTaxMarginalRate < 0 || statement.derivedIncomeTaxMarginalRate > 0.45) errors.push("導出所得税率は0%から45%の範囲で入力してください。");
  return errors;
}

export function getLatestValidWithholdingStatement(statements?: WithholdingStatementRecord[]) {
  return [...(statements ?? [])]
    .filter(statement => validateWithholdingStatement(statement).length === 0)
    .sort((left, right) => right.taxYear - left.taxYear)[0] ?? null;
}
