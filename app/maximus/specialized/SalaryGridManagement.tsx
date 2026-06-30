'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Edit, Plus, Trash2, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string;
  title: string;
  data: Record<string, unknown>;
};

const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'];
const text = (value: unknown) => typeof value === 'string' ? value : '';

export default function SalaryGridManagement() {
  const [items, setItems] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/maximus/records?module=hr%2Fsalary-grid');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Unable to load salary grid.');
    setItems(payload.items || []);
  }

  useEffect(() => { load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load salary grid.')); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const grade = text(values.grade);
    const step = text(values.step);
    if (!editing && items.some(row => text(row.data.grade) === grade && text(row.data.step) === step)) {
      return setMessage('A salary for this grade and step already exists.');
    }
    setBusy(true);
    const data = { grade, step, base_salary: Number(values.base_salary || 0) };
    const response = await fetch('/api/maximus/records', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing
        ? { id: editing.id, title: `${grade} - Step ${step}`, data }
        : { module: 'hr/salary-grid', title: `${grade} - Step ${step}`, data }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save salary entry.');
    setFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Salary grid entry updated.' : 'Salary grid entry created.');
    await load();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete ${text(row.data.grade)} - Step ${text(row.data.step)}?`)) return;
    const response = await fetch(`/api/maximus/records?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    if (!response.ok) return setMessage('Unable to delete salary entry.');
    await load();
  }

  function openForm(row?: Row) {
    setEditing(row || null);
    setFormOpen(true);
  }

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center justify-between gap-4"><h2 className="text-3xl font-black">Salary Grid Management</h2><button onClick={() => openForm()} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add Entry</button></div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('already') || message.includes('Unable') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Salary Grid</h3><p className="mt-1 text-sm text-slate-500">Define and manage the salary structure based on grades and steps.</p>
      <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Grade</th><th className="p-3">Step</th><th className="p-3">Base Salary (FCFA)</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{items.length ? items.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{text(row.data.grade)}</td><td className="p-3">{text(row.data.step)}</td><td className="p-3">{Number(row.data.base_salary || 0).toLocaleString('fr-FR')}</td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => openForm(row)} title="Edit Salary Entry" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button><button onClick={() => remove(row)} title="Delete Salary Entry" className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button></div></td></tr>) : <tr><td colSpan={4} className="h-28 text-center text-slate-500">No salary grid entries found.</td></tr>}</tbody></table></div>
    </section>

    {formOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}><section className="w-full max-w-lg rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><h3 className="text-2xl font-black">{editing ? 'Edit Salary Entry' : 'Add New Salary Grid Entry'}</h3><button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header><form onSubmit={save} className="grid gap-5 p-6">
      <label className="grid gap-2 text-sm font-semibold">Grade<select className="admin-input" name="grade" required defaultValue={text(editing?.data.grade)}><option value="">Select a grade</option>{grades.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold">Step<input className="admin-input" name="step" required placeholder="e.g., 1" defaultValue={text(editing?.data.step)} /></label>
      <label className="grid gap-2 text-sm font-semibold">Base Salary (FCFA)<input className="admin-input" name="base_salary" type="number" min="1" required placeholder="e.g., 500000" defaultValue={Number(editing?.data.base_salary || 0) || ''} /></label>
      <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : 'Save Entry'}</button></div>
    </form></section></div>}
  </div>;
}
