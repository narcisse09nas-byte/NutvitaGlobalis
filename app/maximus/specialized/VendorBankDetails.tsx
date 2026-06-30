'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Banknote, Loader2 } from 'lucide-react';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

type BankAccount = {
  bank_name?: unknown;
  account_name?: unknown;
  account_number?: unknown;
  swift_code?: unknown;
};

const text = (input: unknown) => typeof input === 'string' ? input : '';

function bankAccount(row: Row): BankAccount {
  const nested = row.data.bank_account;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested as BankAccount;
  return {
    bank_name: row.data.bank_name,
    account_name: row.data.bank_account_name,
    account_number: row.data.bank_account_number,
    swift_code: row.data.swift_code,
  };
}

export default function VendorBankDetails() {
  const [vendors, setVendors] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/maximus/records?module=partnerships%2Fvendors')
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to load vendor bank details.');
        setVendors(payload.items || []);
      })
      .catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load vendor bank details.'))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => vendors.filter(row => {
    const bank = bankAccount(row);
    return row.status === 'validated' &&
      Boolean(row.data.has_bank_account ?? row.data.bank_account) &&
      Boolean(text(bank.bank_name)) &&
      Boolean(text(bank.account_number));
  }), [vendors]);

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center gap-4">
      <Link href="/maximus/partnerships/vendors" title="Back to Vendor Management" className="grid h-10 w-10 place-items-center rounded-md border bg-white hover:bg-slate-50">
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <h2 className="text-3xl font-black">Vendor Bank Details</h2>
    </div>
    {message && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{message}</div>}
    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Vendor Bank Accounts</h3>
      <p className="mt-1 text-sm text-slate-500">This is a list of all validated vendors with registered bank accounts.</p>
      {loading ? <div className="grid h-52 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div>
        : rows.length ? <div className="mt-7 overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
          <thead><tr className="border-b text-slate-500"><th className="p-3">Vendor Name</th><th className="p-3">Partnership No.</th>
            <th className="p-3">Bank Name</th><th className="p-3">Account Name</th><th className="p-3">Account Number</th><th className="p-3">SWIFT/BIC</th></tr></thead>
          <tbody>{rows.map(row => {
            const bank = bankAccount(row);
            return <tr key={row.id} className="border-b"><td className="p-3 font-semibold">{text(row.data.structure_name) || text(row.data.contact_name) || row.title}</td>
              <td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8).toUpperCase()}</td>
              <td className="p-3">{text(bank.bank_name)}</td><td className="p-3">{text(bank.account_name)}</td>
              <td className="p-3 font-mono">{text(bank.account_number)}</td><td className="p-3">{text(bank.swift_code) || 'N/A'}</td></tr>;
          })}</tbody>
        </table></div>
        : <div className="grid min-h-56 place-items-center text-center text-sm text-slate-500"><div><Banknote className="mx-auto h-12 w-12" />
          <p className="mt-4">No vendors with bank accounts found.</p></div></div>}
    </section>
  </div>;
}
