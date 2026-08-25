import { getNisaAllowanceStatus } from "./nisaComparison";
import { calculateWealthPlan, EDUCATION_CASH_HORIZON_YEARS, type WealthProfile } from "./wealth";
import { buildMonthlyFundingStatus, type CashPurposeStatus } from "./fundingStatus";

export type TimelinePriority = {
  id: string;
  cadence: "今月" | "毎月" | "条件付き";
  tone: "action" | "hold" | "review";
  title: string;
  detail: string;
  amount?: number;
};

export type FutureCashNeed = {
  id: string;
  timing: string;
  horizonYears: number;
  category: "NISA" | "年払い" | "教育" | "住宅" | "老後";
  title: string;
  estimate?: number;
  detail: string;
};

export type MonthlyFundingPlan = {
  monthlyIncomeBasis: number;
  annualBonusTakeHome: number;
  monthlyFlexBuffer: number;
  monthlyBaseSpending: number;
  monthlyAnnualSinking: number;
  monthlyEmergencyRepair: number;
  monthlyEducationReserve: number;
  monthlyHomeMaintenance: number;
  recommendedIdeco: number;
  recommendedNisa: number;
  recommendedLongTermInvestment: number;
  unallocatedMonthlySurplus: number;
  fundingGap: number;
  educationCashAlreadyAssigned: number;
  educationCashTarget: number;
  educationLongTermTarget: number;
  educationDeadlineDetail: string;
  cashPurposes: CashPurposeStatus[];
  status: "reserve-first" | "conditional-invest" | "cash-constrained";
};

export type MonthlyAction = {
  id: string;
  state: "do" | "hold" | "review";
  due: string;
  title: string;
  amount?: number;
  detail: string;
};

export type MonthlyReviewGuide = {
  snapshotLabel: string;
  flexibleCashTotal: number;
  childEducationSavingsTotal: number;
  investmentMessage: string;
  marketRefreshMessage: string;
  steps: Array<{ id: "balances" | "checklist" | "market"; title: string; detail: string; required: boolean }>;
};

export function summarizeMonthlyFunding(plan: MonthlyFundingPlan) {
  return {
    cashReserveTotal: plan.monthlyAnnualSinking + plan.monthlyEmergencyRepair + plan.monthlyEducationReserve + plan.monthlyHomeMaintenance,
    ideco: plan.recommendedIdeco,
    nisa: plan.recommendedNisa,
    longTermInvestment: plan.recommendedLongTermInvestment,
    unallocatedMonthlySurplus: plan.unallocatedMonthlySurplus,
    status: plan.status,
  };
}

export type ProvisionalCostRange = {
  id: "private-high-school" | "private-university-home" | "home-maintenance";
  label: string;
  base: number;
  stress: number;
  unit: "年額" | "目標額";
  detail: string;
};

type PlanningSource = {
  id: string;
  title: string;
  asOf: string;
  url: string;
  detail: string;
};

export const FINANCIAL_DATA_CONNECTIONS = [
  { id: "sbi", name: "SBI証券", status: "確認値を反映済み", capability: "My資産・約定履歴のCSV出力", action: "NISA枠・評価額・買付履歴を月1回確認し、確認済み数値または公式CSVで更新する。証券口座のログイン情報・認証コードは入力しない。", sourceUrl: "https://www.sbisec.co.jp/ETGate/WPLETmgR001Control?OutSide=on&getFlg=on&burl=search_home&cat1=home&cat2=service&dir=service&file=home_kakutei_rei.html" },
  { id: "resona", name: "埼玉りそな銀行", status: "CSV取込候補", capability: "マイゲートの入出金明細CSV/PDF", action: "マイゲートで必要期間のCSVまたはPDFを出力し、口座残高・年払い支出を確認して更新する。ログイン情報・認証コードは入力しない。", sourceUrl: "https://www.saitamaresona.co.jp/direct/faq/faq_mygate_0117.html" },
  { id: "jaccs", name: "ジャックス インターコムクラブ", status: "公式CSV取込候補", capability: "カード・融資明細をPDF/CSVで出力（最大15か月）", action: "WEB明細サービスのPC画面からCSVまたはPDFを出力し、請求額・費目・ローン残高を確認して更新する。認証情報や自動スクレイピングは使わない。", sourceUrl: "https://www.jaccs.co.jp/icmclub/webmeisai/" },
  { id: "docomo", name: "ドコモSMTBネット銀行", status: "CSV取込候補", capability: "入出金明細CSV/PDF（最大999件）", action: "必要期間のCSVまたはPDFを出力し、口座残高・支出を確認して更新する。ログイン情報・認証コードはこのアプリへ入力しない。", sourceUrl: "https://help.netbk.co.jp/faq_detail.html?id=834" },
] as const;

const PLANNING_SOURCES: PlanningSource[] = [
  { id: "education", title: "文部科学省「令和5年度子供の学習費調査」", asOf: "令和5年度調査・令和8年1月訂正", url: "https://www.mext.go.jp/b_menu/toukei/chousa03/gakushuuhi/kekka/k_detail/mext_00002.html", detail: "私立高校の年間学習費1,030,283円を、統計上の仮置き基準として採用します。進路、授業料支援、物価、学校固有費用では大きく変わります。" },
  { id: "university", title: "日本学生支援機構「令和6年度学生生活調査」", asOf: "令和6年度調査・令和8年3月31日公表", url: "https://www.jasso.go.jp/statistics/gakusei_chosa/2024.html", detail: "東京圏（埼玉県を含む）・私立大学・自宅通学の年間学生生活費1,986,700円を仮置きに使用します。学費に生活費を含む標本推計であり、入学初年度費用、学部、奨学金は別途確認が必要です。" },
  { id: "maintenance", title: "住宅金融支援機構「入居後の住まいの保守管理」", asOf: "閲覧日 2026-08-18", url: "https://www.jhf.go.jp/hensai/hosyu/kanri.html", detail: "木造一戸建ての一般的な定期点検・補修記録の目安です。公式の一律修繕単価はないため、10年で200万円は仮置きの現金目標であり、点検・保証期限・実見積りを優先します。" },
  { id: "mortgage", title: "りそなグループ「住宅ローン返済中の金利と返済額の確認方法」", asOf: "閲覧日 2026-08-18", url: "https://www.resonabank.co.jp/kojin/column/jutaku/user_specialty/kakunin.html", detail: "変動金利の見直し時期、適用時期、5年・125%ルールの説明。個別契約の適用条件は返済予定表・マイゲートで確認します。" },
];

function monthLabel(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function yearLabel(year: number) {
  return `${year}年頃`;
}

function estimateMonthlyPayment(balance: number, annualRate: number, remainingYears: number) {
  const monthlyRate = annualRate / 12;
  const months = Math.max(1, remainingYears * 12);
  if (monthlyRate === 0) return balance / months;
  return balance * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
}

function calculateMonthlyFunding(profile: WealthProfile, plan: ReturnType<typeof calculateWealthPlan>): MonthlyFundingPlan {
  const funding = buildMonthlyFundingStatus(profile);
  const purpose = (id: CashPurposeStatus["id"]) => funding.cashPurposes.find(item => item.id === id);
  const education = purpose("education");
  const annual = purpose("annual");
  const emergency = purpose("emergency");
  const home = purpose("home");
  const longTermEducation = funding.longTermPlans.find(item => item.id === "education");
  return {
    monthlyIncomeBasis: funding.monthlyRegularTakeHome,
    annualBonusTakeHome: funding.annualBonusTakeHome,
    monthlyFlexBuffer: funding.monthlyFlexBuffer,
    monthlyBaseSpending: funding.monthlyBaseSpending,
    monthlyAnnualSinking: annual?.monthlyTransfer ?? 0,
    monthlyEmergencyRepair: emergency?.monthlyTransfer ?? 0,
    monthlyEducationReserve: education?.monthlyTransfer ?? 0,
    monthlyHomeMaintenance: home?.monthlyTransfer ?? 0,
    recommendedIdeco: funding.recommendedIdeco,
    recommendedNisa: funding.recommendedNisa,
    recommendedLongTermInvestment: 0,
    unallocatedMonthlySurplus: funding.unallocatedMonthlySurplus,
    fundingGap: funding.fundingGap,
    educationCashAlreadyAssigned: education?.currentAllocated ?? 0,
    educationCashTarget: education?.cashTarget ?? 0,
    educationLongTermTarget: longTermEducation?.totalEstimate ?? 0,
    educationDeadlineDetail: education ? `${education.due}までの現金目標 ${Math.round(education.cashTarget / 10_000)}万円` : longTermEducation ? `${longTermEducation.timing}。${longTermEducation.nextReview}` : "教育資金の長期計画は保存済みの前提を確認してください。",
    cashPurposes: funding.cashPurposes,
    status: funding.fundingGap > 0 ? "cash-constrained" : funding.investmentAllowed ? "conditional-invest" : "reserve-first",
  };
}

function nextVariableRateReview(asOf: Date) {
  const year = asOf.getFullYear();
  const month = asOf.getMonth() + 1;
  if (month <= 4) return { review: `${year}年4月`, effective: `${year}年7月` };
  if (month <= 10) return { review: `${year}年10月`, effective: `${year + 1}年1月` };
  return { review: `${year + 1}年4月`, effective: `${year + 1}年7月` };
}

export function buildGoalTimeline(profile: WealthProfile, asOf = new Date().toISOString()) {
  const asOfDate = new Date(asOf);
  const plan = calculateWealthPlan(profile);
  const nisa = getNisaAllowanceStatus(profile);
  const annualSinkingTotal = profile.annualPropertyTax + profile.annualTravel + profile.annualHomeInsuranceReserve;
  const maintenanceHorizonYears = Math.max(1, profile.homeMaintenanceHorizonYears ?? 10);
  const emergencyShortfall = Math.max(0, plan.emergencyTarget - plan.cashPosition.flexibleCashTotal);
  const taxYear = nisa.taxYear ?? asOfDate.getFullYear();
  const rateReference = profile.loanRateReference ?? profile.loanRate;
  const rateRise = profile.loanRate - rateReference;
  const theoreticalPayment = estimateMonthlyPayment(profile.loanBalance, profile.loanRate, profile.loanRemainingYears);
  const paymentIncreaseEstimate = Math.max(0, theoreticalPayment - profile.loanMonthlyPayment);
  const fiveYearCap = profile.loanMonthlyPayment * 1.25;
  const rateReview = nextVariableRateReview(asOfDate);
  const monthlyFundingBase = calculateMonthlyFunding(profile, plan);
  const recommendedNisa = (nisa.tsumitateRemaining ?? 0) > 0 ? monthlyFundingBase.recommendedNisa : 0;
  const monthlyFunding = { ...monthlyFundingBase, recommendedNisa, unallocatedMonthlySurplus: monthlyFundingBase.unallocatedMonthlySurplus + (monthlyFundingBase.recommendedNisa - recommendedNisa) };
  const monthlySinking = monthlyFunding.monthlyAnnualSinking;
  const monthlyHomeMaintenance = monthlyFunding.monthlyHomeMaintenance;
  const priorities: TimelinePriority[] = [];

  if (nisa.growthRemaining === 0) {
    priorities.push({ id: "nisa-growth-hold", cadence: "今月", tone: "hold", title: `NISA成長投資枠は${taxYear}年分が残枠0円`, detail: "新規買付は保留。すでに保有する商品を売却・入替する指示ではありません。つみたて投資枠を使う前に生活防衛・教育・年払い資金を確認します。" });
  }
  if ((nisa.tsumitateRemaining ?? 0) > 0) {
    priorities.push({ id: "nisa-tsumitate-review", cadence: "条件付き", tone: "review", title: `つみたて投資枠は残り${Math.round((nisa.tsumitateRemaining ?? 0) / 10_000)}万円`, detail: "成長投資枠の残りとは分けて管理します。現在の現金バケツと年払い予定を満たす場合だけ、定額積立の候補を比較します。", amount: nisa.tsumitateRemaining });
  }
  priorities.push({ id: "annual-sinking", cadence: monthlySinking > 0 ? "毎月" : "条件付き", tone: monthlySinking > 0 ? "action" : "review", title: monthlySinking > 0 ? "年払い・旅行用の現金を今月追加する" : "年払い・旅行用の現金は追加不要", detail: monthlySinking > 0 ? "固定資産税・旅行・火災／地震保険に使う目的別現金の不足分です。納付月・実額は通知書と予約内容で更新します。" : "保存済み残高の仮想配分では年払い・旅行の現金目標を満たしています。支払月・実額だけ確認します。", amount: monthlySinking });
  priorities.push({ id: "home-maintenance", cadence: monthlyHomeMaintenance > 0 ? "毎月" : "条件付き", tone: monthlyHomeMaintenance > 0 ? "action" : "review", title: monthlyHomeMaintenance > 0 ? `住宅維持資金を${maintenanceHorizonYears}年で現金積立` : "住宅維持資金は追加不要", detail: monthlyHomeMaintenance > 0 ? "現在の住宅維持目標に対する不足分だけを、残存期間で月割りした現金移動額です。点検・見積りで更新します。" : "保存済み残高の仮想配分では住宅維持の現金目標を満たしています。点検・見積りが出たときに再計算します。", amount: monthlyHomeMaintenance });
  priorities.push({ id: "education-reserve", cadence: monthlyFunding.monthlyEducationReserve > 0 ? "毎月" : "条件付き", tone: monthlyFunding.monthlyEducationReserve > 0 ? "action" : "review", title: monthlyFunding.monthlyEducationReserve > 0 ? "5年以内の教育資金を現金積立" : "教育資金は開始5年前から現金化", detail: `${monthlyFunding.educationDeadlineDetail}。現金目標は${Math.round(monthlyFunding.educationCashTarget / 10_000)}万円、より先の長期教育計画は${Math.round(monthlyFunding.educationLongTermTarget / 10_000)}万円です。長期分を運用する場合も、開始${EDUCATION_CASH_HORIZON_YEARS}年前から段階的に現金へ移します。`, amount: monthlyFunding.monthlyEducationReserve });
  priorities.push({ id: "education-review", cadence: "今月", tone: "review", title: "教育費の年次前提を確認", detail: `第1子は高校まで約${Math.max(0, 15 - profile.childOneAge)}年、大学まで約${Math.max(0, 18 - profile.childOneAge)}年です。私立・自宅通学の保存前提、進路、支援制度を年1回見直します。` });
  priorities.push({ id: "mortgage-rate-review", cadence: rateRise > 0 ? "今月" : "条件付き", tone: rateRise > 0 ? "action" : "review", title: rateRise > 0 ? `適用金利が基準比${(rateRise * 100).toFixed(2)}%上昇` : `次回の変動金利見直しは${rateReview.review}`, detail: rateRise > 0 ? `単純再計算では月返済の目安が約${Math.round(paymentIncreaseEstimate).toLocaleString("ja-JP")}円増えます。契約の5年・125%ルールにより当月返済額が直ちに同額増えるとは限らないため、返済予定表で確認して更新してください。` : `${rateReview.review}に金利が見直され、${rateReview.effective}返済分から適用される目安です。金利通知後、画面の手動更新で返済額と必要資金を再計算します。` });
  priorities.push({ id: "ideco-check", cadence: monthlyFunding.recommendedIdeco > 0 ? "今月" : "条件付き", tone: monthlyFunding.recommendedIdeco > 0 ? "action" : "hold", title: monthlyFunding.recommendedIdeco > 0 ? "iDeCoを設定額どおり拠出する" : "iDeCoは今月は追加しない", detail: monthlyFunding.recommendedIdeco > 0 ? "近期限の現金目標と毎月の余裕資金を差し引いた後も、設定済み掛金を維持できる場合だけの候補です。" : "近期限の現金目標または月次の余裕資金を優先するため、設定を始める・増やす前に再確認します。", amount: monthlyFunding.recommendedIdeco });
  priorities.push({ id: "nisa-tsumitate", cadence: monthlyFunding.recommendedNisa > 0 ? "今月" : "条件付き", tone: monthlyFunding.recommendedNisa > 0 ? "action" : "hold", title: monthlyFunding.recommendedNisa > 0 ? "NISAつみたて投資枠を設定額どおり積み立てる" : "NISAつみたて投資枠は今月は追加しない", detail: monthlyFunding.recommendedNisa > 0 ? "現金目標とiDeCoを満たした後の、設定済み定額積立だけを候補にします。成長投資枠の残枠とは別に確認します。" : "現金目標または余裕資金を優先するため、NISAの追加積立は保留します。", amount: monthlyFunding.recommendedNisa });
  priorities.push({ id: "cash-safety", cadence: emergencyShortfall > 0 ? "今月" : "条件付き", tone: emergencyShortfall > 0 ? "action" : "review", title: emergencyShortfall > 0 ? "生活防衛資金の不足を優先" : "生活防衛資金を維持", detail: emergencyShortfall > 0 ? "投資・繰上返済より、現金バケツへの補充を優先します。" : "大きな支出、金利変更、収入変化があれば再計算します。", amount: emergencyShortfall || plan.emergencyTarget });

  const currentYear = asOfDate.getFullYear();
  const futureNeeds = ([
    { id: "next-nisa", timing: `${currentYear + 1}年1月`, horizonYears: 1, category: "NISA", title: "翌年のNISA年間枠・積立設定を再確認", detail: "制度・証券会社画面・家計の余剰を再確認してから、翌年の枠を使うか判断します。" },
    { id: "annual-expenses", timing: `${monthLabel(asOfDate)}から毎月`, horizonYears: 0, category: "年払い", title: "固定資産税・旅行・保険の年払い資金", estimate: annualSinkingTotal, detail: "支払月は通知書・予約・契約で確定してください。投資資産の売却を前提にせず現金で準備します。" },
    { id: "home-maintenance", timing: `${currentYear + maintenanceHorizonYears}年頃`, horizonYears: maintenanceHorizonYears, category: "住宅", title: "住宅メンテナンス資金の到達目標", estimate: profile.homeMaintenanceTarget, detail: `現在は${maintenanceHorizonYears}年の積立前提です。点検・補修記録、保証期限、実際の見積りで前倒し・後ろ倒しを更新します。` },
    { id: "education-one-high", timing: yearLabel(currentYear + Math.max(0, 15 - profile.childOneAge)), horizonYears: Math.max(0, 15 - profile.childOneAge), category: "教育", title: "第1子の高校費用を見直す時期", estimate: profile.privateHighSchoolAnnual * 3, detail: "私立高校・自宅通学の入力前提。進路、授業料支援、物価を年1回更新します。" },
    { id: "education-one-university", timing: yearLabel(currentYear + Math.max(0, 18 - profile.childOneAge)), horizonYears: Math.max(0, 18 - profile.childOneAge), category: "教育", title: "第1子の大学費用を見直す時期", estimate: profile.privateUniversityAtHomeAnnual * 4, detail: "自宅通学・私立の入力前提。入学時費用、奨学金、進路で再計算します。" },
    { id: "education-two-high", timing: yearLabel(currentYear + Math.max(0, 15 - profile.childTwoAge)), horizonYears: Math.max(0, 15 - profile.childTwoAge), category: "教育", title: "第2子の高校費用を見直す時期", estimate: profile.privateHighSchoolAnnual * 3, detail: "第1子の進学期と資金が重なる可能性を毎年確認します。" },
    { id: "mortgage-credit", timing: yearLabel(currentYear + profile.loanCreditYears), horizonYears: profile.loanCreditYears, category: "住宅", title: "住宅ローン控除終了前の繰上返済再比較", detail: "控除後実質年利、変動金利、現金余力、教育資金を同時に見てから比較します。" },
    { id: "retirement", timing: yearLabel(currentYear + Math.max(0, profile.retirementAge - profile.currentAge)), horizonYears: Math.max(0, profile.retirementAge - profile.currentAge), category: "老後", title: "退職開始時点の資産・年金・住宅費を再試算", detail: "年金見込額、退職金、住宅ローン残高、教育費終了時期を更新してから取り崩し計画を作ります。" },
  ] satisfies FutureCashNeed[]).sort((left, right) => left.horizonYears - right.horizonYears);
  const provisionalCostRanges: ProvisionalCostRange[] = [
    { id: "private-high-school", label: "私立高校（年間）", base: profile.privateHighSchoolAnnual, stress: Math.ceil(profile.privateHighSchoolAnnual * 1.2 / 100) * 100, unit: "年額", detail: "基準は文部科学省の令和5年度調査。ストレス額は学校固有費用・物価上昇を見込むアプリ内の20%上振れで、統計値ではありません。" },
    { id: "private-university-home", label: "私立大学・自宅通学（年間）", base: profile.privateUniversityAtHomeAnnual, stress: Math.ceil(profile.privateUniversityAtHomeAnnual * 1.2 / 100) * 100, unit: "年額", detail: "基準はJASSO令和6年度の東京圏・私立・自宅通学の学生生活費。ストレス額は学部差・物価・初年度費用の余裕として20%を置くアプリ内仮定です。" },
    { id: "home-maintenance", label: `住宅維持（${maintenanceHorizonYears}年）`, base: profile.homeMaintenanceTarget, stress: profile.homeMaintenanceTarget * 2, unit: "目標額", detail: "住宅金融支援機構は点検時期の目安を示しますが一律修繕単価は公表していません。ストレス額は見積り取得前の2倍シナリオであり、市場平均ではありません。" },
  ];
  const monthlyActions: MonthlyAction[] = [
    {
      id: "cash-reserves",
      state: monthlyFunding.monthlyAnnualSinking + monthlyFunding.monthlyEducationReserve + monthlyFunding.monthlyHomeMaintenance + monthlyFunding.monthlyEmergencyRepair > 0 ? "do" : "review",
      due: "今月の給料日まで",
      title: monthlyFunding.monthlyAnnualSinking + monthlyFunding.monthlyEducationReserve + monthlyFunding.monthlyHomeMaintenance + monthlyFunding.monthlyEmergencyRepair > 0 ? "目的別口座へ今月の現金積立を移す" : "目的別現金の残高を確認する",
      amount: monthlyFunding.monthlyAnnualSinking + monthlyFunding.monthlyEducationReserve + monthlyFunding.monthlyHomeMaintenance + monthlyFunding.monthlyEmergencyRepair,
      detail: `今月の追加額は、生活防衛${Math.round(monthlyFunding.monthlyEmergencyRepair / 10_000)}万円、年払い${Math.round(monthlyFunding.monthlyAnnualSinking / 10_000)}万円、近期限教育${Math.round(monthlyFunding.monthlyEducationReserve / 10_000)}万円、住宅維持${Math.round(monthlyFunding.monthlyHomeMaintenance / 10_000)}万円です。より先の教育費・老後は長期計画として別管理です。`,
    },
    {
      id: "ideco-contribution",
      state: monthlyFunding.recommendedIdeco > 0 ? "do" : "hold",
      due: "今月末まで",
      title: monthlyFunding.recommendedIdeco > 0 ? "iDeCoを設定額どおり拠出する" : "iDeCoの追加拠出は今月見送る",
      amount: monthlyFunding.recommendedIdeco,
      detail: monthlyFunding.recommendedIdeco > 0 ? "現金積立と余裕資金を差し引いた後も掛金を維持できる場合だけ実行候補です。" : "期限付き資金と月次の余裕資金を優先するため、掛金を始める・増やす前に再確認します。",
    },
    {
      id: "nisa-contribution",
      state: monthlyFunding.recommendedNisa > 0 ? "do" : "hold",
      due: "今月の積立日まで",
      title: monthlyFunding.recommendedNisa > 0 ? "NISAつみたて投資枠を設定額どおり積み立てる" : "NISAつみたて投資枠は今月は追加しない",
      amount: monthlyFunding.recommendedNisa,
      detail: monthlyFunding.recommendedNisa > 0 ? "目的別現金とiDeCoを差し引いた後でも維持できる、保存済みの定額積立額です。注文は実行しません。" : "近期限の現金目標または月次余裕資金を優先するため、NISAの追加積立は保留します。",
    },
    {
      id: "mortgage-check",
      state: rateRise > 0 ? "do" : "review",
      due: rateRise > 0 ? "今週中" : rateReview.review,
      title: rateRise > 0 ? "住宅ローンの返済予定表を確認する" : `住宅ローン金利を${rateReview.review}に確認する`,
      detail: rateRise > 0 ? "金利上昇を入力済みです。実際の返済額・適用月を返済予定表で確認し、金利欄を更新します。" : "通知が届いたときだけ適用金利を更新し、返済額と現金積立を再計算します。",
    },
    {
      id: "market-refresh",
      state: "review",
      due: "必要な月だけ",
      title: "市場データは必要な月だけ更新する",
      detail: "自動更新に頼らず、積立判断を見直す月・金利通知時・大きな家計変化時だけ手動更新します。",
    },
  ];

  return {
    asOf,
    nisa,
    monthlySinking,
    monthlyHomeMaintenance,
    monthlyFunding,
    provisionalCostRanges,
    monthlyActions,
    priorities,
    futureNeeds,
    mortgageRateUpdate: { referenceRate: rateReference, currentRate: profile.loanRate, rateRise, theoreticalPayment, paymentIncreaseEstimate, currentContractPayment: profile.loanMonthlyPayment, fiveYearCap, lastUpdatedAt: profile.mortgageRateUpdatedAt, nextReview: rateReview },
    planningSources: PLANNING_SOURCES,
    connections: FINANCIAL_DATA_CONNECTIONS,
    methodology: [
      "年払い・旅行の今月追加額は、固定資産税・旅行・火災／地震保険の年度目標に対する現在不足額を月割りしたものです。実際の納付月・金額は通知書等で更新します。",
      "教育時期は保存済みの子どもの年齢と、高校15歳・大学18歳の単純な年齢到達から逆算した概算です。月日・進路・制度は反映していません。",
      "住宅維持・住宅ローンは、公式の一般的な案内と保存済み前提による資金計画です。実際の点検結果、見積り、返済予定表を優先します。",
      "金融データは、利用者が各社の公式画面から出力または確認したCSV・PDF・集計値だけで更新します。このアプリはログイン情報を保存せず、注文・振込・返済を実行しません。",
    ],
  };
}

export function buildMonthlyReviewGuide(profile: WealthProfile, asOf = new Date().toISOString()): MonthlyReviewGuide {
  const timeline = buildGoalTimeline(profile, asOf);
  const { cashPosition } = calculateWealthPlan(profile);
  const snapshotLabel = profile.cashSnapshotAsOf ? `${profile.cashSnapshotAsOf}時点の保存残高` : "残高の基準日は未入力";
  const investmentMessage = timeline.monthlyFunding.status === "cash-constrained"
    ? "現金の今月追加額が月次余力を上回るため、今月のiDeCo・NISAつみたては見送ります。"
    : timeline.monthlyFunding.recommendedIdeco > 0 || timeline.monthlyFunding.recommendedNisa > 0
      ? `現金目標を確認した後、iDeCoは月${Math.round(timeline.monthlyFunding.recommendedIdeco / 10_000)}万円、NISAつみたては月${Math.round(timeline.monthlyFunding.recommendedNisa / 10_000)}万円を設定額どおり続ける候補です。追加の一括投資は行いません。`
      : "現金目標を優先し、iDeCo・NISAつみたては今月は追加しません。";
  const marketAgeDays = profile.lastMarketSnapshot?.asOf ? Math.floor((new Date(asOf).getTime() - new Date(profile.lastMarketSnapshot.asOf).getTime()) / 86_400_000) : null;
  const marketRefreshMessage = marketAgeDays === null
    ? "市場データは残高入力のたびに更新しません。NISA・iDeCo設定を見直す月、金利通知時、または四半期の見直し時だけ手動更新します。"
    : marketAgeDays > 40
      ? `市場データは${marketAgeDays}日前です。NISA・iDeCo設定を見直す月だけ手動更新してください。`
      : `市場データは${marketAgeDays}日前です。残高入力だけなら更新不要で、次の四半期見直し・金利通知・設定見直し時に更新します。`;
  return {
    snapshotLabel,
    flexibleCashTotal: cashPosition.flexibleCashTotal,
    childEducationSavingsTotal: cashPosition.childEducationSavingsTotal,
    investmentMessage,
    marketRefreshMessage,
    steps: [
      { id: "balances", title: "残高だけ入力して保存", detail: "家計共通・配偶者・本人・子ども用の現在残高を入力します。取引明細やパスワードは不要です。", required: true },
      { id: "checklist", title: "今月やることだけ確認", detail: "「今月やる」「今月はしない」「確認する」の表示に従い、現金移動・iDeCo・NISAつみたての扱いを決めます。", required: true },
      { id: "market", title: "市場データは条件がある月だけ更新", detail: marketRefreshMessage, required: false },
    ],
  };
}
