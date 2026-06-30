'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Edit, History, Plus, Search, WalletCards, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

type Dialog = 'card' | 'topup' | 'history' | null;

const text = (value: unknown) => typeof value === 'string' ? value : '';
const number = (value: unknown) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);

function vehicleLabel(row: Row) {
  return text(row.data.registration_number) || text(row.data.unique_identifier) || row.reference || row.title;
}

function formatDate(value: unknown) {
  const raw = text(value);
  if (!raw) return 'N/A';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('fr-FR');
}

export default function TomCardManagement() {
  const [records, setRecords] = useState<Row[]>([]);
  const [vehicles, setVehicles] = useState<Row[]>([]);
  const [financeRequests, setFinanceRequests] = useState<Row[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [activeCard, setActiveCard] = useState<Row | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [cardRows, assetRows, requestRows] = await Promise.all([
      fetchModule('fleet/tom-cards'),
      fetchModule('assets/inventory'),
      fetchModule('finance/requests'),
    ]);
    setRecords(cardRows);
    setVehicles(assetRows.filter((row: Row) =>
      (!row.data.record_type || row.data.record_type === 'asset') &&
      text(row.data.asset_type) === 'Vehicle' &&
      text(row.data.asset_status) !== 'Written-Off'
    ));
    setFinanceRequests(requestRows.filter((row: Row) => row.status === 'validated'));
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load Tom cards.'));
  }, []);

  const cards = useMemo(() => records.filter(row =>
    !row.data.record_type || row.data.record_type === 'card'
  ), [records]);

  const topUps = useMemo(() => records.filter(row => row.data.record_type === 'topup'), [records]);

  const filteredCards = useMemo(() => cards.filter(row => {
    const haystack = `${row.data.card_number} ${row.data.assigned_vehicle_registration} ${row.reference}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) &&
      (statusFilter === 'all' || text(row.data.card_status) === statusFilter);
  }), [cards, search, statusFilter]);

  const cardHistory = useMemo(() => topUps
    .filter(row => text(row.data.card_id) === activeCard?.id)
    .sort((a, b) => text(b.data.top_up_date).localeCompare(text(a.data.top_up_date))), [topUps, activeCard]);

  const availableRequests = useMemo(() => {
    const usedIds = new Set(topUps.map(row => text(row.data.finance_request_id)).filter(Boolean));
    return financeRequests.filter(row => !usedIds.has(row.id));
  }, [financeRequests, topUps]);

  function openCard(row?: Row) {
    setActiveCard(row || null);
    setDialog('card');
    setMessage('');
  }

  function openTopUp(row: Row) {
    setActiveCard(row);
    setSelectedRequestId('');
    setDialog('topup');
    setMessage('');
  }

  async function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const vehicle = vehicles.find(row => row.id === values.assigned_vehicle_id);
    const cardNumber = text(values.card_number).trim();
    const duplicate = cards.find(row => row.id !== activeCard?.id && text(row.data.card_number).toLowerCase() === cardNumber.toLowerCase());
    if (duplicate) return setMessage('A Tom card with this number already exists.');

    const data = {
      record_type: 'card',
      card_number: cardNumber,
      assigned_vehicle_id: vehicle?.id || null,
      assigned_vehicle_registration: vehicle ? vehicleLabel(vehicle) : null,
      assigned_asset_type: vehicle ? 'Vehicle' : null,
      card_status: values.card_status,
      issue_date: values.issue_date,
      expiry_date: values.expiry_date || null,
    };
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: activeCard ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activeCard
        ? { id: activeCard.id, title: `Tom Card ${cardNumber}`, data }
        : { module: 'fleet/tom-cards', title: `Tom Card ${cardNumber}`, data }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save the Tom card.');
    setDialog(null);
    setActiveCard(null);
    setMessage(activeCard ? 'Tom card updated.' : 'Tom card created.');
    await load();
  }

  async function saveTopUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCard) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const request = availableRequests.find(row => row.id === selectedRequestId);
    if (!request) return setMessage('A validated and unused finance request is required.');
    const amount = number(request.data.amount || request.data.total_amount);
    if (amount <= 0) return setMessage('The selected finance request must have a positive amount.');

    const data = {
      record_type: 'topup',
      card_id: activeCard.id,
      card_number: text(activeCard.data.card_number),
      finance_request_id: request.id,
      finance_request_reference: request.reference,
      finance_request_title: request.title,
      top_up_date: values.top_up_date,
      amount,
      receipt_url: values.receipt_url || null,
    };
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'fleet/tom-cards',
        title: `Top-Up ${text(activeCard.data.card_number)} - ${request.reference || request.title}`,
        data,
      }),
    });
    const payload = await response.json();
    if (response.ok) {
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.item.id, status: 'validated', data }),
      });
    }
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to record the top-up.');
    setDialog(null);
    setSelectedRequestId('');
    setMessage('Tom card top-up recorded.');
    await load();
  }

  const selectedRequest = availableRequests.find(row => row.id === selectedRequestId);

  return <div className="grid gap-5 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href="/maximus/assets/inventory" title="Back to Fleet" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link>
        <h2 className="text-3xl font-black">Tom Card Management</h2>
      </div>
      <button onClick={() => openCard()} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add Tom Card</button>
    </div>

    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
      message.includes('Unable') || message.includes('required') || message.includes('exists') || message.includes('positive')
        ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h3 className="text-xl font-black">Tom Card Registry</h3><p className="mt-1 text-sm text-slate-500">Manage fuel cards, assigned vehicles, and replenishments.</p></div>
        <div className="flex flex-wrap gap-3">
          <label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} className="admin-input min-w-64 pl-10" placeholder="Search card or vehicle..." /></label>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="admin-input min-w-40"><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="lost">Lost</option></select>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Card Number</th><th className="p-3">Assigned Vehicle</th><th className="p-3">Status</th><th className="p-3">Issue Date</th><th className="p-3">Expiry Date</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{filteredCards.length ? filteredCards.map(row => <tr key={row.id} className="border-b">
          <td className="p-3 font-semibold">{text(row.data.card_number)}</td>
          <td className="p-3">{text(row.data.assigned_vehicle_registration) || 'Unassigned'}</td>
          <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${text(row.data.card_status) === 'active' ? 'bg-emerald-100 text-emerald-800' : text(row.data.card_status) === 'lost' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>{text(row.data.card_status) || 'active'}</span></td>
          <td className="p-3">{formatDate(row.data.issue_date)}</td><td className="p-3">{formatDate(row.data.expiry_date)}</td>
          <td className="p-3"><div className="flex justify-end gap-2">
            <button onClick={() => openTopUp(row)} disabled={text(row.data.card_status) !== 'active'} title="Top-Up" className="flex items-center gap-1.5 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><WalletCards className="h-4 w-4" />Top-Up</button>
            <button onClick={() => { setActiveCard(row); setDialog('history'); }} title="History" className="rounded-md border p-2"><History className="h-4 w-4" /></button>
            <button onClick={() => openCard(row)} title="Edit" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button>
          </div></td>
        </tr>) : <tr><td colSpan={6} className="h-36 text-center text-slate-500">No Tom cards found.</td></tr>}</tbody>
      </table></div>
    </section>

    {dialog && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDialog(null)}>
      <section className={`mx-auto my-6 w-full rounded-lg bg-white shadow-2xl ${dialog === 'history' ? 'max-w-3xl' : 'max-w-2xl'}`} onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div>
          <h3 className="text-2xl font-black">{dialog === 'card' ? activeCard ? 'Edit Tom Card' : 'Add Tom Card' : dialog === 'topup' ? `Top-Up Tom Card: ${text(activeCard?.data.card_number)}` : `Replenishment History: ${text(activeCard?.data.card_number)}`}</h3>
          <p className="mt-1 text-sm text-slate-500">{dialog === 'card' ? 'Register a fuel card and optionally assign it to a vehicle.' : dialog === 'topup' ? 'Record a replenishment from a validated finance request.' : 'A log of all top-ups for this card.'}</p>
        </div><button onClick={() => setDialog(null)}><X className="h-5 w-5" /></button></header>

        {dialog === 'card' && <form onSubmit={saveCard} className="grid gap-5 p-6">
          <label className="grid gap-2 text-sm font-semibold">Card Number<input className="admin-input" name="card_number" required minLength={3} defaultValue={text(activeCard?.data.card_number)} /></label>
          <label className="grid gap-2 text-sm font-semibold">Assigned Vehicle<select className="admin-input" name="assigned_vehicle_id" defaultValue={text(activeCard?.data.assigned_vehicle_id)}><option value="">Unassigned</option>{vehicles.map(row => <option key={row.id} value={row.id}>{row.title} ({vehicleLabel(row)})</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">Status<select className="admin-input" name="card_status" defaultValue={text(activeCard?.data.card_status) || 'active'}><option value="active">Active</option><option value="inactive">Inactive</option><option value="lost">Lost</option></select></label>
            <label className="grid gap-2 text-sm font-semibold">Issue Date<input className="admin-input" name="issue_date" type="date" required defaultValue={text(activeCard?.data.issue_date) || today()} /></label>
            <label className="grid gap-2 text-sm font-semibold sm:col-start-2">Expiry Date<input className="admin-input" name="expiry_date" type="date" min={text(activeCard?.data.issue_date) || today()} defaultValue={text(activeCard?.data.expiry_date)} /></label>
          </div>
          <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setDialog(null)} className="btn-secondary">Cancel</button><button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : activeCard ? 'Save Changes' : 'Save Tom Card'}</button></div>
        </form>}

        {dialog === 'topup' && <form onSubmit={saveTopUp} className="grid gap-5 p-6">
          <label className="grid gap-2 text-sm font-semibold">Source Finance Request<select className="admin-input" required value={selectedRequestId} onChange={event => setSelectedRequestId(event.target.value)}><option value="">Select a validated request...</option>{availableRequests.map(row => <option key={row.id} value={row.id}>{row.reference || row.title} - {number(row.data.amount || row.data.total_amount).toLocaleString('fr-FR')} FCFA</option>)}</select></label>
          {!availableRequests.length && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No unused validated finance request is available.</p>}
          <label className="grid gap-2 text-sm font-semibold">Amount (FCFA)<input className="admin-input" readOnly disabled value={selectedRequest ? number(selectedRequest.data.amount || selectedRequest.data.total_amount) : 0} /></label>
          <label className="grid gap-2 text-sm font-semibold">Top-Up Date<input className="admin-input" name="top_up_date" type="date" required defaultValue={today()} /></label>
          <label className="grid gap-2 text-sm font-semibold">Receipt URL (Optional)<input className="admin-input" name="receipt_url" type="url" placeholder="https://example.com/receipt.pdf" /></label>
          <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setDialog(null)} className="btn-secondary">Cancel</button><button disabled={busy || !selectedRequest} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : 'Save Top-Up'}</button></div>
        </form>}

        {dialog === 'history' && <div className="p-6"><div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Date</th><th className="p-3">Finance Request</th><th className="p-3 text-right">Amount (FCFA)</th><th className="p-3">Receipt</th></tr></thead>
            <tbody>{cardHistory.length ? cardHistory.map(row => <tr key={row.id} className="border-b"><td className="p-3">{formatDate(row.data.top_up_date)}</td><td className="p-3">{text(row.data.finance_request_reference) || text(row.data.finance_request_title)}</td><td className="p-3 text-right font-semibold">{number(row.data.amount).toLocaleString('fr-FR')}</td><td className="p-3">{text(row.data.receipt_url) ? <a href={text(row.data.receipt_url)} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">View</a> : 'N/A'}</td></tr>) : <tr><td colSpan={4} className="h-32 text-center text-slate-500">No replenishment history found for this card.</td></tr>}</tbody>
          </table>
        </div></div>}
      </section>
    </div>}
  </div>;
}
