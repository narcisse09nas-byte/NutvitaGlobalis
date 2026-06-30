'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowDownRight, ArrowLeft, ArrowUpRight, Banknote,
  CalendarRange, CircleDollarSign, Clock3, Landmark, Scale, WalletCards,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

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

type TrialRow = {
  account_code: string;
  currency: string;
  total_debit: number;
  total_credit: number;
  balance: number;
};

const modules = [
  'finance/requests', 'finance/payments', 'finance/payment-register',
  'finance/operational-advances', 'finance/petty-cash',
  'finance/bank-transfers', 'finance/cash-deposits', 'finance/cost-estimations',
] as const;

const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => Number(value || 0);
const money = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
const accepted = new Set(['validated', 'executed', 'paid']);

function recordDate(row: Row) {
  const candidates = [
    row.data.payment_date, row.data.deposit_date, row.data.transfer_date,
    row.data.advance_date, row.data.date, row.updated_at, row.created_at,
  ];
  const raw = candidates.map(text).find(Boolean) || row.created_at;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date(row.created_at) : date;
}

function recordAmount(row: Row) {
  return amount(row.data.amount || row.data.total_amount || row.data.total_spent);
}

function periodStart(period: string) {
  const now = new Date();
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  return null;
}

function MetricCard({ label, value, note, icon: Icon, href, tone = 'green' }: {
  label: string;
  value: string;
  note: string;
  icon: typeof Banknote;
  href: string;
  tone?: 'green' | 'orange' | 'red' | 'blue';
}) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-sky-50 text-sky-700',
  };
  return <Link href={href} className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow-md">
    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ${colors[tone]}`}><Icon className="h-5 w-5" /></span></div>
    <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p>
  </Link>;
}

export default function FinancialDashboard() {
  const [records, setRecords] = useState<Row[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialRow[]>([]);
  const [period, setPeriod] = useState('year');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    const [moduleResults, workflowResponse] = await Promise.all([
      Promise.all(modules.map(async module => {
        const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
        return (payload.items || []) as Row[];
      })),
      fetch('/api/maximus/workflow'),
    ]);
    const workflowPayload = await workflowResponse.json();
    if (!workflowResponse.ok) throw new Error(workflowPayload.message || 'Unable to load accounting balances.');
    setRecords(moduleResults.flat());
    setTrialBalance(workflowPayload.trialBalance || []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(error => {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : 'Unable to load the financial dashboard.');
    });
  }, []);

  const filtered = useMemo(() => {
    const start = periodStart(period);
    return start ? records.filter(row => recordDate(row) >= start) : records;
  }, [records, period]);

  const metrics = useMemo(() => {
    const deposits = filtered.filter(row => row.module === 'finance/cash-deposits' && accepted.has(row.status));
    const payments = filtered.filter(row => row.module === 'finance/payments' && ['executed', 'paid'].includes(row.status));
    const petty = filtered.filter(row => row.module === 'finance/petty-cash' && accepted.has(row.status));
    const pettyIncome = petty.filter(row => ['entrée', 'entree', 'bank', 'partner'].includes(text(row.data.transaction_type).toLowerCase())).reduce((sum, row) => sum + recordAmount(row), 0);
    const pettyExpense = petty.filter(row => ['sortie', 'other'].includes(text(row.data.transaction_type).toLowerCase())).reduce((sum, row) => sum + recordAmount(row), 0);
    const income = deposits.reduce((sum, row) => sum + recordAmount(row), 0) + pettyIncome;
    const expenses = payments.reduce((sum, row) => sum + recordAmount(row), 0) + pettyExpense;
    const requests = filtered.filter(row => row.module === 'finance/requests');
    const commitments = requests.filter(row => row.status === 'validated').reduce((sum, row) => sum + recordAmount(row), 0);
    const pendingRequests = requests.filter(row => ['draft', 'submitted', 'endorsed'].includes(row.status));
    const advances = filtered.filter(row => row.module === 'finance/operational-advances' && row.status !== 'archived');
    const outstandingAdvances = advances.reduce((sum, row) => sum + Math.max(recordAmount(row) - amount(row.data.expensed_amount), 0), 0);
    const transfers = filtered.filter(row => row.module === 'finance/bank-transfers' && accepted.has(row.status)).reduce((sum, row) => sum + recordAmount(row), 0);
    return {
      income,
      expenses,
      netCashFlow: income - expenses,
      commitments,
      pendingRequests: pendingRequests.length,
      pendingAmount: pendingRequests.reduce((sum, row) => sum + recordAmount(row), 0),
      outstandingAdvances,
      pettyCash: pettyIncome - pettyExpense,
      transfers,
    };
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
      const rows = records.filter(row => {
        const value = recordDate(row);
        return value >= date && value < next;
      });
      const income = rows.filter(row => row.module === 'finance/cash-deposits' && accepted.has(row.status)).reduce((sum, row) => sum + recordAmount(row), 0);
      const expenses = rows.filter(row => row.module === 'finance/payments' && ['executed', 'paid'].includes(row.status)).reduce((sum, row) => sum + recordAmount(row), 0);
      return { month: date.toLocaleDateString('fr-FR', { month: 'short' }), Recettes: income, Paiements: expenses };
    });
  }, [records]);

  const statusData = useMemo(() => {
    const requestRows = filtered.filter(row => row.module === 'finance/requests');
    return [
      { name: 'Brouillon', value: requestRows.filter(row => row.status === 'draft').length, color: '#94a3b8' },
      { name: 'En circuit', value: requestRows.filter(row => ['submitted', 'endorsed'].includes(row.status)).length, color: '#f59e0b' },
      { name: 'Validées', value: requestRows.filter(row => row.status === 'validated').length, color: '#24945f' },
      { name: 'Rejetées', value: requestRows.filter(row => row.status === 'rejected').length, color: '#dc2626' },
    ].filter(row => row.value > 0);
  }, [filtered]);

  const recent = useMemo(() => [...filtered]
    .filter(row => row.module !== 'finance/payment-register')
    .sort((a, b) => recordDate(b).getTime() - recordDate(a).getTime())
    .slice(0, 8), [filtered]);

  const accountTotals = useMemo(() => trialBalance.reduce((totals, row) => ({
    debit: totals.debit + amount(row.total_debit),
    credit: totals.credit + amount(row.total_credit),
  }), { debit: 0, credit: 0 }), [trialBalance]);

  return <div className="grid gap-6 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><Link href="/maximus" title="Back to Maximus" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link><div><h2 className="text-3xl font-black">Financial Dashboard</h2><p className="mt-1 text-sm text-slate-500">An overview of key financial metrics and performance indicators.</p></div></div>
      <label className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-semibold"><CalendarRange className="h-4 w-4 text-slate-500" /><select value={period} onChange={event => setPeriod(event.target.value)} className="bg-transparent outline-none"><option value="month">Current month</option><option value="quarter">Current quarter</option><option value="year">Current year</option><option value="all">All periods</option></select></label>
    </div>

    {message && <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"><AlertCircle className="h-5 shrink-0" />{message}</div>}
    {loading ? <div className="grid h-72 place-items-center text-sm text-slate-500">Loading financial indicators...</div> : <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Recorded Income" value={money(metrics.income)} note="Validated cash deposits and petty-cash inflows." icon={ArrowUpRight} href="/maximus/finance/cash-deposits" />
        <MetricCard label="Executed Payments" value={money(metrics.expenses)} note="Paid or executed payments and petty-cash outflows." icon={ArrowDownRight} href="/maximus/finance/payments" tone="red" />
        <MetricCard label="Net Cash Flow" value={money(metrics.netCashFlow)} note="Recorded income less executed payments for the selected period." icon={CircleDollarSign} href="/maximus/finance/payment-register" tone={metrics.netCashFlow < 0 ? 'red' : 'blue'} />
        <MetricCard label="Validated Commitments" value={money(metrics.commitments)} note="Validated financial requests awaiting downstream execution." icon={WalletCards} href="/maximus/finance/requests" tone="orange" />
        <MetricCard label="Pending Requests" value={`${metrics.pendingRequests}`} note={`${money(metrics.pendingAmount)} currently in draft or validation workflow.`} icon={Clock3} href="/maximus/finance/requests" tone="orange" />
        <MetricCard label="Outstanding Advances" value={money(metrics.outstandingAdvances)} note="Operational advances not yet fully cleared." icon={Banknote} href="/maximus/finance/operational-advances" tone="orange" />
        <MetricCard label="Petty Cash Balance" value={money(metrics.pettyCash)} note="Validated petty-cash inflows less outflows." icon={Landmark} href="/maximus/finance/petty-cash" tone={metrics.pettyCash < 0 ? 'red' : 'green'} />
        <MetricCard label="Bank Transfers" value={money(metrics.transfers)} note="Validated, executed, or paid transfer orders." icon={Scale} href="/maximus/finance/bank-transfers" tone="blue" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Income and Payment Trend</h3><p className="mt-1 text-sm text-slate-500">Last six calendar months, based on effective record dates.</p><div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} /><Tooltip formatter={value => money(Number(value))} /><Legend /><Bar dataKey="Recettes" fill="#24945f" radius={[4,4,0,0]} /><Bar dataKey="Paiements" fill="#ef7f3b" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></section>
        <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Request Workflow</h3><p className="mt-1 text-sm text-slate-500">Distribution of financial requests for the selected period.</p>{statusData.length ? <div className="mt-6 h-80"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={100} paddingAngle={3}>{statusData.map(row => <Cell key={row.name} fill={row.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div> : <div className="grid h-80 place-items-center text-sm text-slate-500">No financial requests for this period.</div>}</section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Recent Financial Activity</h3><p className="mt-1 text-sm text-slate-500">Latest requests, payments, deposits, transfers, and advances.</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Date</th><th className="p-3">Reference</th><th className="p-3">Description</th><th className="p-3">Module</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th></tr></thead><tbody>{recent.length ? recent.map(row => <tr key={row.id} className="border-b"><td className="p-3">{recordDate(row).toLocaleDateString('fr-FR')}</td><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td><td className="p-3 font-semibold">{row.title}</td><td className="p-3">{row.module.split('/').at(-1)?.replaceAll('-', ' ')}</td><td className="p-3 text-right">{money(recordAmount(row))}</td><td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize">{row.status}</span></td></tr>) : <tr><td colSpan={6} className="h-28 text-center text-slate-500">No financial activity recorded.</td></tr>}</tbody></table></div></section>
        <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">Accounting Control</h3><p className="mt-1 text-sm text-slate-500">Centralized entries from the Maximus accounting ledger.</p><div className="mt-5 grid gap-3"><div className="rounded-md border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Total Debits</p><p className="mt-1 text-xl font-black">{money(accountTotals.debit)}</p></div><div className="rounded-md border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">Total Credits</p><p className="mt-1 text-xl font-black">{money(accountTotals.credit)}</p></div><div className={`rounded-md border p-4 ${Math.abs(accountTotals.debit - accountTotals.credit) < 0.01 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}><p className="text-xs font-bold text-slate-500">Ledger Difference</p><p className="mt-1 text-xl font-black">{money(accountTotals.debit - accountTotals.credit)}</p><p className="mt-2 text-xs text-slate-500">{trialBalance.length ? Math.abs(accountTotals.debit - accountTotals.credit) < 0.01 ? 'Balanced ledger.' : 'Difference requires accounting review.' : 'No accounting entries posted yet.'}</p></div></div></section>
      </div>
    </>}
  </div>;
}
