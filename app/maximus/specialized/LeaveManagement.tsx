'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

const leaveTypes = ['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Family Emergency', 'Permission', 'Other'];
const text = (value: unknown) => typeof value === 'string' ? value : '';

function staffName(row: Row) {
  return [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || row.title;
}

function businessDays(startValue: string, endValue: string) {
  const start = new Date(`${startValue}T12:00:00`);
  const end = new Date(`${endValue}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let days = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) days++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function formatDate(value: unknown) {
  const source = text(value);
  return source ? new Date(`${source}T12:00:00`).toLocaleDateString('en-US', { dateStyle: 'long' }) : '-';
}

export default function LeaveManagement() {
  const [requests, setRequests] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [tab, setTab] = useState<'my' | 'team' | 'hr' | 'dashboard'>('my');
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    const [leaveResponse, staffResponse] = await Promise.all([
      fetch('/api/maximus/records?module=hr%2Fleave'),
      fetch('/api/maximus/records?module=hr%2Fstaff'),
    ]);
    const leavePayload = await leaveResponse.json();
    const staffPayload = await staffResponse.json();
    if (!leaveResponse.ok) throw new Error(leavePayload.message || 'Unable to load leave requests.');
    setRequests(leavePayload.items || []);
    setStaff(staffResponse.ok ? staffPayload.items || [] : []);
    setLoading(false);
  }

  useEffect(() => { load().catch(error => { setMessage(error instanceof Error ? error.message : 'Unable to load leave management.'); setLoading(false); }); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const employee = staff.find(row => row.id === values.employee);
    const startDate = text(values.start_date);
    const endDate = text(values.end_date);
    const days = businessDays(startDate, endDate);
    if (!employee || !days) {
      setBusy(false);
      return setMessage('Select an employee and a valid date range.');
    }
    const data = {
      employee: employee.id,
      employee_name: staffName(employee),
      leave_type: values.leave_type,
      start_date: startDate,
      end_date: endDate,
      number_of_days: days,
      reason: values.reason,
      supervisor: values.supervisor,
    };
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'hr/leave', title: `${staffName(employee)} - ${text(values.leave_type)}`, data }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to create leave request.');
    setFormOpen(false);
    setMessage('Leave request submitted to the supervisor.');
    await load();
  }

  async function changeStatus(row: Row, status: string) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status }),
    });
    if (!response.ok) return setMessage('Unable to update leave request.');
    await load();
  }

  const pendingSupervisor = requests.filter(row => ['draft', 'submitted'].includes(row.status));
  const pendingHr = requests.filter(row => row.status === 'endorsed');
  const approved = requests.filter(row => row.status === 'validated');
  const today = new Date().toISOString().slice(0, 10);
  const currentlyOnLeave = approved.filter(row => text(row.data.start_date) <= today && text(row.data.end_date) >= today);

  const balances = useMemo(() => staff.filter(row => row.status === 'validated').map(employee => {
    const start = text(employee.data.start_date);
    const hireDate = start ? new Date(`${start}T12:00:00`) : new Date();
    const months = Math.max(0, (new Date().getFullYear() - hireDate.getFullYear()) * 12 + new Date().getMonth() - hireDate.getMonth() + 1);
    const employeeRequests = approved.filter(row => text(row.data.employee) === employee.id);
    const annualTaken = employeeRequests.filter(row => text(row.data.leave_type).toLowerCase().includes('annual')).reduce((sum, row) => sum + Number(row.data.number_of_days || 0), 0);
    const sickTaken = employeeRequests.filter(row => /sick|family/i.test(text(row.data.leave_type))).reduce((sum, row) => sum + Number(row.data.number_of_days || 0), 0);
    return { employee, annual: Math.max(0, Math.min(30, months * 2) - annualTaken), sick: Math.max(0, 5 - sickTaken) };
  }), [staff, approved]);

  function RequestsTable({ rows, actions }: { rows: Row[]; actions?: 'supervisor' | 'hr' }) {
    return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
      <thead><tr className="border-b text-slate-500"><th className="p-3">Staff Member</th><th className="p-3">Type</th><th className="p-3">Start Date</th><th className="p-3">End Date</th><th className="p-3">Days</th>{!actions && <th className="p-3">Status</th>}{actions && <th className="p-3 text-right">Actions</th>}</tr></thead>
      <tbody>{rows.length ? rows.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{text(row.data.employee_name) || row.title}</td><td className="p-3">{text(row.data.leave_type)}</td><td className="p-3">{formatDate(row.data.start_date)}</td><td className="p-3">{formatDate(row.data.end_date)}</td><td className="p-3">{Number(row.data.number_of_days || 0)}</td>{!actions && <td className="p-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{row.status === 'validated' ? 'Approved' : row.status === 'endorsed' ? 'Pending HR' : row.status === 'rejected' ? 'Rejected' : 'Pending Supervisor'}</span></td>}{actions && <td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => changeStatus(row, actions === 'supervisor' ? 'endorsed' : 'validated')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><Check className="h-4 w-4" />{actions === 'supervisor' ? 'Endorse' : 'Validate'}</button><button onClick={() => changeStatus(row, 'rejected')} className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white"><X className="h-4 w-4" />Reject</button></div></td>}</tr>) : <tr><td colSpan={7} className="h-28 text-center text-slate-500">No requests found.</td></tr>}</tbody>
    </table></div>;
  }

  return <div className="grid gap-6 text-slate-950">
    <div className="flex items-center justify-between gap-4"><h2 className="text-3xl font-black">Leave Management</h2><button onClick={() => setFormOpen(true)} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Request Leave</button></div>
    {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</div>}
    <div className="flex flex-wrap gap-2 border-b">{[['my', 'My Leave'], ['team', 'Team Requests'], ['hr', 'HR Validation'], ['dashboard', 'Dashboard']].map(([value, label]) => <button key={value} onClick={() => setTab(value as typeof tab)} className={`border-b-2 px-4 py-3 text-sm font-bold ${tab === value ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500'}`}>{label}</button>)}</div>

    {loading ? <div className="grid h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : <>
      {tab === 'my' && <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2"><article className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">Annual Leave</h3><p className="mt-1 text-sm text-slate-500">2 days earned per month, capped at 30 days total.</p><p className="mt-6 text-3xl font-black">{balances.reduce((sum, row) => sum + row.annual, 0)} Days</p><p className="text-sm text-slate-500">available across active staff</p></article><article className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">Sick / Family Emergency Leave</h3><p className="mt-1 text-sm text-slate-500">5 days per year.</p><p className="mt-6 text-3xl font-black">{balances.reduce((sum, row) => sum + row.sick, 0)} Days</p><p className="text-sm text-slate-500">available across active staff</p></article></div>
        <section className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">Leave Requests</h3><div className="mt-5"><RequestsTable rows={requests} /></div></section>
      </div>}
      {tab === 'team' && <section className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">Pending Team Requests</h3><p className="mt-1 text-sm text-slate-500">Requests awaiting your endorsement.</p><div className="mt-5"><RequestsTable rows={pendingSupervisor} actions="supervisor" /></div></section>}
      {tab === 'hr' && <section className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">Pending HR Validation</h3><p className="mt-1 text-sm text-slate-500">Endorsed requests awaiting final validation.</p><div className="mt-5"><RequestsTable rows={pendingHr} actions="hr" /></div></section>}
      {tab === 'dashboard' && <div className="grid gap-6"><section className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">Staff Currently on Leave</h3><div className="mt-5"><RequestsTable rows={currentlyOnLeave} /></div></section><section className="rounded-lg border bg-white p-6"><h3 className="text-xl font-black">All Staff Leave Balances</h3><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Staff Name</th><th className="p-3">Annual Leave Available</th><th className="p-3">Sick Leave Available</th></tr></thead><tbody>{balances.map(row => <tr key={row.employee.id} className="border-b"><td className="p-3 font-semibold">{staffName(row.employee)}</td><td className="p-3">{row.annual.toFixed(2)} days</td><td className="p-3">{row.sick} days</td></tr>)}</tbody></table></div></section></div>}
    </>}

    {formOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}><section className="w-full max-w-2xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-2xl font-black">Request Leave</h3><p className="mt-1 text-sm text-slate-500">Submit a leave request for supervisor endorsement.</p></div><button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header><form onSubmit={save} className="grid gap-5 p-6 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">Staff Member<select className="admin-input" name="employee" required><option value="">Select an employee</option>{staff.filter(row => row.status === 'validated').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">Leave Type<select className="admin-input" name="leave_type" required><option value="">Select leave type</option>{leaveTypes.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold">Start Date<input className="admin-input" name="start_date" type="date" required /></label><label className="grid gap-2 text-sm font-semibold">End Date<input className="admin-input" name="end_date" type="date" required /></label>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">Supervisor<select className="admin-input" name="supervisor" required><option value="">Select supervisor</option>{staff.filter(row => Boolean(row.data.is_supervisor) || text(row.data.unit) === 'Manager').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">Reason<textarea className="admin-input min-h-28" name="reason" required /></label>
      <div className="flex justify-end gap-3 border-t pt-5 md:col-span-2"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Submitting...' : 'Submit Request'}</button></div>
    </form></section></div>}
  </div>;
}
