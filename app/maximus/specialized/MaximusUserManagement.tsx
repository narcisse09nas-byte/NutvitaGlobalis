"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import {
  maximusAssignableModules,
  maximusFunctions,
  maximusUnits,
  type MaximusAccess,
} from "@/lib/maximus-access";

type User = MaximusAccess & { created_at?: string; updated_at?: string };
type Patch = (id: string, patch: Partial<User>) => void;
const functionLabels = { viewer: "Viewer", editor: "Editor", creator: "Creator", validator: "Validator" } as const;

export default function MaximusUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [kitchens, setKitchens] = useState<string[]>([]);
  const [salePoints, setSalePoints] = useState<string[]>([]);
  const [tab, setTab] = useState<"registry" | "roles">("registry");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");

  async function load() {
    const response = await fetch("/api/maximus/users");
    const result = await response.json();
    if (!response.ok) return setMessage(result.message);
    setUsers(result.users || []);
    setKitchens(result.kitchens || []);
    setSalePoints(result.sale_points || []);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => users.filter(user => {
    const content = `${user.full_name} ${user.email} ${user.units.join(" ")} ${user.module_access.join(" ")}`.toLowerCase();
    return content.includes(search.toLowerCase())
      && (!roleFilter || user.role === roleFilter || roleFilter === "assistant" && user.is_assistant_admin)
      && (!statusFilter || String(user.active) === statusFilter);
  }), [users, search, roleFilter, statusFilter]);

  function patchLocal(id: string, patch: Partial<User>) {
    setUsers(items => items.map(item => item.user_id === id ? { ...item, ...patch } : item));
  }

  async function save(user: User) {
    setSaving(user.user_id);
    const response = await fetch("/api/maximus/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    const result = await response.json();
    setMessage(response.ok ? "Droits et perimetres mis a jour." : result.message);
    if (response.ok) patchLocal(user.user_id, result.user);
    setSaving("");
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      full_name: form.get("full_name"),
      email: form.get("email"),
      role: form.get("role"),
      units: form.getAll("units"),
      module_access: form.getAll("module_access"),
      is_assistant_admin: form.get("is_assistant_admin") === "on",
      is_supervisor: form.get("is_supervisor") === "on",
      central_kitchen: form.get("central_kitchen"),
      sale_point: form.get("sale_point"),
      functions: maximusFunctions.filter(item => form.get(item) === "on"),
    };
    const response = await fetch("/api/maximus/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setMessage(response.ok
      ? result.invited ? "Invitation envoyee et acces cree." : "Acces Maximus attribue au compte existant."
      : result.message);
    if (response.ok) {
      setUsers(items => [result.user, ...items.filter(item => item.user_id !== result.user.user_id)]);
      setModal(false);
    }
  }

  return <div className="grid gap-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Administration Maximus</p>
        <h2 className="mt-1 text-3xl font-black">Gestion des utilisateurs</h2>
        <p className="mt-2 text-sm text-slate-500">Comptes, perimetres multiples, affectations et delegation securisee.</p>
      </div>
      <button onClick={() => setModal(true)} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 font-bold text-white">
        <Plus className="h-4 w-4" />Nouvel utilisateur
      </button>
    </header>

    {message && <div className="flex justify-between rounded-md border bg-white p-4 text-sm font-bold">
      <span>{message}</span><button onClick={() => setMessage("")}><X className="h-4 w-4" /></button>
    </div>}

    <div className="flex w-fit rounded-md border bg-white p-1">
      <Tab active={tab === "registry"} onClick={() => setTab("registry")}>Registre utilisateurs</Tab>
      <Tab active={tab === "roles"} onClick={() => setTab("roles")}>Roles et fonctions</Tab>
    </div>

    <section className="overflow-hidden rounded-lg border bg-white">
      <div className="border-b p-5">
        <h3 className="text-xl font-black">{tab === "registry" ? "Registre des utilisateurs Maximus" : "Delegation des fonctions"}</h3>
        <p className="mt-1 text-sm text-slate-500">
          {tab === "registry" ? "Attribuer plusieurs unites et des modules complementaires." : "Les fonctions s appliquent uniquement aux perimetres attribues."}
        </p>
      </div>
      <div className="grid gap-3 border-b p-4 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} className="admin-input pl-9" placeholder="Rechercher par nom, email ou perimetre..." />
        </div>
        <select value={roleFilter} onChange={event => setRoleFilter(event.target.value)} className="admin-input">
          <option value="">Tous les roles</option><option value="staff">Staff</option>
          <option value="manager">Responsable</option><option value="assistant">Admin assistant</option>
        </select>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="admin-input">
          <option value="">Tous les statuts</option><option value="true">Actifs</option><option value="false">Inactifs</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        {tab === "registry"
          ? <Registry users={filtered} kitchens={kitchens} salePoints={salePoints} patch={patchLocal} save={save} saving={saving} />
          : <Roles users={filtered} patch={patchLocal} save={save} saving={saving} />}
      </div>
    </section>

    {modal && <CreateUserModal
      kitchens={kitchens}
      salePoints={salePoints}
      close={() => setModal(false)}
      submit={create}
    />}
  </div>;
}

function Registry({ users, kitchens, salePoints, patch, save, saving }: {
  users: User[]; kitchens: string[]; salePoints: string[]; patch: Patch; save: (user: User) => void; saving: string;
}) {
  return <table className="w-full min-w-[1600px] text-left text-sm">
    <thead><tr className="border-b text-slate-500">
      <th className="p-4">Email / Nom</th><th className="p-4">Role</th><th className="p-4">Perimetres</th>
      <th className="p-4">Superviseur</th><th className="p-4">Admin assistant</th>
      <th className="p-4">Cuisine centrale</th><th className="p-4">Point de vente</th>
      <th className="p-4">Fonctions</th><th className="p-4">Statut</th><th className="p-4 text-right">Actions</th>
    </tr></thead>
    <tbody>{users.map(user => <tr key={user.user_id} className="border-b align-top">
      <td className="p-4"><b>{user.full_name}</b><span className="block text-xs text-slate-500">{user.email}</span></td>
      <td className="p-4"><select value={user.role} onChange={event => patch(user.user_id, { role: event.target.value as User["role"] })} className="admin-input min-w-28"><option value="staff">Staff</option><option value="manager">Responsable</option></select></td>
      <td className="p-4"><ScopeSelector user={user} patch={patch} /></td>
      <td className="p-4"><Toggle checked={user.is_supervisor} change={value => patch(user.user_id, { is_supervisor: value })} /></td>
      <td className="p-4"><Toggle checked={user.is_assistant_admin} change={value => patch(user.user_id, { is_assistant_admin: value })} /></td>
      <td className="p-4"><select value={user.central_kitchen || ""} onChange={event => patch(user.user_id, { central_kitchen: event.target.value })} className="admin-input min-w-40"><option value="">Non affecte</option>{kitchens.map(item => <option key={item}>{item}</option>)}</select></td>
      <td className="p-4"><select value={user.sale_point || ""} onChange={event => patch(user.user_id, { sale_point: event.target.value })} className="admin-input min-w-40"><option value="">Non affecte</option>{salePoints.map(item => <option key={item}>{item}</option>)}</select></td>
      <td className="p-4"><Chips values={user.functions.map(item => functionLabels[item])} /></td>
      <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${user.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>{user.active ? "Actif" : "Inactif"}</span></td>
      <td className="p-4"><div className="flex justify-end gap-2">
        <button onClick={() => patch(user.user_id, { active: !user.active })} className="rounded-md border px-3 py-2 font-bold">{user.active ? "Desactiver" : "Activer"}</button>
        <button disabled={saving === user.user_id} onClick={() => save(user)} className="rounded-md bg-[#24945f] px-3 py-2 font-bold text-white">{saving === user.user_id ? "..." : "Enregistrer"}</button>
      </div></td>
    </tr>)}
    {!users.length && <tr><td colSpan={10} className="h-28 text-center text-slate-400">Aucun utilisateur Maximus.</td></tr>}
    </tbody>
  </table>;
}

function Roles({ users, patch, save, saving }: { users: User[]; patch: Patch; save: (user: User) => void; saving: string }) {
  function toggle(user: User, value: typeof maximusFunctions[number]) {
    patch(user.user_id, { functions: user.functions.includes(value) ? user.functions.filter(item => item !== value) : [...user.functions, value] });
  }
  return <table className="w-full min-w-[1100px] text-left text-sm">
    <thead><tr className="border-b text-slate-500">
      <th className="p-4">Utilisateur</th><th className="p-4">Perimetres</th>
      {maximusFunctions.map(item => <th key={item} className="p-4 text-center">{functionLabels[item]}</th>)}
      <th className="p-4 text-center">Admin assistant</th><th className="p-4 text-right">Action</th>
    </tr></thead>
    <tbody>{users.map(user => <tr key={user.user_id} className="border-b">
      <td className="p-4"><b>{user.full_name}</b><span className="block text-xs text-slate-400">{user.email}</span></td>
      <td className="max-w-80 p-4"><ScopeSummary user={user} /></td>
      {maximusFunctions.map(item => <td key={item} className="p-4 text-center"><input type="checkbox" checked={user.functions.includes(item)} onChange={() => toggle(user, item)} className="h-4 w-4 accent-[#24945f]" /></td>)}
      <td className="p-4 text-center"><input type="checkbox" checked={user.is_assistant_admin} onChange={event => patch(user.user_id, { is_assistant_admin: event.target.checked })} className="h-4 w-4 accent-[#24945f]" /></td>
      <td className="p-4 text-right"><button disabled={saving === user.user_id} onClick={() => save(user)} title="Enregistrer" className="rounded-md bg-[#24945f] p-2 text-white"><Check className="h-4 w-4" /></button></td>
    </tr>)}</tbody>
  </table>;
}

function ScopeSelector({ user, patch }: { user: User; patch: Patch }) {
  function toggleUnit(value: string) {
    const units = user.units.includes(value) ? user.units.filter(item => item !== value) : [...user.units, value];
    if (units.length) patch(user.user_id, { units, unit: units[0] });
  }
  function toggleModule(value: string) {
    patch(user.user_id, { module_access: user.module_access.includes(value) ? user.module_access.filter(item => item !== value) : [...user.module_access, value] });
  }
  return <details className="relative min-w-64">
    <summary className="flex cursor-pointer list-none items-center justify-between rounded-md border px-3 py-2 font-bold">
      {user.units.length} unite(s), {user.module_access.length} module(s)<ChevronDown className="h-4 w-4" />
    </summary>
    <div className="absolute z-30 mt-2 max-h-96 w-96 overflow-y-auto rounded-md border bg-white p-4 shadow-xl">
      <p className="mb-2 text-xs font-black uppercase text-slate-500">Unites completes</p>
      <div className="grid gap-2">{maximusUnits.map(item => <Choice key={item.value} checked={user.units.includes(item.value)} onChange={() => toggleUnit(item.value)} label={item.label} />)}</div>
      <p className="mb-2 mt-5 text-xs font-black uppercase text-slate-500">Modules complementaires</p>
      <div className="grid gap-2">{maximusAssignableModules.map(item => <Choice key={item.value} checked={user.module_access.includes(item.value)} onChange={() => toggleModule(item.value)} label={`${item.group} - ${item.label}`} />)}</div>
    </div>
  </details>;
}

function ScopeSummary({ user }: { user: User }) {
  const unitLabels = user.units.map(value => maximusUnits.find(item => item.value === value)?.label || value);
  const moduleLabels = user.module_access.map(value => maximusAssignableModules.find(item => item.value === value)?.label || value);
  return <div className="grid gap-1"><Chips values={unitLabels} /><Chips values={moduleLabels} tone="orange" /></div>;
}

function CreateUserModal({ kitchens, salePoints, close, submit }: {
  kitchens: string[]; salePoints: string[]; close: () => void; submit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4" onMouseDown={close}>
    <form onSubmit={submit} onMouseDown={event => event.stopPropagation()} className="mx-auto my-8 grid max-w-4xl gap-5 rounded-lg bg-white p-6">
      <div className="flex justify-between"><div><p className="text-xs font-black uppercase text-[#ef7f3b]">Nouveau compte</p><h3 className="text-2xl font-black">Inviter un utilisateur Maximus</h3></div><button type="button" onClick={close}><X /></button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet"><input name="full_name" required className="admin-input" /></Field>
        <Field label="Email"><input name="email" type="email" required className="admin-input" /></Field>
        <Field label="Role"><select name="role" className="admin-input"><option value="staff">Staff</option><option value="manager">Responsable</option></select></Field>
        <Field label="Cuisine centrale"><select name="central_kitchen" className="admin-input"><option value="">Non affecte</option>{kitchens.map(item => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Point de vente"><select name="sale_point" className="admin-input"><option value="">Non affecte</option>{salePoints.map(item => <option key={item}>{item}</option>)}</select></Field>
      </div>
      <fieldset className="rounded-md border p-4">
        <legend className="px-2 text-sm font-black">Unites accessibles (selection multiple)</legend>
        <div className="grid gap-3 sm:grid-cols-2">{maximusUnits.map(item => <CheckField key={item.value} name="units" value={item.value} label={item.label} />)}</div>
      </fieldset>
      <details className="rounded-md border p-4">
        <summary className="cursor-pointer font-black">Ajouter des modules hors des unites selectionnees</summary>
        <div className="mt-4 grid max-h-72 gap-3 overflow-y-auto sm:grid-cols-2">{maximusAssignableModules.map(item => <CheckField key={item.value} name="module_access" value={item.value} label={`${item.group} - ${item.label}`} />)}</div>
      </details>
      <div className="flex flex-wrap gap-5 rounded-md bg-slate-50 p-4"><CheckField name="is_supervisor" label="Superviseur" /><CheckField name="is_assistant_admin" label="Admin assistant sur ses perimetres" /></div>
      <div><p className="mb-3 text-sm font-black">Fonctions initiales</p><div className="flex flex-wrap gap-5">{maximusFunctions.map(item => <CheckField key={item} name={item} label={functionLabels[item]} defaultChecked={item === "viewer"} />)}</div></div>
      <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={close} className="rounded-md border px-4 py-2 font-bold">Annuler</button><button className="rounded-md bg-[#24945f] px-5 py-3 font-bold text-white">Inviter et attribuer</button></div>
    </form>
  </div>;
}

function Chips({ values, tone = "green" }: { values: string[]; tone?: "green" | "orange" }) {
  return <div className="flex flex-wrap gap-1">{values.map(value => <span key={value} className={`rounded-full px-2 py-1 text-[10px] font-bold ${tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{value}</span>)}</div>;
}
function Choice({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <label className="flex cursor-pointer items-start gap-2 text-sm"><input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 accent-[#24945f]" /><span>{label}</span></label>;
}
function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded px-4 py-2 text-sm font-bold ${active ? "bg-[#123d32] text-white" : ""}`}>{children}</button>;
}
function Toggle({ checked, change }: { checked: boolean; change: (value: boolean) => void }) {
  return <button type="button" onClick={() => change(!checked)} className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#24945f]" : "bg-slate-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} /></button>;
}
function CheckField({ name, label, value, defaultChecked = false }: { name: string; label: string; value?: string; defaultChecked?: boolean }) {
  return <label className="flex items-start gap-2 text-sm font-bold"><input name={name} value={value} type="checkbox" defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-[#24945f]" />{label}</label>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold">{label}{children}</label>;
}
