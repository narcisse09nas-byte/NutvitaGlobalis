"use client";
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { buildWbsTree, type WBSTreeNode } from "@/lib/ppm/wbs";
import type { WBSNode } from "@/lib/ppm/types";

const levelNames = ["", "Projet", "Composante", "Sous-composante", "Work Package"];

export default function WBSTreeEditor({ projectId, initial }: { projectId: string; initial: WBSNode[] }) {
  const [nodes, setNodes] = useState(initial);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<WBSTreeNode | { parentId: string | null; level: 1 | 2 | 3 | 4 } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const tree = useMemo(() => buildWbsTree(nodes), [nodes]);
  const isNewNode = editing !== null && !("id" in editing);

  function toggle(id: string) {
    setCollapsed(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
      scope_included: String(form.get("scope_included") || "").trim() || null,
      scope_excluded: String(form.get("scope_excluded") || "").trim() || null,
      responsible_name: String(form.get("responsible_name") || "").trim() || null,
      expected_result: String(form.get("expected_result") || "").trim() || null,
      deliverables: String(form.get("deliverables") || "").trim() || null,
      acceptance_criteria: String(form.get("acceptance_criteria") || "").trim() || null,
      estimated_duration_days: form.get("estimated_duration_days") ? Number(form.get("estimated_duration_days")) : null,
      estimated_cost: form.get("estimated_cost") ? Number(form.get("estimated_cost")) : null,
    };
    if (!payload.title) { setSaving(false); setMessage("Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (isNewNode) {
      const { parentId, level } = editing as { parentId: string | null; level: 1 | 2 | 3 | 4 };
      const orderIndex = nodes.filter(node => (node.parent_id || null) === parentId).length;
      const result = await supabase.from("ppm_wbs_nodes").insert({ project_id: projectId, parent_id: parentId, level, order_index: orderIndex, ...payload, created_by: user?.id }).select("*").single();
      setSaving(false);
      if (result.error) { setMessage(result.error.message); return; }
      setNodes(current => [...current, result.data as WBSNode]);
    } else {
      const node = editing as WBSTreeNode;
      const result = await supabase.from("ppm_wbs_nodes").update(payload).eq("id", node.id).select("*").single();
      setSaving(false);
      if (result.error) { setMessage(result.error.message); return; }
      setNodes(current => current.map(item => item.id === node.id ? result.data as WBSNode : item));
    }
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce noeud et tous ses descendants ?")) return;
    await createClient().from("ppm_wbs_nodes").delete().eq("id", id);
    const toRemove = new Set<string>([id]);
    let grew = true;
    while (grew) { grew = false; for (const node of nodes) if (node.parent_id && toRemove.has(node.parent_id) && !toRemove.has(node.id)) { toRemove.add(node.id); grew = true; } }
    setNodes(current => current.filter(node => !toRemove.has(node.id)));
  }

  function renderNode(node: WBSTreeNode, depth: number) {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    return <div key={node.id}>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3" style={{ marginLeft: depth * 24 }}>
        {hasChildren ? <button onClick={() => toggle(node.id)} aria-label="Basculer">{isCollapsed ? <ChevronRightIcon className="h-4" /> : <ChevronDownIcon className="h-4" />}</button> : <span className="w-4" />}
        <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{node.code}</span>
        <button onClick={() => setEditing(node)} className="text-left font-bold text-forest hover:underline">{node.title}</button>
        <span className="text-xs text-slate-400">{levelNames[node.level]}</span>
        {node.responsible_name && <span className="text-xs text-slate-400">· {node.responsible_name}</span>}
        <div className="ml-auto flex gap-2">
          {node.level === 4 && <Link href={`/op-management/projets/${projectId}/work-packages/${node.id}`} className="rounded-lg border px-3 py-1.5 text-xs font-bold text-leaf">Vue 360°</Link>}
          {node.level < 4 && <button onClick={() => setEditing({ parentId: node.id, level: (node.level + 1) as 1 | 2 | 3 | 4 })} className="rounded-lg border px-3 py-1.5 text-xs font-bold">+ Sous-niveau</button>}
          <button onClick={() => remove(node.id)} aria-label="Supprimer" className="rounded-lg border border-red-200 p-1.5 text-red-600"><TrashIcon className="h-4" /></button>
        </div>
      </div>
      {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
    </div>;
  }

  const editingNode = editing && "id" in editing ? editing as WBSTreeNode : null;

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black text-forest">Work Breakdown Structure</h2>
      <button onClick={() => setEditing({ parentId: null, level: 1 })} className="btn-primary px-4 py-2 text-sm"><PlusIcon className="mr-2 h-4" />Nouvelle racine</button>
    </div>
    <div className="grid gap-2">
      {tree.map(node => renderNode(node, 0))}
      {!tree.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">Aucun WBS. Creez le premier niveau (le projet lui-meme).</p>}
    </div>

    {editing && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{isNewNode ? `Nouveau — ${levelNames[(editing as { level: number }).level]}` : `Fiche WBS — ${editingNode?.code}`}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Fermer"><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Titre<input name="title" defaultValue={editingNode?.title || ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editingNode?.description || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Perimetre inclus<textarea name="scope_included" rows={2} defaultValue={editingNode?.scope_included || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Perimetre exclu<textarea name="scope_excluded" rows={2} defaultValue={editingNode?.scope_excluded || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Responsable<input name="responsible_name" defaultValue={editingNode?.responsible_name || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Resultat attendu<input name="expected_result" defaultValue={editingNode?.expected_result || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Livrables<input name="deliverables" defaultValue={editingNode?.deliverables || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Criteres d&apos;acceptation<input name="acceptance_criteria" defaultValue={editingNode?.acceptance_criteria || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Duree estimee (jours)<input name="estimated_duration_days" type="number" min="0" defaultValue={editingNode?.estimated_duration_days ?? ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Cout estimatif<input name="estimated_cost" type="number" min="0" step="0.01" defaultValue={editingNode?.estimated_cost ?? ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">Annuler</button><button disabled={saving} className="btn-primary">{saving ? "Enregistrement..." : "Enregistrer"}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
