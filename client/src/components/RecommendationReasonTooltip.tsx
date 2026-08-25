import * as React from "react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleRecommendationTooltip, type RecommendationTooltipEvidence } from "@shared/recommendationTooltips";
import { CircleHelp } from "lucide-react";

export default function RecommendationReasonTooltip({ evidence }: { evidence: RecommendationTooltipEvidence }) {
  const [open, setOpen] = useState(false);
  return <Tooltip open={open} onOpenChange={setOpen}><TooltipTrigger asChild><button type="button" onClick={() => setOpen(current => toggleRecommendationTooltip(current))} aria-expanded={open} aria-label={open ? `${evidence.title}の詳細を閉じる` : `${evidence.title}の詳細を表示`} className="inline-grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#3A8061] transition hover:bg-[#E7F4EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4B9A76]"><CircleHelp size={16}/></button></TooltipTrigger><TooltipContent side="top" sideOffset={8} className="z-[70] max-w-sm rounded-2xl bg-[#142725] p-4 text-white shadow-xl"><p className="font-serif text-sm text-[#C9F5DA]">{evidence.title}</p><div className="mt-3 space-y-2">{evidence.sections.map(section => <div key={section.label}><p className="text-[10px] font-medium tracking-wide text-[#A9EDCE]">{section.label}</p><p className="mt-0.5 text-[11px] leading-5 text-white/80">{section.text}</p></div>)}</div><p className="mt-3 border-t border-white/15 pt-2 text-[10px] leading-4 text-white/55">{evidence.safety}</p></TooltipContent></Tooltip>;
}
