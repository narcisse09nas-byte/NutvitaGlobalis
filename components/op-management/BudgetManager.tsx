"use client";
import { useMemo, useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import EntityStatusBadge from "@/components/op-management/EntityStatusBadge";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { buildBudgetCategoryTree, flattenBudgetCategoryTree } from "@/lib/ppm/budget-categories";
import type { BudgetCategory, BudgetLine, PPMStatus, WBSNode } from "@/lib/ppm/types";

export default function BudgetManager({ projectId, initial, wbsNodes, budgetCategories }: {
  projectId: string; initial: BudgetLine[]; wbsNodes: WBSNode[]; budgetCategories: BudgetCategory[];
}) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<BudgetLine | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const wbsLabel = (id?: string | null) => wbsNodes.find(item => item.id === id)?.title || "—";
  const categoryOptions = useMemo(() => flattenBudgetCategoryTree(buildBudgetCategoryTree(budgetCategories)), [budgetCategories]);
  const categoryById = useMemo(() => new Map(categoryOptions.map(item => [item.id, item])), [categoryOptions]);
  // Refinement program, Wave 4: budget line code = {category code}.{line position within that
  // category} — computed, never stored, same convention as every other registry code this wave.
  const lineCode = (row: BudgetLine) => {
    if (!row.budget_category_id) return null;
    const category = categoryById.get(row.budget_category_id);
    if (!category) return null;
    const siblings = [...rows].filter(item => item.budget_category_id === row.budget_category_id).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const index = siblings.findIndex(item => item.id === row.id);
    return `${category.code}.${index + 1}`;
  };
  // Refinement program, Wave 4: Donor/Grant become dropdowns after first entry — a plain
  // <datalist> of values already used on this project, same "known values grow as you type"
  // pattern as Wave 1's Site division/subdivision suggestions.
  const donorSuggestions = useMemo(() => Array.from(new Set(rows.map(item => item.donor_name).filter((value): value is string => !!value))), [rows]);
  const grantSuggestions = useMemo(() => Array.from(new Set(rows.map(item => item.grant_reference).filter((value): value is string => !!value))), [rows]);

  const totals = useMemo(() => rows.reduce((sum, row) => ({
    initial: sum.initial + Number(row.initial_budget || 0),
    revised: sum.revised + Number(row.revised_budget ?? row.initial_budget ?? 0),
    committed: sum.committed + Number(row.committed_amount || 0),
    spent: sum.spent + Number(row.spent_amount || 0),
  }), { initial: 0, revised: 0, committed: 0, spent: 0 }), [rows]);
  const balance = totals.revised - totals.spent;
  const burnRate = totals.revised > 0 ? Math.round((totals.spent / totals.revised) * 100) : 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      project_id: projectId,
      wbs_node_id: String(form.get("wbs_node_id") || "") || null,
      budget_category_id: String(form.get("budget_category_id") || "") || null,
      donor_name: String(form.get("donor_name") || "").trim() || null,
      grant_reference: String(form.get("grant_reference") || "").trim() || null,
      description: String(form.get("description") || "").trim(),
      initial_budget: Number(form.get("initial_budget") || 0),
      revised_budget: form.get("revised_budget") ? Number(form.get("revised_budget")) : null,
      committed_amount: Number(form.get("committed_amount") || 0),
      spent_amount: Number(form.get("spent_amount") || 0),
      forecast_amount: form.get("forecast_amount") ? Number(form.get("forecast_amount")) : null,
      currency: String(form.get("currency") || "XAF"),
      exchange_rate: form.get("exchange_rate") ? Number(form.get("exchange_rate")) : 1,
      period_start: String(form.get("period_start") || "") || null,
      period_end: String(form.get("period_end") || "") || null,
      status: String(form.get("status") || "active") as PPMStatus,
    };
    if (!payload.description) { setSaving(false); setMessage("La description est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isNew = editing === "new";
    const result = isNew
      ? await supabase.from("ppm_budget_lines").insert({ ...payload, created_by: user?.id }).select("*").single()
      : await supabase.from("ppm_budget_lines").update(payload).eq("id", (editing as BudgetLine).id).select("*").single();
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    setRows(current => isNew ? [result.data as BudgetLine, ...current] : current.map(row => row.id === result.data.id ? result.data as BudgetLine : row));
    setEditing(null);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">Budget</h2><button onClick={() => setEditing("new")} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle ligne budgetaire</button></div>

    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Budget initial</p><b className="mt-1 block text-xl text-forest">{totals.initial.toLocaleString("fr-FR")}</b></div>
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Budget revise</p><b className="mt-1 block text-xl text-forest">{totals.revised.toLocaleString("fr-FR")}</b></div>
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Engage</p><b className="mt-1 block text-xl text-forest">{totals.committed.toLocaleString("fr-FR")}</b></div>
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Depense</p><b className="mt-1 block text-xl text-forest">{totals.spent.toLocaleString("fr-FR")}</b></div>
      <div className="rounded-2xl border bg-white p-4"><p className="text-xs font-bold uppercase text-slate-400">Solde · Burn rate</p><b className="mt-1 block text-xl text-forest">{balance.toLocaleString("fr-FR")} · {burnRate}%</b></div>
    </div>

    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Ligne</th><th className="p-4">Rattachement</th><th className="p-4">Initial</th><th className="p-4">Revise</th><th className="p-4">Engage</th><th className="p-4">Depense</th><th className="p-4">Statut</th><th className="p-4">Action</th></tr></thead>
        <tbody>
          {rows.map(row => <tr key={row.id} className="border-t align-top">
            <td className="p-4">
              {lineCode(row) ? <span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{lineCode(row)}</span> : null}
              <b className="text-forest">{row.description}</b>
              {row.budget_category_id ? <p className="mt-1 text-xs text-slate-400">{categoryById.get(row.budget_category_id)?.title}</p> : row.cost_category && <p className="mt-1 text-xs text-slate-400">{row.cost_category}{row.sub_category ? ` · ${row.sub_category}` : ""}</p>}
            </td>
            <td className="p-4">{wbsLabel(row.wbs_node_id)}{row.donor_name && <p className="mt-1 text-xs text-slate-400">Bailleur : {row.donor_name}</p>}</td>
            <td className="p-4">{row.initial_budget.toLocaleString("fr-FR")}</td>
            <td className="p-4">{(row.revised_budget ?? row.initial_budget).toLocaleString("fr-FR")}</td>
            <td className="p-4">{row.committed_amount.toLocaleString("fr-FR")}</td>
            <td className="p-4">{row.spent_amount.toLocaleString("fr-FR")}</td>
            <td className="p-4"><EntityStatusBadge status={row.status} /></td>
            <td className="p-4"><button onClick={() => setEditing(row)} className="btn-secondary px-3 py-2 text-xs">Modifier</button></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={8} className="p-10 text-center text-slate-400">Aucune ligne budgetaire.</td></tr>}
        </tbody>
      </table>
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{editing === "new" ? "Nouvelle ligne budgetaire" : "Modifier la ligne"}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<input name="description" defaultValue={editing !== "new" ? editing.description : ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Categorie budgetaire<SearchableSelect name="budget_category_id" options={categoryOptions.map(item => ({ value: item.id, label: `${item.code} — ${item.title}` }))} defaultValue={editing !== "new" ? editing.budget_category_id || "" : ""} placeholder="Selectionner une categorie..." /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Rattachement WBS<select name="wbs_node_id" defaultValue={editing !== "new" ? editing.wbs_node_id || "" : ""} className="admin-input"><option value="">Aucun</option>{wbsNodes.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Bailleur<input name="donor_name" list="donor-suggestions" defaultValue={editing !== "new" ? editing.donor_name || "" : ""} className="admin-input" />
            <datalist id="donor-suggestions">{donorSuggestions.map(value => <option key={value} value={value} />)}</datalist>
          </label>
          <label className="grid gap-2 text-sm font-bold">Reference Grant<input name="grant_reference" list="grant-suggestions" defaultValue={editing !== "new" ? editing.grant_reference || "" : ""} className="admin-input" />
            <datalist id="grant-suggestions">{grantSuggestions.map(value => <option key={value} value={value} />)}</datalist>
          </label>
          <label className="grid gap-2 text-sm font-bold">Budget initial<input name="initial_budget" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.initial_budget : 0} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Budget revise<input name="revised_budget" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.revised_budget ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Montant engage<input name="committed_amount" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.committed_amount : 0} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Montant depense<input name="spent_amount" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.spent_amount : 0} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Prevision<input name="forecast_amount" type="number" min="0" step="0.01" defaultValue={editing !== "new" ? editing.forecast_amount ?? "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Devise<input name="currency" defaultValue={editing !== "new" ? editing.currency || "XAF" : "XAF"} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Taux de change<input name="exchange_rate" type="number" min="0" step="0.0001" defaultValue={editing !== "new" ? editing.exchange_rate ?? 1 : 1} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Periode debut<input name="period_start" type="date" defaultValue={editing !== "new" ? editing.period_start || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Periode fin<input name="period_end" type="date" defaultValue={editing !== "new" ? editing.period_end || "" : ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Statut<select name="status" defaultValue={editing !== "new" ? editing.status : "active"} className="admin-input"><option value="draft">Brouillon</option><option value="active">Actif</option><option value="on_hold">En pause</option><option value="closed">Cloture</option><option value="cancelled">Annule</option></select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
