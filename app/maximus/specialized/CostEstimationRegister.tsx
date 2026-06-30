'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CircleDollarSign, Eye, Search, X } from 'lucide-react';

type Row = {
  id: string;
  title: string;
  reference?: string | null;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

type EstimationItem = {
  name?: string;
  item?: string;
  unit?: string;
  required?: number;
  in_stock?: number;
  to_purchase?: number;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  totalPrice?: number;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => Number(value || 0);
const money = (value: unknown) => `${Math.round(amount(value)).toLocaleString('fr-FR')} FCFA`;

function statusStyle(status: string) {
  return status === 'validated' ? 'bg-emerald-100 text-emerald-800'
    : status === 'endorsed' ? 'bg-sky-100 text-sky-800'
      : status === 'submitted' ? 'bg-amber-100 text-amber-800'
        : status === 'rejected' ? 'bg-red-100 text-red-800'
          : 'bg-slate-100 text-slate-700';
}

export default function CostEstimationRegister() {
  const [estimations, setEstimations] = useState<Row[]>([]);
  const [sourceEstimations, setSourceEstimations] = useState<Row[]>([]);
  const [initiations, setInitiations] = useState<Row[]>([]);
  const [details, setDetails] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [financeRows, supplyRows, initiationRows] = await Promise.all([
      fetchModule('finance/cost-estimations'),
      fetchModule('supply/cost-estimation'),
      fetchModule('finance/payment-initiation'),
    ]);
    setEstimations(financeRows);
    setSourceEstimations(supplyRows);
    setInitiations(initiationRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load cost estimations.'));
  }, []);

  const sourceMap = useMemo(() => new Map(sourceEstimations.map(row => [row.id, row])), [sourceEstimations]);
  const initiatedIds = useMemo(() => new Set(initiations.map(row => text(row.data.reference_id)).filter(Boolean)), [initiations]);
  const effectiveStatus = (row: Row) => {
    const source = sourceMap.get(text(row.data.source_estimation_id));
    return source?.status === 'validated' ? 'validated' : row.status;
  };

  const filtered = useMemo(() => estimations.filter(row => {
    const status = effectiveStatus(row);
    const haystack = `${row.reference} ${row.title} ${row.data.central_kitchen} ${row.data.budget_line}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'all' || status === statusFilter);
  }), [estimations, sourceMap, search, statusFilter]);

  async function preparePayment(row: Row) {
    if (initiatedIds.has(row.id)) return setMessage('A payment initiation already exists for this estimation.');
    const data = {
      reference_type: 'Cost Estimation',
      reference_id: row.id,
      reference: row.reference,
      beneficiary: '',
      amount: amount(row.data.total_amount),
      budget_line: text(row.data.budget_line),
      purpose: row.title,
      payment_method: '',
      notes: `Purchase-order estimation for ${text(row.data.central_kitchen) || 'operations'}.`,
      prepared_at: new Date().toISOString(),
    };
    if (data.amount <= 0) return setMessage('The estimation has no payable amount.');
    setBusy(row.id);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'finance/payment-initiation', title: `Payment Preparation - ${row.title}`, data }),
    });
    const payload = await response.json();
    if (response.ok) {
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.item.id, status: 'submitted', data }),
      });
    }
    setBusy('');
    if (!response.ok) return setMessage(payload.message || 'Unable to prepare estimation payment.');
    setMessage('Cost estimation sent to the payment preparation queue.');
    await load();
  }

  const items = details && Array.isArray(details.data.items) ? details.data.items as EstimationItem[] : [];
  const detailTotal = items.reduce((sum, item) => sum + amount(item.total_price || item.totalPrice), 0);

  return <div className="grid gap-6 text-slate-950">
    <div className="flex items-center gap-4"><Link href="/maximus/finance/dashboard" title="Back to Finance" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link><h2 className="text-3xl font-black">Cost Estimation Register</h2></div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('Unable') || message.includes('already') || message.includes('no payable') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-black">All Cost Estimations</h3><p className="mt-1 text-sm text-slate-500">This register shows all purchase order cost estimations and their current workflow status.</p></div><div className="flex flex-wrap gap-3"><label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input min-w-64 pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search estimation..." /></label><select className="admin-input min-w-40" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All Statuses</option>{['draft','submitted','endorsed','validated','rejected'].map(status => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}</select></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Estimation ID</th><th className="p-3">Plan Name</th><th className="p-3">Created On</th><th className="p-3">Status</th><th className="p-3">Total Amount (FCFA)</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{filtered.length ? filtered.map(row => {
        const status = effectiveStatus(row);
        const initiated = initiatedIds.has(row.id);
        return <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td><td className="p-3"><p className="font-semibold">{row.title}</p><p className="text-xs text-slate-500">{text(row.data.central_kitchen)}</p></td><td className="p-3">{new Date(row.created_at).toLocaleDateString('fr-FR')}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusStyle(status)}`}>{initiated ? 'Payment Prepared' : status}</span></td><td className="p-3 font-semibold">{money(row.data.total_amount)}</td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => setDetails(row)} title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>{status === 'validated' && !initiated && <button disabled={busy === row.id} onClick={() => preparePayment(row)} title="Prepare Payment" className="rounded-md bg-[#24945f] p-2 text-white disabled:opacity-50"><CircleDollarSign className="h-4 w-4" /></button>}</div></td></tr>;
      }) : <tr><td colSpan={6} className="h-32 text-center text-slate-500">No cost estimations found.</td></tr>}</tbody></table></div>
    </section>

    {details && <div className="fixed inset-0 z-[90] overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDetails(null)}><section className="mx-auto my-6 w-full max-w-5xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex items-start justify-between border-b p-6"><div><p className="font-mono text-xs text-slate-500">{details.reference}</p><h3 className="mt-1 text-2xl font-black">{details.title}</h3><p className="mt-1 text-sm text-slate-500">{text(details.data.central_kitchen)} | {text(details.data.period)}</p></div><button onClick={() => setDetails(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-6 p-6"><div className="grid gap-4 text-sm sm:grid-cols-4"><div><p className="text-slate-500">Requester</p><p className="font-semibold">{text(details.data.requester) || 'Supply Chain'}</p></div><div><p className="text-slate-500">Budget Line</p><p className="font-semibold">{text(details.data.budget_line) || 'Multiple / Unallocated'}</p></div><div><p className="text-slate-500">Status</p><p className="font-semibold capitalize">{effectiveStatus(details)}</p></div><div><p className="text-slate-500">Grand Total</p><p className="font-semibold">{money(details.data.total_amount)}</p></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Item</th><th className="p-3">Required</th><th className="p-3">In Stock</th><th className="p-3">To Purchase</th><th className="p-3">Unit Price</th><th className="p-3 text-right">Total</th></tr></thead><tbody>{items.length ? items.map((item, index) => <tr key={`${item.name || item.item}-${index}`} className="border-b"><td className="p-3 font-semibold">{item.name || item.item}</td><td className="p-3">{amount(item.required || item.quantity).toLocaleString('fr-FR')} {item.unit}</td><td className="p-3">{amount(item.in_stock).toLocaleString('fr-FR')} {item.unit}</td><td className="p-3">{amount(item.to_purchase || item.quantity).toLocaleString('fr-FR')} {item.unit}</td><td className="p-3">{money(item.unit_price)}</td><td className="p-3 text-right font-semibold">{money(item.total_price || item.totalPrice)}</td></tr>) : <tr><td colSpan={6} className="h-24 text-center text-slate-500">No item details recorded.</td></tr>}</tbody><tfoot><tr className="bg-slate-50 font-black"><td colSpan={5} className="p-3 text-right">Calculated Item Total</td><td className="p-3 text-right">{money(detailTotal || details.data.total_amount)}</td></tr></tfoot></table></div>
      {Math.abs(detailTotal - amount(details.data.total_amount)) > 1 && items.length > 0 && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The item total differs from the recorded grand total. Finance should reconcile the estimation before payment.</p>}</div></section></div>}
  </div>;
}
