import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Compass, Landmark } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return <DashboardLayout><main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center py-8"><section className="w-full rounded-[2rem] border border-[#D8E5DC] bg-white p-7 text-center shadow-[0_18px_50px_rgba(23,54,44,0.08)] sm:p-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#E6F5EA] text-[#2D7653]"><Compass size={30}/></div><p className="mt-6 text-[10px] font-semibold tracking-[0.18em] text-[#5D806F]">ページが見つかりません</p><h1 className="mt-3 font-serif text-4xl text-[#17362C] sm:text-5xl">この画面はありません</h1><p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#60756A]">リンクが古いか、画面の場所が変わった可能性があります。今月の判断、口座・現金、または将来の試算からもう一度お進みください。</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><Button onClick={() => setLocation("/")} className="rounded-xl bg-[#17362C] py-5 hover:bg-[#284B42]"><ArrowLeft size={16}/>今月の判断へ戻る</Button><Button onClick={() => setLocation("/accounts")} variant="outline" className="rounded-xl border-[#BFD8C7] bg-white py-5 text-[#214B3A] hover:bg-[#F2F8F3]"><Landmark size={16}/>口座・現金を開く</Button></div></section></main></DashboardLayout>;
}
