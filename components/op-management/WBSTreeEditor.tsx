"use client";
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { buildWbsTree, type WBSTreeNode } from "@/lib/ppm/wbs";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import type { ChangeRequest, PPMResource, WBSNode } from "@/lib/ppm/types";

const levelNamesFr = ["", "Projet", "Composante", "Sous-composante", "Work Package"];
const levelNamesEn = ["", "Project", "Component", "Sub-component", "Work Package"];

export default function WBSTreeEditor({ projectId, initial, staff = [], locked = false, changeRequests = [], selectedChangeRequestId = "", baselineId = "" }: { projectId: string; initial: WBSNode[]; staff?: PPMResource[]; locked?: boolean; changeRequests?: ChangeRequest[]; selectedChangeRequestId?: string; baselineId?: string }) {
  const { en } = usePpmLocale();
  const levelNames = en ? levelNamesEn : levelNamesFr;
  const staffOptions = staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }));
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
    if (!editing || locked) return;
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
      change_request_id: String(form.get("change_request_id") || "").trim() || null,
    };
    if (!payload.title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
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
    if (locked) return;
    if (!confirm(en ? "Delete this node and all its descendants?" : "Supprimer ce noeud et tous ses descendants ?")) return;
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
        {hasChildren ? <button onClick={() => toggle(node.id)} aria-label={en ? "Toggle" : "Basculer"}>{isCollapsed ? <ChevronRightIcon className="h-4" /> : <ChevronDownIcon className="h-4" />}</button> : <span className="w-4" />}
        <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{node.code}</span>
        <button onClick={() => !locked && setEditing(node)} disabled={locked} className="text-left font-bold text-forest hover:underline disabled:cursor-default disabled:no-underline">{node.title}</button>
        <span className="text-xs text-slate-400">{levelNames[node.level]}</span>
        {node.responsible_name && <span className="text-xs text-slate-400">· {node.responsible_name}</span>}
        <div className="ml-auto flex gap-2">
          {!hasChildren && <Link href={`/op-management/projets/${projectId}/work-packages/${node.id}`} className="rounded-lg border px-3 py-1.5 text-xs font-bold text-leaf">{en ? "360° view" : "Vue 360°"}</Link>}
          {!locked && node.level < 4 && <button onClick={() => setEditing({ parentId: node.id, level: (node.level + 1) as 1 | 2 | 3 | 4 })} className="rounded-lg border px-3 py-1.5 text-xs font-bold">+ {en ? "Sub-level" : "Sous-niveau"}</button>}
          {!locked && <button onClick={() => remove(node.id)} aria-label={en ? "Delete" : "Supprimer"} className="rounded-lg border border-red-200 p-1.5 text-red-600"><TrashIcon className="h-4" /></button>}
        </div>
      </div>
      {!isCollapsed && node.children.map(child => renderNode(child, depth + 1))}
    </div>;
  }

  const editingNode = editing && "id" in editing ? editing as WBSTreeNode : null;

  return <div className="grid gap-4 rounded-[28px] border border-emerald-100 bg-emerald-50/70 p-5 md:p-6">
    {locked && <p className="rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "The current Scope Baseline is locked. WBS changes require an approved Change Request." : "La Scope Baseline actuelle est verrouillée. Toute modification du WBS exige une demande de changement approuvée."}</p>}
    {!locked && baselineId && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-mint/60 p-4 text-sm text-forest"><b>{en ? "Authorized version" : "Version autorisée"} : {changeRequests.find(item => item.id === selectedChangeRequestId)?.request_code || selectedChangeRequestId}</b><Link href={`/op-management/projets/${projectId}/planification/wbs?changeRequest=${selectedChangeRequestId}&baseline=${baselineId}&step=dictionary&view=dictionary`} className="btn-primary px-4 py-2 text-xs">{en ? "Continue to WBS Dictionary" : "Continuer vers le Dictionnaire WBS"}</Link></div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-black text-forest">Work Breakdown Structure</h2>
      <button onClick={() => setEditing({ parentId: null, level: 1 })} disabled={locked} className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"><PlusIcon className="mr-2 h-4" />{en ? "New root" : "Nouvelle racine"}</button>
    </div>
    <div className="grid gap-2">
      {tree.map(node => renderNode(node, 0))}
      {!tree.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No WBS yet. Create the first level (the project itself)." : "Aucun WBS. Creez le premier niveau (le projet lui-meme)."}</p>}
    </div>

    {editing && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-2xl rounded-[30px] border border-white/20 bg-emerald-50 p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{isNewNode ? `${en ? "New" : "Nouveau"} — ${levelNames[(editing as { level: number }).level]}` : `${en ? "WBS record" : "Fiche WBS"} — ${editingNode?.code}`}</h2><button type="button" onClick={() => setEditing(null)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Approved Change Request" : "Demande de changement approuvée"}<select name="change_request_id" defaultValue={selectedChangeRequestId || editingNode?.change_request_id || ""} required={Boolean(baselineId)} className="admin-input bg-white"><option value="">{en ? "None / initial version" : "Aucune / version initiale"}</option>{changeRequests.map(item => <option key={item.id} value={item.id}>{item.request_code || item.id} — {item.title}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">{en ? "Title" : "Titre"}<input name="title" defaultValue={editingNode?.title || ""} required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Description<textarea name="description" rows={2} defaultValue={editingNode?.description || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Scope included" : "Perimetre inclus"}<textarea name="scope_included" rows={2} defaultValue={editingNode?.scope_included || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Scope excluded" : "Perimetre exclu"}<textarea name="scope_excluded" rows={2} defaultValue={editingNode?.scope_excluded || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Responsible" : "Responsable"}<SearchableSelect name="responsible_name" options={staffOptions} defaultValue={editingNode?.responsible_name || ""} allowOther otherLabel={en ? "Responsible name" : "Nom du responsable"} placeholder={en ? "Select a staff member..." : "Selectionner un membre du staff..."} /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Expected result" : "Resultat attendu"}<input name="expected_result" defaultValue={editingNode?.expected_result || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Deliverables" : "Livrables"}<input name="deliverables" defaultValue={editingNode?.deliverables || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Acceptance criteria" : "Criteres d'acceptation"}<input name="acceptance_criteria" defaultValue={editingNode?.acceptance_criteria || ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Estimated duration (days)" : "Duree estimee (jours)"}<input name="estimated_duration_days" type="number" min="0" defaultValue={editingNode?.estimated_duration_days ?? ""} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Estimated cost" : "Cout estimatif"}<input name="estimated_cost" type="number" min="0" step="0.01" defaultValue={editingNode?.estimated_cost ?? ""} className="admin-input" /></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 sm:col-span-2">{message}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setEditing(null)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Save" : "Enregistrer")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
