import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BookOpen, BriefcaseBusiness, ChartNoAxesCombined, Gauge, Landmark, LogOut, Menu, PanelTop, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

const primaryItems = [
  { icon: Gauge, label: "今月の判断", detail: "今月すること", path: "/" },
  { icon: Landmark, label: "口座・現金", detail: "残高と使い道", path: "/accounts" },
  { icon: ChartNoAxesCombined, label: "保有・配分", detail: "持っている商品", path: "/portfolio-audit" },
  { icon: ShieldCheck, label: "提案の根拠", detail: "比較・シミュレーション", path: "/recommendation" },
];

const secondaryItems = [
  { icon: SlidersHorizontal, label: "将来の試算", detail: "投資額を変えて比較", path: "/asset-projection" },
  { icon: BookOpen, label: "年間の予定", detail: "教育・住宅・税制", path: "/annual-plan" },
  { icon: Settings2, label: "家計の前提", detail: "収入・支出・税制", path: "/settings" },
];

function NavigationItem({ item, active }: { item: typeof primaryItems[number]; active: boolean }) {
  return <Link href={item.path} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${active ? "bg-[#213D35] text-white shadow-[inset_3px_0_0_#9EE7CB]" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><item.icon size={17} className={active ? "text-[#9EE7CB]" : "group-hover:text-[#9EE7CB]"}/><div><p className="text-xs font-semibold tracking-wide">{item.label}</p><p className={`mt-0.5 text-[10px] ${active ? "text-white/55" : "text-white/35"}`}>{item.detail}</p></div></Link>;
}

function MobileNavigation({ location, logout }: { location: string; logout: () => void }) {
  const allItems = [...primaryItems, ...secondaryItems];
  const current = allItems.find(item => item.path === location) ?? primaryItems[0];
  return <div className="sticky top-0 z-30 -mx-4 mb-5 flex items-center justify-between border-b border-[#D8E1DB] bg-[#F3F5F2]/95 px-4 py-3 backdrop-blur sm:-mx-7 sm:px-7 lg:hidden"><Link href="/" className="flex min-w-0 items-center gap-2 text-[#183229]"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#9EE7CB]"><BriefcaseBusiness size={16}/></div><div className="min-w-0"><p className="truncate text-[10px] font-semibold tracking-[0.14em] text-[#557166]">家族の資産運用</p><p className="truncate text-sm font-semibold">{current.label}</p></div></Link><Sheet><SheetTrigger asChild><Button variant="outline" size="icon" aria-label="メニューを開く" className="h-10 w-10 shrink-0 rounded-xl border-[#C8D7CC] bg-white text-[#17362C] hover:bg-[#EAF4ED]"><Menu size={19}/></Button></SheetTrigger><SheetContent side="left" className="w-[86%] border-0 bg-[#101A1B] p-0 text-[#EAF3EF]"><SheetHeader className="border-b border-white/10 px-5 py-6 text-left"><SheetTitle className="font-serif text-xl text-white">家計・資産運用</SheetTitle><SheetDescription className="text-xs leading-5 text-white/55">今月の判断、口座、将来の試算へ移動できます。金融取引は実行しません。</SheetDescription></SheetHeader><nav className="space-y-1 px-3 py-5" aria-label="主な画面">{primaryItems.map(item => <SheetClose key={item.path} asChild><NavigationItem item={item} active={location === item.path}/></SheetClose>)}</nav><p className="px-6 pt-1 text-[10px] font-semibold tracking-[0.14em] text-white/35">詳しい確認・設定</p><nav className="space-y-1 px-3 py-3" aria-label="詳細画面">{secondaryItems.map(item => <SheetClose key={item.path} asChild><NavigationItem item={item} active={location === item.path}/></SheetClose>)}</nav><div className="mt-auto border-t border-white/10 p-4"><SheetClose asChild><button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm text-white/65 transition hover:bg-white/5 hover:text-white"><LogOut size={16}/>ログアウト</button></SheetClose></div></SheetContent></Sheet></div>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const profileQuery = trpc.profile.get.useQuery(undefined, { enabled: Boolean(user) });
  const [location] = useLocation();
  if (!user) return <main className="grid min-h-screen place-items-center bg-[#101A1B] px-6 text-white"><div className="max-w-md rounded-[2rem] border border-white/10 bg-white/[0.06] p-10 text-center shadow-2xl backdrop-blur"><div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-[#9ee7cb] text-[#102020]"><BriefcaseBusiness/></div><p className="eyebrow">家族の資産運用</p><h1 className="mt-3 font-serif text-3xl">家計・資産運用ダッシュボード</h1><p className="mt-4 text-sm leading-6 text-white/65">家計、資産、住宅ローンを一つの判断画面に集約します。</p><Button onClick={() => startLogin()} className="mt-8 w-full rounded-xl bg-[#9ee7cb] text-[#102020] hover:bg-[#b5f3da]">ログインして開く</Button></div></main>;
  const dataStatus = profileQuery.data?.payload ? "残高データを読み込み済み" : "残高データを読み込み中";
  return <div className="min-h-screen bg-[#F3F5F2] text-[#172324]"><aside className="fixed inset-y-0 left-0 z-20 hidden w-[260px] flex-col border-r border-white/5 bg-[#101A1B] p-5 text-[#EAF3EF] lg:flex"><div className="mb-8 flex items-center gap-3 px-2"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#9EE7CB] text-[#122621]"><BriefcaseBusiness size={19}/></div><div><p className="font-serif text-lg leading-none">家計・資産運用</p><p className="mt-1 text-[9px] tracking-[0.18em] text-[#9EE7CB]">家族の資産運用</p></div></div><div className="mb-6 border-y border-white/10 px-2 py-4"><p className="text-[9px] font-semibold tracking-[0.16em] text-white/35">毎月の使い方</p><p className="mt-2 text-xs leading-5 text-white/65">判断はここで確認します。実際の振込・注文は各金融機関のアプリで行います。</p></div><nav className="space-y-1">{primaryItems.map(item => <NavigationItem key={item.path} item={item} active={location === item.path}/>)}</nav><p className="mt-7 px-3 text-[9px] font-semibold tracking-[0.16em] text-white/30">詳しい確認・設定</p><nav className="mt-2 space-y-1">{secondaryItems.map(item => <NavigationItem key={item.path} item={item} active={location === item.path}/>)}</nav><div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="flex items-center gap-2 text-[10px] font-semibold text-[#9EE7CB]"><PanelTop size={14}/>入力データの状態</div><p className="mt-2 text-[10px] tracking-wide text-white/45">{dataStatus}</p><p className="mt-3 text-[10px] leading-4 text-white/40">残高の基準日と口座の使い道を更新すると、判断・現金計画・投資余力を再計算します。</p></div><button onClick={logout} className="mt-4 flex items-center gap-2 px-3 py-2 text-xs text-white/45 transition hover:text-white"><LogOut size={14}/>ログアウト</button></aside><main className="min-h-screen px-4 py-5 sm:px-7 lg:ml-[260px] lg:px-10 lg:py-8"><MobileNavigation location={location} logout={logout}/>{children}</main></div>;
}
