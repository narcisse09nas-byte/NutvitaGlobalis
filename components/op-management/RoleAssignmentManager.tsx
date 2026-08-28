"use client";
import { useEffect, useState, type FormEvent } from "react";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { PPM_ROLE_LABELS, PPM_ROLES, type PPMRole } from "@/lib/ppm/roles";
import { usePpmLocale } from "@/components/op-management/PpmLocaleContext";

type Assignment = { id: string; user_id: string; role: PPMRole; custom_role_label?: string | null; scope_type: string; scope_id: string | null; created_at: string };
type AccountOption = { id: string; email: string; name: string };
const ROLE_LABELS_FR: Record<PPMRole, string> = {
  super_admin: "Super administrateur", org_admin: "Administrateur de l'organisation", portfolio_manager: "Responsable de portefeuille", program_manager: "Responsable de programme",
  project_manager: "Chef de projet", project_officer: "Charge de projet", meal_officer: "Responsable MEAL", finance_officer: "Responsable financier", procurement_officer: "Responsable achats",
  quality_officer: "Responsable qualite", technical_lead: "Responsable technique", team_member: "Membre de l'equipe", viewer: "Lecteur", auditor: "Auditeur",
  donor_viewer: "Bailleur / partenaire", asset_manager: "Gestionnaire des actifs", other: "Autre (a preciser)",
};

export default function RoleAssignmentManager({ scopeType, scopeId, scopeLabel }: { scopeType: "organization" | "portfolio" | "program" | "project"; scopeId: string; scopeLabel: string }) {
  const { en } = usePpmLocale();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<PPMRole[]>([]);
  const [customRoleLabel, setCustomRoleLabel] = useState("");
  const [customRoleOption, setCustomRoleOption] = useState("");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

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

  async function openAssignmentForm() {
    setCreating(true); setMessage("");
    if (accounts.length) return;
    setAccountsLoading(true);
    const response = await fetch(`/api/ppm/role-assignments?directory=1&scope_type=${encodeURIComponent(scopeType)}&scope_id=${encodeURIComponent(scopeId)}`);
    const payload = await response.json();
    setAccountsLoading(false);
    if (!response.ok) { setMessage(payload.message || (en ? "Unable to load accounts." : "Impossible de charger les comptes.")); return; }
    setAccounts(payload.users || []);
  }

  function toggleRole(role: PPMRole) {
    setSelectedRoles(current => current.includes(role) ? current.filter(item => item !== role) : [...current, role]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    if (!selectedRoles.length) { setMessage(en ? "Select at least one role." : "Selectionnez au moins un role."); return; }
    const resolvedCustomRole = customRoleOption === "other_custom" ? customRoleLabel.trim() : customRoleOption;
    if (selectedRoles.includes("other") && !resolvedCustomRole) { setMessage(en ? "Select or specify the custom role." : "Selectionnez ou precisez le role personnalise."); return; }
    setSaving(true);
    const createdAssignments: Assignment[] = [];
    let lastEmail = "";
    for (const role of selectedRoles) {
      const response = await fetch("/api/ppm/role-assignments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, scope_type: scopeType, scope_id: scopeId, custom_role_label: role === "other" ? resolvedCustomRole : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) { setSaving(false); setMessage(payload.message || (en ? "Assignment failed." : "Attribution impossible.")); return; }
      createdAssignments.push(payload.assignment as Assignment);
      lastEmail = payload.email;
    }
    setSaving(false);
    setRows(current => [...createdAssignments, ...current.filter(row => !createdAssignments.some(item => item.id === row.id))]);
    if (createdAssignments[0]) setEmails(current => ({ ...current, [createdAssignments[0].user_id]: lastEmail }));
    setCreating(false);
    setSelectedRoles([]);
    setCustomRoleLabel("");
    setCustomRoleOption("");
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
      <button onClick={openAssignmentForm} className="btn-secondary px-3 py-2 text-xs"><PlusIcon className="mr-1 h-4" />{en ? "Assign a role" : "Assigner un role"}</button>
    </div>
    <div className="mt-4 grid gap-2">
      {rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
        <span><b className="text-forest">{emails[row.user_id] || row.user_id}</b> — {row.role === "other" && row.custom_role_label ? row.custom_role_label : (en ? PPM_ROLE_LABELS[row.role] : ROLE_LABELS_FR[row.role])}</span>
        <button onClick={() => revoke(row.id)} className="text-xs font-bold text-red-600">{en ? "Remove" : "Retirer"}</button>
      </div>)}
      {!rows.length && <p className="text-sm text-slate-400">{en ? "No role assigned to this scope." : "Aucun role assigne a ce perimetre."}</p>}
    </div>

    {creating && <div className="ppm-modal-backdrop fixed inset-0 z-[150] overflow-y-auto p-4">
      <form onSubmit={submit} className="mx-auto my-10 max-w-md rounded-[30px] bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-forest">{en ? "Assign a role" : "Assigner un role"}</h2><p className="mt-2 text-sm text-slate-500">{en ? "Select an existing NutVitaGlobalis account, then grant one or more roles for this scope." : "Selectionnez un compte NutVitaGlobalis existant, puis attribuez-lui un ou plusieurs roles pour ce perimetre."}</p></div><button type="button" onClick={() => setCreating(false)} aria-label={en ? "Close" : "Fermer"}><XMarkIcon className="h-6" /></button></div>
        <div className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">{en ? "NutVitaGlobalis account email" : "Email du compte NutVitaGlobalis"}<select name="email" required disabled={accountsLoading} className="admin-input"><option value="">{accountsLoading ? (en ? "Loading accounts..." : "Chargement des comptes...") : (en ? "Select an account..." : "Selectionner un compte...")}</option>{accounts.map(account => <option key={account.id} value={account.email}>{account.email}{account.name ? ` — ${account.name}` : ""}</option>)}</select></label>
          <div className="grid gap-2 text-sm font-bold">
            {en ? "Roles (multiple allowed)" : "Roles (selection multiple)"}
            <div className="grid max-h-60 gap-1.5 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">
              {PPM_ROLES.map(role => <label key={role} className="flex items-center gap-2 text-xs font-normal"><input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} className="h-4 w-4" />{en ? PPM_ROLE_LABELS[role] : ROLE_LABELS_FR[role]}</label>)}
            </div>
            {selectedRoles.includes("other") && <div className="grid gap-2"><select value={customRoleOption} onChange={event => { setCustomRoleOption(event.target.value); if (event.target.value !== "other_custom") setCustomRoleLabel(""); }} className="admin-input"><option value="">{en ? "Select the additional role..." : "Selectionner le role complementaire..."}</option><option value="Project focal person">{en ? "Project focal person" : "Point focal du projet"}</option><option value="Project coordinator">{en ? "Project coordinator" : "Coordonnateur de projet"}</option><option value="Technical adviser">{en ? "Technical adviser" : "Conseiller technique"}</option><option value="Specialist">{en ? "Specialist" : "Specialiste"}</option><option value="Administrative assistant">{en ? "Administrative assistant" : "Assistant administratif"}</option><option value="Field officer">{en ? "Field officer" : "Agent de terrain"}</option><option value="other_custom">{en ? "Other (specify)" : "Autre a preciser"}</option></select>{customRoleOption === "other_custom" && <input value={customRoleLabel} onChange={event => setCustomRoleLabel(event.target.value)} placeholder={en ? "Specify the role..." : "Preciser le role..."} required className="admin-input" />}</div>}
          </div>
          {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">{message}</p>}
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreating(false)} className="btn-secondary">{en ? "Cancel" : "Annuler"}</button><button disabled={saving} className="btn-primary">{saving ? (en ? "Saving..." : "Enregistrement...") : (en ? "Assign" : "Assigner")}</button></div>
        </div>
      </form>
    </div>}
  </div>;
}
