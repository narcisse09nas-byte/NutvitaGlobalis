'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, Search, X } from 'lucide-react';

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

function reportReference(row: Row) {
  return text(row.data.report_reference) || text(row.data.reference) || row.reference || row.id.slice(0, 8).toUpperCase();
}

function salePoint(row: Row) {
  return text(row.data.sale_point) || text(row.data.salePointName) || text(row.data.location) || 'N/A';
}

function reportAmount(row: Row) {
  return amount(row.data.amount || row.data.total_revenue || row.data.totalRevenue || row.data.gross_sales);
}

function reportDate(row: Row) {
  const raw = text(row.data.deposit_date) || text(row.data.report_date) || text(row.data.date) || row.created_at;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date(row.created_at) : date;
}

function deposited(row: Row) {
  return text(row.data.deposit_status) === 'deposited'
    || Boolean(row.data.deposited_at)
    || ['validated', 'executed', 'paid', 'acknowledged'].includes(row.status) && row.module === 'finance/cash-deposits';
}

export default function CashDepositsManagement() {
  const [reports, setReports] = useState<Row[]>([]);
  const [deposits, setDeposits] = useState<Row[]>([]);
  const [pettyCash, setPettyCash] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return (payload.items || []).map((row: Row) => ({ ...row, module }));
  }

  async function load() {
    const [reportRows, depositRows, pettyRows] = await Promise.all([
      fetchModule('sales/reports'),
      fetchModule('finance/cash-deposits'),
      fetchModule('finance/petty-cash'),
    ]);
    setReports(reportRows);
    setDeposits(depositRows);
    setPettyCash(pettyRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load cash deposits.'));
  }, []);

  const depositByReport = useMemo(() => {
    const map = new Map<string, Row>();
    deposits.forEach(deposit => {
      [
        text(deposit.data.source_record_id),
        text(deposit.data.related_sales_report_id),
        text(deposit.data.report_reference),
      ].filter(Boolean).forEach(key => map.set(key, deposit));
    });
    return map;
  }, [deposits]);

  const pettyReportIds = useMemo(() => new Set(pettyCash.flatMap(row => [
    text(row.data.related_sales_report_id),
    text(row.data.cash_deposit_id),
  ]).filter(Boolean)), [pettyCash]);

  const acknowledgedReports = useMemo(() => reports.filter(row =>
    ['acknowledged', 'validated', 'served'].includes(row.status)
    || text(row.data.report_status) === 'acknowledged'
    || text(row.data.deposit_status) === 'pending'
  ), [reports]);

  const rows = useMemo(() => {
    const reportRows: Row[] = acknowledgedReports.map(report => {
      const linked = depositByReport.get(report.id) || depositByReport.get(reportReference(report));
      return linked && deposited(linked)
        ? { ...linked, data: { ...linked.data, source_report_title: report.title, source_report_id: report.id } } as Row
        : { ...report, data: { ...report.data, linked_deposit_id: linked?.id || null } } as Row;
    });
    const representedDeposits = new Set(reportRows.map(row => text(row.data.linked_deposit_id) || (row.module === 'finance/cash-deposits' ? row.id : '')).filter(Boolean));
    return [...reportRows, ...deposits.filter(row => !representedDeposits.has(row.id))]
      .sort((a, b) => reportDate(b).getTime() - reportDate(a).getTime());
  }, [acknowledgedReports, deposits, depositByReport]);

  const filtered = useMemo(() => rows.filter(row => {
    const done = deposited(row);
    const status = done ? 'deposited' : 'pending';
    const haystack = `${reportReference(row)} ${salePoint(row)} ${row.title}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (statusFilter === 'all' || status === statusFilter);
  }), [rows, search, statusFilter]);

  async function createValidatedRecord(module: string, title: string, data: Record<string, unknown>, status = 'validated') {
    const createResponse = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module, title, data }),
    });
    const createPayload = await createResponse.json();
    if (!createResponse.ok) throw new Error(createPayload.message || `Unable to create ${module}.`);
    const validateResponse = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: createPayload.item.id, status, data }),
    });
    const validatePayload = await validateResponse.json();
    if (!validateResponse.ok) throw new Error(validatePayload.message || `Unable to validate ${module}.`);
    return validatePayload.item as Row;
  }

  async function confirmDeposit(row: Row) {
    const total = reportAmount(row);
    if (total <= 0) return setMessage('The sales report has no depositable revenue.');
    setBusy(row.id);
    setMessage('');
    try {
      const now = new Date().toISOString();
      const sourceReportId = row.module === 'sales/reports' ? row.id : text(row.data.source_record_id) || text(row.data.related_sales_report_id);
      let deposit = row.module === 'finance/cash-deposits'
        ? row
        : depositByReport.get(row.id) || depositByReport.get(reportReference(row));

      const depositData = {
        ...(deposit?.data || {}),
        sale_point: salePoint(row),
        report_reference: reportReference(row),
        amount: total,
        deposit_date: now.slice(0, 10),
        deposited_by: text(row.data.deposited_by) || text(row.data.requester) || 'Maximus Finance',
        source_record_id: sourceReportId || row.id,
        related_sales_report_id: sourceReportId || row.id,
        deposit_status: 'deposited',
        deposited_at: now,
        confirmation_history: [
          ...(Array.isArray(deposit?.data.confirmation_history) ? deposit.data.confirmation_history as unknown[] : []),
          { status: 'deposited', timestamp: now, source: 'Cash Deposits Register' },
        ],
      };

      if (deposit) {
        const response = await fetch('/api/maximus/records', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: deposit.id, status: 'validated', data: depositData }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to confirm the cash deposit.');
        deposit = { ...payload.item, module: 'finance/cash-deposits' };
      } else {
        deposit = await createValidatedRecord('finance/cash-deposits', `Cash Deposit - ${salePoint(row)}`, depositData);
      }
      if (!deposit) throw new Error('The cash deposit could not be created.');

      const pettyKey = sourceReportId || row.id;
      if (!pettyReportIds.has(pettyKey) && !pettyReportIds.has(deposit.id)) {
        await createValidatedRecord('finance/petty-cash', `Cash In - ${salePoint(row)}`, {
          transaction_type: 'partner',
          cash_flow_direction: 'in',
          source_type: 'sales_report',
          source_name: salePoint(row),
          source_or_beneficiary: salePoint(row),
          related_sales_report_id: pettyKey,
          cash_deposit_id: deposit.id,
          amount: total,
          deposited_by: depositData.deposited_by,
          description: `Deposit from sales report ${reportReference(row)} for ${salePoint(row)}`,
          date: now.slice(0, 10),
          recorded_at: now,
        });
      }

      if (sourceReportId) {
        const source = reports.find(report => report.id === sourceReportId);
        if (source) {
          const response = await fetch('/api/maximus/records', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: source.id,
              status: source.status,
              data: {
                ...source.data,
                deposit_status: 'deposited',
                cash_deposit_id: deposit.id,
                deposited_at: now,
              },
            }),
          });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.message || 'Deposit recorded but the sales report could not be updated.');
        }
      }

      setMessage('Cash deposit confirmed and recorded in petty cash.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to confirm the cash deposit.');
    } finally {
      setBusy('');
    }
  }

  return <div className="grid gap-5 text-slate-950">
    <div><h2 className="text-3xl font-black">Cash Deposits</h2><p className="mt-1 text-sm text-slate-500">Confirm acknowledged sales revenue and transfer it into the petty-cash register.</p></div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('confirmed') ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'}`}>{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-black">Pending Cash Deposits</h3><p className="mt-1 text-sm text-slate-500">A list of acknowledged sales reports awaiting cash deposit confirmation.</p></div><div className="flex flex-wrap gap-3"><label className="relative"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input min-w-64 pl-10" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search deposits..." /></label><select className="admin-input min-w-44" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="pending">Pending</option><option value="deposited">Deposited</option><option value="all">All Statuses</option></select></div></div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Report Date</th><th className="p-3">Sale Point</th><th className="p-3">Report Reference</th><th className="p-3">Total Revenue (FCFA)</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
        {filtered.length ? filtered.map(row => {
          const done = deposited(row);
          return <tr key={`${row.module}-${row.id}`} className="border-b"><td className="p-3">{reportDate(row).toLocaleDateString('fr-FR')}</td><td className="p-3 font-semibold">{salePoint(row)}</td><td className="p-3 font-mono text-xs">{reportReference(row)}</td><td className="p-3 font-semibold">{money(reportAmount(row))}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${done ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{done ? 'Deposited' : 'Pending'}</span></td><td className="p-3 text-right">{done ? <button onClick={() => setSelected(row)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold"><Eye className="h-4 w-4" />View Details</button> : <button disabled={busy === row.id} onClick={() => confirmDeposit(row)} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{busy === row.id ? 'Confirming...' : 'Confirm Deposit'}</button>}</td></tr>;
        }) : <tr><td colSpan={6} className="h-28 text-center text-slate-500">No sales reports are awaiting deposit confirmation.</td></tr>}
      </tbody></table></div>
    </section>

    {selected && <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setSelected(null)}><section className="w-full max-w-xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}><header className="flex items-start justify-between border-b p-6"><div><p className="font-mono text-xs text-slate-500">{reportReference(selected)}</p><h3 className="mt-1 text-2xl font-black">Cash Deposit Details</h3></div><button onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></header><div className="grid gap-4 p-6 text-sm sm:grid-cols-2">{[
      ['Sale Point', salePoint(selected)],
      ['Report Date', reportDate(selected).toLocaleDateString('fr-FR')],
      ['Amount Deposited', money(reportAmount(selected))],
      ['Deposited By', text(selected.data.deposited_by) || 'Maximus Finance'],
      ['Bank / Cash Reference', text(selected.data.bank_reference) || selected.reference || 'N/A'],
      ['Status', 'Deposited'],
    ].map(([label, value]) => <div key={label}><p className="text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>)}</div><div className="flex justify-end border-t p-5"><button onClick={() => setSelected(null)} className="rounded-md border px-5 py-3 text-sm font-bold">Close</button></div></section></div>}
  </div>;
}
