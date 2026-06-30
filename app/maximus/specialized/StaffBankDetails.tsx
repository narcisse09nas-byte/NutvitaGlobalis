'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Banknote, Loader2 } from 'lucide-react';

type Row = { id: string; reference?: string; status: string; data: Record<string, unknown> };
const text = (value: unknown) => typeof value === 'string' ? value : '';
const fullName = (row: Row) => [row.data.first_name, row.data.middle_name, row.data.last_name].map(text).filter(Boolean).join(' ') || text(row.data.full_name) || 'Unnamed';

export default function StaffBankDetails() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/maximus/records?module=hr%2Fstaff').then(async response => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Unable to load bank details.');
      setItems(payload.items || []);
    }).catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load bank details.')).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => items.filter(row => row.status === 'validated' && Boolean(row.data.has_bank_account) && text(row.data.bank_name) && text(row.data.bank_account_number)), [items]);

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center gap-4"><Link href="/maximus/hr/staff" title="Back to Staff Directory" className="grid h-10 w-10 place-items-center rounded-md border bg-white hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></Link><h2 className="text-3xl font-black">Staff Bank Details</h2></div>
    {message && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Staff Bank Accounts</h3>
      <p className="mt-1 text-sm text-slate-500">This is a list of all validated staff members with registered bank accounts.</p>
      {loading ? <div className="grid h-52 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : rows.length ? <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Employee Name</th><th className="p-3">Employee ID</th><th className="p-3">Bank Name</th><th className="p-3">Account Name</th><th className="p-3">Account Number</th><th className="p-3">SWIFT/BIC</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{fullName(row)}</td><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td><td className="p-3">{text(row.data.bank_name)}</td><td className="p-3">{text(row.data.bank_account_name)}</td><td className="p-3 font-mono">{text(row.data.bank_account_number)}</td><td className="p-3">{text(row.data.swift_code) || 'N/A'}</td></tr>)}</tbody>
      </table></div> : <div className="grid min-h-56 place-items-center text-center text-sm text-slate-500"><div><Banknote className="mx-auto h-12 w-12" /><p className="mt-4">No staff with bank accounts found.</p></div></div>}
    </section>
  </div>;
}
