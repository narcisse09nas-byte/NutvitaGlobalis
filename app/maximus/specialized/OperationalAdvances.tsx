'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Eye, FileCheck2, Link as LinkIcon, Search, Upload, X,
} from 'lucide-react';

type Row = {
  id: string;
  module: string;
  title: string;
  reference?: string | null;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => Number(value || 0);
const money = (value: unknown) => `${amount(value).toLocaleString('fr-FR')} FCFA`;

function recipient(row: Row) {
  return text(row.data.beneficiary)
    || text(row.data.vendor_name)
    || text(row.data.vendorName)
    || text(row.data.recipient)
    || 'N/A';
}

function issuedAt(row: Row) {
  const raw = text(row.data.advance_date) || text(row.data.payment_date) || text(row.data.date) || row.created_at;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date(row.created_at) : date;
}

function originalAmount(row: Row) {
  return amount(row.data.amount || row.data.advance_amount);
}

function isCleared(row: Row) {
  return text(row.data.clearing_status) === 'cleared'
    || text(row.data.advance_status) === 'cleared'
    || Boolean(row.data.cleared_at || row.data.clearedAt);
}

function isOperationalPayment(row: Row) {
  return row.data.is_operational_advance === true
    || row.data.isOperationalAdvance === true
    || text(row.data.payment_type).toLowerCase() === 'operational advance';
}

function reference(row: Row) {
  return text(row.data.payment_reference) || row.reference || row.id.slice(0, 8).toUpperCase();
}

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the proof document.'));
    reader.readAsDataURL(file);
  });
}

export default function OperationalAdvances() {
  const [nativeRows, setNativeRows] = useState<Row[]>([]);
  const [paymentRows, setPaymentRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return (payload.items || []).map((row: Row) => ({ ...row, module }));
  }

  async function load() {
    const [advances, payments] = await Promise.all([
      fetchModule('finance/operational-advances'),
      fetchModule('finance/payments'),
    ]);
    setNativeRows(advances);
    setPaymentRows(payments.filter(isOperationalPayment));
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load operational advances.'));
  }, []);

  const rows = useMemo(() => {
    const linkedPayments = new Set(nativeRows.map(row => text(row.data.source_payment_id)).filter(Boolean));
    return [...nativeRows, ...paymentRows.filter(row => !linkedPayments.has(row.id))]
      .sort((a, b) => issuedAt(b).getTime() - issuedAt(a).getTime());
  }, [nativeRows, paymentRows]);

  const filtered = useMemo(() => rows.filter(row => {
    const status = isCleared(row) ? 'cleared' : 'outstanding';
    const haystack = `${reference(row)} ${recipient(row)} ${row.title} ${text(row.data.purpose)}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'all' || status === statusFilter);
  }), [rows, search, statusFilter]);

  async function clearAdvance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const values = new FormData(event.currentTarget);
    const expensed = amount(values.get('expensed_amount'));
    const advanced = originalAmount(selected);
    const comment = text(values.get('clearing_comment')).trim();
    const proof = values.get('proof') as File | null;

    if (expensed < 0 || expensed > advanced) {
      setMessage('The expensed amount must be between zero and the original advance.');
      return;
    }
    if (comment.length < 10) {
      setMessage('A clearing comment of at least 10 characters is required.');
      return;
    }
    if (proof?.size && proof.size > 1024 * 1024) {
      setMessage('The proof document must not exceed 1 MB.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const clearedAt = text(values.get('cleared_at')) || new Date().toISOString().slice(0, 10);
      const proofUrl = proof?.size ? await fileAsDataUrl(proof) : text(selected.data.clearing_proof_url);
      const history = Array.isArray(selected.data.clearing_history) ? selected.data.clearing_history as unknown[] : [];
      const data = {
        ...selected.data,
        beneficiary: recipient(selected),
        amount: advanced,
        advance_date: text(selected.data.advance_date) || issuedAt(selected).toISOString(),
        expensed_amount: expensed,
        remaining_amount: advanced - expensed,
        returned_amount: advanced - expensed,
        cleared_at: clearedAt,
        clearing_comment: comment,
        clearing_proof_url: proofUrl || null,
        clearing_proof_name: proof?.size ? proof.name : text(selected.data.clearing_proof_name),
        clearing_status: 'cleared',
        clearing_history: [
          ...history,
          {
            cleared_at: clearedAt,
            expensed_amount: expensed,
            returned_amount: advanced - expensed,
            comment,
            source: 'Maximus',
          },
        ],
      };

      const response = await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          status: selected.module === 'finance/payments' ? selected.status : 'validated',
          data,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to clear the operational advance.');
      setSelected(null);
      setMessage('Operational advance cleared successfully.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to clear the operational advance.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center gap-4">
      <Link href="/maximus/finance/dashboard" title="Back to Finance" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link>
      <h2 className="text-3xl font-black">Operational Advances</h2>
    </div>

    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('successfully') ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-black">Manage Operational Advances</h3>
          <p className="mt-1 text-sm text-slate-500">Track and manage all operational advances made to staff members.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input className="admin-input min-w-64 pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search an advance..." />
          </label>
          <select className="admin-input min-w-44" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
            <option value="all">All Statuses</option>
            <option value="outstanding">Outstanding</option>
            <option value="cleared">Cleared</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead><tr className="border-b text-slate-500">
            <th className="p-3">Payment ID</th>
            <th className="p-3">Recipient</th>
            <th className="p-3">Date Issued</th>
            <th className="p-3">Amount (FCFA)</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr></thead>
          <tbody>{filtered.length ? filtered.map(row => {
            const cleared = isCleared(row);
            return <tr key={`${row.module}-${row.id}`} className="border-b">
              <td className="p-3 font-mono text-xs">{reference(row)}</td>
              <td className="p-3 font-semibold">{recipient(row)}</td>
              <td className="p-3">{issuedAt(row).toLocaleDateString('fr-FR')}</td>
              <td className="p-3 font-semibold">{money(originalAmount(row))}</td>
              <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cleared ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{cleared ? 'Cleared' : 'Outstanding'}</span></td>
              <td className="p-3 text-right">{cleared
                ? <button onClick={() => setViewing(row)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold"><Eye className="h-4 w-4" />View Details</button>
                : <button onClick={() => { setMessage(''); setSelected(row); }} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><FileCheck2 className="h-4 w-4" />Clear Advance</button>}
              </td>
            </tr>;
          }) : <tr><td colSpan={6} className="h-32 text-center text-slate-500">No operational advances found.</td></tr>}</tbody>
        </table>
      </div>
    </section>

    {selected && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setSelected(null)}>
      <section className="my-6 w-full max-w-xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><p className="text-xs font-bold uppercase tracking-wide text-[#ef7f3b]">Advance clearing</p><h3 className="mt-1 text-2xl font-black">Clear Operational Advance</h3><p className="mt-2 text-sm text-slate-500">{money(originalAmount(selected))} advanced to {recipient(selected)}.</p></div><button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></header>
        <form onSubmit={clearAdvance} className="grid gap-5 p-6">
          <label className="grid gap-2 text-sm font-bold">Expensed Amount (FCFA)<input className="admin-input" name="expensed_amount" type="number" min="0" max={originalAmount(selected)} defaultValue={originalAmount(selected)} required /></label>
          <label className="grid gap-2 text-sm font-bold">Date of Clearing<input className="admin-input" name="cleared_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
          <label className="grid gap-2 text-sm font-bold">Clearing Comment<textarea className="admin-input min-h-28" name="clearing_comment" placeholder="Describe the expenses and how the balance was returned..." required /></label>
          <label className="grid gap-2 text-sm font-bold">Attach Proof (Optional)<span className="flex items-center gap-3 rounded-md border border-dashed p-4 text-slate-500"><Upload className="h-5 w-5" /><input name="proof" type="file" accept="image/*,.pdf,.doc,.docx" className="min-w-0 text-xs font-normal" /></span><span className="text-xs font-normal text-slate-500">Receipt, invoice, or supporting document. Maximum 1 MB.</span></label>
          <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setSelected(null)} className="rounded-md border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Confirm Clearing'}</button></div>
        </form>
      </section>
    </div>}

    {viewing && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setViewing(null)}>
      <section className="my-6 w-full max-w-xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><p className="font-mono text-xs text-slate-500">{reference(viewing)}</p><h3 className="mt-1 text-2xl font-black">Advance Details</h3></div><button onClick={() => setViewing(null)}><X className="h-5 w-5" /></button></header>
        <div className="grid gap-5 p-6 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">{[
            ['Recipient', recipient(viewing)],
            ['Date Issued', issuedAt(viewing).toLocaleDateString('fr-FR')],
            ['Original Amount', money(originalAmount(viewing))],
            ['Expensed Amount', money(viewing.data.expensed_amount)],
            ['Returned Balance', money(viewing.data.returned_amount ?? Math.max(originalAmount(viewing) - amount(viewing.data.expensed_amount), 0))],
            ['Date Cleared', text(viewing.data.cleared_at) ? new Date(text(viewing.data.cleared_at)).toLocaleDateString('fr-FR') : 'N/A'],
          ].map(([label, value]) => <div key={label}><p className="text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div>
          <div><p className="text-slate-500">Clearing Comment</p><p className="mt-2 rounded-md bg-slate-50 p-4 leading-6">{text(viewing.data.clearing_comment) || 'N/A'}</p></div>
          {text(viewing.data.clearing_proof_url) && <a href={text(viewing.data.clearing_proof_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold text-emerald-700"><LinkIcon className="h-4 w-4" />View supporting document</a>}
          <div className="flex justify-end border-t pt-5"><button onClick={() => setViewing(null)} className="rounded-md border px-5 py-3 font-bold">Close</button></div>
        </div>
      </section>
    </div>}
  </div>;
}
