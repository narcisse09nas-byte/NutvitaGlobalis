"use client";
import { useEffect, useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { PPM_ROLE_LABELS, PPM_ROLES, type PPMRole } from "@/lib/ppm/roles";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

type Assignment = { id: string; user_id: string; role: PPMRole; scope_type: string; scope_id: string | null; created_at: string };

export default function RoleAssignmentManager({ scopeType, scopeId, scopeLabel }: { scopeType: "organization" | "portfolio" | "program" | "project"; scopeId: string; scopeLabel: string }) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await createClient().from("ppm_role_assignments").select("*").eq("scope_type", scopeType).eq("scope_id", scopeId).order("created_at", { ascending: false });
      const assignments = (data || []) as Assignment[];
      setRows(assignments);
      const ids = assignments.map(item => item.user_id);
      if (ids.length) {
        const response = await fetch(`/api/ppm/role-assignments?ids=${encodeURIComponent(ids.join(","))}`);
        if (response.ok) setEmails((await response.json()).emails || {});
      }
    })();
  }, [scopeType, scopeId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const role = String(form.get("role") || "");
    const response = await fetch("/api/ppm/role-assignments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, scope_type: scopeType, scope_id: scopeId }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) { setMessage(payload.message || (en ? "Assignment failed." : "Attribution impossible.")); return; }
    const assignment = payload.assignment as Assignment;
    setRows(current => [assignment, ...current.filter(row => row.id !== assignment.id)]);
    setEmails(current => ({ ...current, [assignment.user_id]: payload.email }));
    setCreating(false);
  }

  async function revoke(id: string) {
    if (!confirm(en ? "Remove this role?" : "Retirer ce role ?")) return;
    const response = await fetch("/api/ppm/role-assignments", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revoke", id }),
    });
    if (response.ok) setRows(current => current.filter(row => row.id !== id));
  }

  return <div className="rounded-2xl border bg-white p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-forest">Roles &amp; permissions</h2><p className="text-xs text-slate-400">{en ? "Scope" : "Perimetre"} : {scopeLabel}</p></div>
      <button onClick={() => setCreating(true)} className="btn-secondary px-3 py-2 text-xs"><PlusIcon className="mr-1 h-4" />{en ? "Assign a role" : "Assigner un role"}</button>
    </div>
    <div className="mt-4 grid gap-2">
      {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
        <span><b className="text-forest">{emails[row.user_id] || row.user_id}</b> — {PPM_ROLE_LABELS[row.role]}</span>
        <button onClick={() => revoke(row.id)} className="text-xs font-bold text-red-600">{en ? "Remove" : "Retirer"}</button>
      </div>)}
      {!rows.length && <p className="text-sm text-slate-400">{en ? "No role assigned to this scope." : "Aucun role assigne a ce perimetre."}</p>}
    </div>

    {creating && <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950/60 p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-md rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between"><h2 className="text-xl font-black text-forest">{en ? "Assign a role" : "Assigner un role"}</h2><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "NutVitaGlobalis account email" : "Email du compte NutVitaGlobalis"}<input name="email" type="email" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">{en ? "Role" : "Role"}<select name="role" className="admin-input">{PPM_ROLES.map(role => <option key={role} value={role}>{PPM_ROLE_LABELS[role]}</option>)}</select></label>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Assign" : "Assigner")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
