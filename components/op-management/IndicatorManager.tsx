"use client";
import { useMemo, useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import { buildResultChainTree, flattenResultChainTree } from "@/lib/ppm/result-chain";
import type { Indicator, PPMStatus, ResultChainNode } from "@/lib/ppm/types";

const splitList = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);
const levelLabels = { impact: "Impact", outcome: "Outcome", output: "Output" } as const;
const unitOptions = ["%", "Nombre", "Ratio", "Kg", "Tonnes", "Menages", "Personnes", "Hectares", "XAF", "USD", "EUR"];
const frequencyOptions = ["Hebdomadaire", "Mensuelle", "Trimestrielle", "Semestrielle", "Annuelle", "Ponctuelle"];
const OTHER = "__other__";

export default function IndicatorManager({ projectId, initial, resultChain }: { projectId: string; initial: Indicator[]; resultChain: ResultChainNode[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Indicator | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [unitOther, setUnitOther] = useState(false);
  const [frequencyOther, setFrequencyOther] = useState(false);
  const resultOptions = useMemo(() => flattenResultChainTree(buildResultChainTree(resultChain)), [resultChain]);
  const resultById = useMemo(() => new Map(resultOptions.map(item => [item.id, item])), [resultOptions]);
  const resultLabel = (id?: string | null) => { const item = resultById.get(id || ""); return item ? `${item.code} — ${item.title}` : "—"; };
  const indicatorCode = (indicator: Indicator) => {
    const index = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at)).findIndex(item => item.id === indicator.id);
    return `IND-${String(index + 1).padStart(2, "0")}`;
  };

  function openEditing(row: Indicator | "new") {
    setMessage("");
    setUnitOther(row !== "new" && !!row.unit && !unitOptions.includes(row.unit));
    setFrequencyOther(row !== "new" && !!row.frequency && !frequencyOptions.includes(row.frequency));
    setEditing(row);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      result_chain_id: String(form.get("result_chain_id") || "") || null,
      code: String(form.get("code") || "").trim() || null,
      name: String(form.get("name") || "").trim(),
      definition: String(form.get("definition") || "").trim() || null,
      unit: String(form.get("unit") || "").trim() || null,
      baseline: form.get("baseline") ? Number(form.get("baseline")) : null,
      target: form.get("target") ? Number(form.get("target")) : null,
      current_value: form.get("current_value") ? Number(form.get("current_value")) : null,
      verification_source: String(form.get("verification_source") || "").trim() || null,
      frequency: String(form.get("frequency") || "").trim() || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      disaggregations: splitList(String(form.get("disaggregations") || "")),
      comments: String(form.get("comments") || "").trim() || null,
      status: String(form.get("status") || "active") as PPMStatus,
    };
    if (!payload.name) { setSaving(false); setMessage("Le nom est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_indicators").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_indicators").update(payload).eq("id", (editing as Indicator).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [...current, result.data as Indicator] : current.map(row => row.id === result.data.id ? result.data as Indicator : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Indicateurs</h2><button onClick={() => openEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvel indicateur</button></div>
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Indicateur</th><th className="p-4">Resultat lie</th><th className="p-4">Baseline → Cible</th><th className="p-4">Valeur actuelle</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4"><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.code || indicatorCode(row)}</span><b className="text-forest">{row.name}</b></td>
            <td className="p-4">{resultLabel(row.result_chain_id)}</td>
            <td className="p-4">{row.baseline ?? "—"} → {row.target ?? "—"} {row.unit || ""}</td>
            <td className="p-4">{row.current_value ?? "—"}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><button onClick={() => openEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={6} className="p-10 text-center text-slate-400">Aucun indicateur enregistre.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouvel indicateur" : "Modifier l'indicateur"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Nom<input name="name" defaultValue={editing !== "new" ? editing.name : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Code (facultatif — sinon {editing !== "new" ? indicatorCode(editing) : "auto-genere"})<input name="code" defaultValue={editing !== "new" ? editing.code || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Resultat lie<select name="result_chain_id" defaultValue={editing !== "new" ? editing.result_chain_id || "" : ""} className="admin-input"><option value="">Aucun</option>{resultOptions.map(item => <option key={item.id} value={item.id}>{item.code} — {item.title} ({levelLabels[item.level]})</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Definition<textarea name="definition" rows={2} defaultValue={editing !== "new" ? editing.definition || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Unite
            <select name={unitOther ? undefined : "unit"} className="admin-input" defaultValue={editing !== "new" && editing.unit && !unitOptions.includes(editing.unit) ? OTHER : (editing !== "new" ? editing.unit || "" : "")} onChange={event => setUnitOther(event.target.value === OTHER)}>
              <option value="">—</option>
              {unitOptions.map(value => <option key={value} value={value}>{value}</option>)}
              <option value={OTHER}>Autre (preciser)</option>
            </select>
            {unitOther && <input name="unit" placeholder="Preciser l'unite" defaultValue={editing !== "new" ? editing.unit || "" : ""} className="admin-input mt-2" />}
          </label>
          <label className="grid gap-2 text-sm font-bold">Frequence
            <select name={frequencyOther ? undefined : "frequency"} className="admin-input" defaultValue={editing !== "new" && editing.frequency && !frequencyOptions.includes(editing.frequency) ? OTHER : (editing !== "new" ? editing.frequency || "" : "")} onChange={event => setFrequencyOther(event.target.value === OTHER)}>
              <option value="">—</option>
              {frequencyOptions.map(value => <option key={value} value={value}>{value}</option>)}
              <option value={OTHER}>Autre (preciser)</option>
            </select>
            {frequencyOther && <input name="frequency" placeholder="Preciser la frequence" defaultValue={editing !== "new" ? editing.frequency || "" : ""} className="admin-input mt-2" />}
          </label>
          <label className="grid gap-2 text-sm font-bold">Baseline<input name="baseline" type="number" step="0.01" defaultValue={editing !== "new" ? editing.baseline ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Cible<input name="target" type="number" step="0.01" defaultValue={editing !== "new" ? editing.target ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Valeur actuelle<input name="current_value" type="number" step="0.01" defaultValue={editing !== "new" ? editing.current_value ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Responsable<input name="responsible_name" defaultValue={editing !== "new" ? editing.responsible_name || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Source de verification<input name="verification_source" defaultValue={editing !== "new" ? editing.verification_source || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Desagregations (separees par des virgules)<input name="disaggregations" defaultValue={editing !== "new" ? (editing.disaggregations || []).join(", ") : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Commentaires<textarea name="comments" rows={2} defaultValue={editing !== "new" ? editing.comments || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">Brouillon</option><option value="active">Actif</option><option value="on_hold">En pause</option><option value="closed">Cloture</option><option value="cancelled">Annule</option></select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
