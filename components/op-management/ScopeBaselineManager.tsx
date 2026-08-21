"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ScopeBaseline, ScopeBaselineStatus } from "@/lib/ppm/types";

const statusLabels: Record<ScopeBaselineStatus, string> = { draft: "Brouillon", review: "En revue", approved: "Approuvee", baseline: "Baseline (verrouillee)" };
const statusTones: Record<ScopeBaselineStatus, string> = { draft: "bg-slate-100 text-slate-600", review: "bg-amber-50 text-amber-800", approved: "bg-sky-50 text-sky-800", baseline: "bg-mint text-forest" };
const nextStep: Record<ScopeBaselineStatus, ScopeBaselineStatus | null> = { draft: "review", review: "approved", approved: "baseline", baseline: null };

export default function ScopeBaselineManager({ projectId, initial }: { projectId: string; initial: ScopeBaseline[] }) {
  const [versions, setVersions] = useState(initial);
  const [saving, setSaving] = useState(false);
  const latest = versions[0] || null;

  async function createBaseline() {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_scope_baselines").insert({ project_id: projectId, version: (latest?.version || 0) + 1, status: "draft", created_by: user?.id }).select("*").single();
    setSaving(false);
    if (!result.error) setVersions(current => [result.data as ScopeBaseline, ...current]);
  }

  async function advance() {
    if (!latest) return;
    const next = nextStep[latest.status];
    if (!next) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const extra = next === "baseline" ? { approved_at: new Date().toISOString(), approved_by_name: user?.user_metadata?.full_name || user?.email } : {};
    const result = await supabase.from("ppm_scope_baselines").update({ status: next, ...extra }).eq("id", latest.id).select("*").single();
    setSaving(false);
    if (result.error) return;
    await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Scope Baseline v${latest.version} — ${statusLabels[next]}`, from_status: latest.status, to_status: next });
    setVersions(current => current.map(item => item.id === latest.id ? result.data as ScopeBaseline : item));
  }

  return <div className="grid gap-4">
    <h2 className="text-xl font-black text-forest">Scope Baseline</h2>
    <p className="text-sm text-slate-500">La Scope Baseline reunit le Perimetre du projet, le WBS et le WBS Dictionary. Une fois au statut &quot;Baseline&quot;, toute modification significative du perimetre doit passer par une Change Request.</p>
    {!latest ? <div className="rounded-2xl border bg-white p-8 text-center"><p className="text-slate-500">Aucune baseline initiee.</p><button onClick={createBaseline} disabled={saving} className="btn-primary mt-4">Initier la Scope Baseline</button></div> : <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-3"><b className="text-forest">Version {latest.version}</b><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[latest.status]}`}>{statusLabels[latest.status]}</span>{latest.approved_by_name && <span className="text-xs text-slate-400">Approuve par {latest.approved_by_name}</span>}</div>
      <div className="flex gap-2">
        {nextStep[latest.status] && <button onClick={advance} disabled={saving} className="btn-primary px-4 py-2 text-sm">Passer a &quot;{statusLabels[nextStep[latest.status]!]}&quot;</button>}
        {latest.status === "baseline" && <button onClick={createBaseline} disabled={saving} className="btn-secondary px-4 py-2 text-sm">Nouvelle version (via Change Request)</button>}
      </div>
    </div>}
    {versions.length > 1 && <p className="text-xs text-slate-400">Historique : {versions.map(item => `v${item.version} (${statusLabels[item.status]})`).join(" · ")}</p>}
  </div>;
}
