'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Edit, Eye, Plus, Search, Trash2, X } from 'lucide-react';
import budgetCatalog from '@/lib/maximus-budget-lines.json';

type Row = {
  id: string;
  title: string;
  reference?: string | null;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

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

const catalog = (budgetCatalog as { budgetLines: BudgetLine[] }).budgetLines;
const text = (value: unknown) => typeof value === 'string' ? value : '';

function localized(line: BudgetLine, language: 'fr' | 'en', field: 'category' | 'subCategory' | 'subSubCategory' | 'description') {
  if (field === 'description') return language === 'fr' ? line.description_fr || line.description_en : line.description_en;
  if (language === 'fr') return line[`${field}_fr` as keyof BudgetLine] as string || line[field];
  return line[field];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export default function BudgetaryLines() {
  const [records, setRecords] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [subSubCategory, setSubSubCategory] = useState('');
  const [description, setDescription] = useState('');
  const [comment, setComment] = useState('');
  const [search, setSearch] = useState('');
  const [natureFilter, setNatureFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/maximus/records?module=finance%2Fbudget-lines');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Unable to load budgetary lines.');
    setRecords(payload.items || []);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load budgetary lines.'));
  }, []);

  const categoryOptions = useMemo(() => unique(catalog.map(line => localized(line, language, 'category'))), [language]);
  const categoryLines = useMemo(() => catalog.filter(line => !category || localized(line, language, 'category') === category), [category, language]);
  const subCategoryOptions = useMemo(() => unique(categoryLines.map(line => localized(line, language, 'subCategory'))), [categoryLines, language]);
  const subCategoryLines = useMemo(() => categoryLines.filter(line => !subCategory || localized(line, language, 'subCategory') === subCategory), [categoryLines, subCategory, language]);
  const subSubCategoryOptions = useMemo(() => unique(subCategoryLines.map(line => localized(line, language, 'subSubCategory'))), [subCategoryLines, language]);
  const descriptionLines = useMemo(() => subCategoryLines.filter(line => !subSubCategory || localized(line, language, 'subSubCategory') === subSubCategory), [subCategoryLines, subSubCategory, language]);
  const selectedLine = useMemo(() => descriptionLines.find(line => localized(line, language, 'description') === description) || null, [descriptionLines, description, language]);

  const filtered = useMemo(() => records.filter(row => {
    const haystack = [
      row.data.code, row.data.category, row.data.subCategory, row.data.subSubCategory,
      row.data.description, row.data.ohadaAccount, row.data.ohadaAccountName,
    ].map(text).join(' ').toLowerCase();
    return haystack.includes(search.toLowerCase()) && (natureFilter === 'all' || text(row.data.nature) === natureFilter);
  }), [records, search, natureFilter]);

  function resetSelection(nextLanguage: 'fr' | 'en' = language) {
    setLanguage(nextLanguage);
    setCategory('');
    setSubCategory('');
    setSubSubCategory('');
    setDescription('');
    setComment('');
  }

  function openForm(row?: Row) {
    if (!row) {
      setEditing(null);
      resetSelection('fr');
    } else {
      setEditing(row);
      setLanguage('en');
      setCategory(text(row.data.category));
      setSubCategory(text(row.data.subCategory));
      setSubSubCategory(text(row.data.subSubCategory));
      setDescription(text(row.data.description));
      setComment(text(row.data.comment));
    }
    setMessage('');
    setFormOpen(true);
  }

  function changeLanguage(value: 'fr' | 'en') {
    resetSelection(value);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLine) return setMessage('Complete all selections to choose an official budgetary line.');
    const duplicate = records.find(row => row.id !== editing?.id && text(row.data.code) === selectedLine.code);
    if (duplicate) return setMessage(`Budgetary line ${selectedLine.code} already exists.`);
    const data = {
      code: selectedLine.code,
      category: selectedLine.category,
      subCategory: selectedLine.subCategory,
      subSubCategory: selectedLine.subSubCategory,
      description: selectedLine.description_en,
      category_fr: selectedLine.category_fr || selectedLine.category,
      subCategory_fr: selectedLine.subCategory_fr || selectedLine.subCategory,
      subSubCategory_fr: selectedLine.subSubCategory_fr || selectedLine.subSubCategory,
      description_fr: selectedLine.description_fr || selectedLine.description_en,
      nature: selectedLine.nature || '',
      ohadaClass: selectedLine.ohadaClass || '',
      ohadaAccount: selectedLine.ohadaAccount || '',
      ohadaAccountName: selectedLine.ohadaAccountName || '',
      usefulLife: selectedLine.usefulLife || 'N/A',
      amortizationMethod: selectedLine.amortizationMethod || 'N/A',
      comment: comment.trim(),
    };
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing
        ? { id: editing.id, title: `${data.code} - ${data.description}`, data }
        : { module: 'finance/budget-lines', title: `${data.code} - ${data.description}`, data }),
    });
    const payload = await response.json();
    if (response.ok && !editing) {
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.item.id, status: 'validated', data }),
      });
    }
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save the budgetary line.');
    setFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Budgetary line updated.' : 'Budgetary line created from the official catalog.');
    await load();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete budgetary line ${text(row.data.code)}? Existing records referencing this code will retain their stored value.`)) return;
    const response = await fetch(`/api/maximus/records?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.message || 'Unable to delete the budgetary line.');
    setMessage('Budgetary line deleted.');
    await load();
  }

  const details = viewing ? viewing.data : null;

  return <div className="grid gap-6 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><Link href="/maximus/finance/dashboard" title="Back to Finance" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link><h2 className="text-3xl font-black">Budgetary Lines</h2></div>
      <button onClick={() => openForm()} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add Budget Line</button>
    </div>

    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('Unable') || message.includes('already') || message.includes('Complete') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-black">Budget Lines Register</h3><p className="mt-1 text-sm text-slate-500">List of all defined budgetary lines in the system.</p></div><div className="flex flex-wrap gap-3"><label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input min-w-64 pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search code or description..." /></label><select className="admin-input min-w-36" value={natureFilter} onChange={event => setNatureFilter(event.target.value)}><option value="all">All Natures</option><option>OPEX</option><option>CAPEX</option></select></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1450px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Code Budgetaire</th><th className="p-3">Category</th><th className="p-3">Subcategory</th><th className="p-3">Sub-subcategory</th><th className="p-3">Description</th><th className="p-3">Nature</th><th className="p-3">OHADA Class</th><th className="p-3">OHADA Account</th><th className="p-3">OHADA Account Name</th><th className="p-3">Useful Life</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{filtered.length ? filtered.map(row => <tr key={row.id} className="border-b align-top"><td className="p-3 font-mono text-xs font-bold">{text(row.data.code)}</td><td className="p-3">{text(row.data.category)}</td><td className="p-3">{text(row.data.subCategory)}</td><td className="p-3">{text(row.data.subSubCategory)}</td><td className="max-w-64 p-3 font-semibold">{text(row.data.description)}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{text(row.data.nature)}</span></td><td className="p-3">{text(row.data.ohadaClass)}</td><td className="p-3 font-mono text-xs">{text(row.data.ohadaAccount)}</td><td className="p-3">{text(row.data.ohadaAccountName)}</td><td className="p-3">{text(row.data.usefulLife) || 'N/A'}</td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setViewing(row)} title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button><button onClick={() => openForm(row)} title="Edit" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button><button onClick={() => remove(row)} title="Delete" className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button></div></td></tr>) : <tr><td colSpan={11} className="h-32 text-center text-slate-500">No budget lines created yet.</td></tr>}</tbody></table></div>
    </section>

    {formOpen && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}><section className="mx-auto my-6 w-full max-w-2xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">{editing ? 'Edit Budget Line' : 'Add a New Budget Line'}</h3><p className="mt-1 text-sm text-slate-500">Create a budgetary line from the official chart of accounts.</p></div><button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header>
      <form onSubmit={save} className="grid max-h-[78vh] gap-5 overflow-y-auto p-6">
        <label className="grid gap-2 text-sm font-semibold">Language for Selection<select className="admin-input" value={language} onChange={event => changeLanguage(event.target.value as 'fr' | 'en')}><option value="fr">Francais</option><option value="en">English</option></select></label>
        <label className="grid gap-2 text-sm font-semibold">Category<select className="admin-input" required value={category} onChange={event => { setCategory(event.target.value); setSubCategory(''); setSubSubCategory(''); setDescription(''); }}><option value="">Select a category</option>{categoryOptions.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Subcategory<select className="admin-input" required disabled={!category} value={subCategory} onChange={event => { setSubCategory(event.target.value); setSubSubCategory(''); setDescription(''); }}><option value="">Select a subcategory</option>{subCategoryOptions.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Sub-subcategory<select className="admin-input" required disabled={!subCategory} value={subSubCategory} onChange={event => { setSubSubCategory(event.target.value); setDescription(''); }}><option value="">Select a sub-subcategory</option>{subSubCategoryOptions.map(option => <option key={option}>{option}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Description<select className="admin-input" required disabled={!subSubCategory} value={description} onChange={event => setDescription(event.target.value)}><option value="">Select a description</option>{descriptionLines.map(line => <option key={line.code} value={localized(line, language, 'description')}>{localized(line, language, 'description')}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Comment (Optional)<textarea className="admin-input min-h-20" value={comment} onChange={event => setComment(event.target.value)} placeholder="Add a comment..." /></label>
        <div className="rounded-md border bg-emerald-50/40 p-5"><h4 className="text-center font-black">Selected Line Details</h4>{selectedLine ? <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">{[
          ['Code', selectedLine.code], ['Description', localized(selectedLine, language, 'description')],
          ['Category', localized(selectedLine, language, 'category')], ['Subcategory', localized(selectedLine, language, 'subCategory')],
          ['Sub-subcategory', localized(selectedLine, language, 'subSubCategory')], ['Nature', selectedLine.nature || 'N/A'],
          ['OHADA Class', selectedLine.ohadaClass || 'N/A'], ['OHADA Account', selectedLine.ohadaAccount || 'N/A'],
          ['OHADA Account Name', selectedLine.ohadaAccountName || 'N/A'], ['Useful Life', selectedLine.usefulLife || 'N/A'],
          ['Amortization Method', selectedLine.amortizationMethod || 'N/A'],
        ].map(([label, value]) => <div key={label} className={label === 'OHADA Account Name' ? 'sm:col-span-2' : ''}><p className="text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div> : <p className="py-8 text-center text-sm text-slate-500">Details will appear here after selection.</p>}</div>
        <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy || !selectedLine} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : 'Save Budget Line'}</button></div>
      </form></section></div>}

    {viewing && details && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setViewing(null)}><section className="w-full max-w-2xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><p className="font-mono text-xs text-slate-500">{text(details.code)}</p><h3 className="mt-1 text-2xl font-black">{text(details.description)}</h3></div><button onClick={() => setViewing(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-4 p-6 text-sm sm:grid-cols-2">{[
      ['Category', details.category], ['Subcategory', details.subCategory], ['Sub-subcategory', details.subSubCategory],
      ['Nature', details.nature], ['OHADA Class', details.ohadaClass], ['OHADA Account', details.ohadaAccount],
      ['OHADA Account Name', details.ohadaAccountName], ['Useful Life', details.usefulLife],
      ['Amortization Method', details.amortizationMethod], ['Comment', details.comment],
    ].map(([label, value]) => <div key={String(label)}><p className="text-slate-500">{String(label)}</p><p className="mt-1 font-semibold">{text(value) || 'N/A'}</p></div>)}</div></section></div>}
  </div>;
}
