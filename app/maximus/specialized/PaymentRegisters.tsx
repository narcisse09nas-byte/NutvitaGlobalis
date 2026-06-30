'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCheck, Eye, Receipt, Search, X } from 'lucide-react';

type Row = {
  id: string;
  title: string;
  reference?: string | null;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  module?: string;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => Number(value || 0);
const money = (value: unknown) => `${amount(value).toLocaleString('fr-FR')} FCFA`;

function paymentDate(row: Row) {
  const raw = text(row.data.payment_date) || text(row.data.date) || row.updated_at || row.created_at;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date(row.created_at) : date;
}

function paymentReference(row: Row) {
  return text(row.data.payment_reference) || text(row.data.reference) || row.reference || row.id.slice(0, 8);
}

function paymentMethod(row: Row) {
  return text(row.data.payment_method) || text(row.data.method) || 'N/A';
}

function beneficiary(row: Row) {
  return text(row.data.beneficiary) || text(row.data.vendor_name) || text(row.data.vendorName) || 'N/A';
}

function budgetCode(row: Row, requestMap: Map<string, Row>) {
  const direct = text(row.data.budget_line);
  if (direct) return direct;
  const request = requestMap.get(text(row.data.reference_id) || text(row.data.finance_request_id));
  return text(request?.data.budget_line) || 'N/A';
}

export default function PaymentRegisters({ mode }: { mode: 'mine' | 'register' }) {
  const [payments, setPayments] = useState<Row[]>([]);
  const [legacy, setLegacy] = useState<Row[]>([]);
  const [requests, setRequests] = useState<Row[]>([]);
  const [estimations, setEstimations] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return (payload.items || []).map((row: Row) => ({ ...row, module }));
  }

  async function load() {
    const [paymentRows, registerRows, requestRows, estimationRows] = await Promise.all([
      fetchModule('finance/payments'), fetchModule('finance/payment-register'),
      fetchModule('finance/requests'), fetchModule('finance/cost-estimations'),
    ]);
    setPayments(paymentRows);
    setLegacy(registerRows);
    setRequests(requestRows);
    setEstimations(estimationRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load payments.'));
  }, []);

  const requestMap = useMemo(() => new Map(requests.map(row => [row.id, row])), [requests]);
  const estimationMap = useMemo(() => new Map(estimations.map(row => [row.id, row])), [estimations]);
  const rows = useMemo(() => {
    const paymentReferences = new Set(payments.map(paymentReference));
    return [...payments, ...legacy.filter(row => !paymentReferences.has(paymentReference(row)))]
      .sort((a, b) => paymentDate(b).getTime() - paymentDate(a).getTime());
  }, [payments, legacy]);

  const filtered = useMemo(() => rows.filter(row => {
    const acknowledged = Boolean(row.data.acknowledged);
    const effectiveStatus = acknowledged ? 'acknowledged' : row.status;
    const haystack = `${paymentReference(row)} ${beneficiary(row)} ${row.title} ${budgetCode(row, requestMap)}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'all' || effectiveStatus === statusFilter);
  }), [rows, search, statusFilter, requestMap]);

  async function acknowledge(row: Row) {
    if (row.module !== 'finance/payments') return setMessage('Legacy register entries cannot be acknowledged from this screen.');
    const data = {
      ...row.data,
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledgement_history: [
        ...(Array.isArray(row.data.acknowledgement_history) ? row.data.acknowledgement_history as unknown[] : []),
        { acknowledged_at: new Date().toISOString(), source: 'Maximus' },
      ],
    };
    setBusy(row.id);
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, data }),
    });
    const payload = await response.json();
    setBusy('');
    if (!response.ok) return setMessage(payload.message || 'Unable to acknowledge payment receipt.');
    setMessage('Payment receipt acknowledged.');
    await load();
  }

  const linkedRecord = selected
    ? requestMap.get(text(selected.data.reference_id) || text(selected.data.finance_request_id))
      || estimationMap.get(text(selected.data.reference_id) || text(selected.data.cost_estimation_id))
    : null;

  return <div className="grid gap-6 text-slate-950">
    <div className="flex items-center gap-4">{mode === 'register' && <Link href="/maximus/finance/dashboard" title="Back to Finance" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link>}<div><h2 className="text-3xl font-black">{mode === 'mine' ? 'My Payments' : 'Payment Register'}</h2>{mode === 'register' && <p className="mt-1 text-sm text-slate-500">Central record of all payments executed through Maximus.</p>}</div></div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('Unable') || message.includes('cannot') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-black">{mode === 'mine' ? 'Payment Register' : 'Executed Payments'}</h3><p className="mt-1 text-sm text-slate-500">{mode === 'mine' ? 'This is a list of payments made to recipients. Confirm receipt for each payment.' : 'A log of all payments executed through the system.'}</p></div><div className="flex flex-wrap gap-3"><label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input min-w-64 pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search payment..." /></label><select className="admin-input min-w-44" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All Statuses</option><option value="paid">Paid</option><option value="executed">Executed</option><option value="acknowledged">Acknowledged</option></select></div></div>
      <div className="mt-6 overflow-x-auto"><table className={`w-full text-left text-sm ${mode === 'mine' ? 'min-w-[950px]' : 'min-w-[1100px]'}`}><thead><tr className="border-b text-slate-500">{mode === 'mine' ? <><th className="p-3">Payment Date</th><th className="p-3">Amount (FCFA)</th><th className="p-3">Payment Method</th><th className="p-3">Payment ID</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></> : <><th className="p-3">Payment ID</th><th className="p-3">Date</th><th className="p-3">Vendor / Recipient</th><th className="p-3">Amount (FCFA)</th><th className="p-3">Budget Line(s)</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></>}</tr></thead><tbody>{filtered.length ? filtered.map(row => {
        const acknowledged = Boolean(row.data.acknowledged);
        const status = acknowledged ? 'Acknowledged' : ['paid','executed'].includes(row.status) ? row.status.toUpperCase() : 'Pending Acknowledgement';
        const badge = acknowledged ? 'bg-emerald-100 text-emerald-800' : ['paid','executed'].includes(row.status) ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800';
        return <tr key={`${row.module}-${row.id}`} className="border-b">{mode === 'mine' ? <><td className="p-3">{paymentDate(row).toLocaleDateString('fr-FR')}</td><td className="p-3 font-semibold">{money(row.data.amount)}</td><td className="p-3"><span className="rounded-full border px-2.5 py-1 text-xs font-bold">{paymentMethod(row)}</span></td><td className="p-3 font-mono text-xs">{paymentReference(row)}</td><td className="p-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>{acknowledged && <CheckCheck className="h-3.5 w-3.5" />}{status}{acknowledged && text(row.data.acknowledged_at) ? ` on ${new Date(text(row.data.acknowledged_at)).toLocaleDateString('fr-FR')}` : ''}</span></td><td className="p-3 text-right">{!acknowledged && ['paid','executed'].includes(row.status) && <button disabled={busy === row.id} onClick={() => acknowledge(row)} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Receipt className="h-4 w-4" />{busy === row.id ? 'Saving...' : 'Acknowledge Receipt'}</button>}</td></> : <><td className="p-3 font-mono text-xs">{paymentReference(row)}</td><td className="p-3">{paymentDate(row).toLocaleDateString('fr-FR')}</td><td className="p-3 font-semibold">{beneficiary(row)}</td><td className="p-3 font-semibold">{money(row.data.amount)}</td><td className="p-3"><p className="font-mono text-xs">{budgetCode(row, requestMap)}</p>{linkedDescription(row, requestMap, estimationMap) && <p className="mt-1 max-w-56 truncate text-xs text-slate-500">{linkedDescription(row, requestMap, estimationMap)}</p>}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>{status}</span></td><td className="p-3 text-right"><button onClick={() => setSelected(row)} title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button></td></>}</tr>;
      }) : <tr><td colSpan={mode === 'mine' ? 6 : 7} className="h-32 text-center text-slate-500">{mode === 'mine' ? 'No payments have been recorded for your account yet.' : 'No payments have been executed yet.'}</td></tr>}</tbody></table></div>
    </section>

    {selected && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setSelected(null)}><section className="my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex items-start justify-between border-b p-6"><div><p className="font-mono text-xs text-slate-500">{paymentReference(selected)}</p><h3 className="mt-1 text-2xl font-black">Payment Details</h3></div><button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-6 p-6"><div className="grid gap-4 text-sm sm:grid-cols-2">{[
      ['Payment Date', paymentDate(selected).toLocaleDateString('fr-FR')], ['Recipient', beneficiary(selected)],
      ['Amount', money(selected.data.amount)], ['Payment Method', paymentMethod(selected)],
      ['Budget Line', budgetCode(selected, requestMap)], ['Proof Reference', selected.data.proof_reference],
      ['Reference Type', selected.data.reference_type], ['Reference ID', selected.data.reference_id],
      ['Status', selected.status], ['Acknowledged', selected.data.acknowledged ? 'Yes' : 'No'],
    ].map(([label, value]) => <div key={String(label)}><p className="text-slate-500">{String(label)}</p><p className="mt-1 font-semibold">{String(value || 'N/A')}</p></div>)}</div>{linkedRecord && <div className="rounded-md border bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Source Document</p><p className="mt-2 font-black">{linkedRecord.title}</p><p className="mt-1 text-sm text-slate-600">{text(linkedRecord.data.description) || text(linkedRecord.data.items)}</p></div>}</div></section></div>}
  </div>;
}

function linkedDescription(row: Row, requestMap: Map<string, Row>, estimationMap: Map<string, Row>) {
  const id = text(row.data.reference_id) || text(row.data.finance_request_id) || text(row.data.cost_estimation_id);
  return requestMap.get(id)?.title || estimationMap.get(id)?.title || '';
}
