'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Bot, CalendarDays, Download, Loader2, Printer } from 'lucide-react';

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

type ReportRow = {
  id: string;
  type: 'revenue' | 'expense';
  date: Date;
  reference: string;
  budgetCode: string;
  category: string;
  description: string;
  comment: string;
  amount: number;
};

type Narrative = {
  executive_summary: string;
  findings: string[];
  risks: string[];
  recommendations: string[];
  conclusion: string;
};

type Report = {
  rows: ReportRow[];
  revenue: number;
  expense: number;
  net: number;
  commitments: number;
  pendingRequests: number;
  outstandingAdvances: number;
  budgetBreakdown: Array<{ code: string; amount: number }>;
  monthlyBreakdown: Array<{ month: string; revenue: number; expense: number }>;
  narrative: Narrative;
  provider: string;
};

const modules = [
  'finance/requests', 'finance/payments', 'finance/petty-cash',
  'finance/cash-deposits', 'finance/operational-advances', 'finance/budget-lines',
] as const;

const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => Number(value || 0);
const money = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
const accepted = new Set(['validated', 'executed', 'paid']);

function dateOf(row: Row) {
  const raw = [row.data.payment_date, row.data.deposit_date, row.data.date, row.data.advance_date, row.updated_at, row.created_at].map(text).find(Boolean) || row.created_at;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date(row.created_at) : date;
}

function recordAmount(row: Row) {
  return amount(row.data.amount || row.data.total_amount);
}

function defaultNarrative(revenue: number, expense: number): Narrative {
  return {
    executive_summary: `Recorded revenue totals ${money(revenue)} and executed expenditure totals ${money(expense)} for the selected period.`,
    findings: ['Figures are derived from validated or executed Maximus records.'],
    risks: [],
    recommendations: ['Verify supporting documents and reconcile the report before formal approval.'],
    conclusion: 'The report is ready for Finance and Management review.',
  };
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function FinancialReports() {
  const now = new Date();
  const [from, setFrom] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return (payload.items || []) as Row[];
  }

  async function generate() {
    if (!from || !to || from > to) return setMessage('Please select a valid date range.');
    setLoading(true);
    setMessage('');
    setReport(null);
    try {
      const groups = await Promise.all(modules.map(fetchModule));
      const all = groups.flat();
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T23:59:59.999`);
      const inRange = all.filter(row => {
        const date = dateOf(row);
        return date >= start && date <= end;
      });
      const budgetLines = new Map(all.filter(row => row.module === 'finance/budget-lines').map(row => [text(row.data.code), row]));
      const rows: ReportRow[] = [];

      inRange.filter(row => row.module === 'finance/cash-deposits' && accepted.has(row.status)).forEach(row => rows.push({
        id: row.id,
        type: 'revenue',
        date: dateOf(row),
        reference: row.reference || row.id.slice(0, 8),
        budgetCode: 'REVENUE',
        category: 'Cash Deposits',
        description: row.title,
        comment: text(row.data.sale_point) || text(row.data.report_reference),
        amount: recordAmount(row),
      }));

      inRange.filter(row => row.module === 'finance/payments' && ['executed', 'paid'].includes(row.status)).forEach(row => {
        const code = text(row.data.budget_line) || 'UNALLOCATED';
        const line = budgetLines.get(code);
        rows.push({
          id: row.id,
          type: 'expense',
          date: dateOf(row),
          reference: text(row.data.payment_reference) || row.reference || row.id.slice(0, 8),
          budgetCode: code,
          category: text(line?.data.category) || 'Payment',
          description: row.title,
          comment: text(row.data.beneficiary) || text(row.data.proof_reference),
          amount: recordAmount(row),
        });
      });

      inRange.filter(row => row.module === 'finance/petty-cash' && accepted.has(row.status)).forEach(row => {
        const transaction = text(row.data.transaction_type).toLowerCase();
        const revenue = ['entrée', 'entree', 'bank', 'partner'].includes(transaction);
        rows.push({
          id: row.id,
          type: revenue ? 'revenue' : 'expense',
          date: dateOf(row),
          reference: text(row.data.reference) || row.reference || row.id.slice(0, 8),
          budgetCode: text(row.data.budget_line) || (revenue ? 'PETTY-IN' : 'PETTY-OUT'),
          category: 'Petty Cash',
          description: text(row.data.description) || row.title,
          comment: text(row.data.source_or_beneficiary),
          amount: recordAmount(row),
        });
      });

      rows.sort((a, b) => a.date.getTime() - b.date.getTime());
      const revenue = rows.filter(row => row.type === 'revenue').reduce((sum, row) => sum + row.amount, 0);
      const expense = rows.filter(row => row.type === 'expense').reduce((sum, row) => sum + row.amount, 0);
      const requests = inRange.filter(row => row.module === 'finance/requests');
      const commitments = requests.filter(row => row.status === 'validated').reduce((sum, row) => sum + recordAmount(row), 0);
      const pendingRequests = requests.filter(row => ['draft', 'submitted', 'endorsed'].includes(row.status)).length;
      const outstandingAdvances = inRange.filter(row => row.module === 'finance/operational-advances' && row.status !== 'archived').reduce((sum, row) => sum + Math.max(recordAmount(row) - amount(row.data.expensed_amount), 0), 0);
      const budgetMap = new Map<string, number>();
      rows.filter(row => row.type === 'expense').forEach(row => budgetMap.set(row.budgetCode, (budgetMap.get(row.budgetCode) || 0) + row.amount));
      const budgetBreakdown = [...budgetMap].map(([code, value]) => ({ code, amount: value })).sort((a, b) => b.amount - a.amount);
      const monthMap = new Map<string, { month: string; revenue: number; expense: number }>();
      rows.forEach(row => {
        const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`;
        const current = monthMap.get(key) || { month: key, revenue: 0, expense: 0 };
        current[row.type] += row.amount;
        monthMap.set(key, current);
      });
      const monthlyBreakdown = [...monthMap.values()];
      const summary = {
        period: { from, to },
        totals: { revenue, expense, net: revenue - expense, pending_commitments: commitments, pending_requests: pendingRequests, outstanding_advances: outstandingAdvances },
        monthly_breakdown: monthlyBreakdown,
        budget_breakdown: budgetBreakdown.slice(0, 12),
        status_summary: { pending_requests: pendingRequests },
        data_limitations: rows.length ? [] : ['No validated revenue or executed expenditure was found for this period.'],
      };
      const narrativeResponse = await fetch('/api/maximus/financial-report-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summary),
      });
      const narrativePayload = await narrativeResponse.json();
      const narrative = narrativeResponse.ok ? narrativePayload.narrative as Narrative : defaultNarrative(revenue, expense);
      setReport({
        rows, revenue, expense, net: revenue - expense, commitments, pendingRequests,
        outstandingAdvances, budgetBreakdown, monthlyBreakdown, narrative,
        provider: narrativeResponse.ok ? narrativePayload.provider : 'local',
      });
      setMessage(`Financial report generated from ${rows.length} validated transaction line(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate the financial report.');
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    if (!report) return;
    const lines = [
      ['Date','Reference','Budget Code','Category','Description','Comment','Revenue FCFA','Expense FCFA'].map(escapeCsv).join(','),
      ...report.rows.map(row => [
        row.date.toLocaleDateString('fr-FR'), row.reference, row.budgetCode, row.category,
        row.description, row.comment, row.type === 'revenue' ? row.amount : '', row.type === 'expense' ? row.amount : '',
      ].map(escapeCsv).join(',')),
    ];
    const url = URL.createObjectURL(new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `financial-report-${from}-${to}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const topBudget = useMemo(() => report?.budgetBreakdown.slice(0, 8) || [], [report]);

  return <div className="grid gap-6 text-slate-950">
    <style>{`@media print { body * { visibility: hidden !important; } #financial-report-print, #financial-report-print * { visibility: visible !important; } #financial-report-print { position: absolute; inset: 0; width: 100%; } .print-hidden { display: none !important; } }`}</style>
    <div className="flex items-center gap-4"><Link href="/maximus/finance/dashboard" title="Back to Finance" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link><h2 className="text-3xl font-black">Financial Reports</h2></div>
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Generate Financial Report</h3><p className="mt-1 text-sm text-slate-500">Select a date range to generate a report of expenses and revenues.</p>
      <div className="mt-6 flex flex-wrap items-end gap-4"><label className="grid gap-2 text-sm font-semibold">From<div className="relative"><CalendarDays className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="date" className="admin-input pl-10" value={from} onChange={event => setFrom(event.target.value)} /></div></label><label className="grid gap-2 text-sm font-semibold">To<div className="relative"><CalendarDays className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input type="date" className="admin-input pl-10" min={from} value={to} onChange={event => setTo(event.target.value)} /></div></label><button onClick={generate} disabled={loading} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}Generate Report</button></div>
    </section>

    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('Unable') || message.includes('valid date') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message}</div>}

    {report && <article id="financial-report-print" className="grid gap-5 rounded-lg border bg-white p-6 shadow-sm print:border-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b pb-5"><div><p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">NutVita Globalis</p><h3 className="mt-2 text-3xl font-black">Financial Report</h3><p className="mt-2 text-sm text-slate-500">Period: {new Date(`${from}T00:00:00`).toLocaleDateString('en-GB')} to {new Date(`${to}T00:00:00`).toLocaleDateString('en-GB')}</p><p className="mt-1 text-xs text-slate-500">Narrative provider: {report.provider}</p></div><div className="print-hidden flex gap-2"><button onClick={downloadCsv} title="Export CSV" className="rounded-md border p-3"><Download className="h-4 w-4" /></button><button onClick={() => window.print()} title="Print Report" className="rounded-md bg-[#24945f] p-3 text-white"><Printer className="h-4 w-4" /></button></div></header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Revenue', report.revenue, 'text-emerald-700'],['Expense', report.expense, 'text-red-700'],['Net Balance', report.net, report.net < 0 ? 'text-red-700' : 'text-emerald-700'],['Validated Commitments', report.commitments, 'text-orange-700']].map(([label, value, color]) => <div key={String(label)} className="rounded-md border bg-slate-50 p-4"><p className="text-xs font-bold text-slate-500">{String(label)}</p><p className={`mt-2 text-xl font-black ${color}`}>{money(Number(value))}</p></div>)}</section>

      <section className="rounded-md border bg-slate-50 p-5"><h4 className="font-black">Executive Summary</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{report.narrative.executive_summary}</p></section>

      <section className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Date</th><th className="p-3">Reference</th><th className="p-3">Budget Code</th><th className="p-3">Description</th><th className="p-3">Comment</th><th className="p-3 text-right">Revenue</th><th className="p-3 text-right">Expense</th></tr></thead><tbody>{report.rows.length ? report.rows.map(row => <tr key={row.id} className="border-b"><td className="p-3">{row.date.toLocaleDateString('fr-FR')}</td><td className="p-3 font-mono text-xs">{row.reference}</td><td className="p-3 font-mono text-xs">{row.budgetCode}</td><td className="p-3"><p className="font-semibold">{row.description}</p><p className="text-xs text-slate-500">{row.category}</p></td><td className="p-3 text-xs">{row.comment || 'N/A'}</td><td className="p-3 text-right font-semibold text-emerald-700">{row.type === 'revenue' ? money(row.amount) : '-'}</td><td className="p-3 text-right font-semibold text-red-700">{row.type === 'expense' ? money(row.amount) : '-'}</td></tr>) : <tr><td colSpan={7} className="h-28 text-center text-slate-500">No validated transactions found for this period.</td></tr>}</tbody><tfoot><tr className="border-t-2 bg-slate-50 font-black"><td colSpan={5} className="p-3 text-right">Totals</td><td className="p-3 text-right text-emerald-700">{money(report.revenue)}</td><td className="p-3 text-right text-red-700">{money(report.expense)}</td></tr><tr className="font-black"><td colSpan={5} className="p-3 text-right">Net Balance</td><td colSpan={2} className="p-3 text-right text-lg">{money(report.net)}</td></tr></tfoot></table></section>

      <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-md border p-5"><h4 className="font-black">Main Findings</h4><ul className="mt-3 grid gap-2 text-sm leading-6">{report.narrative.findings.map((item, index) => <li key={index}>• {item}</li>)}</ul></section><section className="rounded-md border border-amber-200 bg-amber-50 p-5"><h4 className="font-black">Risks and Attention Points</h4><ul className="mt-3 grid gap-2 text-sm leading-6">{report.narrative.risks.length ? report.narrative.risks.map((item, index) => <li key={index}>• {item}</li>) : <li>No specific risk identified from the available records.</li>}</ul></section><section className="rounded-md border p-5"><h4 className="font-black">Recommendations</h4><ul className="mt-3 grid gap-2 text-sm leading-6">{report.narrative.recommendations.map((item, index) => <li key={index}>• {item}</li>)}</ul></section><section className="rounded-md border p-5"><h4 className="font-black">Budget Concentration</h4><div className="mt-3 grid gap-2">{topBudget.length ? topBudget.map(row => <div key={row.code} className="flex justify-between gap-4 text-sm"><span className="font-mono">{row.code}</span><strong>{money(row.amount)}</strong></div>) : <p className="text-sm text-slate-500">No expense allocation available.</p>}</div></section></div>

      <section className="rounded-md border bg-slate-50 p-5"><h4 className="font-black">Conclusion</h4><p className="mt-3 text-sm leading-7 text-slate-700">{report.narrative.conclusion}</p><div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3"><p>Pending requests: {report.pendingRequests}</p><p>Outstanding advances: {money(report.outstandingAdvances)}</p><p>Transaction lines: {report.rows.length}</p></div></section>

      <footer className="mt-10 grid grid-cols-2 gap-16 text-center text-sm"><div><p className="font-bold">Finance Officer</p><div className="mx-auto mt-16 w-48 border-t pt-2">Signature</div></div><div><p className="font-bold">Director</p><div className="mx-auto mt-16 w-48 border-t pt-2">Signature</div></div></footer>
    </article>}
  </div>;
}
