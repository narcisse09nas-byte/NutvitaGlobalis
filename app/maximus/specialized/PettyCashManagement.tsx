'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MinusCircle, PlusCircle, Search, Wallet, X } from 'lucide-react';

type Row = {
  id: string;
  module: string;
  title: string;
  reference?: string | null;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => Number(value || 0);
const money = (value: unknown) => `${amount(value).toLocaleString('fr-FR')} FCFA`;

function transactionType(row: Row) {
  const value = text(row.data.transaction_type).toLowerCase();
  return ['entrée', 'entree', 'in', 'bank', 'partner'].includes(value) ? 'in' : 'out';
}

function transactionDate(row: Row) {
  const date = new Date(text(row.data.date) || row.created_at);
  return Number.isNaN(date.getTime()) ? new Date(row.created_at) : date;
}

function staffName(row: Row) {
  return [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ')
    || text(row.data.full_name) || row.title;
}

function paymentMethod(row: Row) {
  return text(row.data.payment_method) || text(row.data.method);
}

function isCashPayment(row: Row) {
  return ['cash', 'espèces', 'especes'].includes(paymentMethod(row).trim().toLowerCase())
    && ['executed', 'paid', 'acknowledged'].includes(row.status);
}

export default function PettyCashManagement() {
  const [transactions, setTransactions] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<Row[]>([]);
  const [financeRequests, setFinanceRequests] = useState<Row[]>([]);
  const [vendors, setVendors] = useState<Row[]>([]);
  const [staff, setStaff] = useState<Row[]>([]);
  const [dialog, setDialog] = useState<'in' | 'out' | null>(null);
  const [sourceType, setSourceType] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return (payload.items || []).map((row: Row) => ({ ...row, module }));
  }

  async function load() {
    const [cashRows, paymentRows, supplyRows, requestRows, vendorRows, staffRows] = await Promise.all([
      fetchModule('finance/petty-cash'),
      fetchModule('finance/payments'),
      fetchModule('finance/cash-supply-requests'),
      fetchModule('finance/requests'),
      fetchModule('partnerships/vendors'),
      fetchModule('hr/staff'),
    ]);
    setTransactions(cashRows);
    setPayments(paymentRows);
    setSupplyRequests(supplyRows);
    setFinanceRequests(requestRows);
    setVendors(vendorRows);
    setStaff(staffRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load petty cash.'));
  }, []);

  const acceptedRows = useMemo(() => transactions.filter(row => ['validated', 'executed', 'paid', 'acknowledged'].includes(row.status)), [transactions]);
  const balance = useMemo(() => acceptedRows.reduce((total, row) => total + (transactionType(row) === 'in' ? amount(row.data.amount) : -amount(row.data.amount)), 0), [acceptedRows]);
  const usedPaymentIds = useMemo(() => new Set(transactions.map(row => text(row.data.payment_id)).filter(Boolean)), [transactions]);
  const usedSupplyIds = useMemo(() => new Set(transactions.map(row => text(row.data.cash_supply_request_id)).filter(Boolean)), [transactions]);
  const availablePayments = useMemo(() => payments.filter(row => isCashPayment(row) && !usedPaymentIds.has(row.id)), [payments, usedPaymentIds]);
  const availableSupplyRequests = useMemo(() => supplyRequests.filter(row => row.status === 'executed' && !usedSupplyIds.has(row.id)), [supplyRequests, usedSupplyIds]);
  const selectedPayment = availablePayments.find(row => row.id === selectedPaymentId);
  const financeRequestMap = useMemo(() => new Map(financeRequests.map(row => [row.id, row])), [financeRequests]);

  const filtered = useMemo(() => transactions
    .filter(row => `${row.reference} ${row.title} ${row.data.description} ${row.data.source_name} ${row.data.source_or_beneficiary}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => transactionDate(b).getTime() - transactionDate(a).getTime()), [transactions, search]);

  function closeDialog() {
    setDialog(null);
    setSourceType('');
    setSelectedPaymentId('');
  }

  async function createTransaction(title: string, data: Record<string, unknown>) {
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'finance/petty-cash', title, data }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Unable to record the transaction.');
    const validateResponse = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: payload.item.id,
        status: 'validated',
        data: {
          ...data,
          validation_history: [{ status: 'validated', timestamp: new Date().toISOString(), source: 'Petty Cash Register' }],
        },
      }),
    });
    const validatePayload = await validateResponse.json();
    if (!validateResponse.ok) throw new Error(validatePayload.message || 'Transaction created but validation failed.');
  }

  async function recordCashIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const type = text(values.get('source_type'));
    const supplyId = text(values.get('cash_supply_request_id'));
    const vendorId = text(values.get('partner_id'));
    const selectedSupply = availableSupplyRequests.find(row => row.id === supplyId);
    const selectedVendor = vendors.find(row => row.id === vendorId);
    const transactionAmount = type === 'bank' && selectedSupply
      ? amount(selectedSupply.data.amount)
      : amount(values.get('amount'));
    const otherSource = text(values.get('other_source')).trim();
    const sourceName = type === 'bank'
      ? `Bank Account via ${selectedSupply?.reference || selectedSupply?.title || supplyId}`
      : type === 'partner'
        ? selectedVendor?.title || text(selectedVendor?.data.vendor_name)
        : otherSource;

    if (!['bank', 'partner', 'other'].includes(type)) return setMessage('Select a valid cash source.');
    if (type === 'bank' && !selectedSupply) return setMessage('Select an executed cash supply request.');
    if (type === 'partner' && !selectedVendor) return setMessage('Select a validated partner.');
    if (type === 'other' && !otherSource) return setMessage('Specify the other source.');
    if (transactionAmount <= 0) return setMessage('The amount must be greater than zero.');

    setBusy(true);
    setMessage('');
    try {
      await createTransaction(`Cash In - ${sourceName}`, {
        transaction_type: type === 'bank' ? 'bank' : type === 'partner' ? 'partner' : 'entree',
        cash_flow_direction: 'in',
        source_type: type,
        source_name: sourceName,
        source_or_beneficiary: sourceName,
        cash_supply_request_id: type === 'bank' ? supplyId : null,
        partner_id: type === 'partner' ? vendorId : null,
        amount: transactionAmount,
        deposited_by: text(values.get('deposited_by')),
        description: text(values.get('description')).trim(),
        date: text(values.get('date')),
        recorded_at: new Date().toISOString(),
      });
      closeDialog();
      setMessage('Cash entry recorded successfully.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to record the cash entry.');
    } finally {
      setBusy(false);
    }
  }

  async function recordCashOut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPayment) return setMessage('Select an available cash payment.');
    const values = new FormData(event.currentTarget);
    const transactionAmount = amount(selectedPayment.data.amount);
    if (transactionAmount <= 0) return setMessage('The selected payment has no payable amount.');
    if (transactionAmount > balance) return setMessage(`Insufficient petty cash balance. Available: ${money(balance)}.`);
    const sourceRequest = financeRequestMap.get(text(selectedPayment.data.reference_id) || text(selectedPayment.data.finance_request_id));

    setBusy(true);
    setMessage('');
    try {
      await createTransaction(`Cash Out - ${selectedPayment.title}`, {
        transaction_type: 'Sortie',
        cash_flow_direction: 'out',
        payment_id: selectedPayment.id,
        payment_reference: text(selectedPayment.data.payment_reference) || selectedPayment.reference,
        source_or_beneficiary: text(selectedPayment.data.beneficiary) || selectedPayment.title,
        amount: transactionAmount,
        budget_line: text(selectedPayment.data.budget_line) || text(sourceRequest?.data.budget_line),
        budget_description: sourceRequest?.title || '',
        description: text(values.get('description')).trim(),
        date: text(values.get('date')),
        recorded_at: new Date().toISOString(),
      });
      closeDialog();
      setMessage('Cash expense recorded successfully.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to record the cash expense.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center gap-4"><Link href="/maximus/finance/dashboard" title="Back to Finance" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link><h2 className="text-3xl font-black">Petty Cash Management</h2></div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('successfully') ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}>{message}</div>}

    <section className="rounded-lg bg-[#24943f] p-6 text-white shadow-sm">
      <h3 className="flex items-center gap-2 text-xl font-black"><Wallet className="h-5 w-5" />Petty Cash Balance</h3>
      <p className="mt-5 text-4xl font-black">{money(balance)}</p>
    </section>

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h3 className="text-xl font-black">Cash Flow Register</h3><p className="mt-1 text-sm text-slate-500">Manage cash inflows from partners and other sources, and handle petty cash outflows.</p></div>
        <label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input min-w-64 pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search transactions..." /></label>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => { setMessage(''); setDialog('in'); }} className="inline-flex items-center gap-2 rounded-md bg-[#24943f] px-4 py-2.5 text-sm font-bold text-white"><PlusCircle className="h-4 w-4" />Record Cash In</button>
        <button onClick={() => { setMessage(''); setDialog('out'); }} className="inline-flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm font-bold"><MinusCircle className="h-4 w-4" />Record Cash Out</button>
      </div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Description / Source / Budget</th><th className="p-3">Ref. ID</th><th className="p-3">Deposited By</th><th className="p-3 text-right">Amount (FCFA)</th></tr></thead><tbody>
        {filtered.length ? filtered.map(row => {
          const incoming = transactionType(row) === 'in';
          return <tr key={row.id} className="border-b align-top"><td className="p-3">{transactionDate(row).toLocaleDateString('fr-FR')}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${incoming ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'}`}>{incoming ? 'In' : 'Out'}</span></td><td className="p-3"><p>{text(row.data.description) || row.title}</p><p className="mt-1 text-xs text-slate-500">{text(row.data.source_name) || text(row.data.source_or_beneficiary)}</p>{text(row.data.budget_line) && <p className="mt-2 border-l-2 border-emerald-500 pl-2 font-mono text-xs text-emerald-800">{text(row.data.budget_line)} {text(row.data.budget_description) && `- ${text(row.data.budget_description)}`}</p>}</td><td className="p-3 font-mono text-xs">{text(row.data.payment_reference) || text(row.data.cash_supply_request_id) || row.reference || 'N/A'}</td><td className="p-3">{text(row.data.deposited_by) || 'N/A'}</td><td className={`p-3 text-right font-bold ${incoming ? 'text-emerald-700' : 'text-red-700'}`}>{incoming ? '+' : '-'}{amount(row.data.amount).toLocaleString('fr-FR')}</td></tr>;
        }) : <tr><td colSpan={6} className="h-28 text-center text-slate-500">No transactions yet.</td></tr>}
      </tbody></table></div>
    </section>

    {dialog && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={closeDialog}><section className="my-6 w-full max-w-2xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
      <header className="flex items-start justify-between border-b p-6"><div><p className="text-xs font-bold uppercase tracking-wide text-[#ef7f3b]">Petty cash transaction</p><h3 className="mt-1 text-2xl font-black">{dialog === 'in' ? 'Record Cash In' : 'Record Cash Out'}</h3></div><button onClick={closeDialog}><X className="h-5 w-5" /></button></header>
      {dialog === 'in' ? <form onSubmit={recordCashIn} className="grid gap-5 p-6">
        <label className="grid gap-2 text-sm font-bold">Source Type<select className="admin-input" name="source_type" value={sourceType} onChange={event => setSourceType(event.target.value)} required><option value="">Select a source</option><option value="bank">Bank Account</option><option value="partner">Partner</option><option value="other">Other</option></select></label>
        {sourceType === 'bank' && <label className="grid gap-2 text-sm font-bold">Cash Supply Request ID<select className="admin-input" name="cash_supply_request_id" required><option value="">Select an executed request</option>{availableSupplyRequests.map(row => <option key={row.id} value={row.id}>{row.reference || row.title} ({money(row.data.amount)})</option>)}</select></label>}
        {sourceType === 'partner' && <label className="grid gap-2 text-sm font-bold">Partner<select className="admin-input" name="partner_id" required><option value="">Select a partner</option>{vendors.filter(row => row.status === 'validated').map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>}
        {sourceType === 'other' && <label className="grid gap-2 text-sm font-bold">Specify Other Source<input className="admin-input" name="other_source" placeholder="e.g., Cash sales" required /></label>}
        <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Amount (FCFA)<input className="admin-input" name="amount" type="number" min="1" disabled={sourceType === 'bank'} required={sourceType !== 'bank'} /></label><label className="grid gap-2 text-sm font-bold">Date<input className="admin-input" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label></div>
        <label className="grid gap-2 text-sm font-bold">Deposited By<select className="admin-input" name="deposited_by" required><option value="">Select a staff member</option>{staff.filter(row => row.status === 'validated').map(row => <option key={row.id} value={staffName(row)}>{staffName(row)}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">Description<textarea className="admin-input min-h-24" name="description" minLength={5} required /></label>
        <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={closeDialog} className="rounded-md border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={busy} className="rounded-md bg-[#24943f] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Record Entry'}</button></div>
      </form> : <form onSubmit={recordCashOut} className="grid gap-5 p-6">
        <label className="grid gap-2 text-sm font-bold">Select Cash Payment ID<select className="admin-input" name="payment_id" value={selectedPaymentId} onChange={event => setSelectedPaymentId(event.target.value)} required><option value="">Select a payment</option>{availablePayments.map(row => <option key={row.id} value={row.id}>{text(row.data.payment_reference) || row.reference || row.id.slice(0, 8)} - {text(row.data.beneficiary) || row.title} ({money(row.data.amount)})</option>)}</select></label>
        {selectedPayment && <div className="grid gap-3 rounded-md border bg-slate-50 p-4 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Recipient:</span><br /><strong>{text(selectedPayment.data.beneficiary) || selectedPayment.title}</strong></p><p><span className="text-slate-500">Amount:</span><br /><strong>{money(selectedPayment.data.amount)}</strong></p><p><span className="text-slate-500">Budget line:</span><br /><strong>{text(selectedPayment.data.budget_line) || text(financeRequestMap.get(text(selectedPayment.data.reference_id))?.data.budget_line) || 'N/A'}</strong></p><p><span className="text-slate-500">Available balance:</span><br /><strong>{money(balance)}</strong></p></div>}
        <label className="grid gap-2 text-sm font-bold">Date<input className="admin-input" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></label>
        <label className="grid gap-2 text-sm font-bold">Description<textarea className="admin-input min-h-24" name="description" minLength={5} defaultValue={selectedPayment ? `Cash payment to ${text(selectedPayment.data.beneficiary) || selectedPayment.title}` : ''} required /></label>
        <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={closeDialog} className="rounded-md border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={busy || !selectedPayment} className="rounded-md bg-[#24943f] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Record Expense'}</button></div>
      </form>}
    </section></div>}
  </div>;
}
