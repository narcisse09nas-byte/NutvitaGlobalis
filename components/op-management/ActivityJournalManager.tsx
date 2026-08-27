"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { nextSequence } from "@/lib/ppm/ids";
import type { ActivityJournalCategory, ActivityJournalEntry, PPMResource } from "@/lib/ppm/types";

const categoryLabels: Record<ActivityJournalCategory, { fr: string; en: string }> = {
  milestone: { fr: "Jalon", en: "Milestone" }, decision: { fr: "Decision", en: "Decision" },
  issue: { fr: "Probleme", en: "Issue" }, meeting: { fr: "Reunion", en: "Meeting" },
  field_visit: { fr: "Visite terrain", en: "Field visit" }, other: { fr: "Autre", en: "Other" },
};

export default function ActivityJournalManager({ projectId, initial, staff = [] }: {
  projectId: string; initial: ActivityJournalEntry[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const seq = await nextSequence(supabase, projectId, "activity_journal").catch(() => null);
    const code = seq ? `JRN-${String(seq).padStart(3, "0")}` : null;
    const result = await supabase.from("ppm_project_activity_journal").insert({
      project_id: projectId, code,
      entry_date: String(form.get("entry_date") || "") || new Date().toISOString().slice(0, 10),
      category: String(form.get("category") || "") as ActivityJournalCategory || null,
      title, description: String(form.get("description") || "").trim() || null,
      author_name: String(form.get("author_name") || "").trim() || null,
      created_by: user?.id,
    }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => [result.data as ActivityJournalEntry, ...current]);
    setCreating(false);
  }

  async function removeEntry(entry: ActivityJournalEntry) {
    if (!window.confirm(en ? "Delete this entry?" : "Supprimer cette entree ?")) return;
    const result = await createClient().from("ppm_project_activity_journal").delete().eq("id", entry.id);
    if (!result.error) setRows(current => current.filter(item => item.id !== entry.id));
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Activity journal" : "Journal d'activite"}</h2><button onClick={() => setCreating(true)} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New entry" : "Nouvelle entree"}</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">ID</th><th className="p-3">{en ? "Date" : "Date"}</th><th className="p-3">{en ? "Category" : "Categorie"}</th><th className="p-3">{en ? "Title" : "Titre"}</th><th className="p-3">{en ? "Author" : "Auteur"}</th><th className="p-3"></th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-3 font-mono text-xs font-bold text-slate-500">{row.code}</td>
            <td className="p-3">{new Date(row.entry_date).toLocaleDateString("fr-FR")}</td>
            <td className="p-3">{row.category ? categoryLabels[row.category][locale] : "—"}</td>
            <td className="p-3"><b className="text-forest">{row.title}</b>{row.description && <p className="mt-1 text-xs text-slate-500">{row.description}</p>}</td>
            <td className="p-3">{row.author_name || "—"}</td>
            <td className="p-3"><button onClick={() => removeEntry(row)} className="text-xs font-bold text-red-600">{en ? "Delete" : "Supprimer"}</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">{en ? "No entry recorded yet." : "Aucune entree enregistree pour le moment."}</td></tr>}
        </tbody>
      </table>
    </div>

    {creating && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New journal entry" : "Nouvelle entree de journal"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Date" : "Date"}<input name="entry_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Category" : "Categorie"}<select name="category" defaultValue="" className="admin-input"><option value="">—</option>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Title" : "Titre"}<input name="title" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Description" : "Description"}<textarea name="description" rows={3} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Author" : "Auteur"}<SearchableSelect name="author_name" options={staffOptions} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
