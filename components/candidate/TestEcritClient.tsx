"use client";
import { useState, type ReactNode } from "react";
import type { CandidatureCard } from "@/lib/candidate-unified";

const trackLabels: Record<string, string> = {
  recruitment_dietitian: "Diététicien / Nutritionniste",
  recruitment_promoter: "Promoteur",
  staff: "Staff / Carrières",
};

export default function TestEcritClient({ cards, recruitmentSlot, staffSlot }: { cards: CandidatureCard[]; recruitmentSlot: ReactNode; staffSlot: ReactNode }) {
  const [filter, setFilter] = useState<string | null>(null);
  const selected = cards.find(c => c.key === filter) || null;
  const showRecruitment = !selected || selected.track === "recruitment_dietitian" || selected.track === "recruitment_promoter";
  const showStaff = !selected || selected.track === "staff";

  return <div className="grid gap-6">
    {cards.length > 1 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(card => <button key={card.key} onClick={() => setFilter(current => current === card.key ? null : card.key)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${filter === card.key ? "border-leaf bg-mint/60 ring-2 ring-leaf" : "border-slate-200 bg-white"}`}>
        <p className="text-xs font-black uppercase tracking-widest text-orange">{trackLabels[card.track]}</p>
        <h3 className="mt-1 font-black text-forest">{card.title}</h3>
      </button>)}
    </div>}
    {showRecruitment && recruitmentSlot}
    {showStaff && staffSlot}
    {!cards.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-500">Aucun test écrit n&apos;est associé à vos candidatures pour le moment.</p>}
  </div>;
}
