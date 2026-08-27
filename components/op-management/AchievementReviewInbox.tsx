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
  const activityById = new Map(activities.map(item => [item.id, item]));
  const indicatorById = new Map(indicators.map(item => [item.id, item]));

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
    <div><h2 className="text-xl font-black text-forest">{en ? "Achievement validation" : "Validation des realisations"}</h2><p className="text-sm text-slate-500">{rows.length} {en ? "achievement(s) awaiting decision" : "realisation(s) en attente de decision"}</p></div>
    <div className="grid gap-3">
      {rows.map(row => { const activity = activityById.get(row.activity_id); return <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{activity?.title}{row.period_label ? ` · ${row.period_label}` : ""} · {en ? "Proposed progress" : "Progression proposee"} : {row.progress_percent ?? "—"}%</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span>
        </div>
        {row.description && <p className="mt-2 text-sm text-slate-600">{row.description}</p>}
        {row.indicator_id && row.indicator_contribution != null && <p className="mt-2 text-sm text-slate-600">{en ? "Proposed indicator contribution" : "Contribution indicateur proposee"} : +{row.indicator_contribution} ({indicatorById.get(row.indicator_id)?.name})</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          {row.status === "submitted" && <button onClick={() => markUnderReview(row)} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Put under review" : "Mettre en revue"}</button>}
          <button onClick={() => startDecision(row, "validated")} className="btn-primary px-3 py-1.5 text-xs">{en ? "Validate" : "Valider"}</button>
          <button onClick={() => startDecision(row, "returned")} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Return" : "Retourner"}</button>
          <button onClick={() => startDecision(row, "rejected")} className="btn-secondary px-3 py-1.5 text-xs">{en ? "Reject" : "Rejeter"}</button>
        </div>
      </article>; })}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No achievement awaiting decision." : "Aucune realisation en attente."}</p>}
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
