'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, CircleDollarSign, Edit, Eye, FileCheck, Plus,
  Search, Send, ShieldX, X,
} from 'lucide-react';
import budgetCatalog from '@/lib/maximus-budget-lines.json';

type Row = {
  id: string;
  title: string;
  reference?: string | null;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
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
const amount = (value: unknown) => Number(value || 0);
const money = (value: unknown) => `${amount(value).toLocaleString('fr-FR')} FCFA`;

function localized(line: BudgetLine, language: 'fr' | 'en', field: 'category' | 'subCategory' | 'subSubCategory' | 'description') {
  if (field === 'description') return language === 'fr' ? line.description_fr || line.description_en : line.description_en;
  if (language === 'fr') return line[`${field}_fr` as keyof BudgetLine] as string || line[field];
  return line[field];
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function staffName(row: Row) {
  return [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || row.title;
}

function statusLabel(status: string) {
  return status === 'draft' ? 'Draft'
    : status === 'submitted' ? 'Submitted'
      : status === 'endorsed' ? 'Endorsed'
        : status === 'validated' ? 'Validated'
          : status === 'rejected' ? 'Rejected'
            : status;
}

function statusStyle(status: string) {
  return ['validated', 'paid'].includes(status) ? 'bg-emerald-100 text-emerald-800'
    : status === 'rejected' ? 'bg-red-100 text-red-800'
      : status === 'endorsed' ? 'bg-sky-100 text-sky-800'
        : status === 'submitted' ? 'bg-amber-100 text-amber-800'
          : 'bg-slate-100 text-slate-700';
}

export default function FinancialRequests() {
  const [requests, setRequests] = useState<Row[]>([]);
  const [budgetLines, setBudgetLines] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [subSubCategory, setSubSubCategory] = useState('');
  const [budgetDescription, setBudgetDescription] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [prefill, setPrefill] = useState<Record<string, unknown> | null>(null);

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [requestRows, lineRows, staffRows, paymentRows] = await Promise.all([
      fetchModule('finance/requests'), fetchModule('finance/budget-lines'),
      fetchModule('hr/staff'), fetchModule('finance/payments'),
    ]);
    setRequests(requestRows);
    setBudgetLines(lineRows);
    setStaff(staffRows.filter((row: Row) => row.status === 'validated'));
    setPayments(paymentRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load financial requests.'));
    const stored = sessionStorage.getItem('maximusFinanceRequestPrefill');
    if (stored) {
      try {
        setPrefill(JSON.parse(stored));
        sessionStorage.removeItem('maximusFinanceRequestPrefill');
        setEditing(null);
        clearBudget('fr');
        setFormOpen(true);
      } catch {
        sessionStorage.removeItem('maximusFinanceRequestPrefill');
      }
    }
  }, []);

  const categoryOptions = useMemo(() => unique(catalog.map(line => localized(line, language, 'category'))), [language]);
  const categoryLines = useMemo(() => catalog.filter(line => !category || localized(line, language, 'category') === category), [category, language]);
  const subCategoryOptions = useMemo(() => unique(categoryLines.map(line => localized(line, language, 'subCategory'))), [categoryLines, language]);
  const subCategoryLines = useMemo(() => categoryLines.filter(line => !subCategory || localized(line, language, 'subCategory') === subCategory), [categoryLines, subCategory, language]);
  const subSubCategoryOptions = useMemo(() => unique(subCategoryLines.map(line => localized(line, language, 'subSubCategory'))), [subCategoryLines, language]);
  const descriptionLines = useMemo(() => subCategoryLines.filter(line => !subSubCategory || localized(line, language, 'subSubCategory') === subSubCategory), [subCategoryLines, subSubCategory, language]);
  const selectedLine = useMemo(() => descriptionLines.find(line => localized(line, language, 'description') === budgetDescription) || null, [descriptionLines, budgetDescription, language]);

  const paidRequestIds = useMemo(() => new Set(payments.map(row => text(row.data.reference_id) || text(row.data.finance_request_id)).filter(Boolean)), [payments]);
  const filtered = useMemo(() => requests.filter(row => {
    const haystack = `${row.reference} ${row.title} ${row.data.requester} ${row.data.budget_line}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'all' || row.status === statusFilter);
  }), [requests, search, statusFilter]);

  function clearBudget(nextLanguage: 'fr' | 'en' = language) {
    setLanguage(nextLanguage);
    setCategory('');
    setSubCategory('');
    setSubSubCategory('');
    setBudgetDescription('');
  }

  function openForm(row?: Row) {
    setEditing(row || null);
    if (row) {
      setLanguage('en');
      setCategory(text(row.data.category));
      setSubCategory(text(row.data.subCategory));
      setSubSubCategory(text(row.data.subSubCategory));
      setBudgetDescription(text(row.data.budgetDescription) || text(row.data.budget_description));
    } else clearBudget('fr');
    setMessage('');
    setFormOpen(true);
  }

  async function ensureBudgetLine(line: BudgetLine) {
    if (budgetLines.some(row => text(row.data.code) === line.code)) return;
    const data = {
      code: line.code,
      category: line.category,
      subCategory: line.subCategory,
      subSubCategory: line.subSubCategory,
      description: line.description_en,
      nature: line.nature || '',
      ohadaClass: line.ohadaClass || '',
      ohadaAccount: line.ohadaAccount || '',
      ohadaAccountName: line.ohadaAccountName || '',
      usefulLife: line.usefulLife || 'N/A',
      amortizationMethod: line.amortizationMethod || 'N/A',
      comment: 'Automatically registered from a financial request.',
    };
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'finance/budget-lines', title: `${line.code} - ${line.description_en}`, data }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Unable to register the selected budgetary line.');
    await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: payload.item.id, status: 'validated', data }),
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (!selectedLine) return setMessage('Please complete the full budgetary selection.');
    const requestAmount = amount(values.amount);
    if (text(values.title).trim().length < 5) return setMessage('Request title must contain at least 5 characters.');
    if (text(values.description).trim().length < 10) return setMessage('Description must contain at least 10 characters.');
    if (requestAmount <= 0) return setMessage('Amount must be greater than zero.');
    const requester = staff.find(row => row.id === values.requester_id);
    const history = Array.isArray(editing?.data.status_history) ? editing.data.status_history : [];
    const data = {
      title: text(values.title).trim(),
      description: text(values.description).trim(),
      amount: requestAmount,
      requester_id: requester?.id || null,
      requester: requester ? staffName(requester) : text(values.requester_name),
      needed_by: values.needed_by || null,
      justification: text(values.justification).trim(),
      selection_language: language === 'fr' ? 'Francais' : 'English',
      category: selectedLine.category,
      subCategory: selectedLine.subCategory,
      subSubCategory: selectedLine.subSubCategory,
      budgetDescription: selectedLine.description_en,
      budget_line: selectedLine.code,
      nature: selectedLine.nature || '',
      ohadaAccount: selectedLine.ohadaAccount || '',
      related_maintenance_id: text(prefill?.related_maintenance_id) || text(editing?.data.related_maintenance_id) || null,
      related_mission_id: text(prefill?.related_mission_id) || text(editing?.data.related_mission_id) || null,
      status_history: editing ? history : [{ status: 'draft', timestamp: new Date().toISOString() }],
    };
    setBusy(true);
    try {
      await ensureBudgetLine(selectedLine);
      const response = await fetch('/api/maximus/records', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing
          ? { id: editing.id, title: data.title, data }
          : { module: 'finance/requests', title: data.title, data }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to save the financial request.');
      setFormOpen(false);
      setEditing(null);
      setPrefill(null);
      setMessage(editing ? 'Financial request updated.' : 'Financial request saved as draft.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the financial request.');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(row: Row, status: 'submitted' | 'endorsed' | 'validated' | 'rejected') {
    let reason = '';
    if (status === 'rejected') {
      reason = prompt('Reason for rejection (minimum 10 characters):')?.trim() || '';
      if (reason.length < 10) return setMessage('A rejection reason of at least 10 characters is required.');
    }
    const history = Array.isArray(row.data.status_history) ? row.data.status_history : [];
    const data = { ...row.data, status_history: [...history, { status, reason, timestamp: new Date().toISOString() }] };
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status, data }),
    });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.message || 'Unable to update request status.');
    setMessage(`Financial request ${status}.`);
    await load();
  }

  function initiatePayment(row: Row) {
    sessionStorage.setItem('maximusPaymentInitiation', JSON.stringify({
      reference_type: 'Demande financiere',
      reference_id: row.id,
      reference: row.reference,
      amount: row.data.amount,
      purpose: row.title,
      budget_line: row.data.budget_line,
    }));
    window.location.href = '/maximus/finance/payment-initiation';
  }

  return <div className="grid gap-6 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-3xl font-black">Financial Requests</h2><button onClick={() => openForm()} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Create Request</button></div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('Unable') || message.includes('must') || message.includes('required') || message.includes('complete') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-black">My Financial Requests</h3><p className="mt-1 text-sm text-slate-500">View and manage your financial requests.</p></div><div className="flex flex-wrap gap-3"><label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input min-w-64 pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search request..." /></label><select className="admin-input min-w-40" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All Statuses</option>{['draft','submitted','endorsed','validated','rejected'].map(option => <option key={option} value={option}>{statusLabel(option)}</option>)}</select></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Request ID</th><th className="p-3">Title</th><th className="p-3">Amount (FCFA)</th><th className="p-3">Budget Line</th><th className="p-3">Status</th><th className="p-3">Created At</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{filtered.length ? filtered.map(row => {
        const paid = paidRequestIds.has(row.id);
        return <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td><td className="p-3"><p className="font-semibold">{row.title}</p><p className="text-xs text-slate-500">{text(row.data.requester)}</p></td><td className="p-3 font-semibold">{money(row.data.amount)}</td><td className="p-3 font-mono text-xs">{text(row.data.budget_line)}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle(paid ? 'paid' : row.status)}`}>{paid ? 'Paid' : statusLabel(row.status)}</span></td><td className="p-3">{new Date(row.created_at).toLocaleDateString('fr-FR')}</td><td className="p-3"><div className="flex justify-end gap-2">
          <button onClick={() => setViewing(row)} title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>
          {['draft','rejected'].includes(row.status) && <button onClick={() => openForm(row)} title="Edit" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button>}
          {['draft','rejected'].includes(row.status) && <button onClick={() => changeStatus(row, 'submitted')} title="Submit" className="rounded-md bg-sky-600 p-2 text-white"><Send className="h-4 w-4" /></button>}
          {row.status === 'submitted' && <button onClick={() => changeStatus(row, 'endorsed')} title="Endorse" className="rounded-md border p-2 text-emerald-700"><FileCheck className="h-4 w-4" /></button>}
          {row.status === 'endorsed' && <button onClick={() => changeStatus(row, 'validated')} title="Validate" className="rounded-md bg-[#24945f] p-2 text-white"><CheckCircle2 className="h-4 w-4" /></button>}
          {['submitted','endorsed'].includes(row.status) && <button onClick={() => changeStatus(row, 'rejected')} title="Reject" className="rounded-md bg-red-600 p-2 text-white"><ShieldX className="h-4 w-4" /></button>}
          {row.status === 'validated' && !paid && <button onClick={() => initiatePayment(row)} title="Initiate Payment" className="rounded-md bg-[#24945f] p-2 text-white"><CircleDollarSign className="h-4 w-4" /></button>}
        </div></td></tr>;
      }) : <tr><td colSpan={7} className="h-32 text-center text-slate-500">No financial requests found.</td></tr>}</tbody></table></div>
    </section>

    {formOpen && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}><section className="mx-auto my-6 w-full max-w-2xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">{editing ? 'Edit Financial Request' : 'New Financial Request'}</h3><p className="mt-1 text-sm text-slate-500">Fill out the form to create a new request.</p></div><button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header>
      <form onSubmit={save} className="grid max-h-[78vh] gap-5 overflow-y-auto p-6">
        <label className="grid gap-2 text-sm font-semibold">Request Title<input className="admin-input" name="title" required minLength={5} defaultValue={editing?.title || text(prefill?.title)} placeholder="e.g., Purchase of new laptops" /></label>
        <label className="grid gap-2 text-sm font-semibold">Description<textarea className="admin-input min-h-24" name="description" required minLength={10} defaultValue={text(editing?.data.description) || text(prefill?.description)} placeholder="Detailed reason for the request..." /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Amount (FCFA)<input className="admin-input" name="amount" type="number" min="1" required defaultValue={amount(editing?.data.amount) || amount(prefill?.amount) || ''} /></label><label className="grid gap-2 text-sm font-semibold">Needed By<input className="admin-input" name="needed_by" type="date" min={new Date().toISOString().slice(0, 10)} defaultValue={text(editing?.data.needed_by)} /></label></div>
        <label className="grid gap-2 text-sm font-semibold">Requester<select className="admin-input" name="requester_id" defaultValue={text(editing?.data.requester_id)}><option value="">Select staff member</option>{staff.map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Additional Justification<textarea className="admin-input min-h-20" name="justification" defaultValue={text(editing?.data.justification)} /></label>
        <div className="grid gap-4 rounded-md border bg-slate-50 p-5"><h4 className="font-black">Select Budget Line</h4><label className="grid gap-2 text-sm font-semibold">Language for Selection<select className="admin-input" value={language} onChange={event => clearBudget(event.target.value as 'fr' | 'en')}><option value="fr">Francais</option><option value="en">English</option></select></label>
          <label className="grid gap-2 text-sm font-semibold">Category<select className="admin-input" required value={category} onChange={event => { setCategory(event.target.value); setSubCategory(''); setSubSubCategory(''); setBudgetDescription(''); }}><option value="">Select a category</option>{categoryOptions.map(option => <option key={option}>{option}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">Subcategory<select className="admin-input" required disabled={!category} value={subCategory} onChange={event => { setSubCategory(event.target.value); setSubSubCategory(''); setBudgetDescription(''); }}><option value="">Select a subcategory</option>{subCategoryOptions.map(option => <option key={option}>{option}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">Sub-subcategory<select className="admin-input" required disabled={!subCategory} value={subSubCategory} onChange={event => { setSubSubCategory(event.target.value); setBudgetDescription(''); }}><option value="">Select a sub-subcategory</option>{subSubCategoryOptions.map(option => <option key={option}>{option}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">Description<select className="admin-input" required disabled={!subSubCategory} value={budgetDescription} onChange={event => setBudgetDescription(event.target.value)}><option value="">Select a description</option>{descriptionLines.map(line => <option key={line.code} value={localized(line, language, 'description')}>{localized(line, language, 'description')}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">Selected Budget Code<input className="admin-input bg-white" readOnly value={selectedLine?.code || ''} /></label>
          {selectedLine && <div className="grid gap-3 rounded-md border bg-emerald-50/50 p-4 text-sm sm:grid-cols-2"><div><p className="text-slate-500">Nature</p><p className="font-bold">{selectedLine.nature}</p></div><div><p className="text-slate-500">OHADA Account</p><p className="font-bold">{selectedLine.ohadaAccount}</p></div><div className="sm:col-span-2"><p className="text-slate-500">OHADA Account Name</p><p className="font-bold">{selectedLine.ohadaAccountName}</p></div></div>}
        </div>
        <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy || !selectedLine} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : 'Save as Draft'}</button></div>
      </form></section></div>}

    {viewing && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setViewing(null)}><section className="mx-auto my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex items-start justify-between border-b p-6"><div><p className="font-mono text-xs text-slate-500">{viewing.reference}</p><h3 className="mt-1 text-2xl font-black">{viewing.title}</h3></div><button onClick={() => setViewing(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-6 p-6"><div className="grid gap-4 text-sm sm:grid-cols-2">{[
      ['Requester', viewing.data.requester], ['Amount', money(viewing.data.amount)], ['Budget Line', viewing.data.budget_line],
      ['Needed By', viewing.data.needed_by], ['Status', statusLabel(viewing.status)], ['Nature', viewing.data.nature],
      ['Description', viewing.data.description], ['Justification', viewing.data.justification],
    ].map(([label, value]) => <div key={String(label)}><p className="text-slate-500">{String(label)}</p><p className="mt-1 whitespace-pre-wrap font-semibold">{String(value || 'N/A')}</p></div>)}</div><div><h4 className="font-black">Status History</h4><div className="mt-3 grid gap-2">{(Array.isArray(viewing.data.status_history) ? viewing.data.status_history as Array<Record<string, unknown>> : []).map((entry, index) => <div key={index} className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-3"><span className="font-bold capitalize">{text(entry.status)}</span><span>{text(entry.timestamp) ? new Date(text(entry.timestamp)).toLocaleString('fr-FR') : 'N/A'}</span><span>{text(entry.reason) || 'N/A'}</span></div>)}</div></div></div></section></div>}
  </div>;
}
