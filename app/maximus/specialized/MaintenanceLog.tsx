'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Edit, Eye, FileCheck, Plus, RotateCcw, ShieldX, Trash2, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type Task = {
  task_type: 'Labor' | 'Part Replacement' | 'Other';
  description: string;
  part_name: string;
  part_reference: string;
  cost: number;
};

const text = (input: unknown) => typeof input === 'string' ? input : '';
const numeric = (input: unknown) => Number(input || 0);
const emptyTask = (): Task => ({ task_type: 'Labor', description: '', part_name: '', part_reference: '', cost: 0 });

function tasksFrom(row?: Row): Task[] {
  if (!Array.isArray(row?.data.tasks)) return [emptyTask()];
  const tasks = (row.data.tasks as Array<Record<string, unknown>>).map(task => ({
    task_type: (text(task.task_type) || text(task.taskType) || 'Labor') as Task['task_type'],
    description: text(task.description),
    part_name: text(task.part_name) || text(task.partName),
    part_reference: text(task.part_reference) || text(task.partReference),
    cost: numeric(task.cost),
  }));
  return tasks.length ? tasks : [emptyTask()];
}

export default function MaintenanceLog() {
  const [records, setRecords] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [vendors, setVendors] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [details, setDetails] = useState<Row | null>(null);
  const [tasks, setTasks] = useState<Task[]>([emptyTask()]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [maintenanceRows, assetRows, vendorRows] = await Promise.all([
      fetchModule('fleet/maintenance'),
      fetchModule('assets/inventory'),
      fetchModule('partnerships/vendors'),
    ]);
    setRecords(maintenanceRows);
    setAssets(assetRows.filter((row: Row) =>
      (!row.data.record_type || row.data.record_type === 'asset') &&
      ['Vehicle', 'Generator'].includes(text(row.data.asset_type))
    ));
    setVendors(vendorRows.filter((row: Row) => row.status === 'validated'));
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load maintenance records.'));
  }, []);

  function openForm(row?: Row) {
    setEditing(row || null);
    setTasks(tasksFrom(row));
    setFormOpen(true);
    setMessage('');
  }

  function updateTask(index: number, field: keyof Task, value: string | number) {
    setTasks(current => current.map((task, taskIndex) => taskIndex === index ? { ...task, [field]: value } : task));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const asset = assets.find(row => row.id === values.asset_id);
    const vendor = vendors.find(row => row.id === values.vendor_id);
    if (!asset || !vendor) return;
    if (!tasks.length) return setMessage('At least one maintenance task is required.');
    if (tasks.some(task => task.description.trim().length < 3)) return setMessage('Every task requires a description.');
    if (tasks.some(task => task.task_type === 'Part Replacement' && !task.part_name.trim())) {
      return setMessage('Part name is required for every part replacement.');
    }
    const total = tasks.reduce((sum, task) => sum + numeric(task.cost), 0);
    const data = {
      asset_id: asset.id,
      asset: asset.title,
      vehicle_registration: text(asset.data.registration_number) || text(asset.data.unique_identifier) || asset.reference,
      provider_id: vendor.id,
      provider: text(vendor.data.structure_name) || text(vendor.data.contact_name) || vendor.title,
      maintenance_date: values.maintenance_date,
      tasks,
      actual_cost: total,
      estimated_cost: total,
      status_history: editing?.data.status_history || [],
    };
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing
        ? { id: editing.id, title: `Maintenance - ${data.vehicle_registration}`, data }
        : { module: 'fleet/maintenance', title: `Maintenance - ${data.vehicle_registration}`, data }),
    });
    const payload = await response.json();
    if (response.ok && !editing) {
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payload.item.id,
          status: 'submitted',
          data: { ...data, status_history: [{ status: 'submitted', timestamp: new Date().toISOString() }] },
        }),
      });
    }
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save the maintenance log.');
    setFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Maintenance log updated.' : 'Maintenance log created and pending endorsement.');
    await load();
  }

  async function changeStatus(row: Row, status: 'submitted' | 'endorsed' | 'validated' | 'rejected', reason = '') {
    const history = Array.isArray(row.data.status_history) ? row.data.status_history : [];
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: row.id,
        status,
        data: { ...row.data, status_history: [...history, { status, reason, timestamp: new Date().toISOString() }] },
      }),
    });
    if (!response.ok) return setMessage('Unable to update the maintenance status.');
    setMessage(`Maintenance status updated to ${status}.`);
    await load();
  }

  function reject(row: Row) {
    const reason = prompt('Reason for rejection (minimum 10 characters):');
    if (!reason || reason.trim().length < 10) return setMessage('A rejection reason of at least 10 characters is required.');
    changeStatus(row, 'rejected', reason.trim());
  }

  function revert(row: Row) {
    const reason = prompt('Reason for sending this log back (minimum 10 characters):');
    if (!reason || reason.trim().length < 10) return setMessage('A return reason of at least 10 characters is required.');
    changeStatus(row, 'submitted', reason.trim());
  }

  return <div className="grid gap-5 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-3xl font-black">Vehicle Maintenance Records</h2>
      <div className="flex gap-2"><button onClick={() => openForm()} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />New Log</button>
        <Link href="/maximus/assets/inventory" className="flex items-center gap-2 rounded-md border bg-white px-4 py-3 text-sm font-semibold"><ArrowLeft className="h-4 w-4" />Back to Fleet</Link></div>
    </div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
      message.includes('Unable') || message.includes('required') || message.includes('requires')
        ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Maintenance Log</h3><p className="mt-1 text-sm text-slate-500">A log of all vehicle maintenance sessions.</p>
      {records.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Vehicle</th><th className="p-3">Date</th><th className="p-3">Vendor</th><th className="p-3">Total Cost (FCFA)</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{records.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{text(row.data.vehicle_registration) || text(row.data.asset)}</td><td className="p-3">{text(row.data.maintenance_date) || text(row.data.planned_date)}</td><td className="p-3">{text(row.data.provider)}</td><td className="p-3">{numeric(row.data.actual_cost || row.data.estimated_cost).toLocaleString('fr-FR')}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize">{row.status === 'submitted' ? 'Pending Endorsement' : row.status}</span></td>
          <td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setDetails(row)} title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>
            {['submitted','rejected'].includes(row.status) && <button onClick={() => openForm(row)} title="Edit" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button>}
            {row.status === 'submitted' && <button onClick={() => changeStatus(row, 'endorsed')} title="Endorse" className="rounded-md border p-2 text-emerald-700"><FileCheck className="h-4 w-4" /></button>}
            {row.status === 'endorsed' && <button onClick={() => changeStatus(row, 'validated')} title="Validate" className="rounded-md bg-[#24945f] p-2 text-white"><CheckCircle2 className="h-4 w-4" /></button>}
            {['submitted','endorsed'].includes(row.status) && <button onClick={() => reject(row)} title="Reject" className="rounded-md bg-red-600 p-2 text-white"><ShieldX className="h-4 w-4" /></button>}
            {row.status === 'validated' && <button onClick={() => revert(row)} title="Send Back" className="rounded-md border p-2"><RotateCcw className="h-4 w-4" /></button>}</div></td>
        </tr>)}</tbody></table></div> : <div className="py-16 text-center text-sm text-slate-500">No maintenance records found.</div>}
    </section>

    {formOpen && <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}>
      <section className="mx-auto my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><h3 className="text-2xl font-black">{editing ? 'Edit' : 'Create'} Maintenance Log</h3><button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header>
        <form onSubmit={save} className="grid max-h-[78vh] gap-6 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold">Vehicle / Generator<select className="admin-input" name="asset_id" required defaultValue={text(editing?.data.asset_id)}><option value="">Select...</option>{assets.map(row => <option key={row.id} value={row.id}>{row.title} ({text(row.data.registration_number) || text(row.data.unique_identifier) || row.reference})</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold">Vendor<select className="admin-input" name="vendor_id" required defaultValue={text(editing?.data.provider_id)}><option value="">Select...</option>{vendors.map(row => <option key={row.id} value={row.id}>{text(row.data.structure_name) || text(row.data.contact_name) || row.title} ({row.reference})</option>)}</select></label>
            <label className="grid gap-2 text-sm font-semibold">Date of Maintenance<input className="admin-input" name="maintenance_date" type="date" required defaultValue={text(editing?.data.maintenance_date) || new Date().toISOString().slice(0, 10)} /></label>
          </div>
          <div className="border-t pt-5"><h4 className="font-black">Maintenance Tasks</h4><div className="mt-4 grid gap-4">
            {tasks.map((task, index) => <div key={index} className="relative grid gap-4 rounded-md border bg-emerald-50/40 p-4"><button type="button" onClick={() => setTasks(current => current.filter((_, taskIndex) => taskIndex !== index))} title="Delete Task" className="absolute right-3 top-3 text-red-600"><Trash2 className="h-4 w-4" /></button>
              <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Task Type<select className="admin-input" value={task.task_type} onChange={event => updateTask(index, 'task_type', event.target.value)}><option>Labor</option><option>Part Replacement</option><option>Other</option></select></label>
                <label className="grid gap-2 text-sm font-semibold">Cost (FCFA)<input className="admin-input" type="number" min="0" value={task.cost} onChange={event => updateTask(index, 'cost', numeric(event.target.value))} /></label></div>
              <label className="grid gap-2 text-sm font-semibold">Description<textarea className="admin-input min-h-20" required minLength={3} value={task.description} onChange={event => updateTask(index, 'description', event.target.value)} /></label>
              {task.task_type === 'Part Replacement' && <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Part Name<input className="admin-input" required value={task.part_name} onChange={event => updateTask(index, 'part_name', event.target.value)} /></label><label className="grid gap-2 text-sm font-semibold">Part Reference<input className="admin-input" value={task.part_reference} onChange={event => updateTask(index, 'part_reference', event.target.value)} /></label></div>}
            </div>)}
          </div><button type="button" onClick={() => setTasks(current => [...current, emptyTask()])} className="mt-4 flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold"><Plus className="h-4 w-4" />Add Task</button></div>
          <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy || !tasks.length} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : editing ? 'Save Changes' : 'Save Log'}</button></div>
        </form>
      </section>
    </div>}

    {details && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDetails(null)}>
      <section className="my-6 w-full max-w-4xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">Maintenance Details: {details.reference}</h3><p className="mt-1 text-sm text-slate-500">{text(details.data.vehicle_registration)} on {text(details.data.maintenance_date)}</p></div><button onClick={() => setDetails(null)}><X className="h-5 w-5" /></button></header>
        <div className="grid gap-6 p-6"><div className="grid gap-4 text-sm sm:grid-cols-4"><div><p className="text-slate-500">Vehicle</p><p className="font-semibold">{text(details.data.vehicle_registration)}</p></div><div><p className="text-slate-500">Vendor</p><p className="font-semibold">{text(details.data.provider)}</p></div><div><p className="text-slate-500">Total Cost</p><p className="font-semibold">{numeric(details.data.actual_cost).toLocaleString('fr-FR')} FCFA</p></div><div><p className="text-slate-500">Status</p><p className="font-semibold capitalize">{details.status}</p></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3">Part</th><th className="p-3">Part Reference</th><th className="p-3 text-right">Cost</th></tr></thead><tbody>{tasksFrom(details).map((task, index) => <tr key={index} className="border-b"><td className="p-3">{task.task_type}</td><td className="p-3">{task.description}</td><td className="p-3">{task.part_name || 'N/A'}</td><td className="p-3">{task.part_reference || 'N/A'}</td><td className="p-3 text-right">{task.cost.toLocaleString('fr-FR')}</td></tr>)}</tbody></table></div>
          <div><h4 className="font-black">Status History</h4><div className="mt-3 grid gap-2">{(Array.isArray(details.data.status_history) ? details.data.status_history as Array<Record<string, unknown>> : []).map((entry, index) => <div key={index} className="grid gap-2 rounded-md border p-3 text-sm sm:grid-cols-3"><span className="capitalize">{text(entry.status)}</span><span>{text(entry.timestamp) ? new Date(text(entry.timestamp)).toLocaleString('fr-FR') : 'N/A'}</span><span>{text(entry.reason) || 'N/A'}</span></div>)}</div></div>
        </div>
      </section>
    </div>}
  </div>;
}
