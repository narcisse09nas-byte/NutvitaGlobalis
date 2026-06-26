'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FilePenLine, GitBranch, Plus, Search, Send, Trash2, X, XCircle } from 'lucide-react';
import type { MaximusModule } from '@/lib/maximus-modules';
import { workflowActionFor } from '@/lib/maximus-workflows';
import budgetCatalog from '@/lib/maximus-budget-lines.json';

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
type BudgetLine = {
  code: string;
  category: string;
  category_fr?: string;
  subCategory: string;
  subCategory_fr?: string;
  subSubCategory: string;
  subSubCategory_fr?: string;
  description_en: string;
  description_fr?: string;
  nature?: string;
  ohadaClass?: string;
  ohadaAccount?: string;
  ohadaAccountName?: string;
  usefulLife?: string | null;
  amortizationMethod?: string | null;
};

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  submitted: 'Soumis',
  endorsed: 'Endossé',
  validated: 'Validé',
  acknowledged: 'Accusé réception',
  delivered: 'Livré',
  served: 'Servi',
  executed: 'Exécuté',
  paid: 'Payé',
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
const budgetLinesData = (budgetCatalog as { budgetLines: BudgetLine[] }).budgetLines;

function budgetKey(language: string, key: 'category' | 'subCategory' | 'subSubCategory' | 'description') {
  if (key === 'description') return language === 'English' ? 'description_en' : 'description_fr';
  return language === 'English' ? key : `${key}_fr`;
}

function budgetLineValue(line: BudgetLine, language: string, key: 'category' | 'subCategory' | 'subSubCategory' | 'description') {
  const field = budgetKey(language, key) as keyof BudgetLine;
  return String(line[field] || (key === 'description' ? line.description_en : line[key]) || '');
}

function uniqueBudgetOptions(lines: BudgetLine[], language: string, key: 'category' | 'subCategory' | 'subSubCategory' | 'description') {
  return [...new Set(lines.map(line => budgetLineValue(line, language, key)).filter(Boolean))];
}

function statusActionsFor(moduleSlug: string, currentStatus: string) {
  if (currentStatus === 'draft') return [{ status: 'submitted', label: 'Soumettre' }];
  if (currentStatus === 'submitted') {
    if (['finance/requests', 'sales/daily-orders'].includes(moduleSlug)) {
      return [
        { status: 'endorsed', label: 'Endosser' },
        { status: 'rejected', label: 'Rejeter' },
      ];
    }
    return [
      { status: 'validated', label: 'Valider' },
      { status: 'rejected', label: 'Rejeter' },
    ];
  }
  if (currentStatus === 'endorsed') return [
    { status: 'validated', label: 'Valider' },
    { status: 'rejected', label: 'Rejeter' },
  ];
  if (currentStatus === 'validated') {
    if (moduleSlug === 'sales/daily-orders') return [{ status: 'acknowledged', label: 'Accuser réception' }];
    if (moduleSlug === 'production/consolidated-orders') return [{ status: 'delivered', label: 'Marquer livré' }];
    if (moduleSlug === 'sales/delivery-register') return [{ status: 'delivered', label: 'Marquer livré' }];
    if (moduleSlug === 'finance/payments') return [{ status: 'paid', label: 'Marquer payé' }];
    if (moduleSlug === 'finance/cash-deposits') return [{ status: 'executed', label: 'Exécuter' }];
  }
  if (currentStatus === 'delivered' && moduleSlug === 'production/consolidated-orders') return [{ status: 'served', label: 'Servi' }];
  return [];
}

export default function MaximusRecords({ module, embedded = false }: { module: MaximusModule; embedded?: boolean }) {
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
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module.slug)}`);
    const result = await response.json();
    if (response.ok) setItems(result.items || []);
    else setMessage(result.message || 'Chargement impossible.');
  }

  useEffect(() => { load(); setFieldFilters({}); }, [module.slug]);
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

  const registryFields = useMemo(() => {
    const keys = module.registryColumns || module.fields.filter(field => !field.hidden).slice(0, 8).map(field => field.key);
    return keys.map(key => module.fields.find(field => field.key === key) || { key, label: key }).filter(field => !field.hidden);
  }, [module]);

  const filtered = useMemo(() => items.filter(item => {
    const haystack = `${item.title} ${item.reference || ''} ${JSON.stringify(item.data)}`.toLowerCase();
    if (status && item.status !== status) return false;
    if (search && !haystack.includes(search.toLowerCase())) return false;
    return Object.entries(fieldFilters).every(([key, value]) => {
      if (!value) return true;
      return String(item.data[key] || '').toLowerCase().includes(value.toLowerCase());
    });
  }), [items, search, status, fieldFilters]);

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
    setFormValues(item ? Object.fromEntries(module.fields.map(field => [field.key, String(item.data[field.key] || '')])) : { selection_language: 'Français' });
    setFormOpen(true);
  }

  function fieldOptions(fieldKey: string) {
    const field = module.fields.find(item => item.key === fieldKey);
    const source = field?.optionSource || sourceByField[fieldKey];
    if (!source) return null;
    if (source === 'countries') return countries;
    if (source === 'states') return states;
    return dynamicOptions[source] || [];
  }

  function budgetSelection(values = formValues, descriptionKey: 'description' | 'budgetDescription' = 'description') {
    const language = values.selection_language || 'Français';
    const category = values.category || '';
    const subCategory = values.subCategory || '';
    const subSubCategory = values.subSubCategory || '';
    const categoryOptions = uniqueBudgetOptions(budgetLinesData, language, 'category');
    const subCategoryLines = budgetLinesData.filter(line => !category || budgetLineValue(line, language, 'category') === category);
    const subCategoryOptions = uniqueBudgetOptions(subCategoryLines, language, 'subCategory');
    const subSubCategoryLines = subCategoryLines.filter(line => !subCategory || budgetLineValue(line, language, 'subCategory') === subCategory);
    const subSubCategoryOptions = uniqueBudgetOptions(subSubCategoryLines, language, 'subSubCategory');
    const descriptionLines = subSubCategoryLines.filter(line => !subSubCategory || budgetLineValue(line, language, 'subSubCategory') === subSubCategory);
    const selectedLine = descriptionLines.find(line => budgetLineValue(line, language, 'description') === values[descriptionKey]) || null;
    return { language, categoryOptions, subCategoryOptions, subSubCategoryOptions, descriptionLines, selectedLine };
  }

  function applyBudgetLine(line: BudgetLine | null, language: string, description: string) {
    setFormValues(current => ({
      ...current,
      description,
      code: line?.code || '',
      category: line ? budgetLineValue(line, language, 'category') : current.category || '',
      subCategory: line ? budgetLineValue(line, language, 'subCategory') : current.subCategory || '',
      subSubCategory: line ? budgetLineValue(line, language, 'subSubCategory') : current.subSubCategory || '',
      nature: line?.nature || '',
      ohadaClass: line?.ohadaClass || '',
      ohadaAccount: line?.ohadaAccount || '',
      ohadaAccountName: line?.ohadaAccountName || '',
      usefulLife: line?.usefulLife || 'N/A',
      amortizationMethod: line?.amortizationMethod || 'N/A',
    }));
  }

  function applyFinanceBudgetLine(line: BudgetLine | null, language: string, description: string) {
    setFormValues(current => ({
      ...current,
      budgetDescription: description,
      budget_line: line?.code || '',
      category: line ? budgetLineValue(line, language, 'category') : current.category || '',
      subCategory: line ? budgetLineValue(line, language, 'subCategory') : current.subCategory || '',
      subSubCategory: line ? budgetLineValue(line, language, 'subSubCategory') : current.subSubCategory || '',
      budgetLineNature: line?.nature || '',
      budgetLineOhadaClass: line?.ohadaClass || '',
      budgetLineOhadaAccount: line?.ohadaAccount || '',
      budgetLineOhadaAccountName: line?.ohadaAccountName || '',
    }));
  }

  const pettyCashTotals = useMemo(() => {
    if (module.specializedForm !== 'pettyCash') return null;
    return items.reduce((totals, item) => {
      const amount = Number(item.data.amount || 0);
      const type = String(item.data.transaction_type || '').toLowerCase();
      if (type === 'entrée' || type === 'entree' || type === 'in' || type === 'bank' || type === 'partner' || type === 'other') totals.in += amount;
      if (type === 'sortie' || type === 'out') totals.out += amount;
      totals.balance = totals.in - totals.out;
      return totals;
    }, { in: 0, out: 0, balance: 0 });
  }, [items, module.specializedForm]);

  const stockSummary = useMemo(() => {
    if (module.slug !== 'supply/central-stock') return null;
    return items.reduce((summary, item) => {
      const quantity = Number(item.data.quantity || 0);
      const type = String(item.data.movement_type || '').toLowerCase();
      if (type === 'entrée' || type === 'entree') summary.in += quantity;
      if (type === 'sortie' || type === 'transfert' || type === 'perte') summary.out += quantity;
      if (type === 'ajustement') summary.adjustments += quantity;
      summary.balance = summary.in - summary.out + summary.adjustments;
      return summary;
    }, { in: 0, out: 0, adjustments: 0, balance: 0 });
  }, [items, module.slug]);

  const budget = module.specializedForm === 'budgetLines' ? budgetSelection() : null;
  const financeBudget = module.specializedForm === 'financeRequest' ? budgetSelection(formValues, 'budgetDescription') : null;

  return <div className="grid gap-6">
    {!embedded && <section className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">{module.group}</p>
        <h2 className="mt-2 text-3xl font-black">{module.title}</h2>
        <p className="mt-2 max-w-3xl leading-7 text-slate-500">{module.description}</p>
      </div>
      <button onClick={() => openEdit()} className="btn-primary"><Plus className="mr-2 h-4" />Ajouter</button>
    </section>}

    {message && <p className="rounded-md bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}

    {pettyCashTotals && <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border bg-white p-5">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Entrées</p>
        <p className="mt-2 text-2xl font-black text-emerald-700">{pettyCashTotals.in.toLocaleString('fr-FR')} FCFA</p>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sorties</p>
        <p className="mt-2 text-2xl font-black text-red-700">{pettyCashTotals.out.toLocaleString('fr-FR')} FCFA</p>
      </div>
      <div className="rounded-lg border bg-emerald-50 p-5">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Solde petite caisse</p>
        <p className="mt-2 text-2xl font-black text-emerald-900">{pettyCashTotals.balance.toLocaleString('fr-FR')} FCFA</p>
      </div>
    </section>}

    {stockSummary && <section className="grid gap-4 md:grid-cols-4">
      <div className="rounded-lg border bg-white p-5">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Entrées stock</p>
        <p className="mt-2 text-2xl font-black text-emerald-700">{stockSummary.in.toLocaleString('fr-FR')}</p>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Sorties / transferts</p>
        <p className="mt-2 text-2xl font-black text-red-700">{stockSummary.out.toLocaleString('fr-FR')}</p>
      </div>
      <div className="rounded-lg border bg-white p-5">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Ajustements</p>
        <p className="mt-2 text-2xl font-black text-slate-800">{stockSummary.adjustments.toLocaleString('fr-FR')}</p>
      </div>
      <div className="rounded-lg border bg-emerald-50 p-5">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Solde net</p>
        <p className="mt-2 text-2xl font-black text-emerald-900">{stockSummary.balance.toLocaleString('fr-FR')}</p>
      </div>
    </section>}

    <section className="rounded-lg border bg-white">
      <header className="border-b p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black">{module.title} Register</h3>
            <p className="mt-1 text-sm text-slate-500">Liste des éléments enregistrés dans ce module.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {embedded && <button onClick={() => openEdit()} className="btn-primary"><Plus className="mr-2 h-4" />Ajouter</button>}
            <label className="relative min-w-[240px]">
              <Search className="absolute left-3 top-3 h-4 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher..." className="admin-input pl-10" />
            </label>
            <select value={status} onChange={event => setStatus(event.target.value)} className="admin-input max-w-48">
              <option value="">Tous les statuts</option>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {registryFields.slice(0, 4).map(field => {
            const options = fieldOptions(field.key);
            return <label key={`filter-${field.key}`} className="grid gap-1 text-xs font-bold text-slate-500">
              {field.label}
              {options ? <select value={fieldFilters[field.key] || ''} onChange={event => setFieldFilters(current => ({ ...current, [field.key]: event.target.value }))} className="admin-input py-2 text-sm">
                <option value="">Tous</option>
                {options.map(option => <option key={`filter-${field.key}-${option.value}`} value={option.value}>{option.label}</option>)}
              </select> : <input value={fieldFilters[field.key] || ''} onChange={event => setFieldFilters(current => ({ ...current, [field.key]: event.target.value }))} className="admin-input py-2 text-sm" placeholder="Filtrer" />}
            </label>;
          })}
        </div>
      </header>

      {filtered.length ? <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-slate-500"><th className="p-4">Élément</th><th className="p-4">Référence</th>{registryFields.map(field => <th key={field.key} className="p-4">{field.label}</th>)}<th className="p-4">Statut</th><th className="p-4">Date</th><th className="p-4 text-right">Actions</th></tr></thead>
          <tbody>{filtered.map(item => {
            const action = workflowActionFor(module.slug, item.status);
            const processed = Array.isArray(item.data.workflow_processed_actions) ? item.data.workflow_processed_actions : [];
            const workflowAvailable = action && !processed.includes(action.id);
            const statusActions = statusActionsFor(module.slug, item.status);
            return <tr key={item.id} className="border-t">
              <td className="p-4">
                <b>{item.title}</b>
                <p className="mt-1 max-w-xl truncate text-xs text-slate-400">{registryFields.slice(0, 3).map(field => item.data[field.key]).filter(Boolean).join(' · ')}</p>
                {action && processed.includes(action.id) && <p className="mt-2 text-xs font-bold text-emerald-700">Étape suivante déjà exécutée</p>}
              </td>
              <td className="p-4">{item.reference || '-'}</td>
              {registryFields.map(field => <td key={`${item.id}-${field.key}`} className="max-w-[240px] truncate p-4">{String(item.data[field.key] ?? '-')}</td>)}
              <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${item.status === 'validated' ? 'bg-emerald-50 text-emerald-800' : item.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'}`}>{statusLabels[item.status] || item.status}</span></td>
              <td className="p-4">{new Date(item.created_at).toLocaleDateString('fr-FR')}</td>
              <td className="p-4"><div className="flex justify-end gap-2">
                <button title="Modifier" onClick={() => openEdit(item)} className="icon-action"><FilePenLine className="h-4" /></button>
                {statusActions.map(statusAction => <button
                  key={`${item.id}-${statusAction.status}`}
                  title={statusAction.label}
                  onClick={() => changeStatus(item, statusAction.status)}
                  className={`icon-action ${statusAction.status === 'rejected' ? 'text-red-700' : statusAction.status === 'submitted' ? 'text-blue-700' : 'text-emerald-700'}`}
                >
                  {statusAction.status === 'rejected' ? <XCircle className="h-4" /> : statusAction.status === 'submitted' ? <Send className="h-4" /> : <CheckCircle2 className="h-4" />}
                </button>)}
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
            if (field.hidden) return <input key={field.key} type="hidden" name={field.key} value={value} />;
            if (module.specializedForm === 'financeRequest' && financeBudget) {
              if (field.key === 'selection_language') return <label key={field.key} className="grid gap-2 text-sm font-bold md:col-span-2">
                {field.label}
                <select
                  name={field.key}
                  value={value || 'Français'}
                  onChange={event => setFormValues(current => ({ ...current, selection_language: event.target.value, category: '', subCategory: '', subSubCategory: '', budgetDescription: '', budget_line: '' }))}
                  className="admin-input"
                >
                  <option value="Français">Français</option>
                  <option value="English">English</option>
                </select>
              </label>;
              if (field.key === 'category') return <label key={field.key} className="grid gap-2 text-sm font-bold">
                {field.label}
                <select
                  name={field.key}
                  required={field.required}
                  value={value}
                  onChange={event => setFormValues(current => ({ ...current, category: event.target.value, subCategory: '', subSubCategory: '', budgetDescription: '', budget_line: '' }))}
                  className="admin-input"
                >
                  <option value="">Sélectionner</option>
                  {financeBudget.categoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>;
              if (field.key === 'subCategory') return <label key={field.key} className="grid gap-2 text-sm font-bold">
                {field.label}
                <select
                  name={field.key}
                  required={field.required}
                  value={value}
                  disabled={!formValues.category}
                  onChange={event => setFormValues(current => ({ ...current, subCategory: event.target.value, subSubCategory: '', budgetDescription: '', budget_line: '' }))}
                  className="admin-input"
                >
                  <option value="">Sélectionner</option>
                  {financeBudget.subCategoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>;
              if (field.key === 'subSubCategory') return <label key={field.key} className="grid gap-2 text-sm font-bold">
                {field.label}
                <select
                  name={field.key}
                  required={field.required}
                  value={value}
                  disabled={!formValues.subCategory}
                  onChange={event => setFormValues(current => ({ ...current, subSubCategory: event.target.value, budgetDescription: '', budget_line: '' }))}
                  className="admin-input"
                >
                  <option value="">Sélectionner</option>
                  {financeBudget.subSubCategoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>;
              if (field.key === 'budgetDescription') return <label key={field.key} className="grid gap-2 text-sm font-bold md:col-span-2">
                {field.label}
                <select
                  name={field.key}
                  required={field.required}
                  value={value}
                  disabled={!formValues.subSubCategory}
                  onChange={event => {
                    const description = event.target.value;
                    const line = financeBudget.descriptionLines.find(item => budgetLineValue(item, financeBudget.language, 'description') === description) || null;
                    applyFinanceBudgetLine(line, financeBudget.language, description);
                  }}
                  className="admin-input"
                >
                  <option value="">Sélectionner</option>
                  {financeBudget.descriptionLines.map(line => {
                    const label = budgetLineValue(line, financeBudget.language, 'description');
                    return <option key={line.code} value={label}>{label}</option>;
                  })}
                </select>
              </label>;
              if (field.key === 'budget_line') return <label key={field.key} className="grid gap-2 text-sm font-bold">
                {field.label}
                <input name={field.key} value={value} readOnly required={field.required} className="admin-input bg-slate-50 text-slate-500" />
              </label>;
            }
            if (module.specializedForm === 'pettyCash' && field.key === 'transaction_type') return <label key={field.key} className="grid gap-2 text-sm font-bold">
              {field.label}
              <select
                name={field.key}
                required={field.required}
                value={value || 'Entrée'}
                onChange={event => setFormValues(current => ({ ...current, transaction_type: event.target.value }))}
                className="admin-input"
              >
                <option value="Entrée">Entrée de caisse</option>
                <option value="Sortie">Sortie de caisse</option>
              </select>
            </label>;
            if (module.specializedForm === 'pettyCash' && field.key === 'source_or_beneficiary') return <label key={field.key} className="grid gap-2 text-sm font-bold">
              {(formValues.transaction_type || editing?.data.transaction_type) === 'Sortie' ? 'Bénéficiaire' : 'Source / déposant'}
              {options ? <select
                name={field.key}
                value={value}
                onChange={event => setFormValues(current => ({ ...current, [field.key]: event.target.value }))}
                className="admin-input"
              >
                <option value="">Sélectionner</option>
                {options.map(option => <option key={`${field.key}-${option.value}`} value={option.value}>{option.label}</option>)}
                {!options.some(option => option.value === value) && value && <option value={value}>{value}</option>}
              </select> : <input name={field.key} value={value} onChange={event => setFormValues(current => ({ ...current, [field.key]: event.target.value }))} className="admin-input" />}
            </label>;
            if (module.specializedForm === 'budgetLines' && budget) {
              if (field.key === 'selection_language') return <label key={field.key} className="grid gap-2 text-sm font-bold md:col-span-2">
                {field.label}
                <select
                  name={field.key}
                  value={value || 'Français'}
                  onChange={event => setFormValues(current => ({ ...current, selection_language: event.target.value, category: '', subCategory: '', subSubCategory: '', description: '', code: '', nature: '', ohadaClass: '', ohadaAccount: '', ohadaAccountName: '', usefulLife: '', amortizationMethod: '' }))}
                  className="admin-input"
                >
                  <option value="Français">Français</option>
                  <option value="English">English</option>
                </select>
              </label>;
              if (field.key === 'category') return <label key={field.key} className="grid gap-2 text-sm font-bold">
                {field.label}
                <select
                  name={field.key}
                  required={field.required}
                  value={value}
                  onChange={event => setFormValues(current => ({ ...current, category: event.target.value, subCategory: '', subSubCategory: '', description: '', code: '' }))}
                  className="admin-input"
                >
                  <option value="">Sélectionner</option>
                  {budget.categoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>;
              if (field.key === 'subCategory') return <label key={field.key} className="grid gap-2 text-sm font-bold">
                {field.label}
                <select
                  name={field.key}
                  required={field.required}
                  value={value}
                  disabled={!formValues.category}
                  onChange={event => setFormValues(current => ({ ...current, subCategory: event.target.value, subSubCategory: '', description: '', code: '' }))}
                  className="admin-input"
                >
                  <option value="">Sélectionner</option>
                  {budget.subCategoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>;
              if (field.key === 'subSubCategory') return <label key={field.key} className="grid gap-2 text-sm font-bold">
                {field.label}
                <select
                  name={field.key}
                  required={field.required}
                  value={value}
                  disabled={!formValues.subCategory}
                  onChange={event => setFormValues(current => ({ ...current, subSubCategory: event.target.value, description: '', code: '' }))}
                  className="admin-input"
                >
                  <option value="">Sélectionner</option>
                  {budget.subSubCategoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>;
              if (field.key === 'description') return <label key={field.key} className="grid gap-2 text-sm font-bold md:col-span-2">
                {field.label}
                <select
                  name={field.key}
                  required={field.required}
                  value={value}
                  disabled={!formValues.subSubCategory}
                  onChange={event => {
                    const description = event.target.value;
                    const line = budget.descriptionLines.find(item => budgetLineValue(item, budget.language, 'description') === description) || null;
                    applyBudgetLine(line, budget.language, description);
                  }}
                  className="admin-input"
                >
                  <option value="">Sélectionner</option>
                  {budget.descriptionLines.map(line => {
                    const label = budgetLineValue(line, budget.language, 'description');
                    return <option key={line.code} value={label}>{label}</option>;
                  })}
                </select>
              </label>;
              if (field.key === 'code') return <label key={field.key} className="grid gap-2 text-sm font-bold">
                {field.label}
                <input name={field.key} value={value} readOnly required={field.required} className="admin-input bg-slate-50 text-slate-500" />
              </label>;
            }
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
          {module.specializedForm === 'budgetLines' && budget && <div className="rounded-lg border bg-emerald-50/40 p-4 md:col-span-2">
            <h4 className="text-center text-sm font-black">Selected Line Details</h4>
            {budget.selectedLine ? <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div><p className="text-slate-500">Code</p><p className="font-semibold">{budget.selectedLine.code}</p></div>
              <div><p className="text-slate-500">Description</p><p className="font-semibold">{budgetLineValue(budget.selectedLine, budget.language, 'description')}</p></div>
              <div><p className="text-slate-500">Category</p><p className="font-semibold">{budgetLineValue(budget.selectedLine, budget.language, 'category')}</p></div>
              <div><p className="text-slate-500">Subcategory</p><p className="font-semibold">{budgetLineValue(budget.selectedLine, budget.language, 'subCategory')}</p></div>
              <div><p className="text-slate-500">Sub-subcategory</p><p className="font-semibold">{budgetLineValue(budget.selectedLine, budget.language, 'subSubCategory')}</p></div>
              <div><p className="text-slate-500">Nature</p><p className="font-semibold">{budget.selectedLine.nature || '-'}</p></div>
              <div><p className="text-slate-500">OHADA Class</p><p className="font-semibold">{budget.selectedLine.ohadaClass || '-'}</p></div>
              <div><p className="text-slate-500">OHADA Account</p><p className="font-semibold">{budget.selectedLine.ohadaAccount || '-'}</p></div>
              <div className="md:col-span-2"><p className="text-slate-500">OHADA Account Name</p><p className="font-semibold">{budget.selectedLine.ohadaAccountName || '-'}</p></div>
              <div><p className="text-slate-500">Useful Life</p><p className="font-semibold">{budget.selectedLine.usefulLife || 'N/A'}</p></div>
            </div> : <p className="mt-3 text-center text-sm text-slate-500">Complétez la sélection pour afficher les détails de la ligne.</p>}
          </div>}
          {module.specializedForm === 'financeRequest' && financeBudget && <div className="rounded-lg border bg-emerald-50/40 p-4 md:col-span-2">
            <h4 className="text-center text-sm font-black">Selected Budget Line</h4>
            {financeBudget.selectedLine ? <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
              <div><p className="text-slate-500">Code</p><p className="font-semibold">{financeBudget.selectedLine.code}</p></div>
              <div><p className="text-slate-500">Description</p><p className="font-semibold">{budgetLineValue(financeBudget.selectedLine, financeBudget.language, 'description')}</p></div>
              <div><p className="text-slate-500">Category</p><p className="font-semibold">{budgetLineValue(financeBudget.selectedLine, financeBudget.language, 'category')}</p></div>
              <div><p className="text-slate-500">Subcategory</p><p className="font-semibold">{budgetLineValue(financeBudget.selectedLine, financeBudget.language, 'subCategory')}</p></div>
              <div><p className="text-slate-500">Sub-subcategory</p><p className="font-semibold">{budgetLineValue(financeBudget.selectedLine, financeBudget.language, 'subSubCategory')}</p></div>
              <div><p className="text-slate-500">Nature</p><p className="font-semibold">{financeBudget.selectedLine.nature || '-'}</p></div>
              <div><p className="text-slate-500">OHADA Class</p><p className="font-semibold">{financeBudget.selectedLine.ohadaClass || '-'}</p></div>
              <div><p className="text-slate-500">OHADA Account</p><p className="font-semibold">{financeBudget.selectedLine.ohadaAccount || '-'}</p></div>
              <div className="md:col-span-2"><p className="text-slate-500">OHADA Account Name</p><p className="font-semibold">{financeBudget.selectedLine.ohadaAccountName || '-'}</p></div>
            </div> : <p className="mt-3 text-center text-sm text-slate-500">Complétez la sélection budgétaire pour afficher les détails et le compte OHADA.</p>}
          </div>}
          <div className="flex justify-end gap-3 border-t pt-5 md:col-span-2">
            <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Annuler</button>
            <button disabled={busy} className="btn-primary">{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>}
  </div>;
}
