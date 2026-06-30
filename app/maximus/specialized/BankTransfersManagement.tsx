'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, FileCheck2, Printer, Search, X } from 'lucide-react';

type Row = {
  id: string;
  module: string;
  title: string;
  reference?: string | null;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type BankAccount = {
  bank_name?: unknown;
  account_name?: unknown;
  account_number?: unknown;
  swift_code?: unknown;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => Number(value || 0);
const money = (value: unknown) => `${amount(value).toLocaleString('fr-FR')} FCFA`;

function bankAccount(row?: Row): BankAccount {
  if (!row) return {};
  const nested = row.data.bank_account;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested as BankAccount;
  return {
    bank_name: row.data.bank_name,
    account_name: row.data.bank_account_name,
    account_number: row.data.bank_account_number,
    swift_code: row.data.swift_code,
  };
}

function vendorName(row: Row) {
  return text(row.data.beneficiary) || text(row.data.vendor_name) || text(row.data.vendorName) || row.title;
}

function paymentReference(row: Row) {
  return text(row.data.payment_reference) || text(row.data.reference) || row.reference || row.id.slice(0, 8).toUpperCase();
}

function isBankPayment(row: Row) {
  const method = (text(row.data.payment_method) || text(row.data.paymentMethod) || text(row.data.method)).toLowerCase();
  return ['bank transfer', 'virement bancaire', 'virement'].includes(method);
}

function completed(row: Row) {
  return text(row.data.bank_transfer_status) === 'completed'
    || text(row.data.bankTransferStatus) === 'completed'
    || ['executed', 'paid', 'acknowledged'].includes(row.status) && row.module === 'finance/bank-transfers';
}

function transferDate(row: Row) {
  const raw = text(row.data.transfer_date) || text(row.data.payment_date) || text(row.data.date) || row.created_at;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date(row.created_at) : date;
}

export default function BankTransfersManagement() {
  const [payments, setPayments] = useState<Row[]>([]);
  const [transfers, setTransfers] = useState<Row[]>([]);
  const [vendors, setVendors] = useState<Row[]>([]);
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
    const [paymentRows, transferRows, vendorRows, requestRows, estimationRows] = await Promise.all([
      fetchModule('finance/payments'),
      fetchModule('finance/bank-transfers'),
      fetchModule('partnerships/vendors'),
      fetchModule('finance/requests'),
      fetchModule('finance/cost-estimations'),
    ]);
    setPayments(paymentRows.filter(isBankPayment));
    setTransfers(transferRows);
    setVendors(vendorRows);
    setRequests(requestRows);
    setEstimations(estimationRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load bank transfers.'));
  }, []);

  const vendorMap = useMemo(() => {
    const map = new Map<string, Row>();
    vendors.forEach(vendor => {
      [
        vendor.id,
        vendor.reference,
        vendor.title,
        text(vendor.data.vendor_id),
        text(vendor.data.partnership_number),
        text(vendor.data.structure_name),
        text(vendor.data.contact_name),
      ].filter(Boolean).forEach(key => map.set(String(key).toLowerCase(), vendor));
    });
    return map;
  }, [vendors]);

  const requestMap = useMemo(() => new Map(requests.map(row => [row.id, row])), [requests]);
  const estimationMap = useMemo(() => new Map(estimations.map(row => [row.id, row])), [estimations]);
  const transferByPayment = useMemo(() => transfers.reduce((map, row) => {
    const paymentId = text(row.data.source_payment_id);
    if (paymentId) map.set(paymentId, row);
    return map;
  }, new Map<string, Row>()), [transfers]);
  const representedPayments = useMemo(() => new Set(transferByPayment.keys()), [transferByPayment]);
  const rows = useMemo(() => [
    ...payments,
    ...transfers.filter(row => !text(row.data.source_payment_id) || !payments.some(payment => payment.id === text(row.data.source_payment_id))),
  ].sort((a, b) => transferDate(b).getTime() - transferDate(a).getTime()), [payments, transfers]);

  function linkedVendor(row: Row) {
    const keys = [
      text(row.data.vendor_id),
      text(row.data.vendorId),
      text(row.data.vendor_number),
      text(row.data.beneficiary),
      text(row.data.vendor_name),
      text(row.data.vendorName),
    ].filter(Boolean);
    for (const key of keys) {
      const vendor = vendorMap.get(key.toLowerCase());
      if (vendor) return vendor;
    }
    return undefined;
  }

  function budgetCode(row: Row) {
    const direct = text(row.data.budget_line) || text(row.data.budget_code);
    if (direct) return direct;
    const sourceId = text(row.data.reference_id) || text(row.data.finance_request_id) || text(row.data.cost_estimation_id);
    const source = requestMap.get(sourceId) || estimationMap.get(sourceId);
    return text(source?.data.budget_line) || (source?.module === 'finance/cost-estimations' ? 'Multiple (from PO)' : 'N/A');
  }

  function effectiveCompleted(row: Row) {
    return row.module === 'finance/payments'
      ? completed(row) || completed(transferByPayment.get(row.id) || row)
      : completed(row);
  }

  const filtered = useMemo(() => rows.filter(row => {
    const vendor = linkedVendor(row);
    const bank = bankAccount(vendor);
    const status = effectiveCompleted(row) ? 'completed' : 'pending';
    const haystack = `${paymentReference(row)} ${vendorName(row)} ${vendor?.reference} ${bank.bank_name} ${bank.account_number} ${budgetCode(row)}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'all' || status === statusFilter);
  }), [rows, search, statusFilter, vendorMap, requestMap, estimationMap, transferByPayment]);

  async function markCompleted(row: Row) {
    const vendor = linkedVendor(row);
    const bank = bankAccount(vendor);
    if (!vendor || !text(bank.account_number)) {
      setMessage('A validated vendor bank account is required before completing this transfer.');
      return;
    }
    setBusy(row.id);
    setMessage('');
    try {
      const now = new Date().toISOString();
      if (row.module === 'finance/payments') {
        if (!representedPayments.has(row.id)) {
          const transferData = {
            beneficiary: vendorName(row),
            vendor_id: vendor.id,
            vendor_number: vendor.reference,
            bank: text(bank.bank_name),
            account_name: text(bank.account_name),
            account_number: text(bank.account_number),
            swift_code: text(bank.swift_code),
            amount: amount(row.data.amount),
            transfer_date: now,
            reference: paymentReference(row),
            budget_line: budgetCode(row),
            purpose: row.title,
            source_payment_id: row.id,
            bank_transfer_status: 'completed',
            completed_at: now,
          };
          const createResponse = await fetch('/api/maximus/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module: 'finance/bank-transfers', title: `Bank Transfer - ${vendorName(row)}`, data: transferData }),
          });
          const createPayload = await createResponse.json();
          if (!createResponse.ok) throw new Error(createPayload.message || 'Unable to create the bank transfer record.');
          const validateResponse = await fetch('/api/maximus/records', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: createPayload.item.id, status: 'executed', data: transferData }),
          });
          const validatePayload = await validateResponse.json();
          if (!validateResponse.ok) throw new Error(validatePayload.message || 'Unable to validate the transfer record.');
        }
        const paymentData = {
          ...row.data,
          bank_transfer_status: 'completed',
          bank_transfer_completed_at: now,
          bank_transfer_account: text(bank.account_number),
          bank_transfer_bank: text(bank.bank_name),
        };
        const paymentResponse = await fetch('/api/maximus/records', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: row.id, status: row.status, data: paymentData }),
        });
        const paymentPayload = await paymentResponse.json();
        if (!paymentResponse.ok) throw new Error(paymentPayload.message || 'Unable to update the payment.');
      } else {
        const data = { ...row.data, bank_transfer_status: 'completed', completed_at: now };
        const response = await fetch('/api/maximus/records', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: row.id, status: 'executed', data }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to complete the bank transfer.');
      }
      setMessage('Bank transfer marked as completed.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to complete the bank transfer.');
    } finally {
      setBusy('');
    }
  }

  function printOrder(row: Row) {
    setSelected(row);
    window.setTimeout(() => window.print(), 100);
  }

  return <div className="grid gap-5 text-slate-950">
    <style jsx global>{`
      @media print {
        body * { visibility: hidden !important; }
        .maximus-transfer-order, .maximus-transfer-order * { visibility: visible !important; }
        .maximus-transfer-order { position: absolute !important; inset: 0 !important; width: 100% !important; box-shadow: none !important; }
        .maximus-transfer-order .no-print { display: none !important; }
      }
    `}</style>
    <div className="flex items-center gap-4"><Link href="/maximus/finance/dashboard" title="Back to Finance" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link><h2 className="text-3xl font-black">Bank Transfers Management</h2></div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('completed.') ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-black">Pending &amp; Completed Bank Transfers</h3><p className="mt-1 text-sm text-slate-500">A list of all payments to be made via bank transfer.</p></div><div className="flex flex-wrap gap-3"><label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input min-w-64 pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search transfers..." /></label><select className="admin-input min-w-44" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All Statuses</option><option value="pending">Pending</option><option value="completed">Completed</option></select></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Vendor&apos;s Number</th><th className="p-3">Vendor&apos;s Name</th><th className="p-3">Bank Account</th><th className="p-3">Payment ID</th><th className="p-3">Budget Code(s)</th><th className="p-3">Amount (FCFA)</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
        {filtered.length ? filtered.map(row => {
          const vendor = linkedVendor(row);
          const bank = bankAccount(vendor);
          const done = effectiveCompleted(row);
          return <tr key={`${row.module}-${row.id}`} className="border-b"><td className="p-3 font-mono text-xs">{vendor?.reference || text(row.data.vendor_number) || 'N/A'}</td><td className="p-3 font-semibold">{vendorName(row)}</td><td className="p-3">{text(bank.account_number) ? <div className="text-xs"><p className="font-semibold">{text(bank.bank_name)}</p><p className="mt-1 font-mono text-slate-500">{text(bank.account_number)}</p></div> : <span className="text-xs font-bold text-red-700">Not Found</span>}</td><td className="p-3 font-mono text-xs">{paymentReference(row)}</td><td className="p-3 font-mono text-xs">{budgetCode(row)}</td><td className="p-3 font-semibold">{money(row.data.amount)}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{done ? 'Completed' : 'Pending'}</span></td><td className="p-3 text-right"><div className="flex justify-end gap-2">{done ? <button onClick={() => setSelected(row)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold"><Eye className="h-4 w-4" />View Order</button> : <><button onClick={() => printOrder(row)} disabled={!text(bank.account_number)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold disabled:opacity-40"><Printer className="h-4 w-4" />Print Order</button><button onClick={() => markCompleted(row)} disabled={busy === row.id} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"><FileCheck2 className="h-4 w-4" />{busy === row.id ? 'Saving...' : 'Mark as Completed'}</button></>}</div></td></tr>;
        }) : <tr><td colSpan={8} className="h-28 text-center text-slate-500">No bank transfer payments found.</td></tr>}
      </tbody></table></div>
    </section>

    {selected && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setSelected(null)}><TransferOrder row={selected} vendor={linkedVendor(selected)} budgetCode={budgetCode(selected)} onClose={() => setSelected(null)} /></div>}
  </div>;
}

function TransferOrder({ row, vendor, budgetCode, onClose }: { row: Row; vendor?: Row; budgetCode: string; onClose: () => void }) {
  const bank = bankAccount(vendor);
  return <section className="maximus-transfer-order my-6 w-full max-w-3xl rounded-lg bg-white p-8 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
    <div className="no-print flex justify-end"><button onClick={onClose}><X className="h-5 w-5" /></button></div>
    <header className="border-b-2 border-[#123d32] pb-5 text-center"><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#24945f]">NutVitaGlobalis</p><h3 className="mt-2 text-3xl font-black">Bank Transfer Order</h3><p className="mt-2 font-mono text-sm text-slate-500">{paymentReference(row)}</p></header>
    <div className="mt-8 grid gap-6 text-sm sm:grid-cols-2">
      <Detail label="Beneficiary" value={vendorName(row)} />
      <Detail label="Vendor Number" value={vendor?.reference || text(row.data.vendor_number) || 'N/A'} />
      <Detail label="Bank" value={text(bank.bank_name) || text(row.data.bank) || 'N/A'} />
      <Detail label="Account Name" value={text(bank.account_name) || text(row.data.account_name) || vendorName(row)} />
      <Detail label="Account Number / IBAN" value={text(bank.account_number) || text(row.data.account_number) || 'N/A'} mono />
      <Detail label="SWIFT / BIC" value={text(bank.swift_code) || text(row.data.swift_code) || 'N/A'} mono />
      <Detail label="Amount" value={money(row.data.amount)} />
      <Detail label="Budget Code(s)" value={budgetCode} mono />
      <Detail label="Transfer Date" value={transferDate(row).toLocaleDateString('fr-FR')} />
      <Detail label="Status" value={completed(row) ? 'Completed' : 'Pending'} />
    </div>
    <div className="mt-8 rounded-md border bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Purpose</p><p className="mt-2 font-semibold">{text(row.data.purpose) || row.title}</p></div>
    <div className="mt-16 grid grid-cols-2 gap-12 text-center text-sm"><div className="border-t pt-2">Prepared by</div><div className="border-t pt-2">Authorized signature</div></div>
    <div className="no-print mt-8 flex justify-end gap-3 border-t pt-5"><button onClick={onClose} className="rounded-md border px-5 py-3 font-bold">Close</button><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 font-bold text-white"><Printer className="h-4 w-4" />Print</button></div>
  </section>;
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-slate-500">{label}</p><p className={`mt-1 font-semibold ${mono ? 'font-mono' : ''}`}>{value}</p></div>;
}
