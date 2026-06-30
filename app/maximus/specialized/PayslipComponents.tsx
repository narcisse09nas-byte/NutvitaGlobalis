'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Edit, Plus, Trash2, X } from 'lucide-react';

type Row = {
  id: string;
  title: string;
  data: Record<string, unknown>;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const calculationLabels: Record<string, string> = {
  fixed: 'Fixed Amount',
  percentage_base: 'Percentage of Base Salary',
  manual: 'Manual Input',
  sum_subcomponents: 'Sum of Sub-components',
};

export default function PayslipComponents() {
  const [items, setItems] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [calculationType, setCalculationType] = useState('fixed');
  const [subcomponents, setSubcomponents] = useState<Array<{ name: string; calculation_type: string; value: number }>>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/maximus/records?module=hr%2Fpayroll');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Unable to load payslip components.');
    setItems((payload.items || []).filter((row: Row) => row.data.record_type === 'component'));
  }

  useEffect(() => { load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load components.')); }, []);

  function openForm(row?: Row) {
    setEditing(row || null);
    setCalculationType(text(row?.data.calculation_type) || 'fixed');
    setSubcomponents(Array.isArray(row?.data.subcomponents) ? row.data.subcomponents as Array<{ name: string; calculation_type: string; value: number }> : []);
    setFormOpen(true);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (calculationType === 'sum_subcomponents' && !subcomponents.length) return setMessage('Add at least one sub-component.');
    setBusy(true);
    const data = {
      record_type: 'component',
      component_type: values.component_type,
      calculation_type: calculationType,
      value: Number(values.value || 0),
      applies_to: text(values.applies_to).split(',').map(value => value.trim()).filter(Boolean),
      subcomponents,
    };
    const response = await fetch('/api/maximus/records', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing
        ? { id: editing.id, title: values.name, data }
        : { module: 'hr/payroll', title: values.name, data }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save component.');
    setFormOpen(false);
    setEditing(null);
    setMessage(editing ? 'Payslip component updated.' : 'Payslip component created.');
    await load();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const response = await fetch(`/api/maximus/records?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    if (!response.ok) return setMessage('Unable to delete component.');
    await load();
  }

  function updateSubcomponent(index: number, field: string, value: string | number) {
    setSubcomponents(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  }

  function displayValue(row: Row) {
    const calculation = text(row.data.calculation_type);
    if (calculation === 'manual') return 'Manual';
    if (calculation === 'sum_subcomponents') return `${Array.isArray(row.data.subcomponents) ? row.data.subcomponents.length : 0} component(s)`;
    return `${Number(row.data.value || 0).toLocaleString('fr-FR')}${calculation === 'percentage_base' ? '%' : ' FCFA'}`;
  }

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center justify-between gap-4"><h2 className="text-3xl font-black">Payslip Components</h2><button onClick={() => openForm()} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add Component</button></div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('Unable') || message.includes('least') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Payslip Component Library</h3><p className="mt-1 text-sm text-slate-500">Manage reusable earnings, deductions, and employer contributions for your payslips.</p>
      <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Calculation</th><th className="p-3">Value</th><th className="p-3">Applies To</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{items.length ? items.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{row.title}</td><td className="p-3">{text(row.data.component_type)}</td><td className="p-3">{calculationLabels[text(row.data.calculation_type)] || text(row.data.calculation_type)}</td><td className="p-3">{displayValue(row)}</td><td className="p-3">{Array.isArray(row.data.applies_to) && row.data.applies_to.length ? row.data.applies_to.join(', ') : 'All grades'}</td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => openForm(row)} title="Edit Component" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button><button onClick={() => remove(row)} title="Delete Component" className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button></div></td></tr>) : <tr><td colSpan={6} className="h-28 text-center text-slate-500">No components created yet.</td></tr>}</tbody></table></div>
    </section>

    {formOpen && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}><section className="my-6 w-full max-w-2xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-2xl font-black">{editing ? 'Edit Payslip Component' : 'Add New Payslip Component'}</h3><p className="mt-1 text-sm text-slate-500">Define a reusable payroll calculation.</p></div><button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header><form onSubmit={save} className="grid gap-5 p-6">
      <label className="grid gap-2 text-sm font-semibold">Component Name<input className="admin-input" name="name" required minLength={2} placeholder="e.g., Transport Allowance" defaultValue={editing?.title || ''} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Type<select className="admin-input" name="component_type" required defaultValue={text(editing?.data.component_type)}><option value="">Select type...</option><option>Earning</option><option>Deduction</option><option>Employer Contribution</option></select></label><label className="grid gap-2 text-sm font-semibold">Calculation<select className="admin-input" name="calculation_type" value={calculationType} onChange={event => setCalculationType(event.target.value)}><option value="fixed">Fixed Amount</option><option value="percentage_base">Percentage of Base Salary</option><option value="manual">Manual Input</option><option value="sum_subcomponents">Sum of Sub-components</option></select></label></div>
      {['fixed', 'percentage_base'].includes(calculationType) && <label className="grid gap-2 text-sm font-semibold">{calculationType === 'fixed' ? 'Amount (FCFA)' : 'Percentage (%)'}<input className="admin-input" name="value" type="number" min="0" required defaultValue={Number(editing?.data.value || 0)} /></label>}
      <label className="grid gap-2 text-sm font-semibold">Applies To (Optional)<input className="admin-input" name="applies_to" placeholder="Grade 1, Grade 2; leave blank for all grades" defaultValue={Array.isArray(editing?.data.applies_to) ? editing.data.applies_to.join(', ') : ''} /></label>
      {calculationType === 'sum_subcomponents' && <div className="grid gap-3 rounded-md border bg-slate-50 p-4"><div className="flex items-center justify-between"><h4 className="font-black">Sub-components</h4><button type="button" onClick={() => setSubcomponents(current => [...current, { name: '', calculation_type: 'fixed', value: 0 }])} className="flex items-center gap-1 rounded-md border bg-white px-3 py-2 text-xs font-bold"><Plus className="h-4 w-4" />Add</button></div>{subcomponents.map((row, index) => <div key={index} className="grid gap-2 rounded-md border bg-white p-3 sm:grid-cols-[1fr_150px_120px_40px]"><input className="admin-input" required placeholder="Sub-component name" value={row.name} onChange={event => updateSubcomponent(index, 'name', event.target.value)} /><select className="admin-input" value={row.calculation_type} onChange={event => updateSubcomponent(index, 'calculation_type', event.target.value)}><option value="fixed">Fixed</option><option value="percentage_base">% of Base</option><option value="manual">Manual</option></select><input className="admin-input" type="number" min="0" disabled={row.calculation_type === 'manual'} value={row.value} onChange={event => updateSubcomponent(index, 'value', Number(event.target.value))} /><button type="button" onClick={() => setSubcomponents(current => current.filter((_, rowIndex) => rowIndex !== index))} className="grid place-items-center rounded-md bg-red-600 text-white"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
      <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : 'Save Component'}</button></div>
    </form></section></div>}
  </div>;
}
