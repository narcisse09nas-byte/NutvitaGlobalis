"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Attempt = Record<string, any>;

export default function ProctoringSummary({ attempts }: { attempts: Attempt[] }) {
  const safeAttempts = Array.isArray(attempts) ? attempts : [];
  const [selected, setSelected] = useState<Attempt | null>(null);
  const [error, setError] = useState("");

  async function photo(path: string) {
    const { data, error } = await createClient().storage.from("recruitment-documents").createSignedUrl(path, 180);
    if (error) setError(error.message);
    else window.open(data.signedUrl, "_blank");
  }

  return <section className="mb-8 rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-black">Surveillance du test</h2>
        <p className="mt-1 text-sm text-slate-500">Signaux d'aide a la decision, sans exclusion automatique.</p>
      </div>
      <span className="rounded-full bg-orange/10 px-4 py-2 text-sm font-bold text-orange">
        {safeAttempts.filter(item => ["medium", "high"].includes(String(item.suspicion_level || ""))).length} a examiner
      </span>
    </div>
    {error && <p className="mt-3 text-red-600">{error}</p>}
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {safeAttempts.map(attempt => <button key={attempt.id} onClick={() => setSelected(attempt)} className="rounded-xl border p-4 text-left">
        <div className="flex justify-between gap-2">
          <b className="text-forest">{attempt.recruitment_applications?.full_name || "Candidat"}</b>
          <span className={`rounded-full px-2 py-1 text-xs font-bold ${attempt.suspicion_level === "high" ? "bg-red-100 text-red-700" : attempt.suspicion_level === "medium" ? "bg-orange/10 text-orange" : "bg-mint text-leaf"}`}>
            {attempt.suspicion_level || "none"}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Sorties : {attempt.tab_switch_count || 0} - Reconnexions : {attempt.reconnect_count || 0}</p>
      </button>)}
    </div>
    {selected && <div className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/60 p-4">
      <div className="mx-auto my-8 max-w-2xl rounded-3xl bg-white p-7">
        <div className="flex justify-between">
          <h3 className="text-2xl font-black">Journal du test</h3>
          <button onClick={() => setSelected(null)} className="text-3xl">x</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-2 text-sm">Debut : {selected.started_at ? new Date(selected.started_at).toLocaleString("fr-FR") : "-"}</span>
          {selected.submitted_at && <span className="rounded-full bg-slate-100 px-3 py-2 text-sm">Fin : {new Date(selected.submitted_at).toLocaleString("fr-FR")}</span>}
          {selected.identity_photo_path && <button onClick={() => photo(selected.identity_photo_path)} className="btn-secondary px-4 py-2">Voir la photo</button>}
        </div>
        <div className="mt-5 grid gap-2">
          {(Array.isArray(selected.test_proctoring_logs) ? selected.test_proctoring_logs : [])
            .sort((a: Attempt, b: Attempt) => String(a.created_at || "").localeCompare(String(b.created_at || "")))
            .map((log: Attempt) => <div key={log.id} className="rounded-xl bg-slate-50 p-4">
              <b>{log.event_type}</b>
              <span className="ml-3 text-xs text-slate-400">{log.created_at ? new Date(log.created_at).toLocaleString("fr-FR") : "-"}</span>
            </div>)}
        </div>
      </div>
    </div>}
  </section>;
}
