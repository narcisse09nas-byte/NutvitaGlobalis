"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import type { Activity, PPMResource, PPMStatus, ResourceAssignment, ResourceType } from "@/lib/ppm/types";

const typeLabels: Record<ResourceType, string> = { human: "Personnel", consultant: "Consultant", equipment: "Equipement", vehicle: "Vehicule", infrastructure: "Infrastructure" };
const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);

export default function ResourceManager({ projectId, initial, initialAssignments, activities }: {
  projectId: string; initial: PPMResource[]; initialAssignments: ResourceAssignment[]; activities: Activity[];
}) {
  const [rows, setRows] = useState(initial);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [editing, setEditing] = useState<PPMResource | "new" | null>(null);
  const [assigning, setAssigning] = useState<PPMResource | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const activityLabel = (id?: string | null) => activities.find(item => item.id === id)?.title || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      type: String(form.get("type") || "human") as ResourceType,
      name: String(form.get("name") || "").trim(),
      role_title: String(form.get("role_title") || "").trim() || null,
      skills: splitList(String(form.get("skills") || "")),
      availability_percent: form.get("availability_percent") ? Number(form.get("availability_percent")) : null,
      weekly_capacity_hours: form.get("weekly_capacity_hours") ? Number(form.get("weekly_capacity_hours")) : null,
      cost_rate: form.get("cost_rate") ? Number(form.get("cost_rate")) : null,
      cost_unit: String(form.get("cost_unit") || "day"),
      currency: String(form.get("currency") || "XAF"),
      notes: String(form.get("notes") || "").trim() || null,
      status: String(form.get("status") || "active") as PPMStatus,
    };
    if (!payload.name) { setSaving(false); setMessage("Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_resources").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_resources").update(payload).eq("id", (editing as PPMResource).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [...current, result.data as PPMResource] : current.map(row => row.id === result.data.id ? result.data as PPMResource : row));
    setEditing(null);
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigning) return;
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const result = await supabase.from("ppm_resource_assignments").insert({
      project_id: projectId, resource_id: assigning.id,
      activity_id: String(form.get("activity_id") || "") || null,
      allocation_percent: form.get("allocation_percent") ? Number(form.get("allocation_percent")) : null,
      start_date: String(form.get("start_date") || "") || null,
      end_date: String(form.get("end_date") || "") || null,
    }).select("*").single();
    if (!result.error) setAssignments(current => [...current, result.data as ResourceAssignment]);
    setAssigning(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Ressources</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle ressource</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Ressource</th><th className="p-4">Type</th><th className="p-4">Disponibilite</th><th className="p-4">Cout</th><th className="p-4">Affectations</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><b className="text-forest">{row.name}</b>{row.role_title && <p className="mt-1 text-xs text-slate-400">{row.role_title}</p>}</td>
            <td className="p-4">{typeLabels[row.type]}</td>
            <td className="p-4">{row.availability_percent != null ? `${row.availability_percent}%` : "—"}</td>
            <td className="p-4">{row.cost_rate ? `${row.cost_rate.toLocaleString("fr-FR")} ${row.currency || ""}/${row.cost_unit}` : "—"}</td>
            <td className="p-4">{assignments.filter(a => a.resource_id === row.id).map(a => activityLabel(a.activity_id)).join(", ") || "—"}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><div className="flex flex-wrap gap-2"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button><button onClick={() => setAssigning(row)} className="btn-secondary px-3 py-2 text-xs">Affecter</button></div></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={7} className="p-10 text-center text-slate-400">Aucune ressource enregistree.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouvelle ressource" : "Modifier la ressource"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nom<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Type<select name="type" defaultValue={editing !== "new" ? editing.type : "human"} className="admin-input">{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Poste / role<input name="role_title" defaultValue={editing !== "new" ? editing.role_title || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Competences (separees par des virgules)<input name="skills" defaultValue={editing !== "new" ? (editing.skills || []).join(", ") : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Disponibilite (%)<input name="availability_percent" type="number" min="0" max="100" defaultValue={editing !== "new" ? editing.availability_percent ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Capacite hebdo (heures)<input name="weekly_capacity_hours" type="number" min="0" defaultValue={editing !== "new" ? editing.weekly_capacity_hours ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Cout<input name="cost_rate" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.cost_rate ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Unite de cout<select name="cost_unit" defaultValue={editing !== "new" ? editing.cost_unit || "day" : "day"} className="admin-input"><option value="hour">Heure</option><option value="day">Jour</option><option value="week">Semaine</option><option value="month">Mois</option><option value="flat">Forfait</option></select></label>
          <label className="grid gap-2 text-sm font-bold">Devise<input name="currency" defaultValue={editing !== "new" ? editing.currency || "XAF" : "XAF"} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">Brouillon</option><option value="active">Actif</option><option value="on_hold">En pause</option><option value="closed">Cloture</option><option value="cancelled">Annule</option></select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Notes<textarea name="notes" rows={2} defaultValue={editing !== "new" ? editing.notes || "" : ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}

    {assigning && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submitAssignment} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Affecter {assigning.name}</h2><button type="button" onClick={() => setAssigning(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Activite<select name="activity_id" className="admin-input"><option value="">Aucune</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Taux d&apos;allocation (%)<input name="allocation_percent" type="number" min="0" max="100" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date de debut<input name="start_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date de fin<input name="end_date" type="date" className="admin-input" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAssigning(null)} className="btn-secondary">Annuler</button><button className="btn-primary">Affecter</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
