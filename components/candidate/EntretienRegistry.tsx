"use client";
import { Fragment, useState } from "react";
import VideoRoom from "@/components/recruitment/VideoRoom";
import AutoRefresh from "@/components/candidate/AutoRefresh";
import type { CandidatureCard } from "@/lib/candidate-unified";

export type InterviewRow = {
  key: string;
  track: "recruitment_dietitian" | "recruitment_promoter" | "medical" | "staff";
  applicationTitle: string;
  scheduledAt: string | null;
  durationMinutes: number | null;
  status: string;
  provider: string;
  meetingUrl: string | null;
  roomName: string | null;
  candidateName: string;
};

type Notification = { title: string; message: string; created_at: string } | null;

const trackLabels: Record<string, string> = {
  recruitment_dietitian: "Diététicien / Nutritionniste",
  recruitment_promoter: "Promoteur",
  medical: "Médecin spécialiste",
  staff: "Staff / Carrières",
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function EntretienRegistry({ rows, notifications, cards }: { rows: InterviewRow[]; notifications: Record<string, Notification>; cards: CandidatureCard[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const now = new Date();
  const visibleRows = filter ? rows.filter(row => row.key === filter) : rows;

  return <div className="grid gap-6">
    <AutoRefresh />
    {cards.length > 1 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(card => <button key={card.key} onClick={() => setFilter(current => current === card.key ? null : card.key)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${filter === card.key ? "border-leaf bg-mint/60 ring-2 ring-leaf" : "border-slate-200 bg-white"}`}>
        <p className="text-xs font-black uppercase tracking-widest text-orange">{trackLabels[card.track]}</p>
        <h3 className="mt-1 font-black text-forest">{card.title}</h3>
      </button>)}
    </div>}
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr><th className="p-4">Candidature</th><th className="p-4">Date prévue</th><th className="p-4">Statut</th><th className="p-4">Dernière notification</th><th className="p-4">Action</th></tr>
        </thead>
        <tbody>
          {visibleRows.map(row => {
            const scheduled = row.scheduledAt ? new Date(row.scheduledAt) : null;
            const dayOf = scheduled ? isSameDay(scheduled, now) : false;
            const canJoin = dayOf && ["scheduled", "in_progress", "pending"].includes(row.status);
            const notification = notifications[row.key];
            return <Fragment key={row.key}>
              <tr className="border-t align-top">
                <td className="p-4"><b className="block text-forest">{row.applicationTitle}</b><span className="text-xs text-slate-400">{trackLabels[row.track]}</span></td>
                <td className="p-4">{scheduled ? scheduled.toLocaleString("fr-FR") : "Non planifié"}{row.durationMinutes ? <span className="block text-xs text-slate-400">{row.durationMinutes} minutes</span> : null}</td>
                <td className="p-4"><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{row.status}</span></td>
                <td className="p-4 max-w-xs">{notification ? <><b className="block text-forest">{notification.title}</b><p className="text-xs text-slate-500">{notification.message}</p></> : <span className="text-slate-400">Aucune notification</span>}</td>
                <td className="p-4">
                  {row.meetingUrl && row.track === "medical"
                    ? <a href={row.meetingUrl} target="_blank" rel="noreferrer" className={`btn-secondary px-4 py-2 text-xs ${canJoin ? "" : "pointer-events-none opacity-40"}`}>Rejoindre</a>
                    : <button disabled={!canJoin || !row.roomName} onClick={() => setOpen(current => current === row.key ? null : row.key)} className="btn-secondary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">Rejoindre</button>}
                  {!canJoin && scheduled && <p className="mt-1 text-[11px] text-slate-400">Disponible le jour de l&apos;entretien</p>}
                </td>
              </tr>
              {open === row.key && row.roomName && <tr><td colSpan={5} className="bg-slate-50 p-5"><VideoRoom roomName={row.roomName} displayName={row.candidateName} provider={row.provider} meetingUrl={row.meetingUrl || undefined} /></td></tr>}
            </Fragment>;
          })}
          {!visibleRows.length && <tr><td colSpan={5} className="p-10 text-center text-slate-400">Aucun entretien planifié pour le moment.</td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}
