import { buildGoalTimeline, type MonthlyAction } from "./goalTimeline";
import { buildCashTransferInstructions } from "./cashTransferInstructions";
import type { MonthlyTaskCompletion, WealthProfile } from "./wealth";

export type CommandTask = MonthlyAction & {
  key: string;
  signature: string;
  category: "資金" | "投資" | "住宅" | "税制・支援";
  sourceUrl?: string;
  sourceLabel?: string;
  completed: boolean;
  decision?: "accepted" | "held";
  guidance: {
    recommendation: string;
    rationale: string;
    changesWhen: string;
    check: string;
    money: string;
    completion: string;
  };
};

export type MonthlyInvestmentGate = {
  idecoAllowed: boolean;
  nisaAllowed: boolean;
  longTermAllowed: boolean;
  investmentAllowed: boolean;
  cashReserveFirst: boolean;
  recommendedIdeco: number;
  recommendedNisa: number;
  recommendedLongTermInvestment: number;
};

function monthPeriod(asOf: string | Date) {
  const date = new Date(asOf);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function taskSignature(action: Pick<MonthlyAction, "id" | "state" | "due" | "title" | "amount" | "detail">, guidance: CommandTask["guidance"]) {
  return JSON.stringify([action.id, action.state, action.due, action.title, action.amount ?? null, action.detail, guidance.recommendation, guidance.rationale, guidance.changesWhen, guidance.check, guidance.money, guidance.completion]);
}

function categoryFor(action: MonthlyAction): CommandTask["category"] {
  if (action.id === "cash-reserves") return "資金";
  if (action.id === "mortgage-check") return "住宅";
  if (action.id === "ideco-contribution" || action.id === "nisa-contribution" || action.id === "market-refresh") return "投資";
  return "資金";
}

function sourceFor(action: MonthlyAction) {
  if (action.id === "child-allowance") return { sourceUrl: "https://www.cfa.go.jp/policies/kokoseido/jidouteate/annai", sourceLabel: "こども家庭庁・児童手当制度（確認日 2026-08-18）" };
  if (action.id === "education-support-review") return { sourceUrl: "https://www.mext.go.jp/a_menu/shotou/mushouka/1342674.htm", sourceLabel: "文部科学省・高等学校等就学支援金（確認日 2026-08-18）" };
  if (action.id === "resident-tax-review" || action.id === "year-end-tax-review") return { sourceUrl: "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1135.htm", sourceLabel: "国税庁・小規模企業共済等掛金控除（確認日 2026-08-18）" };
  return {};
}

function supportTasks(asOf: string | Date): MonthlyAction[] {
  const month = new Date(asOf).getMonth() + 1;
  const tasks: MonthlyAction[] = [];
  if (month % 2 === 0) {
    tasks.push({ id: "child-allowance", state: "review", due: "入金日まで", title: "児童手当を教育目的口座へ記録", detail: "口座明細で実際の入金額・入金日を確認し、同額を教育目的口座として記録します。生活防衛資金が目標未満などの例外時だけ保留にします。" });
  }
  if (month === 6) {
    tasks.push({ id: "resident-tax-review", state: "review", due: "住民税決定通知の受領後", title: "住民税・住宅ローン控除・ふるさと納税の前提を確認", detail: "住民税決定通知と源泉徴収票を確認して年次税額を更新します。控除の適用額・寄付上限は通知と個別条件で変わるため、アプリ内の推定値だけで手続きしません。" });
  }
  if (month === 11) {
    tasks.push({ id: "year-end-tax-review", state: "review", due: "年末調整の締切前", title: "iDeCo掛金・住宅ローン控除・保険料控除の書類を確認", detail: "年末調整・確定申告の要否は勤務先案内と書類の記載を優先します。iDeCo控除、住宅ローン控除、保険料控除の証明書を保管してください。" });
  }
  if (month === 4) {
    tasks.push({ id: "education-support-review", state: "review", due: "年度内", title: "教育支援制度の確認時期を記録", detail: "高校進学前は高等学校等就学支援金、大学進学前はJASSO給付奨学金の家計基準を確認します。受給可否・金額は進路、所得、自治体・学校手続きに依存するため、教育資金の目標から自動控除しません。" });
  }
  return tasks;
}

const formatTaskYen = (amount: number) => `${Math.max(0, Math.round(amount)).toLocaleString("ja-JP")}円`;

function guidanceFor(profile: WealthProfile, action: MonthlyAction): CommandTask["guidance"] {
  const amount = Math.max(0, action.amount ?? 0);
  if (action.id === "child-allowance") return {
    recommendation: (() => {
      const educationAccount = (profile.cashAccounts ?? []).find(account => account.purpose === "education" && account.institution.trim() && account.institution !== "未分類" && account.nickname.trim());
      return educationAccount ? `児童手当の実入金額を全額、${educationAccount.institution}｜${educationAccount.nickname}（教育資金）へ移す。` : "今月の教育口座への振替は0円。先に教育資金の入金先口座を台帳へ登録する。";
    })(),
    rationale: "教育資金を日常支出と混ぜず、将来必要額へ充てるためです。",
    changesWhen: "生活防衛資金が目標を下回る、または12か月以内の大きな支出が確定した場合は、教育目的への振分けを保留します。",
    check: "児童手当の受取口座の明細で、実際の入金額と入金日を確認する。教育資金の入金先口座が台帳にあるかも確認する。",
    money: (() => {
      const educationAccount = (profile.cashAccounts ?? []).find(account => account.purpose === "education" && account.institution.trim() && account.institution !== "未分類" && account.nickname.trim());
      return educationAccount ? "今月動かす金額: 実際の児童手当入金額と同額。入金前は0円。" : "今月の実際の振替額: 0円。教育資金の入金先口座を登録後、実入金額と同額を振り替える。";
    })(),
    completion: (() => {
      const educationAccount = (profile.cashAccounts ?? []).find(account => account.purpose === "education" && account.institution.trim() && account.institution !== "未分類" && account.nickname.trim());
      return educationAccount ? `入金額・入金日を確認し、${educationAccount.institution}｜${educationAccount.nickname}の残高を更新して保存したら『提案を採用』を選ぶ。` : "口座台帳に教育資金の入金先口座を登録して保存したら完了。まだ振替はしない。";
    })(),
  };
  if (action.id === "cash-reserves") return {
    recommendation: (() => {
      const transfer = buildCashTransferInstructions(profile);
      const first = transfer.instructions[0];
      return first ? first.action : "今月の目的別現金の追加移動はしない。";
    })(),
    rationale: amount > 0 ? "近期限の現金目標を、どの口座に置くかを曖昧にせず、投資より先に整えるためです。" : "保存残高で近期限の現金目標を満たしているためです。",
    changesWhen: "口座残高、年払い予定、教育費の時期、住宅見積りが変わった場合に再計算します。",
    check: "口座台帳の出金元・入金先が実際の金融機関名と口座名で登録されているかを確認する。未分類の仮口座は振替先に使わない。",
    money: (() => {
      const transfer = buildCashTransferInstructions(profile);
      const ready = transfer.instructions.filter(item => item.status === "ready");
      return ready.length > 0 ? `今月の実際の振替額: 合計${formatTaskYen(transfer.readyTotal)}。` : `今月の実際の振替額: 0円。${transfer.summary}`;
    })(),
    completion: (() => {
      const transfer = buildCashTransferInstructions(profile);
      const first = transfer.instructions[0];
      return first ? first.completion : "口座台帳の残高を確認して保存したら完了。";
    })(),
  };
  if (action.id === "ideco-contribution") return {
    recommendation: amount > 0 ? `SBI証券のiDeCo加入者サイトで、月${formatTaskYen(amount)}の設定を維持する。` : "SBI証券のiDeCoは新規設定・増額をしない。",
    rationale: amount > 0 ? "近期限の現金目標を満たしたうえで、所得控除を活かす設定済み掛金だからです。" : "近期限の現金目標または月次余力を優先するためです。",
    changesWhen: "現金目標の不足、収入低下、iDeCoの勤務先制度変更があれば見直します。",
    check: "SBI証券のiDeCo加入者サイトで、掛金が月額と一致しているか確認する。",
    money: amount > 0 ? `今月のSBI証券iDeCo設定額: ${formatTaskYen(amount)}。このアプリは設定変更・注文を実行しない。` : "今月のiDeCo追加額: 0円。新規設定・増額はしない。",
    completion: amount > 0 ? "SBI証券iDeCoの掛金設定が一致していることを確認したら完了。変更が必要な場合だけSBI証券で手動操作する。" : "SBI証券iDeCoの掛金を増やさないことを確認したら完了。",
  };
  if (action.id === "nisa-contribution") return {
    recommendation: amount > 0 ? `SBI証券NISAで、eMAXIS Slim 全世界株式（オール・カントリー）の月${formatTaskYen(amount)}設定を維持する。` : "SBI証券NISAの新規開始・増額・一括買付はしない。",
    rationale: amount > 0 ? "現金目標とiDeCoを満たした後でも継続できる、設定済みの長期積立だからです。" : "近期限の現金目標または月次余力を優先するためです。",
    changesWhen: "現金不足、NISA枠の変更、家計収入の変化、積立対象の見直しがあれば再判定します。",
    check: "SBI証券NISAで、商品名と月額が保存済みの提案と一致しているか確認する。",
    money: amount > 0 ? `今月のSBI証券NISAつみたて設定額: ${formatTaskYen(amount)}。追加の一括買付は0円。` : "今月のNISA追加額: 0円。設定の新規開始・増額・一括買付はしない。",
    completion: amount > 0 ? "SBI証券NISAの商品名・積立設定額が一致していることを確認したら完了。" : "追加買付をしないことを確認したら完了。",
  };
  if (action.id === "mortgage-check") return {
    recommendation: "埼玉りそな銀行の住宅ローンについて、繰上返済はせず、適用金利と返済額だけを確認する。",
    rationale: "住宅ローン控除・教育資金・生活防衛を考慮すると、まず現金余力を維持する方針だからです。",
    changesWhen: "金利上昇、住宅ローン控除終了、教育資金の充足、現金余力の増加があれば比較を更新します。",
    check: "埼玉りそな銀行の通知または返済予定表で、適用金利・返済額・適用月を確認する。",
    money: "今月動かす金額: 0円。繰上返済はこのタスクでは行わない。",
    completion: "金利・返済額に変更があれば前提条件へ入力して保存したら完了。変更がなければ確認のみで完了。",
  };
  if (action.id === "market-refresh") return {
    recommendation: "今月は市場データを更新しない。",
    rationale: "残高入力だけでは投資設定を変えず、不要な更新や判断を増やさないためです。",
    changesWhen: "金利通知、大きな家計変化、iDeCo・NISA設定の見直し、または四半期レビューがある場合だけ更新します。",
    check: "金利通知、大きな家計変化、または積立設定の見直しが今月あるか確認する。",
    money: "今月動かす金額: 0円。市場データ更新だけでは売買しない。",
    completion: "見直し理由がなければ更新せず完了。理由がある場合だけ『市場データ更新』を手動実行して完了。",
  };
  if (action.id === "resident-tax-review" || action.id === "year-end-tax-review" || action.id === "education-support-review") return {
    recommendation: "通知書・案内を確認し、対象制度・控除の有無と期限だけを記録する。",
    rationale: "受給額や控除額が確定する前に、教育目標や投資額を変えないためです。",
    changesWhen: "自治体・学校・勤務先から金額や適用可否が確定する通知を受けた場合にだけ前提を更新します。",
    check: action.id === "education-support-review" ? "学校・自治体の案内で、利用できる可能性がある制度と申請期限を確認する。" : "通知書・勤務先案内・控除証明書の記載を確認する。",
    money: "今月動かす金額: 0円。この確認だけで教育費・税額の目標は減額しない。",
    completion: "対象制度・控除の有無と期限を確認したら完了。実額が確定した場合だけ前提条件を手動更新する。",
  };
  return {
    recommendation: action.title,
    rationale: action.detail,
    changesWhen: "家計前提または期限が変わった場合に再判定します。",
    check: action.detail,
    money: amount > 0 ? `今月動かす金額: ${formatTaskYen(amount)}。` : "今月動かす金額: 0円。",
    completion: "確認内容を終えたら完了にする。",
  };
}

export function buildCommandTasks(profile: WealthProfile, asOf = new Date().toISOString()): CommandTask[] {
  const period = monthPeriod(asOf);
  const actions = [...buildGoalTimeline(profile, asOf).monthlyActions, ...supportTasks(asOf)];
  const completions = profile.monthlyTaskCompletions ?? {};
  const cashTransfer = buildCashTransferInstructions(profile);
  return actions.map(originalAction => {
    const action = originalAction.id === "cash-reserves" && cashTransfer.instructions[0]
      ? (() => {
        const first = cashTransfer.instructions[0]!;
        if (first.status === "ready") return {
          ...originalAction,
          title: `${first.purpose}へ${formatTaskYen(first.amount)}を振り替える`,
          amount: cashTransfer.readyTotal,
          detail: first.action,
        };
        return {
          ...originalAction,
          title: first.status === "needs-source-account" ? "出金元の口座を台帳に登録する（今月の振替は0円）" : `${first.purpose}の入金先口座を台帳に登録する（今月の振替は0円）`,
          amount: 0,
          detail: first.action,
        };
      })()
      : originalAction;
    const guidance = guidanceFor(profile, action);
    const signature = taskSignature(action, guidance);
    const key = `${period}:${action.id}`;
    return {
      ...action,
      key,
      signature,
      category: action.id === "child-allowance" || action.id.includes("tax") || action.id.includes("support") ? "税制・支援" : categoryFor(action),
      ...sourceFor(action),
      guidance,
      decision: completions[key]?.signature === signature ? completions[key]?.decision ?? "accepted" : undefined,
      completed: completions[key]?.signature === signature,
    };
  });
}

export function getMonthlyInvestmentGate(profile: WealthProfile, asOf = new Date().toISOString()): MonthlyInvestmentGate {
  const timeline = buildGoalTimeline(profile, asOf);
  const nisaAction = timeline.monthlyActions.find(action => action.id === "nisa-contribution");
  const idecoAllowed = timeline.monthlyFunding.recommendedIdeco > 0;
  const nisaAllowed = nisaAction?.state === "do" && timeline.monthlyFunding.recommendedNisa > 0;
  const longTermAllowed = false;
  const cashReserveTotal = timeline.monthlyFunding.monthlyAnnualSinking + timeline.monthlyFunding.monthlyEmergencyRepair + timeline.monthlyFunding.monthlyEducationReserve + timeline.monthlyFunding.monthlyHomeMaintenance;
  return {
    idecoAllowed,
    nisaAllowed,
    longTermAllowed,
    investmentAllowed: idecoAllowed || nisaAllowed,
    cashReserveFirst: cashReserveTotal > 0,
    recommendedIdeco: timeline.monthlyFunding.recommendedIdeco,
    recommendedNisa: timeline.monthlyFunding.recommendedNisa,
    recommendedLongTermInvestment: timeline.monthlyFunding.recommendedLongTermInvestment,
  };
}

export function toggleCommandTask(profile: WealthProfile, task: Pick<CommandTask, "key" | "signature" | "completed" | "decision">, decision: "accepted" | "held" = "accepted", completedAt = new Date().toISOString()): WealthProfile {
  const completions = { ...(profile.monthlyTaskCompletions ?? {}) };
  if (task.completed && task.decision === decision) delete completions[task.key];
  else completions[task.key] = { signature: task.signature, completedAt, decision } satisfies MonthlyTaskCompletion;
  return { ...profile, monthlyTaskCompletions: completions };
}
