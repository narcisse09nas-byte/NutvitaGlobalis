"use client";
import { useMemo, useState, type FormEvent } from "react";
import { PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { buildResultChainTree, type ResultChainTreeNode } from "@/lib/ppm/result-chain";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { ResultChainNode, ResultLevel } from "@/lib/ppm/types";

const levelLabels: Record<ResultLevel, string> = { impact: "Impact", outcome: "Outcome", output: "Output" };
const childLevel: Record<ResultLevel, ResultLevel | null> = { impact: "outcome", outcome: "output", output: null };

export default function ResultChainManager({ projectId, initial }: { projectId: string; initial: ResultChainNode[] }) {
  const { en } = usePpmLocale();
  const [nodes, setNodes] = useState(initial);
  const [adding, setAdding] = useState<{ parentId: string | null; level: ResultLevel } | null>(null);
  const [saving, setSaving] = useState(false);
  const tree = useMemo(() => buildResultChainTree(nodes), [nodes]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adding) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) { setSaving(false); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const result = await supabase.from("ppm_result_chains").insert({
      project_id: projectId, parent_id: adding.parentId, level: adding.level, title,
      description: String(form.get("description") || "").trim() || null,
      order_index: nodes.filter(n => (n.parent_id || null) === adding.parentId).length,
      created_by: user?.id,
    }).select("*").single();
    setSaving(false);
    if (!result.error) setNodes(current => [...current, result.data as ResultChainNode]);
    setAdding(null);
  }

  async function remove(id: string) {
    if (!confirm(en ? "Delete this node and its children?" : "Supprimer ce noeud et ses enfants ?")) return;
    await createClient().from("ppm_result_chains").delete().eq("id", id);
    setNodes(current => current.filter(node => node.id !== id && node.parent_id !== id));
  }

  function renderNode(node: ResultChainTreeNode, depth: number) {
    const next = childLevel[node.level];
    return <div key={node.id} className="grid gap-2" style={{ marginLeft: depth * 24 }}>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3">
        <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{node.code}</span>
        <span className="rounded-full bg-mint px-3 py-1 text-xs font-black text-forest">{levelLabels[node.level]}</span>
        <b className="text-forest">{node.title}</b>
        {node.description && <span className="text-xs text-slate-400">{node.description}</span>}
        <div className="ml-auto flex gap-2">
          {next && <button onClick={() => setAdding({ parentId: node.id, level: next })} className="rounded-lg border px-3 py-1.5 text-xs font-bold">+ {levelLabels[next]}</button>}
          <button onClick={() => remove(node.id)} aria-label={en ? "Delete" : "Supprimer"} className="rounded-lg border border-red-200 p-1.5 text-red-600"><TrashIcon className="h-4" /></button>
        </div>
      </div>
      {node.children.map(child => renderNode(child, depth + 1))}
    </div>;
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Results framework" : "Cadre de resultats"}</h2><button onClick={() => setAdding({ parentId: null, level: "impact" })} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />{en ? "New Impact" : "Nouvel Impact"}</button></div>
    <div className="grid gap-2">
      {tree.map(node => renderNode(node, 0))}
      {!tree.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No results framework yet. Start with an Impact." : "Aucun cadre de resultats. Commencez par un Impact."}</p>}
    </div>

    {adding && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New" : "Nouveau"} {levelLabels[adding.level]}</h2><button type="button" onClick={() => setAdding(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Title" : "Titre"}<input name="title" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Description<textarea name="description" rows={3} className="admin-input" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setAdding(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Adding..." : "Ajout...") : (en ? "Add" : "Ajouter")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
