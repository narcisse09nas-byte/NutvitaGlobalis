'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Eye, History, Plus, ShieldCheck, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type DialogMode = 'plan' | 'kpi' | 'competency' | null;
const text = (value: unknown) => typeof value === 'string' ? value : '';

function staffName(row: Row) {
  return [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || row.title;
}

export default function PerformanceManagement() {
  const [records, setRecords] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [history, setHistory] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const [performanceResponse, staffResponse] = await Promise.all([
      fetch('/api/maximus/records?module=hr%2Fperformance'),
      fetch('/api/maximus/records?module=hr%2Fstaff'),
    ]);
    const performancePayload = await performanceResponse.json();
    const staffPayload = await staffResponse.json();
    if (!performanceResponse.ok) throw new Error(performancePayload.message || 'Unable to load performance reviews.');
    setRecords(performancePayload.items || []);
    setStaff(staffResponse.ok ? staffPayload.items || [] : []);
  }

  useEffect(() => { load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load performance management.')); }, []);

  const reviews = records.filter(row => !row.data.record_type || row.data.record_type === 'review');
  const kpis = records.filter(row => row.data.record_type === 'kpi');
  const competencies = records.filter(row => row.data.record_type === 'competency');

  async function createRecord(title: string, data: Record<string, unknown>, nextStatus?: string) {
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'hr/performance', title, data }),
    });
    const payload = await response.json();
    if (response.ok && nextStatus) {
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.item.id, status: nextStatus }),
      });
    }
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.message || 'Unable to save performance data.');
      return false;
    }
    await load();
    return true;
  }

  async function savePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const employee = staff.find(row => row.id === values.employee);
    const supervisor = staff.find(row => row.id === values.supervisor);
    if (!employee || !supervisor) return setMessage('Select a staff member and a supervisor.');
    const ok = await createRecord(`Performance plan - ${staffName(employee)}`, {
      record_type: 'review',
      employee: employee.id,
      employee_name: staffName(employee),
      supervisor: supervisor.id,
      supervisor_name: staffName(supervisor),
      period_start: values.period_start,
      period_end: values.period_end,
      goals: text(values.goals).split(/\r?\n/).filter(Boolean),
      kpi_ids: values.kpi_ids,
      development_plan: values.development_plan,
    }, 'submitted');
    if (ok) {
      setDialog(null);
      setMessage('Performance plan submitted for supervisor acknowledgement.');
    }
  }

  async function saveKpi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const ok = await createRecord(text(values.kpi), { record_type: 'kpi', kpi: values.kpi, objective: values.objective, unit: values.unit }, 'validated');
    if (ok) setMessage('KPI added to the reference list.');
  }

  async function saveCompetency(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const ok = await createRecord(text(values.criteria), { record_type: 'competency', criteria: values.criteria, description: values.description }, 'validated');
    if (ok) setMessage('Core competency added.');
  }

  async function changeStatus(row: Row, status: string) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status }),
    });
    if (!response.ok) return setMessage('Unable to update performance plan.');
    await load();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete "${row.title}"?`)) return;
    await fetch(`/api/maximus/records?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    await load();
  }

  const statusLabel = (row: Row) => ({ draft: 'Planning', submitted: 'Pending Acknowledgment', endorsed: 'Pending Validation', validated: 'Validated', executed: 'Review Completed', rejected: 'Rejected' }[row.status] || row.status);

  return <div className="grid gap-7 text-slate-950">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <h2 className="text-3xl font-black">Performance Management</h2>
      <div className="flex flex-wrap gap-2"><button onClick={() => setDialog('kpi')} className="rounded-md border bg-white px-4 py-3 text-sm font-semibold">Manage KPIs</button><button onClick={() => setDialog('competency')} className="rounded-md border bg-white px-4 py-3 text-sm font-semibold">Manage Competencies</button><button onClick={() => setDialog('plan')} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />New Performance Plan</button></div>
    </div>
    {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Performance Review Cycles</h3><p className="mt-1 text-sm text-slate-500">A list of all performance reviews you are involved in.</p>
      <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Staff Member</th><th className="p-3">Supervisor</th><th className="p-3">Period</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{reviews.length ? reviews.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{text(row.data.employee_name) || row.title}</td><td className="p-3">{text(row.data.supervisor_name) || '-'}</td><td className="p-3">{text(row.data.period_start)} - {text(row.data.period_end)}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{statusLabel(row)}</span></td><td className="p-3"><div className="flex justify-end gap-2">
          {row.status === 'submitted' && <button onClick={() => changeStatus(row, 'endorsed')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><ShieldCheck className="h-4 w-4" />Acknowledge</button>}
          {row.status === 'endorsed' && <button onClick={() => changeStatus(row, 'validated')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4" />Validate</button>}
          {row.status === 'validated' && <button onClick={() => changeStatus(row, 'executed')} className="rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white">Complete Review</button>}
          <button onClick={() => setViewing(row)} title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button><button onClick={() => setHistory(row)} title="View History" className="rounded-md border p-2"><History className="h-4 w-4" /></button>
        </div></td></tr>) : <tr><td colSpan={5} className="h-28 text-center text-slate-500">No performance reviews found.</td></tr>}</tbody>
      </table></div>
    </section>

    {dialog && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDialog(null)}><section className="my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-2xl font-black">{dialog === 'plan' ? 'Performance Evaluation Planning' : dialog === 'kpi' ? 'KPI Management' : 'Default Core Competencies'}</h3><p className="mt-1 text-sm text-slate-500">{dialog === 'plan' ? 'Define the review period, goals and performance indicators.' : 'Manage the performance reference framework.'}</p></div><button onClick={() => setDialog(null)}><X className="h-5 w-5" /></button></header>
      {dialog === 'plan' && <form onSubmit={savePlan} className="grid gap-5 p-6 md:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Staff Member<select className="admin-input" name="employee" required><option value="">Select staff member</option>{staff.filter(row => row.status === 'validated').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Supervisor<select className="admin-input" name="supervisor" required><option value="">Select supervisor</option>{staff.filter(row => Boolean(row.data.is_supervisor) || text(row.data.unit) === 'Manager').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Period Start Date<input className="admin-input" name="period_start" type="date" required /></label><label className="grid gap-2 text-sm font-semibold">Period End Date<input className="admin-input" name="period_end" type="date" required /></label><label className="grid gap-2 text-sm font-semibold md:col-span-2">Goals<textarea className="admin-input min-h-32" name="goals" required placeholder="One goal per line" /></label><label className="grid gap-2 text-sm font-semibold md:col-span-2">Key Performance Indicators<select className="admin-input" name="kpi_ids" multiple size={Math.min(Math.max(kpis.length, 3), 7)}>{kpis.map(row => <option key={row.id} value={row.id}>{text(row.data.kpi)}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold md:col-span-2">My Plan to Achieve This<textarea className="admin-input min-h-28" name="development_plan" /></label><div className="flex justify-end border-t pt-5 md:col-span-2"><button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : 'Save Performance Plan'}</button></div></form>}
      {dialog === 'kpi' && <div className="grid gap-6 p-6"><form onSubmit={saveKpi} className="grid gap-4"><label className="grid gap-2 text-sm font-semibold">KPI Name<input className="admin-input" name="kpi" required /></label><label className="grid gap-2 text-sm font-semibold">Objective<textarea className="admin-input min-h-24" name="objective" required /></label><label className="grid gap-2 text-sm font-semibold">Applies To Unit<select className="admin-input" name="unit"><option>All Units</option><option>Manager</option><option>Production</option><option>Supply chain</option><option>Admin/Fin/RH</option><option>Seller</option></select></label><button disabled={busy} className="justify-self-start rounded-md bg-[#24945f] px-4 py-3 text-sm font-bold text-white">Add KPI</button></form><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">KPI</th><th className="p-3">Objective</th><th className="p-3">Unit</th><th className="p-3"></th></tr></thead><tbody>{kpis.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{text(row.data.kpi)}</td><td className="p-3">{text(row.data.objective)}</td><td className="p-3">{text(row.data.unit)}</td><td className="p-3 text-right"><button onClick={() => remove(row)} className="text-xs font-bold text-red-700">Delete</button></td></tr>)}</tbody></table></div>}
      {dialog === 'competency' && <div className="grid gap-6 p-6"><form onSubmit={saveCompetency} className="grid gap-4"><label className="grid gap-2 text-sm font-semibold">Criteria<input className="admin-input" name="criteria" required /></label><label className="grid gap-2 text-sm font-semibold">Description<textarea className="admin-input min-h-24" name="description" required /></label><button disabled={busy} className="justify-self-start rounded-md bg-[#24945f] px-4 py-3 text-sm font-bold text-white">Add Competency</button></form><div className="grid gap-3">{competencies.map(row => <article key={row.id} className="flex items-start justify-between rounded-md border p-4"><div><p className="font-bold">{text(row.data.criteria)}</p><p className="mt-1 text-sm text-slate-500">{text(row.data.description)}</p></div><button onClick={() => remove(row)} className="text-xs font-bold text-red-700">Delete</button></article>)}</div></div>}
    </section></div>}

    {(viewing || history) && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => { setViewing(null); setHistory(null); }}><section className="w-full max-w-2xl rounded-lg bg-white p-7" onMouseDown={event => event.stopPropagation()}><div className="flex justify-between"><h3 className="text-2xl font-black">{history ? 'Performance Plan History' : 'Performance Plan Details'}</h3><button onClick={() => { setViewing(null); setHistory(null); }}><X className="h-5 w-5" /></button></div>{history ? <div className="mt-6 grid gap-3"><div className="rounded-md border-l-4 border-emerald-600 bg-slate-50 p-4"><p className="font-bold">Plan created</p><p className="text-sm text-slate-500">{new Date(history.created_at).toLocaleString('en-US')}</p></div><div className="rounded-md border-l-4 border-emerald-600 bg-slate-50 p-4"><p className="font-bold">Current status: {statusLabel(history)}</p></div></div> : viewing && <dl className="mt-7 grid gap-5 text-sm sm:grid-cols-2">{[['Staff Member', viewing.data.employee_name], ['Supervisor', viewing.data.supervisor_name], ['Period', `${text(viewing.data.period_start)} - ${text(viewing.data.period_end)}`], ['Status', statusLabel(viewing)], ['Goals', Array.isArray(viewing.data.goals) ? viewing.data.goals.join(', ') : viewing.data.goals], ['Development Plan', viewing.data.development_plan]].map(([label, value]) => <div key={String(label)}><dt className="text-slate-500">{String(label)}</dt><dd className="mt-1 font-bold">{String(value || '-')}</dd></div>)}</dl>}</section></div>}
  </div>;
}
