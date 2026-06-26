'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FilePenLine, GitBranch, Plus, Search, Send, Trash2, X, XCircle } from 'lucide-react';
import type { MaximusModule } from '@/lib/maximus-modules';
import { workflowActionFor } from '@/lib/maximus-workflows';

type RecordRow = {
  id: string;
  title: string;
  reference?: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type SelectOption = { value: string; label: string };
type OptionSource = 'countries' | 'states' | 'centralKitchens' | 'salePoints' | 'ingredients' | 'budgetLines' | 'staff' | 'vendors' | 'assets' | 'menus';

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  validated: 'Validé',
  rejected: 'Rejeté',
  archived: 'Archivé',
};

const workflowItemFields = new Set(['menus', 'menus_quantities', 'items', 'specific_ingredients']);
const sourceByField: Record<string, OptionSource> = {
  country: 'countries',
  region: 'states',
  state: 'states',
  state_region: 'states',
  central_kitchen: 'centralKitchens',
  sale_point: 'salePoints',
  item: 'ingredients',
  ingredient: 'ingredients',
  menu: 'menus',
  budget_line: 'budgetLines',
  supplier: 'vendors',
  vendor: 'vendors',
  provider: 'vendors',
  employee: 'staff',
  supervisor: 'staff',
  requester: 'staff',
  beneficiary: 'staff',
  assigned_to: 'staff',
  asset: 'assets',
  vehicle: 'assets',
};

export default function MaximusRecords({ module }: { module: MaximusModule }) {
  const [items, setItems] = useState<RecordRow[]>([]);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState('');
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, SelectOption[]>>({});
  const [countries, setCountries] = useState<SelectOption[]>([]);
  const [states, setStates] = useState<SelectOption[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module.slug)}`);
    const result = await response.json();
    if (response.ok) setItems(result.items || []);
    else setMessage(result.message || 'Chargement impossible.');
  }

  useEffect(() => { load(); }, [module.slug]);
  useEffect(() => {
    fetch('/api/maximus/options')
      .then(response => response.ok ? response.json() : {})
      .then(setDynamicOptions)
      .catch(() => setDynamicOptions({}));
    fetch('/api/geo?type=countries')
      .then(response => response.ok ? response.json() : [])
      .then((items: Array<{ code?: string; name: string }>) => setCountries(items.map(item => ({ value: item.name, label: item.name }))))
      .catch(() => setCountries([]));
  }, []);
  useEffect(() => {
    const country = formValues.country || '';
    if (!country) {
      setStates([]);
      return;
    }
    fetch(`/api/geo?type=states&country=${encodeURIComponent(country)}`)
      .then(response => response.ok ? response.json() : [])
      .then((items: Array<{ code?: string; name: string }>) => setStates(items.map(item => ({ value: item.name, label: item.name }))))
      .catch(() => setStates([]));
  }, [formValues.country]);

  const filtered = useMemo(() => items.filter(item =>
    (!status || item.status === status)
    && (!search || `${item.title} ${item.reference || ''} ${JSON.stringify(item.data)}`.toLowerCase().includes(search.toLowerCase())),
  ), [items, search, status]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const data = Object.fromEntries(module.fields.map(field => [
      field.key,
      field.type === 'number' && values[field.key] !== '' ? Number(values[field.key]) : values[field.key],
    ]));
    const firstField = module.fields.find(field => field.required) || module.fields[0];
    const body = {
      ...(editing ? { id: editing.id } : { module: module.slug }),
      title: String(data[firstField.key] || module.title),
      reference: values.reference || null,
      data,
    };
    const response = await fetch('/api/maximus/records', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.message || 'Enregistrement impossible.');
    setFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Élément mis à jour.' : 'Élément créé.');
    await load();
  }

  async function changeStatus(item: RecordRow, next: string) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: next }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.message || 'Mise à jour impossible.');
    setMessage(`Statut : ${statusLabels[next]}.`);
    await load();
  }

  async function advanceWorkflow(item: RecordRow) {
    const action = workflowActionFor(module.slug, item.status);
    if (!action) return;
    if (!confirm(`${action.label} pour « ${item.title} » ?`)) return;
    setWorkflowBusy(item.id);
    const response = await fetch('/api/maximus/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: item.id, action: action.id }),
    });
    const result = await response.json();
    setWorkflowBusy('');
    if (!response.ok) return setMessage(result.message || 'Exécution du workflow impossible.');
    setMessage(result.message || action.successMessage);
    await load();
  }

  async function remove(item: RecordRow) {
    if (!confirm(`Supprimer définitivement « ${item.title} » ?`)) return;
    const response = await fetch(`/api/maximus/records?id=${item.id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) return setMessage(result.message || 'Suppression impossible.');
    setMessage('Élément supprimé.');
    await load();
  }

  function openEdit(item?: RecordRow) {
    setEditing(item || null);
    setFormValues(item ? Object.fromEntries(module.fields.map(field => [field.key, String(item.data[field.key] || '')])) : {});
    setFormOpen(true);
  }

  function fieldOptions(fieldKey: string) {
    const source = sourceByField[fieldKey];
    if (!source) return null;
    if (source === 'countries') return countries;
    if (source === 'states') return states;
    return dynamicOptions[source] || [];
  }

  return <div className="grid gap-6">
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">{module.group}</p>
        <h2 className="mt-2 text-3xl font-black">{module.title}</h2>
        <p className="mt-2 max-w-3xl leading-7 text-slate-500">{module.description}</p>
      </div>
      <button onClick={() => openEdit()} className="btn-primary"><Plus className="mr-2 h-4" />Ajouter</button>
    </section>

    {message && <p className="rounded-md bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}

    <section className="rounded-lg border bg-white">
      <header className="flex flex-wrap items-center gap-3 border-b p-4">
        <label className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-3 h-4 text-slate-400" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher..." className="admin-input pl-10" />
        </label>
        <select value={status} onChange={event => setStatus(event.target.value)} className="admin-input max-w-48">
          <option value="">Tous les statuts</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </header>

      {filtered.length ? <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="p-4">Élément</th><th className="p-4">Référence</th><th className="p-4">Statut</th><th className="p-4">Date</th><th className="p-4 text-right">Actions</th></tr></thead>
          <tbody>{filtered.map(item => {
            const action = workflowActionFor(module.slug, item.status);
            const processed = Array.isArray(item.data.workflow_processed_actions) ? item.data.workflow_processed_actions : [];
            const workflowAvailable = action && !processed.includes(action.id);
            return <tr key={item.id} className="border-t">
              <td className="p-4">
                <b>{item.title}</b>
                <p className="mt-1 max-w-xl truncate text-xs text-slate-400">{module.fields.slice(1, 4).map(field => item.data[field.key]).filter(Boolean).join(' · ')}</p>
                {action && processed.includes(action.id) && <p className="mt-2 text-xs font-bold text-emerald-700">Étape suivante déjà exécutée</p>}
              </td>
              <td className="p-4">{item.reference || '-'}</td>
              <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.status === 'validated' ? 'bg-emerald-50 text-emerald-800' : item.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{statusLabels[item.status] || item.status}</span></td>
              <td className="p-4">{new Date(item.created_at).toLocaleDateString('fr-FR')}</td>
              <td className="p-4"><div className="flex justify-end gap-2">
                <button title="Modifier" onClick={() => openEdit(item)} className="icon-action"><FilePenLine className="h-4" /></button>
                {item.status === 'draft' && <button title="Soumettre" onClick={() => changeStatus(item, 'submitted')} className="icon-action text-blue-700"><Send className="h-4" /></button>}
                {item.status === 'submitted' && <>
                  <button title="Valider" onClick={() => changeStatus(item, 'validated')} className="icon-action text-emerald-700"><CheckCircle2 className="h-4" /></button>
                  <button title="Rejeter" onClick={() => changeStatus(item, 'rejected')} className="icon-action text-red-700"><XCircle className="h-4" /></button>
                </>}
                {workflowAvailable && <button disabled={workflowBusy === item.id} title={action.label} onClick={() => advanceWorkflow(item)} className="icon-action text-violet-700"><GitBranch className="h-4" /></button>}
                <button title="Supprimer" onClick={() => remove(item)} className="icon-action text-red-700"><Trash2 className="h-4" /></button>
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div> : <div className="p-12 text-center text-sm text-slate-500">Aucun élément enregistré dans ce module.</div>}
    </section>

    {formOpen && <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 p-4">
      <div className="mx-auto my-8 max-w-4xl rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b p-5">
          <div><p className="text-xs font-black uppercase text-[#ef7f3b]">{editing ? 'Modification' : 'Nouvel élément'}</p><h3 className="mt-1 text-xl font-black">{module.title}</h3></div>
          <button onClick={() => { setFormOpen(false); setEditing(null); }} className="icon-action"><X className="h-5" /></button>
        </header>
        <form onSubmit={save} className="grid gap-4 p-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            Référence interne
            <input
              name="reference"
              defaultValue={editing?.reference || ''}
              readOnly={!editing}
              placeholder="Générée automatiquement, ex. I7K3P9Q2"
              className="admin-input read-only:bg-slate-50 read-only:text-slate-500"
            />
            {!editing && <span className="text-xs font-medium text-slate-500">Automatique: 8 caractères, initiale du module puis lettres/chiffres.</span>}
          </label>
          {module.fields.map(field => {
            const options = fieldOptions(field.key);
            const value = formValues[field.key] ?? String(editing?.data[field.key] || '');
            return <label key={field.key} className={`grid gap-2 text-sm font-bold ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
              {field.label}
              {field.type === 'textarea' ? <>
                <textarea
                  name={field.key}
                  required={field.required}
                  value={value}
                  onChange={event => setFormValues(current => ({ ...current, [field.key]: event.target.value }))}
                  rows={4}
                  className="admin-input"
                />
                {workflowItemFields.has(field.key) && <span className="text-xs font-normal text-slate-500">Une ligne par article : désignation | quantité | unité | prix unitaire. Exemple : Menu poulet | 20 | portion | 2500</span>}
              </> : options ? <select
                name={field.key}
                required={field.required}
                value={value}
                onChange={event => setFormValues(current => ({
                  ...current,
                  [field.key]: event.target.value,
                  ...(field.key === 'country' ? { region: '', state: '', state_region: '' } : {}),
                }))}
                className="admin-input"
              >
                <option value="">Sélectionner</option>
                {options.map(option => <option key={`${field.key}-${option.value}`} value={option.value}>{option.label}</option>)}
                {!options.some(option => option.value === value) && value && <option value={value}>{value}</option>}
              </select> : field.type === 'select' ? <select
                name={field.key}
                required={field.required}
                value={value}
                onChange={event => setFormValues(current => ({ ...current, [field.key]: event.target.value }))}
                className="admin-input"
              >
                <option value="">Sélectionner</option>{field.options?.map(option => <option key={option}>{option}</option>)}
              </select> : <input
                name={field.key}
                type={field.type || 'text'}
                required={field.required}
                value={value}
                onChange={event => setFormValues(current => ({ ...current, [field.key]: event.target.value }))}
                className="admin-input"
              />}
            </label>;
          })}
          <div className="flex justify-end gap-3 border-t pt-5 md:col-span-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Annuler</button>
            <button disabled={busy} className="btn-primary">{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>}
  </div>;
}
