'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Eye, Loader2, Plus, Send, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => Number(value || 0);

function staffName(row: Row) {
  return [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || row.title;
}

function daysBetween(start: string, end: string) {
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) return 0;
  return Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
}

export default function MissionManagement() {
  const [missions, setMissions] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const [missionsResponse, staffResponse] = await Promise.all([
      fetch('/api/maximus/records?module=hr%2Fmissions'),
      fetch('/api/maximus/records?module=hr%2Fstaff'),
    ]);
    const missionsPayload = await missionsResponse.json();
    const staffPayload = await staffResponse.json();
    if (!missionsResponse.ok) throw new Error(missionsPayload.message || 'Unable to load missions.');
    setMissions(missionsPayload.items || []);
    setStaff(staffResponse.ok ? staffPayload.items || [] : []);
  }

  useEffect(() => { load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load missions.')); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const requester = staff.find(row => row.id === values.requester);
    const startDate = text(values.departure_date);
    const returnDate = text(values.return_date);
    const numberOfDays = daysBetween(startDate, returnDate);
    const perDiem = amount(values.per_diem);
    const transport = amount(values.transport_cost);
    const accommodation = amount(values.accommodation_cost);
    const other = amount(values.other_costs);
    const totalCost = perDiem * numberOfDays + transport + accommodation + other;
    if (!requester || !numberOfDays) {
      setBusy(false);
      return setMessage('Select a requester and a valid mission period.');
    }
    const data = {
      requester: requester.id,
      requester_name: staffName(requester),
      purpose: values.purpose,
      departure: values.departure,
      destination: values.destination,
      departure_date: startDate,
      return_date: returnDate,
      number_of_days: numberOfDays,
      transport_mode: values.transport_mode,
      per_diem: perDiem,
      transport_cost: transport,
      accommodation_cost: accommodation,
      other_costs: other,
      total_cost: totalCost,
      supervisor: values.supervisor,
      finance_request_id: '',
    };
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'hr/missions', title: `${staffName(requester)} to ${text(values.destination)}`, data }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save mission request.');
    await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: payload.item.id, status: 'submitted' }),
    });
    setFormOpen(false);
    setMessage('Mission request submitted.');
    await load();
  }

  async function changeStatus(row: Row, status: string) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status }),
    });
    if (!response.ok) return setMessage('Unable to update mission status.');
    await load();
  }

  async function initiateFinance(row: Row) {
    setBusy(true);
    const financeResponse = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'finance/requests',
        title: `Payment for Mission: ${text(row.data.requester_name)} to ${text(row.data.destination)}`,
        data: {
          description: `Payment request for mission costs for ${text(row.data.requester_name)}.`,
          amount: amount(row.data.total_cost),
          related_mission_id: row.id,
          beneficiary: text(row.data.requester_name),
          request_date: new Date().toISOString().slice(0, 10),
        },
      }),
    });
    const payload = await financeResponse.json();
    if (!financeResponse.ok) {
      setBusy(false);
      return setMessage(payload.message || 'Unable to initiate finance request.');
    }
    await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, data: { ...row.data, finance_request_id: payload.item.id } }),
    });
    setBusy(false);
    setMessage('Finance request created for this mission.');
    await load();
  }

  const statusLabel = (row: Row) => ({ draft: 'Draft', submitted: 'Pending Endorsement', endorsed: 'Pending Validation', validated: 'Validated', rejected: 'Rejected', executed: 'Completed', archived: 'Archived' }[row.status] || row.status);

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center justify-between gap-4"><div><h2 className="text-3xl font-black">Mission Requests</h2><p className="mt-1 text-sm text-slate-500">Manage field mission requests, approvals and per diem.</p></div><button onClick={() => setFormOpen(true)} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Request Mission</button></div>
    {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Mission Request Register</h3><p className="mt-1 text-sm text-slate-500">Review mission requests, costs and approval status.</p>
      {missions.length ? <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Mission ID</th><th className="p-3">Requestor</th><th className="p-3">Destination</th><th className="p-3">Period</th><th className="p-3">Days</th><th className="p-3">Total Cost (FCFA)</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{missions.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td><td className="p-3 font-semibold">{text(row.data.requester_name)}</td><td className="p-3">{text(row.data.destination)}</td><td className="p-3">{text(row.data.departure_date)} - {text(row.data.return_date)}</td><td className="p-3">{amount(row.data.number_of_days)}</td><td className="p-3">{amount(row.data.total_cost).toLocaleString('fr-FR')}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{statusLabel(row)}</span></td><td className="p-3"><div className="flex justify-end gap-2">
          <button onClick={() => setViewing(row)} title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>
          {row.status === 'submitted' && <><button onClick={() => changeStatus(row, 'endorsed')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><Check className="h-4 w-4" />Endorse</button><button onClick={() => changeStatus(row, 'rejected')} className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white">Reject</button></>}
          {row.status === 'endorsed' && <><button onClick={() => changeStatus(row, 'validated')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><Check className="h-4 w-4" />Validate</button><button onClick={() => changeStatus(row, 'rejected')} className="rounded-md bg-red-600 px-3 py-2 text-xs font-bold text-white">Reject</button></>}
          {row.status === 'validated' && !row.data.finance_request_id && <button onClick={() => initiateFinance(row)} disabled={busy} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><Send className="h-4 w-4" />Initiate Finance Request</button>}
        </div></td></tr>)}</tbody>
      </table></div> : <div className="py-20 text-center text-sm text-slate-500">No mission requests have been created yet.</div>}
    </section>

    {formOpen && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setFormOpen(false)}><section className="my-5 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex justify-between border-b p-6"><div><h3 className="text-2xl font-black">New Mission Request</h3><p className="mt-1 text-sm text-slate-500">Provide the mission, travel and cost details.</p></div><button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button></header><form onSubmit={save} className="grid gap-5 p-6 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">Requestor<select className="admin-input" name="requester" required><option value="">Select an employee</option>{staff.filter(row => row.status === 'validated').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold md:col-span-2">Purpose<textarea className="admin-input min-h-24" name="purpose" required /></label>
      <label className="grid gap-2 text-sm font-semibold">Departure<input className="admin-input" name="departure" required /></label><label className="grid gap-2 text-sm font-semibold">Destination<input className="admin-input" name="destination" required /></label>
      <label className="grid gap-2 text-sm font-semibold">Departure Date<input className="admin-input" name="departure_date" type="date" required /></label><label className="grid gap-2 text-sm font-semibold">Return Date<input className="admin-input" name="return_date" type="date" required /></label>
      <label className="grid gap-2 text-sm font-semibold">Transport Mode<select className="admin-input" name="transport_mode"><option>Company Vehicle</option><option>Public Transport</option><option>Air Travel</option><option>Personal Vehicle</option><option>Other</option></select></label>
      <label className="grid gap-2 text-sm font-semibold">Supervisor<select className="admin-input" name="supervisor" required><option value="">Select supervisor</option>{staff.filter(row => Boolean(row.data.is_supervisor) || text(row.data.unit) === 'Manager').map(row => <option key={row.id} value={row.id}>{staffName(row)}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-semibold">Per Diem / Day (FCFA)<input className="admin-input" name="per_diem" type="number" min="0" defaultValue="0" /></label><label className="grid gap-2 text-sm font-semibold">Transport Cost (FCFA)<input className="admin-input" name="transport_cost" type="number" min="0" defaultValue="0" /></label>
      <label className="grid gap-2 text-sm font-semibold">Accommodation Cost (FCFA)<input className="admin-input" name="accommodation_cost" type="number" min="0" defaultValue="0" /></label><label className="grid gap-2 text-sm font-semibold">Other Costs (FCFA)<input className="admin-input" name="other_costs" type="number" min="0" defaultValue="0" /></label>
      <div className="flex justify-end gap-3 border-t pt-5 md:col-span-2"><button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button><button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Submitting...' : 'Submit Mission'}</button></div>
    </form></section></div>}

    {viewing && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setViewing(null)}><section className="w-full max-w-2xl rounded-lg bg-white p-7" onMouseDown={event => event.stopPropagation()}><div className="flex justify-between"><div><h3 className="text-2xl font-black">Mission Details</h3><p className="mt-1 font-mono text-xs text-slate-500">{viewing.reference}</p></div><button onClick={() => setViewing(null)}><X className="h-5 w-5" /></button></div><dl className="mt-7 grid gap-5 text-sm sm:grid-cols-2">{[['Requestor', viewing.data.requester_name], ['Destination', viewing.data.destination], ['Purpose', viewing.data.purpose], ['Period', `${text(viewing.data.departure_date)} - ${text(viewing.data.return_date)}`], ['Per Diem', `${amount(viewing.data.per_diem).toLocaleString('fr-FR')} FCFA/day`], ['Total Cost', `${amount(viewing.data.total_cost).toLocaleString('fr-FR')} FCFA`], ['Status', statusLabel(viewing)], ['Finance Request', viewing.data.finance_request_id || 'Not initiated']].map(([label, value]) => <div key={String(label)}><dt className="text-slate-500">{String(label)}</dt><dd className="mt-1 font-bold">{String(value || '-')}</dd></div>)}</dl></section></div>}
  </div>;
}
