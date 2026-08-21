import type { AuditLogEntry } from "@/lib/ppm/types";

// This app has no general people-directory, so entries can only distinguish "you" (the
// viewer) from anyone else — see the note on AuditLogEntry in lib/ppm/types.ts.
export default function AuditTrailFeed({ entries, currentUserId }: { entries: AuditLogEntry[]; currentUserId?: string }) {
  return <div className="rounded-2xl border bg-white p-6">
    <h2 className="text-lg font-black text-forest">Journal d&apos;activite</h2>
    <div className="mt-4 grid gap-3">
      {entries.map(entry => <div key={entry.id} className="flex gap-3 border-l-2 border-mint pl-4">
        <div className="grid gap-0.5">
          <p className="text-sm font-bold text-forest">{entry.action}</p>
          {(entry.from_status || entry.to_status) && <p className="text-xs text-slate-400">{entry.from_status ? `${entry.from_status} → ` : ""}{entry.to_status}</p>}
          {entry.note && <p className="text-xs text-slate-500">{entry.note}</p>}
          <p className="text-xs text-slate-400">{entry.actor_id === currentUserId ? "Vous" : "Un membre de l'equipe"} · {new Date(entry.created_at).toLocaleString("fr-FR")}</p>
        </div>
      </div>)}
      {!entries.length && <p className="text-center text-sm text-slate-400">Aucun evenement enregistre.</p>}
    </div>
  </div>;
}
