"use client";
import { useEffect, useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import SearchableSelect from "@/components/op-management/SearchableSelect";
import WorkflowStatusActions, { type WorkflowAction, type WorkflowHistoryEntry } from "@/components/op-management/WorkflowStatusActions";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";
import { generateRegistryCode, getOrgCodeForProject, withUniqueRegistryCode } from "@/lib/ppm/ids";
import type { AssetInventoryCountStatus, AssetInventoryLine, AssetInventorySession, AssetInventorySessionStatus, PPMResource } from "@/lib/ppm/types";

const statusLabels: Record<AssetInventorySessionStatus, { fr: string; en: string }> = {
  draft: { fr: "Brouillon", en: "Draft" }, in_progress: { fr: "En cours", en: "In progress" },
  completed: { fr: "Terminee", en: "Completed" }, cancelled: { fr: "Annulee", en: "Cancelled" },
};
const statusTones: Record<AssetInventorySessionStatus, string> = {
  draft: "bg-slate-100 text-slate-600", in_progress: "bg-amber-50 text-amber-800",
  completed: "bg-mint text-forest", cancelled: "bg-red-50 text-red-700",
};
const NEXT_ACTIONS: Record<AssetInventorySessionStatus, WorkflowAction[]> = {
  draft: [{ value: "in_progress", label: "Demarrer le comptage", tone: "primary" }],
  in_progress: [
    { value: "completed", label: "Terminer la session", tone: "primary" },
    { value: "cancelled", label: "Annuler", tone: "ghost", requireNote: true },
  ],
  completed: [], cancelled: [],
};
const countLabels: Record<AssetInventoryCountStatus, { fr: string; en: string }> = {
  pending: { fr: "En attente", en: "Pending" }, found: { fr: "Trouve", en: "Found" },
  not_found: { fr: "Introuvable", en: "Not found" }, misplaced: { fr: "Mal place", en: "Misplaced" },
};

export default function AssetInventoryManager({ projectId, initial, assets, staff = [] }: {
  projectId: string; initial: AssetInventorySession[]; assets: PPMResource[]; staff?: PPMResource[];
}) {
  const { locale, en } = usePpmLocale();
  const [rows, setRows] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [detailFor, setDetailFor] = useState<AssetInventorySession | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function createSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    if (!title) { setSaving(false); setMessage(en ? "Title is required." : "Le titre est obligatoire."); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const orgCode = await getOrgCodeForProject(supabase, projectId);
    const result = await withUniqueRegistryCode<AssetInventorySession>(
      async code => await supabase.from("ppm_asset_inventory_sessions").insert({
        project_id: projectId, code, title, count_date: String(form.get("count_date") || "") || new Date().toISOString().slice(0, 10),
        conducted_by_name: String(form.get("conducted_by_name") || "").trim() || null, created_by: user?.id,
      }).select("*").single(),
      () => generateRegistryCode(orgCode, "asset_inventory_session"),
    );
    setSaving(false);
    if (result.error) { setMessage(result.error.message); return; }
    const session = result.data as AssetInventorySession;
    if (assets.length) await supabase.from("ppm_asset_inventory_lines").insert(assets.map(asset => ({ session_id: session.id, resource_id: asset.id })));
    await supabase.from("ppm_history").insert({ entity_type: "asset_inventory_session", entity_id: session.id, actor_id: user?.id, action: "Session d'inventaire creee", note: session.title });
    setRows(current => [session, ...current]);
    setCreating(false);
  }

  return <div className="grid gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest">{en ? "Physical inventory" : "Inventaire physique"}</h2><button onClick={() => setCreating(true)} disabled={!assets.length} className="btn-primary px-4 py-2 text-sm disabled:opacity-40"><PlusIcon className="mr-2 h-4" />{en ? "New session" : "Nouvelle session"}</button></div>
    {!assets.length && <p className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-900">{en ? "Register at least one asset before starting an inventory." : "Enregistrez au moins un actif avant de demarrer un inventaire."}</p>}
    <div className="grid gap-3">
      {rows.map(row => <article key={row.id} className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><span className="mr-2 rounded-full bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-500">{row.code}</span><b className="text-forest">{row.title}</b><p className="mt-1 text-xs text-slate-400">{new Date(row.count_date).toLocaleDateString("fr-FR")}{row.conducted_by_name ? ` · ${row.conducted_by_name}` : ""}</p></div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTones[row.status]}`}>{statusLabels[row.status][locale]}</span>
        </div>
        <button onClick={() => setDetailFor(row)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">{en ? "Open" : "Ouvrir"}</button>
      </article>)}
      {!rows.length && <p className="rounded-2xl border bg-white p-8 text-center text-slate-400">{en ? "No inventory session yet." : "Aucune session d'inventaire pour le moment."}</p>}
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
      <form onSubmit={createSession} className="mx-auto my-10 max-w-lg rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "New inventory session" : "Nouvelle session d'inventaire"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "Title" : "Titre"}<input name="title" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Count date" : "Date de comptage"}<input name="count_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Conducted by" : "Realise par"}<SearchableSelect name="conducted_by_name" options={staff.map(item => ({ value: item.name, label: item.name, hint: item.role_title }))} allowOther otherLabel={en ? "Name" : "Nom"} placeholder={en ? "Select..." : "Selectionner..."} /></label>
          <p className="text-xs text-slate-400">{en ? `This will list all ${assets.length} currently registered asset(s) to count.` : `Ceci listera les ${assets.length} actif(s) actuellement enregistre(s) a compter.`}</p>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Creating..." : "Creation...") : (en ? "Create" : "Creer")}</button></div>
        </div>
      </form>
    </div>}

    {detailFor && <SessionDetailPanel session={detailFor} assets={assets} staff={staff}
      onStatusChanged={updated => setRows(current => current.map(row => row.id === updated.id ? updated : row))} onClose={() => setDetailFor(null)} />}
  </div>;
}

function SessionDetailPanel({ session, assets, staff, onStatusChanged, onClose }: {
  session: AssetInventorySession; assets: PPMResource[]; staff: PPMResource[];
  onStatusChanged: (updated: AssetInventorySession) => void; onClose: () => void;
}) {
  const { locale, en } = usePpmLocale();
  const [status, setStatus] = useState(session.status);
  const [lines, setLines] = useState<AssetInventoryLine[]>([]);
  const [history, setHistory] = useState<{ id: string; action: string; to_status?: string | null; from_status?: string | null; note?: string | null; created_at: string }[]>([]);
  const assetName = (id: string) => { const asset = assets.find(item => item.id === id); return asset ? `${asset.asset_code ? `${asset.asset_code} — ` : ""}${asset.name}` : "—"; };
  const assetContext = (id: string) => assets.find(item => item.id === id);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("ppm_asset_inventory_lines").select("*").eq("session_id", session.id),
      supabase.from("ppm_history").select("*").eq("entity_type", "asset_inventory_session").eq("entity_id", session.id).order("created_at", { ascending: false }).limit(100),
    ]).then(([linesResult, historyResult]) => {
      setLines((linesResult.data || []) as AssetInventoryLine[]);
      setHistory(historyResult.data || []);
    });
  }, [session.id]);

  async function saveLine(line: AssetInventoryLine, updates: Partial<AssetInventoryLine>) {
    const supabase = createClient();
    const result = await supabase.from("ppm_asset_inventory_lines").update({ ...updates, counted_at: new Date().toISOString() }).eq("id", line.id).select("*").single();
    if (!result.error) setLines(current => current.map(item => item.id === line.id ? result.data as AssetInventoryLine : item));
  }

  const pendingCount = lines.filter(item => item.count_status === "pending").length;
  const historyEntries: WorkflowHistoryEntry[] = history.map(item => ({ status: item.to_status || item.action, at: item.created_at, note: item.note }));

  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-forest/90 p-4">
    <div className="mx-auto my-10 max-w-4xl rounded-[30px] bg-white p-7 shadow-2xl">
      <div className="flex items-start justify-between"><h2 className="text-2xl font-black text-forest">{session.title}</h2><button type="button" onClick={onClose} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>

      <div className="mt-4">
        <WorkflowStatusActions
          entityLabel={en ? "Inventory session" : "Session d'inventaire"} itemTitle={session.title} status={status}
          statusLabels={Object.fromEntries(Object.entries(statusLabels).map(([value, label]) => [value, label[locale]]))}
          statusTones={statusTones} actions={NEXT_ACTIONS[status]} staff={staff}
          history={historyEntries}
          onConfirm={async ({ nextStatus, note }) => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const extra: Record<string, unknown> = {};
            if (nextStatus === "completed") extra.completed_at = new Date().toISOString();
            const result = await supabase.from("ppm_asset_inventory_sessions").update({ status: nextStatus, ...extra }).eq("id", session.id).select("*").single();
            if (result.error) return { error: result.error.message };
            const updated = result.data as AssetInventorySession;
            await supabase.from("ppm_history").insert({ entity_type: "asset_inventory_session", entity_id: session.id, actor_id: user?.id, action: statusLabels[nextStatus as AssetInventorySessionStatus][locale], from_status: status, to_status: nextStatus, note: note || undefined });
            setStatus(updated.status);
            onStatusChanged(updated);
            setHistory(current => [{ id: crypto.randomUUID(), action: nextStatus, to_status: nextStatus, from_status: status, note: note || undefined, created_at: new Date().toISOString() }, ...current]);
          }}
        />
        {status === "in_progress" && pendingCount > 0 && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-900">{en ? `${pendingCount} asset(s) still uncounted.` : `${pendingCount} actif(s) encore non comptes.`}</p>}
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">{en ? "Asset" : "Actif"}</th><th className="p-3">{en ? "Expected" : "Attendu"}</th><th className="p-3">{en ? "Status" : "Statut"}</th><th className="p-3">{en ? "Condition observed" : "Etat observe"}</th><th className="p-3">{en ? "Location observed" : "Localisation observee"}</th><th className="p-3">{en ? "Discrepancy" : "Ecart"}</th></tr></thead>
          <tbody>{lines.map(line => { const asset = assetContext(line.resource_id); return <tr key={line.id} className="border-t align-top">
            <td className="p-3 font-bold text-forest">{assetName(line.resource_id)}</td>
            <td className="p-3 text-xs text-slate-400">{asset?.current_location || "—"}{asset?.condition_notes ? ` · ${asset.condition_notes}` : ""}</td>
            <td className="p-3"><select value={line.count_status} onChange={event => saveLine(line, { count_status: event.target.value as AssetInventoryCountStatus })} className="admin-input py-1 text-xs">{Object.entries(countLabels).map(([value, label]) => <option key={value} value={value}>{label[locale]}</option>)}</select></td>
            <td className="p-3"><input defaultValue={line.condition_observed || ""} onBlur={event => saveLine(line, { condition_observed: event.target.value })} className="admin-input py-1 text-xs" /></td>
            <td className="p-3"><input defaultValue={line.location_observed || ""} onBlur={event => saveLine(line, { location_observed: event.target.value })} className="admin-input py-1 text-xs" /></td>
            <td className="p-3"><input defaultValue={line.discrepancy_note || ""} onBlur={event => saveLine(line, { discrepancy_note: event.target.value })} className="admin-input py-1 text-xs" /></td>
          </tr>; })}
          {!lines.length && <tr><td colSpan={6} className="p-8 text-center text-slate-400">{en ? "No lines." : "Aucune ligne."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}
