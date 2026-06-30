'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit, Eye, FileCheck, Plus, Search, Send, ShieldX, Trash2, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type Option = { value: string; label: string };

const text = (input: unknown) => typeof input === 'string' ? input : '';
const natureOptions = [
  'Food & Beverage Supplies',
  'Non-Food Consumables',
  'Equipment & Utensils',
  'Utilities & Services',
  'Technology & Software',
  'Training',
  'Project Management',
  'Support for a Survey',
  'Other',
];

export default function VendorManagement() {
  const [vendors, setVendors] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [details, setDetails] = useState<Row | null>(null);
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [nature, setNature] = useState('');
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/maximus/records?module=partnerships%2Fvendors');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Unable to load vendors.');
    setVendors(payload.items || []);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load vendors.'));
    fetch('/api/geo?type=countries')
      .then(response => response.ok ? response.json() : [])
      .then((rows: Array<{ name: string }>) => setCountries(rows.map(row => ({ value: row.name, label: row.name }))))
      .catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!country) {
      setStates([]);
      return;
    }
    fetch(`/api/geo?type=states&country=${encodeURIComponent(country)}`)
      .then(response => response.ok ? response.json() : [])
      .then((rows: Array<{ name: string }>) => setStates(rows.map(row => ({ value: row.name, label: row.name }))))
      .catch(() => setStates([]));
  }, [country]);

  useEffect(() => {
    if (!country || !region) {
      setCities([]);
      return;
    }
    fetch(`/api/geo?type=cities&country=${encodeURIComponent(country)}&state=${encodeURIComponent(region)}`)
      .then(response => response.ok ? response.json() : [])
      .then((rows: Array<{ name: string }>) => setCities(rows.map(row => ({ value: row.name, label: row.name }))))
      .catch(() => setCities([]));
  }, [country, region]);

  const filtered = useMemo(() => vendors.filter(row => {
    const haystack = [
      row.reference, row.title, row.data.structure_name, row.data.contact_name,
      row.data.contract_number,
    ].map(value => String(value || '').toLowerCase()).join(' ');
    return (statusFilter === 'all' || row.status === statusFilter) &&
      (!search || haystack.includes(search.toLowerCase()));
  }), [vendors, search, statusFilter]);

  function openForm(row?: Row) {
    setEditing(row || null);
    setCountry(text(row?.data.country));
    setRegion(text(row?.data.region));
    setNature(text(row?.data.nature));
    setHasBankAccount(Boolean(row?.data.has_bank_account));
    setFormOpen(true);
    setMessage('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.end_date && String(values.end_date) < String(values.start_date)) {
      return setMessage('The end date cannot precede the start date.');
    }
    const structure = String(values.structure_name || '').trim();
    const contact = String(values.contact_name || '').trim();
    const data = {
      structure_name: structure,
      contact_name: contact,
      nature,
      nature_other: nature === 'Other' ? values.nature_other : '',
      contract_number: values.contract_number,
      start_date: values.start_date,
      end_date: values.end_date,
      country,
      region,
      city: values.city,
      address: values.address,
      phone_code: values.phone_code,
      phone: values.phone,
      po_box: values.po_box,
      email: values.email,
      scope: values.scope,
      has_bank_account: hasBankAccount,
      bank_account: hasBankAccount ? {
        account_name: values.account_name,
        account_number: values.account_number,
        bank_name: values.bank_name,
        swift_code: values.swift_code,
      } : null,
      lifecycle_status: 'pending endorsement',
    };
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing
        ? { id: editing.id, title: structure || contact, data }
        : { module: 'partnerships/vendors', title: structure || contact, data }),
    });
    const payload = await response.json();
    if (response.ok) {
      const id = editing?.id || payload.item?.id;
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'submitted' }),
      });
    }
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save the vendor.');
    setFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Vendor updated and resubmitted.' : 'Vendor created and pending endorsement.');
    await load();
  }

  async function updateStatus(row: Row, status: 'submitted' | 'endorsed' | 'validated' | 'rejected' | 'archived', lifecycleStatus: string) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status, data: { ...row.data, lifecycle_status: lifecycleStatus } }),
    });
    if (!response.ok) return setMessage('Unable to update the vendor status.');
    setMessage(`Vendor status updated to ${lifecycleStatus}.`);
    await load();
  }

  async function requestExtension(row: Row) {
    const newEndDate = prompt('New contract end date (YYYY-MM-DD):', text(row.data.end_date));
    if (!newEndDate) return;
    const reason = prompt('Reason for the extension (minimum 10 characters):');
    if (!reason || reason.trim().length < 10) return setMessage('An extension reason of at least 10 characters is required.');
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: row.id,
        data: {
          ...row.data,
          extension_request: { new_end_date: newEndDate, reason: reason.trim(), status: 'pending', requested_at: new Date().toISOString() },
        },
      }),
    });
    if (!response.ok) return setMessage('Unable to request the extension.');
    setMessage('Contract extension requested.');
    await load();
  }

  async function decideExtension(row: Row, decision: 'approved' | 'rejected') {
    const request = row.data.extension_request as Record<string, unknown> | undefined;
    const data = {
      ...row.data,
      ...(decision === 'approved' ? { end_date: request?.new_end_date } : {}),
      extension_request: { ...(request || {}), status: decision },
    };
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, data }),
    });
    if (!response.ok) return setMessage('Unable to process the extension request.');
    setMessage(`Extension ${decision}.`);
    await load();
  }

  async function terminate(row: Row) {
    const terminationDate = prompt('Termination date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!terminationDate) return;
    const reason = prompt('Termination reason (minimum 10 characters):');
    if (!reason || reason.trim().length < 10) return setMessage('A termination reason of at least 10 characters is required.');
    await updateStatus(
      { ...row, data: { ...row.data, termination_date: terminationDate, termination_reason: reason.trim() } },
      'archived',
      'terminated',
    );
  }

  async function remove(row: Row) {
    if (!confirm(`Delete vendor "${row.title}"?`)) return;
    const response = await fetch(`/api/maximus/records?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    if (!response.ok) return setMessage('Unable to delete the vendor.');
    setMessage('Vendor deleted.');
    await load();
  }

  const statusLabel = (row: Row) => text(row.data.lifecycle_status) || row.status;

  return <div className="grid gap-5 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-3xl font-black">Vendor Management</h2>
      <button onClick={() => openForm()} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Create New Vendor</button>
    </div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
      message.includes('Unable') || message.includes('required') || message.includes('cannot')
        ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Vendor Registry</h3>
      <p className="mt-1 text-sm text-slate-500">Review, manage, and approve all recorded vendors.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input className="admin-input pl-10" placeholder="Search by name, structure, or number..." value={search} onChange={event => setSearch(event.target.value)} /></label>
        <select className="admin-input sm:max-w-52" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
          <option value="all">All Statuses</option><option value="submitted">Pending Endorsement</option><option value="endorsed">Endorsed</option>
          <option value="validated">Validated</option><option value="rejected">Rejected</option><option value="archived">Terminated</option>
        </select>
      </div>
      {filtered.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Vendor Number</th><th className="p-3">Promoter Name</th>
          <th className="p-3">Structure Name</th><th className="p-3">Nature</th><th className="p-3">End Date</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{filtered.map(row => {
          const extension = row.data.extension_request as Record<string, unknown> | undefined;
          return <tr key={row.id} className="border-b">
            <td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8).toUpperCase()}</td><td className="p-3">{text(row.data.contact_name)}</td>
            <td className="p-3 font-semibold">{text(row.data.structure_name) || 'N/A'}</td><td className="p-3">{text(row.data.nature)}</td>
            <td className="p-3">{text(row.data.end_date) || 'N/A'}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize">{statusLabel(row)}</span></td>
            <td className="p-3"><div className="flex justify-end gap-2">
              <button onClick={() => setDetails(row)} title="View" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>
              {row.status === 'submitted' && <button onClick={() => updateStatus(row, 'endorsed', 'endorsed')} title="Endorse" className="rounded-md border p-2 text-emerald-700"><FileCheck className="h-4 w-4" /></button>}
              {row.status === 'endorsed' && <button onClick={() => updateStatus(row, 'validated', 'validated')} title="Validate" className="rounded-md bg-[#24945f] p-2 text-white"><CheckCircle2 className="h-4 w-4" /></button>}
              {['submitted', 'endorsed'].includes(row.status) && <button onClick={() => updateStatus(row, 'rejected', 'rejected')} title="Reject" className="rounded-md bg-red-600 p-2 text-white"><ShieldX className="h-4 w-4" /></button>}
              {['submitted', 'rejected'].includes(row.status) && <button onClick={() => openForm(row)} title="Edit" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button>}
              {row.status === 'validated' && !extension?.status && <button onClick={() => requestExtension(row)} title="Request Extension" className="rounded-md border p-2"><Send className="h-4 w-4" /></button>}
              {row.status === 'validated' && extension?.status === 'pending' && <><button onClick={() => decideExtension(row, 'approved')} className="rounded-md border px-3 py-2 text-xs font-bold">Approve Ext.</button><button onClick={() => decideExtension(row, 'rejected')} className="rounded-md border px-3 py-2 text-xs font-bold">Reject Ext.</button></>}
              {row.status === 'validated' && <button onClick={() => terminate(row)} className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white">Terminate</button>}
              {['submitted', 'rejected'].includes(row.status) && <button onClick={() => remove(row)} title="Delete" className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button>}
            </div></td>
          </tr>;
        })}</tbody>
      </table></div> : <div className="py-16 text-center text-sm text-slate-500"><p>No vendors found.</p>
        <button onClick={() => openForm()} className="mt-5 font-semibold text-emerald-700">Create the first one</button></div>}
    </section>

    {formOpen && <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}>
      <section className="mx-auto my-5 w-full max-w-4xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">{editing ? 'Edit Vendor' : 'Create New Vendor'}</h3>
          <p className="mt-1 text-sm text-slate-500">Complete the vendor identity, contract, contact, location and payment details.</p></div>
          <button onClick={() => setFormOpen(false)} title="Close"><X className="h-5 w-5" /></button></header>
        <form onSubmit={save} className="grid gap-7 p-6">
          <fieldset className="grid gap-4"><legend className="mb-3 text-lg font-black">Vendor Details</legend>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Contract Number<input className="admin-input" name="contract_number" defaultValue={text(editing?.data.contract_number)} /></label>
              <label className="grid gap-2 text-sm font-semibold">Structure Name<input className="admin-input" name="structure_name" defaultValue={text(editing?.data.structure_name)} /></label>
              <label className="grid gap-2 text-sm font-semibold">Promoter / Main Contact<input className="admin-input" name="contact_name" required minLength={2} defaultValue={text(editing?.data.contact_name)} /></label>
              <label className="grid gap-2 text-sm font-semibold">Nature of Vendor<select className="admin-input" required value={nature} onChange={event => setNature(event.target.value)}><option value="">Select a type</option>{natureOptions.map(option => <option key={option}>{option}</option>)}</select></label>
              {nature === 'Other' && <label className="grid gap-2 text-sm font-semibold md:col-span-2">Specify Other Nature<input className="admin-input" name="nature_other" required defaultValue={text(editing?.data.nature_other)} /></label>}
              <label className="grid gap-2 text-sm font-semibold">Start Date<input className="admin-input" name="start_date" type="date" required defaultValue={text(editing?.data.start_date) || new Date().toISOString().slice(0, 10)} /></label>
              <label className="grid gap-2 text-sm font-semibold">End Date (Optional)<input className="admin-input" name="end_date" type="date" defaultValue={text(editing?.data.end_date)} /></label>
            </div>
          </fieldset>
          <fieldset className="grid gap-4"><legend className="mb-3 text-lg font-black">Vendor Location</legend><div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">Country<select className="admin-input" required value={country} onChange={event => { setCountry(event.target.value); setRegion(''); }}><option value="">Select a country</option>{countries.map(option => <option key={option.value}>{option.label}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold">Region / State<select className="admin-input" value={region} disabled={!country} onChange={event => setRegion(event.target.value)}><option value="">Select a region</option>{states.map(option => <option key={option.value}>{option.label}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold">City / District<select className="admin-input" name="city" disabled={!region} defaultValue={text(editing?.data.city)}><option value="">Select a city</option>{cities.map(option => <option key={option.value}>{option.label}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold md:col-span-3">Address<input className="admin-input" name="address" defaultValue={text(editing?.data.address)} /></label>
          </div></fieldset>
          <fieldset className="grid gap-4"><legend className="mb-3 text-lg font-black">Vendor Contact</legend><div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">Phone Code<input className="admin-input" name="phone_code" placeholder="+237" defaultValue={text(editing?.data.phone_code)} /></label>
            <label className="grid gap-2 text-sm font-semibold">Phone Number<input className="admin-input" name="phone" type="tel" required minLength={5} defaultValue={text(editing?.data.phone)} /></label>
            <label className="grid gap-2 text-sm font-semibold">PO Box<input className="admin-input" name="po_box" defaultValue={text(editing?.data.po_box)} /></label>
            <label className="grid gap-2 text-sm font-semibold">Email<input className="admin-input" name="email" type="email" required defaultValue={text(editing?.data.email)} /></label>
            <label className="grid gap-2 text-sm font-semibold md:col-span-2">Scope of Partnership<textarea className="admin-input min-h-28" name="scope" required minLength={10} maxLength={900} defaultValue={text(editing?.data.scope)} /></label>
          </div></fieldset>
          <fieldset className="grid gap-4"><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={hasBankAccount} onChange={event => setHasBankAccount(event.target.checked)} />Vendor has a bank account</label>
            {hasBankAccount && <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">Account Name<input className="admin-input" name="account_name" required defaultValue={text((editing?.data.bank_account as Record<string, unknown>)?.account_name)} /></label>
              <label className="grid gap-2 text-sm font-semibold">Account Number<input className="admin-input" name="account_number" required defaultValue={text((editing?.data.bank_account as Record<string, unknown>)?.account_number)} /></label>
              <label className="grid gap-2 text-sm font-semibold">Bank Name<input className="admin-input" name="bank_name" required defaultValue={text((editing?.data.bank_account as Record<string, unknown>)?.bank_name)} /></label>
              <label className="grid gap-2 text-sm font-semibold">SWIFT Code<input className="admin-input" name="swift_code" defaultValue={text((editing?.data.bank_account as Record<string, unknown>)?.swift_code)} /></label>
            </div>}
          </fieldset>
          <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : editing ? 'Update Vendor' : 'Create Vendor'}</button></div>
        </form>
      </section>
    </div>}

    {details && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDetails(null)}>
      <section className="my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">{details.title}</h3><p className="mt-1 text-sm text-slate-500">{details.reference} | {statusLabel(details)}</p></div>
          <button onClick={() => setDetails(null)}><X className="h-5 w-5" /></button></header>
        <div className="grid gap-5 p-6 sm:grid-cols-2">{[
          ['Promoter', details.data.contact_name], ['Nature', details.data.nature], ['Contract', details.data.contract_number],
          ['Period', `${text(details.data.start_date)} - ${text(details.data.end_date) || 'Open-ended'}`],
          ['Location', [details.data.city, details.data.region, details.data.country].filter(Boolean).join(', ')],
          ['Phone', `${text(details.data.phone_code)} ${text(details.data.phone)}`], ['Email', details.data.email], ['Scope', details.data.scope],
        ].map(([label, value]) => <div key={String(label)} className={label === 'Scope' ? 'sm:col-span-2' : ''}><p className="text-xs font-semibold text-slate-500">{String(label)}</p><p className="mt-1 font-semibold">{String(value || 'N/A')}</p></div>)}</div>
      </section>
    </div>}
  </div>;
}
