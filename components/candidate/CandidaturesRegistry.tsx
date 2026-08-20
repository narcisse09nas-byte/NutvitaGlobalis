"use client";
import Link from "next/link";
import { useState } from "react";
import type { CandidatureCard } from "@/lib/candidate-unified";
import AutoRefresh from "@/components/candidate/AutoRefresh";

type Notification = { title: string; message: string; created_at: string } | null;

const trackLabels: Record<string, string> = {
  recruitment_dietitian: "Diététicien / Nutritionniste",
  recruitment_promoter: "Promoteur",
  medical: "Médecin spécialiste",
  staff: "Staff / Carrières",
};

function statusColor(percent: number) {
  if (percent >= 100) return "bg-mint text-forest";
  if (percent >= 60) return "bg-amber-50 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default function CandidaturesRegistry({ cards, notifications }: { cards: CandidatureCard[]; notifications: Record<string, Notification> }) {
  const [filter, setFilter] = useState<string | null>(null);
  const visible = cards.filter(c => !filter || c.key === filter);

  return <div className="grid gap-7">
    <AutoRefresh />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(card => <button key={card.key} onClick={() => setFilter(current => current === card.key ? null : card.key)} className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-soft ${filter === card.key ? "border-leaf bg-mint/60 ring-2 ring-leaf" : "border-slate-200 bg-white"}`}>
        <p className="text-xs font-black uppercase tracking-widest text-orange">{trackLabels[card.track]}</p>
        <h3 className="mt-2 text-lg font-black text-forest">{card.title}</h3>
        {card.subtitle && <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>}
        <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusColor(card.percent)}`}>{card.statusLabel}</span>
      </button>)}
      {!cards.length && <p className="rounded-2xl border bg-white p-6 text-slate-500">Aucune candidature soumise pour le moment.</p>}
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="p-4">Candidature</th><th className="p-4">Statut</th><th className="p-4">Soumise le</th><th className="p-4">Dernière mise à jour</th><th className="p-4">Dernière notification</th><th className="p-4">Action</th></tr>
        </thead>
        <tbody>
          {visible.map(card => {
            const notification = notifications[card.key];
            return <tr key={card.key} className="border-t align-top">
              <td className="p-4"><b className="block text-forest">{card.title}</b><span className="text-xs text-slate-400">{trackLabels[card.track]}{card.subtitle ? ` · ${card.subtitle}` : ""}</span></td>
              <td className="p-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusColor(card.percent)}`}>{card.statusLabel}</span></td>
              <td className="p-4">{card.submittedAt ? new Date(card.submittedAt).toLocaleDateString("fr-FR") : "—"}</td>
              <td className="p-4">{card.updatedAt ? new Date(card.updatedAt).toLocaleString("fr-FR") : "—"}</td>
              <td className="p-4 max-w-xs">{notification ? <><b className="block text-forest">{notification.title}</b><p className="text-xs text-slate-500">{notification.message}</p><span className="text-[11px] text-slate-400">{new Date(notification.created_at).toLocaleDateString("fr-FR")}</span></> : <span className="text-slate-400">Aucune notification</span>}</td>
              <td className="p-4"><Link href={card.dossierHref} className="btn-secondary px-4 py-2 text-xs">Ouvrir mon dossier</Link></td>
            </tr>;
          })}
          {!visible.length && cards.length > 0 && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucune candidature ne correspond au filtre sélectionné.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
