'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCheck, Edit, Eye, Plus, ShieldCheck, ShieldX, X, XCircle } from 'lucide-react';

type Row = {
  id: string;
  reference?: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type Option = { value: string; label: string };

const positions = [
  'Manager', 'Admin Officer', 'Accounting', 'Human ressources Officer', 'Human Ressources Assistant',
  'Kitchen chef', 'Kitchen Assistant', 'Dishwasher', 'Cashier', 'Logistic officer', 'Logistic Assistant',
  'Purchasing Manager', 'Sales Manager', 'Storekeeper', 'Delivery Driver', 'Transport Assistant/Drivers',
  'Hygiene and Safety Officer', 'Cleaning Staff', 'Maintenance Technician', 'Marketing Officer',
  'Social Media Manager', 'Customer Service Representative', 'Waiter / Waitress (Restaurant Server)', 'Other',
];
const units = ['Supply chain', 'Admin/Fin/RH', 'Manager', 'Seller', 'Production', 'Care provider', 'Communication/Partnership', 'Support service'];
const contractTypes = ['Permanent Contract (Indefinite Term) - CDI', 'Fixed-Term Contract - CDD', 'Temporary/Interim Contract', 'Internship or Apprenticeship Agreement', 'Casual or Seasonal Work Contract', 'Probationary Clause'];
const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function fullName(row: Row) {
  return [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || 'Unnamed';
}

function Field({ label, name, type = 'text', required, placeholder, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; defaultValue?: string | number }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}<input className="admin-input" name={name} type={type} required={required} placeholder={placeholder} defaultValue={defaultValue} /></label>;
}

export default function StaffDirectory() {
  const [items, setItems] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [country, setCountry] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [hasBankAccount, setHasBankAccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/maximus/records?module=hr%2Fstaff');
    const payload = await response.json();
    if (response.ok) setItems(payload.items || []);
    else setMessage(payload.message || 'Unable to load staff.');
  }

  useEffect(() => {
    load();
    fetch('/api/geo?type=countries').then(response => response.ok ? response.json() : []).then((rows: Array<{ name: string }>) => setCountries(rows.map(row => ({ value: row.name, label: row.name })))).catch(() => setCountries([]));
  }, []);

  useEffect(() => {
    if (!country) return setStates([]);
    fetch(`/api/geo?type=states&country=${encodeURIComponent(country)}`).then(response => response.ok ? response.json() : []).then((rows: Array<{ name: string }>) => setStates(rows.map(row => ({ value: row.name, label: row.name })))).catch(() => setStates([]));
  }, [country]);

  function openForm(row?: Row) {
    setEditing(row || null);
    setCountry(text(row?.data.country));
    setCreateAccount(Boolean(row?.data.create_user_account));
    setHasBankAccount(Boolean(row?.data.has_bank_account));
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const data = {
      ...values,
      age: Number(values.age || 0),
      is_supervisor: values.is_supervisor === 'on',
      create_user_account: createAccount,
      has_bank_account: hasBankAccount,
      linked_user_uid: editing?.data.linked_user_uid || '',
    };
    const title = [values.first_name, values.middle_name, values.last_name].filter(Boolean).join(' ');
    const response = await fetch('/api/maximus/records', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? { id: editing.id, title, data } : { module: 'hr/staff', title, data }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save employee.');
    setFormOpen(false);
    setMessage(editing ? 'Employee updated.' : 'Employee created and awaiting endorsement.');
    await load();
  }

  async function changeStatus(row: Row, status: string, extra: Record<string, unknown> = {}) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status, data: { ...row.data, ...extra } }),
    });
    if (!response.ok) return setMessage('Unable to update staff status.');
    await load();
  }

  const statusLabel = (row: Row) => row.data.employment_status === 'terminated'
    ? 'Terminated'
    : ({ draft: 'Pending Endorsement', submitted: 'Pending Endorsement', endorsed: 'Endorsed', validated: 'Active', rejected: 'Rejected', archived: 'Archived' }[row.status] || row.status);

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-3xl font-black">Staff Directory</h2>
      <button onClick={() => openForm()} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add Employee</button>
    </div>
    {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Employee List</h3>
      <p className="mt-1 text-sm text-slate-500">A list of all current and past employees.</p>
      {items.length ? <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead><tr className="border-b text-slate-500"><th className="p-3">Employee ID</th><th className="p-3">Employee Name</th><th className="p-3">Unit</th><th className="p-3">Age</th><th className="p-3">Start Date</th><th className="p-3">Status</th><th className="p-3">Account</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>{items.map(row => <tr key={row.id} className="border-b">
            <td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td>
            <td className="p-3 font-semibold">{fullName(row)}</td>
            <td className="p-3">{text(row.data.unit) || 'N/A'}</td>
            <td className="p-3">{Number(row.data.age || 0) || 'N/A'}</td>
            <td className="p-3">{text(row.data.start_date) ? new Date(`${text(row.data.start_date)}T12:00:00`).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'N/A'}</td>
            <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === 'validated' ? 'bg-emerald-100 text-emerald-800' : row.status === 'rejected' || row.data.employment_status === 'terminated' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>{statusLabel(row)}</span></td>
            <td className="p-3">{row.data.linked_user_uid || row.data.create_user_account ? <CheckCheck className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-slate-400" />}</td>
            <td className="p-3"><div className="flex justify-end gap-2">
              <button onClick={() => setViewing(row)} title="View Profile" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>
              {['draft', 'submitted'].includes(row.status) && <button onClick={() => changeStatus(row, 'endorsed')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><ShieldCheck className="h-4 w-4" />Endorse</button>}
              {row.status === 'endorsed' && <button onClick={() => changeStatus(row, 'validated')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><CheckCheck className="h-4 w-4" />Validate</button>}
              {['draft', 'submitted', 'endorsed'].includes(row.status) && <button onClick={() => changeStatus(row, 'rejected')} className="flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-bold"><ShieldX className="h-4 w-4" />Reject</button>}
              {row.status === 'validated' && <button onClick={() => changeStatus(row, 'archived', { employment_status: 'terminated', termination_date: new Date().toISOString().slice(0, 10) })} className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white"><XCircle className="h-4 w-4" />Terminate</button>}
              <button onClick={() => openForm(row)} title="Edit Employee" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="py-20 text-center text-sm text-slate-500">No staff members found.</div>}
    </section>

    {formOpen && <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/55" onMouseDown={() => setFormOpen(false)}>
      <section className="h-full w-full max-w-4xl overflow-y-auto bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-7 py-5">
          <div><p className="text-xs font-black uppercase text-[#ef7f3b]">{editing ? 'Edit Employee' : 'New Employee'}</p><h3 className="mt-1 text-2xl font-black">{editing ? fullName(editing) : 'Add Employee'}</h3></div>
          <button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={save} className="grid gap-7 p-7">
          <fieldset className="grid gap-4 md:grid-cols-3"><legend className="mb-4 text-lg font-black md:col-span-3">Personal Information</legend>
            <Field label="First Name" name="first_name" required defaultValue={text(editing?.data.first_name)} /><Field label="Middle Name (Optional)" name="middle_name" defaultValue={text(editing?.data.middle_name)} /><Field label="Last Name" name="last_name" required defaultValue={text(editing?.data.last_name)} />
            <label className="grid gap-2 text-sm font-semibold">Gender<select className="admin-input" name="gender" required defaultValue={text(editing?.data.gender)}><option value="">Select gender</option><option>Female</option><option>Male</option><option>Other</option></select></label>
            <Field label="Age" name="age" type="number" required defaultValue={Number(editing?.data.age || 0) || ''} /><Field label="Contact Email" name="email" type="email" required defaultValue={text(editing?.data.email)} />
            <Field label="Phone Code" name="phone_code" placeholder="+237" defaultValue={text(editing?.data.phone_code)} /><Field label="Phone Number" name="phone" required defaultValue={text(editing?.data.phone)} /><Field label="P.O. Box (Optional)" name="po_box" defaultValue={text(editing?.data.po_box)} />
          </fieldset>

          <fieldset className="grid gap-4 border-t pt-6 md:grid-cols-2"><legend className="mb-4 text-lg font-black md:col-span-2">Employment and Contract</legend>
            <label className="grid gap-2 text-sm font-semibold">Unit<select className="admin-input" name="unit" required defaultValue={text(editing?.data.unit)}><option value="">Select unit</option>{units.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold">Position<select className="admin-input" name="position" required defaultValue={text(editing?.data.position)}><option value="">Select position</option>{positions.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold">Contract Type<select className="admin-input" name="contract_type" required defaultValue={text(editing?.data.contract_type)}><option value="">Select contract type</option>{contractTypes.map(value => <option key={value}>{value}</option>)}</select></label>
            <Field label="Contract Number (Optional)" name="contract_number" placeholder="e.g., CN-2024-001" defaultValue={text(editing?.data.contract_number)} />
            <label className="grid gap-2 text-sm font-semibold">Grade<select className="admin-input" name="grade" required defaultValue={text(editing?.data.grade)}><option value="">Select grade</option>{grades.map(value => <option key={value}>{value}</option>)}</select></label>
            <Field label="Step" name="step" required placeholder="e.g., 1" defaultValue={text(editing?.data.step)} />
            <Field label="Start Date" name="start_date" type="date" required defaultValue={text(editing?.data.start_date)} /><Field label="End Date (Optional)" name="end_date" type="date" defaultValue={text(editing?.data.end_date)} />
            <label className="flex items-center gap-3 rounded-md border p-4 text-sm font-semibold md:col-span-2"><input type="checkbox" name="is_supervisor" defaultChecked={Boolean(editing?.data.is_supervisor)} />This employee is a supervisor</label>
          </fieldset>

          <fieldset className="grid gap-4 border-t pt-6 md:grid-cols-2"><legend className="mb-4 text-lg font-black md:col-span-2">Location</legend>
            <label className="grid gap-2 text-sm font-semibold">Country<select className="admin-input" name="country" required value={country} onChange={event => setCountry(event.target.value)}><option value="">Select a country</option>{countries.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold">Region/Province/State<select className="admin-input" name="region" disabled={!country} defaultValue={text(editing?.data.region)}><option value="">Select a region</option>{states.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <Field label="City" name="city" defaultValue={text(editing?.data.city)} /><Field label="Address" name="address" defaultValue={text(editing?.data.address)} />
          </fieldset>

          <fieldset className="grid gap-4 border-t pt-6"><legend className="mb-4 text-lg font-black">User Account</legend>
            <label className="flex items-center justify-between rounded-md border p-4 text-sm font-semibold"><span>Create User Account</span><input type="checkbox" checked={createAccount} onChange={event => setCreateAccount(event.target.checked)} /></label>
            {createAccount && <div className="grid gap-4 md:grid-cols-2"><Field label="Professional Email (for login)" name="professional_email" type="email" defaultValue={text(editing?.data.professional_email)} /><Field label="Temporary Password" name="password" type="password" required={!editing} /></div>}
          </fieldset>

          <fieldset className="grid gap-4 border-t pt-6"><legend className="mb-4 text-lg font-black">Bank Details</legend>
            <label className="flex items-center justify-between rounded-md border p-4 text-sm font-semibold"><span>Does this employee have a bank account?</span><input type="checkbox" checked={hasBankAccount} onChange={event => setHasBankAccount(event.target.checked)} /></label>
            {hasBankAccount && <div className="grid gap-4 md:grid-cols-2"><Field label="Account Name" name="bank_account_name" required defaultValue={text(editing?.data.bank_account_name)} /><Field label="Account Number" name="bank_account_number" required defaultValue={text(editing?.data.bank_account_number)} /><Field label="Bank Name" name="bank_name" required defaultValue={text(editing?.data.bank_name)} /><Field label="SWIFT/BIC Code (Optional)" name="swift_code" defaultValue={text(editing?.data.swift_code)} /></div>}
          </fieldset>
          <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white py-5"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : 'Save Employee'}</button></div>
        </form>
      </section>
    </div>}

    {viewing && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setViewing(null)}><section className="w-full max-w-2xl rounded-lg bg-white p-7" onMouseDown={event => event.stopPropagation()}><div className="flex justify-between"><div><h3 className="text-2xl font-black">{fullName(viewing)}</h3><p className="mt-1 text-sm text-slate-500">{viewing.reference}</p></div><button onClick={() => setViewing(null)}><X className="h-5 w-5" /></button></div><dl className="mt-7 grid gap-5 text-sm sm:grid-cols-2">{[['Position', viewing.data.position], ['Unit', viewing.data.unit], ['Contract', viewing.data.contract_type], ['Grade', viewing.data.grade], ['Email', viewing.data.email], ['Phone', `${text(viewing.data.phone_code)} ${text(viewing.data.phone)}`], ['Country', viewing.data.country], ['Status', statusLabel(viewing)]].map(([label, value]) => <div key={String(label)}><dt className="text-slate-500">{String(label)}</dt><dd className="mt-1 font-bold">{String(value || 'N/A')}</dd></div>)}</dl></section></div>}
  </div>;
}
