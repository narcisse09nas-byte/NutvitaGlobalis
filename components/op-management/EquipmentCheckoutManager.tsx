"use client";
import { useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import type { Activity, EquipmentCheckout, EquipmentCheckoutStatus, PPMResource } from "@/lib/ppm/types";

const statusLabels: Record<EquipmentCheckoutStatus, string> = { checked_out: "Sorti", returned: "Retourne", lost: "Perdu", damaged: "Endommage" };
const statusTones: Record<EquipmentCheckoutStatus, string> = {
  checked_out: "bg-amber-50 text-amber-800", returned: "bg-mint text-forest", lost: "bg-red-50 text-red-700", damaged: "bg-red-50 text-red-700",
};

export default function EquipmentCheckoutManager({ projectId, initial, equipment, activities }: {
  projectId: string; initial: EquipmentCheckout[]; equipment: PPMResource[]; activities: Activity[];
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<"new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const equipmentLabel = (id: string) => equipment.find(item => item.id === id)?.name || "—";
  const activityLabel = (id?: string | null) => activities.find(item => item.id === id)?.title || "—";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      resource_id: String(form.get("resource_id") || ""),
      activity_id: String(form.get("activity_id") || "") || null,
      user_name: String(form.get("user_name") || "").trim() || null,
      checkout_date: String(form.get("checkout_date") || "") || null,
      expected_return_date: String(form.get("expected_return_date") || "") || null,
      condition_out: String(form.get("condition_out") || "").trim() || null,
    };
    if (!payload.resource_id) { setSaving(false); setMessage("L'equipement est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_equipment_checkouts").insert({ ...payload, status: "checked_out", created_by: user?.id }).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => [result.data as EquipmentCheckout, ...current]);
    setEditing(null);
  }

  async function registerReturn(row: EquipmentCheckout) {
    const conditionIn = prompt("Etat au retour :");
    const incident = prompt("Incident eventuel (laisser vide si aucun) :");
    const supabase = createClient();
    const result = await supabase.from("ppm_equipment_checkouts").update({
      status: incident ? "damaged" : "returned", actual_return_date: new Date().toISOString().slice(0, 10),
      condition_in: conditionIn || null, incident_note: incident || null,
    }).eq("id", row.id).select("*").single();
    if (!result.error) setRows(current => current.map(item => item.id === row.id ? result.data as EquipmentCheckout : item));
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Equipements</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle sortie</button></div>
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><b className="text-forest">{equipmentLabel(row.resource_id)}</b><p className="mt-1 text-xs text-slate-400">{row.user_name || "—"}{row.activity_id ? ` · ${activityLabel(row.activity_id)}` : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status]}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">Sortie : {row.checkout_date ? new Date(row.checkout_date).toLocaleDateString("fr-FR") : "—"} · Retour prevu : {row.expected_return_date ? new Date(row.expected_return_date).toLocaleDateString("fr-FR") : "—"} · Retour reel : {row.actual_return_date ? new Date(row.actual_return_date).toLocaleDateString("fr-FR") : "—"}</p>
        {row.incident_note && <p className="mt-2 text-sm text-red-600">Incident : {row.incident_note}</p>}
        {row.status === "checked_out" && <button onClick={() => registerReturn(row)} className="btn-primary mt-3 px-3 py-1.5 text-xs">Enregistrer le retour</button>}
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucune sortie d&apos;equipement.</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">Nouvelle sortie</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">Equipement<select name="resource_id" required className="admin-input"><option value="">Selectionner...</option>{equipment.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Activite<select name="activity_id" className="admin-input"><option value="">Aucune</option>{activities.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Utilisateur<input name="user_name" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Date de sortie<input name="checkout_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Retour prevu<input name="expected_return_date" type="date" className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Etat au depart<input name="condition_out" className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
