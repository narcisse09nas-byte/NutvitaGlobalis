"use client";
// Refinement program, Wave 4: budget coding hierarchy (Categorie -> Sous-categorie -> ... ->
// libelle), mirroring lib/ppm/wbs.ts's tree pattern exactly — unlimited depth like the Result
// Chain (ResultChainManager.tsx), since a budget chart of accounts doesn't have a fixed number
// of levels the way WBS does.
import { useMemo, useState, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { buildBudgetCategoryTree, type BudgetCategoryTreeNode } from "@/lib/ppm/budget-categories";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { BudgetCategory } from "@/lib/ppm/types";

export default function BudgetCategoryManager({ projectId, initial }: { projectId: string; initial: BudgetCategory[] }) {
  const { en } = usePpmLocale();
  const [categories, setCategories] = useState(initial);
  const [adding, setAdding] = useState<{ parentId: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const tree = useMemo(() => buildBudgetCategoryTree(categories), [categories]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adding) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) { setSaving(false); return; }
    const supabase = createClient();
    const result = await supabase.from("ppm_budget_categories").insert({
      project_id: projectId, parent_id: adding.parentId, title,
      order_index: categories.filter(item => (item.parent_id || null) === adding.parentId).length,
    }).select("*").single();
    setSaving(false);
    if (!result.error) setCategories(current => [...current, result.data as BudgetCategory]);
    setAdding(null);
  }

  async function remove(id: string) {
    if (!confirm(en ? "Delete this category and its subcategories?" : "Supprimer cette categorie et ses sous-categories ?")) return;
    await createClient().from("ppm_budget_categories").delete().eq("id", id);
    const toRemove = new Set<string>([id]);
    let grew = true;
    while (grew) { grew = false; for (const category of categories) if (category.parent_id && toRemove.has(category.parent_id) && !toRemove.has(category.id)) { toRemove.add(category.id); grew = true; } }
    setCategories(current => current.filter(category => !toRemove.has(category.id)));
  }

  function renderNode(node: BudgetCategoryTreeNode, depth: number) {
    return <div key={node.id} className="grid gap-2" style={{ marginLeft: depth * 24 }}>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3">
        <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{node.code}</span>
        <b className="text-forest">{node.title}</b>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setAdding({ parentId: node.id })} className="rounded-lg border px-3 py-1.5 text-xs font-bold">+ {en ? "Subcategory" : "Sous-categorie"}</button>
          <button onClick={() => remove(node.id)} aria-label={en ? "Delete" : "Supprimer"} className="rounded-lg border border-red-200 p-1.5 text-red-600"><TrashIcon className="h-4" /></button>
        </div>
      </div>
      {node.children.map(child => renderNode(child, depth + 1))}
    </div>;
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Budget categories" : "Categories budgetaires"}</h2><button onClick={() => setAdding({ parentId: null })} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New category" : "Nouvelle categorie"}</button></div>
    <div className="grid gap-2">
      {tree.map(node => renderNode(node, 0))}
      {!tree.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No budget category yet. Start with a main category." : "Aucune categorie budgetaire. Commencez par une categorie principale."}</p>}
    </div>

    {adding && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New category" : "Nouvelle categorie"}</h2><button type="button" onClick={() => setAdding(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Title" : "Titre"}<input name="title" required className="admin-input" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAdding(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Adding..." : "Ajout...") : (en ? "Add" : "Ajouter")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
