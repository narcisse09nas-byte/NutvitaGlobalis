"use client";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { Achievement, AchievementStatus, Activity, Indicator, PPMResource } from "@/lib/ppm/types";

const statusLabels: Record<AchievementStatus, { fr: string; en: string }> = {
  draft: { fr: "Brouillon", en: "Draft" }, submitted: { fr: "Soumise", en: "Submitted" }, under_review: { fr: "En cours de revue", en: "Under review" }, validated: { fr: "Validee", en: "Validated" },
  returned: { fr: "Retournee pour correction", en: "Returned for correction" }, rejected: { fr: "Rejetee", en: "Rejected" }, cancelled: { fr: "Annulee", en: "Cancelled" },
};
const statusTones: Record<AchievementStatus, string> = {
  draft: "bg-slate-100 text-slate-600", submitted: "bg-sky-50 text-sky-800", under_review: "bg-amber-50 text-amber-800",
  validated: "bg-mint text-forest", returned: "bg-orange/10 text-orange", rejected: "bg-red-50 text-red-700", cancelled: "bg-slate-200 text-slate-500",
};

export default function AchievementReviewInbox({ projectId, initial, activities, indicators, staff = [] }: {
  projectId: string; initial: Achievement[]; activities: Activity[]; indicators: Indicator[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
  const [rows, setRows] = useState(initial.filter(row => row.status === "submitted" || row.status === "under_review"));
  const [deciding, setDeciding] = useState<{ row: Achievement; nextStatus: AchievementStatus } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");
  const [indicatorFilter, setIndicatorFilter] = useState("");
  const activityById = new Map(activities.map(item => [item.id, item]));
  const indicatorById = new Map(indicators.map(item => [item.id, item]));
  const normalizedSearch = search.trim().toLocaleLowerCase(locale);
  const filtered = rows.filter(row => {
    const activity = activityById.get(row.activity_id);
    const indicator = row.indicator_id ? indicatorById.get(row.indicator_id) : undefined;
    const matchesSearch = !normalizedSearch || [row.code, row.title, row.description, row.period_label, activity?.code, activity?.title, indicator?.name]
      .some(value => value?.toLocaleLowerCase(locale).includes(normalizedSearch));
    return matchesSearch && (!statusFilter || row.status === statusFilter)
      && (!activityFilter || row.activity_id === activityFilter)
      && (!indicatorFilter || row.indicator_id === indicatorFilter);
  });

  async function markUnderReview(row: Achievement) {
    const result = await createClient().from("ppm_achievements").update({ status: "under_review" }).eq("id", row.id).select("*").single();
    if (!result.error) setRows(current => current.map(item => item.id === row.id ? result.data as Achievement : item));
  }

  function startDecision(row: Achievement, nextStatus: AchievementStatus) {
    setMessage("");
    setDeciding({ row, nextStatus });
  }

  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deciding) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const reviewedByName = String(form.get("reviewed_by_name") || "").trim() || null;
    const reviewNote = String(form.get("review_note") || "").trim() || null;
    if (deciding.nextStatus === "returned" && !reviewNote) { setSaving(false); setMessage(en ? "A comment is required to return an achievement." : "Un commentaire est obligatoire pour retourner une realisation."); return; }
    const supabase = createClient();
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      status: deciding.nextStatus, reviewed_by_name: reviewedByName, review_note: reviewNote, reviewed_at: now,
    };
    if (deciding.nextStatus === "validated") payload.validated_at = now;
    const result = await supabase.from("ppm_achievements").update(payload).eq("id", deciding.row.id).select("*").single();
    if (result.error) { setSaving(false); setMessage(result.error.message); return; }
    const updated = result.data as Achievement;

    if (deciding.nextStatus === "validated") {
      // Cascade: validated progress becomes the activity's official progress; a proposed
      // indicator contribution is applied to the indicator's actual value only now (never
      // when the achievement was merely submitted) — spec section 7's core guardrail.
      if (updated.progress_percent != null) {
        await supabase.from("ppm_activities").update({ progress_percent: updated.progress_percent }).eq("id", updated.activity_id);
      }
      if (updated.indicator_id && updated.indicator_contribution) {
        const indicator = indicatorById.get(updated.indicator_id);
        await supabase.from("ppm_indicators").update({ current_value: Number(indicator?.current_value || 0) + Number(updated.indicator_contribution) }).eq("id", updated.indicator_id);
      }
    }
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("ppm_history").insert({
      entity_type: "project", entity_id: projectId, actor_id: user?.id,
      action: `Realisation ${statusLabels[updated.status].fr.toLowerCase()} — ${updated.title}`, from_status: deciding.row.status, to_status: updated.status, note: reviewNote || undefined,
    });
    if (updated.created_by_email) {
      await supabase.from("ppm_notifications").insert({
        recipient_email: updated.created_by_email, project_id: projectId, category: "info",
        title: `${statusLabels[updated.status].fr} — ${updated.title}`, message: reviewNote || undefined,
        link: `/op-management/projets/${projectId}/mise-en-oeuvre/mes-realisations`,
      });
    }
    setSaving(false);
    setRows(current => current.filter(item => item.id !== updated.id));
    setDeciding(null);
  }

  return <div className="grid gap-4">
    <div><h2 className="text-xl font-black text-forest">{en ? "Achievement validation" : "Validation des realisations"}</h2><p className="text-sm text-slate-500">{filtered.length} / {rows.length} {en ? "achievement(s) awaiting decision" : "realisation(s) en attente de decision"}</p></div>
    <div className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-1 text-xs font-bold text-slate-600">{en ? "Search" : "Rechercher"}<input value={search} onChange={event => setSearch(event.target.value)} className="admin-input" placeholder={en ? "ID, achievement, activity..." : "ID, realisation, activite..."} /></label>
      <label className="grid gap-1 text-xs font-bold text-slate-600">{en ? "Status" : "Statut"}<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="admin-input"><option value="">{en ? "All statuses" : "Tous les statuts"}</option><option value="submitted">{statusLabels.submitted[locale]}</option><option value="under_review">{statusLabels.under_review[locale]}</option></select></label>
      <label className="grid gap-1 text-xs font-bold text-slate-600">{en ? "Activity" : "Activite"}<select value={activityFilter} onChange={event => setActivityFilter(event.target.value)} className="admin-input"><option value="">{en ? "All activities" : "Toutes les activites"}</option>{activities.map(item => <option key={item.id} value={item.id}>{item.code ? `${item.code} - ` : ""}{item.title}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-bold text-slate-600">{en ? "Indicator" : "Indicateur"}<select value={indicatorFilter} onChange={event => setIndicatorFilter(event.target.value)} className="admin-input"><option value="">{en ? "All indicators" : "Tous les indicateurs"}</option>{indicators.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    </div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[1250px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">ID</th><th className="p-4">{en ? "Activity" : "Activite"}</th><th className="p-4">{en ? "Period" : "Periode"}</th><th className="p-4">{en ? "Achievement" : "Realisation"}</th><th className="p-4">{en ? "Indicator" : "Indicateur"}</th><th className="p-4">{en ? "Progress" : "Progression"}</th><th className="p-4">{en ? "Status" : "Statut"}</th><th className="p-4 text-right">Actions</th></tr></thead>
        <tbody>
          {filtered.map(row => { const activity = activityById.get(row.activity_id); const indicator = row.indicator_id ? indicatorById.get(row.indicator_id) : undefined; const period = row.reporting_period_start || row.reporting_period_end ? `${row.reporting_period_start || "..."} - ${row.reporting_period_end || "..."}` : row.period_label || "-"; return <tr key={row.id} className="border-t align-top">
            <td className="p-4 font-mono text-xs font-bold text-slate-500">{row.code || row.id.slice(0, 8)}</td>
            <td className="p-4"><b className="text-forest">{activity?.title || "-"}</b>{activity?.code && <p className="mt-1 font-mono text-xs text-slate-400">{activity.code}</p>}</td>
            <td className="whitespace-nowrap p-4">{period}</td>
            <td className="p-4"><b className="text-forest">{row.title}</b>{row.description && <p className="mt-1 max-w-xs text-xs text-slate-500 line-clamp-2">{row.description}</p>}</td>
            <td className="p-4">{indicator?.name || "-"}{row.indicator_contribution != null && <p className="mt-1 text-xs font-bold text-forest">+{row.indicator_contribution}</p>}</td>
            <td className="p-4 font-bold">{row.progress_percent != null ? `${row.progress_percent}%` : "-"}</td>
            <td className="p-4"><span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span></td>
            <td className="p-4"><div className="flex flex-wrap justify-end gap-2">{row.status === "submitted" && <button onClick={() => markUnderReview(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Review" : "Mettre en revue"}</button>}<button onClick={() => startDecision(row, "validated")} className="btn-primary px-3 py-1.5 text-xs">{en ? "Validate" : "Valider"}</button><button onClick={() => startDecision(row, "returned")} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Return" : "Retourner"}</button><button onClick={() => startDecision(row, "rejected")} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Reject" : "Rejeter"}</button></div></td>
          </tr>; })}
          {!filtered.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">{rows.length ? (en ? "No achievement matches these filters." : "Aucune realisation ne correspond aux filtres.") : (en ? "No achievement awaiting decision." : "Aucune realisation en attente.")}</td></tr>}
        </tbody>
      </table>
    </div>

    {deciding && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submitDecision} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{statusLabels[deciding.nextStatus][locale]} — {deciding.row.title}</h2><button type="button" onClick={() => setDeciding(null)} className="text-2xl">×</button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Reviewed by" : "Revu par"}<SearchableSelect name="reviewed_by_name" options={staffOptions} allowOther otherLabel={en ? "Reviewer name" : "Nom du reviseur"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Comment" : "Commentaire"}<textarea name="review_note" rows={3} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setDeciding(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Confirm" : "Confirmer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
