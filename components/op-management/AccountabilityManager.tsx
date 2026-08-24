"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { FeedbackCategory, FeedbackEntry, FeedbackFollowup, FeedbackStatus, LessonLearned } from "@/lib/ppm/types";

const categoryLabels: Record<FeedbackCategory, string> = { complaint: "Plainte", suggestion: "Suggestion", feedback: "Retour", question: "Question" };
const statusLabels: Record<FeedbackStatus, string> = { received: "Recue", under_review: "En cours d'examen", resolved: "Resolue", closed: "Cloturee" };
const statusTones: Record<FeedbackStatus, string> = {
  received: "bg-red-50 text-red-700", under_review: "bg-amber-50 text-amber-800", resolved: "bg-mint text-forest", closed: "bg-slate-100 text-slate-600",
};
// Refinement program, Wave 7 (item 41): channel becomes a fixed dropdown + "Autre" instead of
// free text.
const channelOptions = ["Telephone", "SMS", "WhatsApp", "Boite a suggestions", "Reunion communautaire", "Email", "En personne"];
const OTHER = "__other__";

export default function AccountabilityManager({ projectId, initialFeedback, initialLessons, initialFollowups }: {
  projectId: string; initialFeedback: FeedbackEntry[]; initialLessons: LessonLearned[]; initialFollowups: FeedbackFollowup[];
}) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [lessons, setLessons] = useState(initialLessons);
  const [followups, setFollowups] = useState(initialFollowups);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackEntry | "new" | null>(null);
  const [editingLesson, setEditingLesson] = useState<LessonLearned | "new" | null>(null);
  const [followingUp, setFollowingUp] = useState<FeedbackEntry | null>(null);
  const [historyFor, setHistoryFor] = useState<FeedbackEntry | null>(null);
  const [channelOther, setChannelOther] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function openFeedbackEditor(row: FeedbackEntry | "new") {
    setMessage("");
    setChannelOther(row !== "new" && !!row.channel && !channelOptions.includes(row.channel));
    setEditingFeedback(row);
  }

  // Refinement program, Wave 7 (item 42): closed feedback gets its own follow-up review register
  // with history, instead of only a single status field.
  async function submitFollowup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!followingUp) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      feedback_id: followingUp.id,
      review_date: String(form.get("review_date") || new Date().toISOString().slice(0, 10)),
      reviewer_name: String(form.get("reviewer_name") || "").trim() || null,
      action_taken: String(form.get("action_taken") || "").trim() || null,
      status_after: String(form.get("status_after") || followingUp.status) as FeedbackStatus,
      notes: String(form.get("notes") || "").trim() || null,
    };
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_feedback_followups").insert({ ...payload, created_by: user?.id }).select("*").single();
    if (result.error) { setMessage(result.error.message); return; }
    setFollowups(current => [result.data as FeedbackFollowup, ...current]);
    const updated = await supabase.from("ppm_feedback_entries").update({ status: payload.status_after }).eq("id", followingUp.id).select("*").single();
    if (!updated.error) {
      setFeedback(current => current.map(row => row.id === followingUp.id ? updated.data as FeedbackEntry : row));
      await supabase.from("ppm_history").insert({ entity_type: "project", entity_id: projectId, actor_id: user?.id, action: `Suivi retour/plainte`, from_status: followingUp.status, to_status: payload.status_after, note: payload.notes || undefined });
    }
    setFollowingUp(null);
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      source_name: String(form.get("source_name") || "").trim() || null,
      category: String(form.get("category") || "feedback") as FeedbackCategory,
      channel: String(form.get("channel") || "").trim() || null,
      description: String(form.get("description") || "").trim(),
      is_sensitive: form.get("is_sensitive") === "on",
      status: String(form.get("status") || "received") as FeedbackStatus,
      response: String(form.get("response") || "").trim() || null,
      resolved_at: String(form.get("status") || "") === "resolved" || String(form.get("status") || "") === "closed"
        ? (editingFeedback !== "new" ? editingFeedback?.resolved_at : null) || new Date().toISOString()
        : null,
    };
    if (!payload.description) { setSaving(false); setMessage("La description est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editingFeedback === "new";
    const result = isNew
      ? await supabase.from("ppm_feedback_entries").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_feedback_entries").update(payload).eq("id", (editingFeedback as FeedbackEntry).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setFeedback(current => isNew ? [result.data as FeedbackEntry, ...current] : current.map(row => row.id === result.data.id ? result.data as FeedbackEntry : row));
    setEditingFeedback(null);
  }

  async function submitLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      category: String(form.get("category") || "").trim() || null,
      context: String(form.get("context") || "").trim() || null,
      description: String(form.get("description") || "").trim(),
      recommendation: String(form.get("recommendation") || "").trim() || null,
      created_by_name: String(form.get("created_by_name") || "").trim() || null,
    };
    if (!payload.description) { setSaving(false); setMessage("La description est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_lessons_learned").insert({ ...payload, created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setLessons(current => [result.data as LessonLearned, ...current]);
    setEditingLesson(null);
  }

  return <div className="grid gap-8">
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Redevabilite — plaintes & retours</h2><button onClick={() => openFeedbackEditor("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouveau retour</button></div>
      <div className="grid gap-3">
        {feedback.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><b className="text-forest">{categoryLabels[row.category]}</b>{row.source_name && <span className="ml-2 text-xs text-slate-400">{row.source_name}</span>}{row.is_sensitive && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">SENSIBLE</span>}</div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
          </div>
          <p className="mt-2 text-sm text-slate-600">{row.description}</p>
          {row.response && <p className="mt-2 text-sm text-slate-600"><b>Reponse :</b> {row.response}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => openFeedbackEditor(row)} className="btn-secondary px-3 py-1.5 text-xs">Instruire</button>
            {(row.status === "resolved" || row.status === "closed") && <button onClick={() => setFollowingUp(row)} className="btn-primary px-3 py-1.5 text-xs">Suivi</button>}
            {followups.some(item => item.feedback_id === row.id) && <button onClick={() => setHistoryFor(row)} className="text-xs font-bold text-slate-400 underline">Historique</button>}
          </div>
        </article>)}
        {!feedback.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune plainte ni retour enregistre.</p>}
      </div>
    </div>

    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Leçons apprises</h2><button onClick={() => setEditingLesson("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle lecon</button></div>
      <div className="grid gap-3">
        {lessons.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">{row.category && <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">{row.category}</span>}{row.created_by_name && <span className="text-xs text-slate-400">par {row.created_by_name}</span>}</div>
          <p className="mt-2 text-sm text-slate-600">{row.description}</p>
          {row.recommendation && <p className="mt-2 text-sm text-slate-600"><b>Recommandation :</b> {row.recommendation}</p>}
        </article>)}
        {!lessons.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune lecon enregistree.</p>}
      </div>
    </div>

    {editingFeedback && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitFeedback} className="mx-auto my-10 max-w-xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{editingFeedback === "new" ? "Nouveau retour" : "Instruire le retour"}</h2><button type="button" onClick={() => setEditingFeedback(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Source (anonyme si vide)<input name="source_name" defaultValue={editingFeedback !== "new" ? editingFeedback.source_name || "" : ""} className="admin-input" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-bold">Categorie<select name="category" defaultValue={editingFeedback !== "new" ? editingFeedback.category : "feedback"} className="admin-input">{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-bold">Canal
              <select name={channelOther ? undefined : "channel"} defaultValue={editingFeedback !== "new" && editingFeedback.channel && !channelOptions.includes(editingFeedback.channel) ? OTHER : (editingFeedback !== "new" ? editingFeedback.channel || "" : "")} onChange={event => setChannelOther(event.target.value === OTHER)} className="admin-input">
                <option value="">—</option>
                {channelOptions.map(value => <option key={value} value={value}>{value}</option>)}
                <option value={OTHER}>Autre (preciser)</option>
              </select>
              {channelOther && <input name="channel" placeholder="Preciser le canal" defaultValue={editingFeedback !== "new" ? editingFeedback.channel || "" : ""} className="admin-input mt-2" />}
            </label>
          </div>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={3} defaultValue={editingFeedback !== "new" ? editingFeedback.description : ""} required className="admin-input" /></label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="is_sensitive" defaultChecked={editingFeedback !== "new" ? editingFeedback.is_sensitive : false} className="h-4 w-4" />Cas sensible (protection des donnees)</label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editingFeedback !== "new" ? editingFeedback.status : "received"} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Reponse apportee<textarea name="response" rows={2} defaultValue={editingFeedback !== "new" ? editingFeedback.response || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingFeedback(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}

    {editingLesson && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitLesson} className="mx-auto my-10 max-w-xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Nouvelle lecon apprise</h2><button type="button" onClick={() => setEditingLesson(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Categorie<input name="category" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Contexte<textarea name="context" rows={2} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={2} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Recommandation<textarea name="recommendation" rows={2} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Auteur<input name="created_by_name" className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingLesson(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}

    {followingUp && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitFollowup} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Suivi — {categoryLabels[followingUp.category]}</h2><button type="button" onClick={() => setFollowingUp(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Date de suivi<input name="review_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Revu par<input name="reviewer_name" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Action menee<textarea name="action_taken" rows={2} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Statut apres suivi<select name="status_after" defaultValue={followingUp.status} className="admin-input">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Notes<textarea name="notes" rows={2} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setFollowingUp(null)} className="btn-secondary">Annuler</button><button className="btn-primary">Enregistrer le suivi</button></div>
        </div>
      </form>
    </div>}

    {historyFor && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <div className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Historique des suivis</h2><button onClick={() => setHistoryFor(null)} className="text-2xl">×</button></div>
        <div className="mt-4 grid gap-2">
          {followups.filter(item => item.feedback_id === historyFor.id).map(item => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2"><b className="text-forest">{new Date(item.review_date).toLocaleDateString("fr-FR")}</b><span className="text-xs text-slate-400">{statusLabels[item.status_after]}</span>{item.reviewer_name && <span className="text-xs text-slate-400">· {item.reviewer_name}</span>}</div>
            {item.action_taken && <p className="mt-1 text-xs text-slate-500"><b>Action :</b> {item.action_taken}</p>}
            {item.notes && <p className="mt-1 text-xs text-slate-500">{item.notes}</p>}
          </div>)}
        </div>
      </div>
    </div>}
  </div>;
}
