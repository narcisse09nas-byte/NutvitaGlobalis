'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Send } from 'lucide-react';

type Row = {
  id: string;
  title: string;
  reference?: string | null;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const amount = (value: unknown) => Number(value || 0);
const money = (value: unknown) => amount(value).toLocaleString('fr-FR');

export default function PaymentInitiation() {
  const [maintenance, setMaintenance] = useState<Row[]>([]);
  const [missions, setMissions] = useState<Row[]>([]);
  const [requests, setRequests] = useState<Row[]>([]);
  const [initiations, setInitiations] = useState<Row[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [maintenanceRows, missionRows, requestRows, initiationRows] = await Promise.all([
      fetchModule('fleet/maintenance'), fetchModule('hr/missions'),
      fetchModule('finance/requests'), fetchModule('finance/payment-initiation'),
    ]);
    setMaintenance(maintenanceRows);
    setMissions(missionRows);
    setRequests(requestRows);
    setInitiations(initiationRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load payment initiation.'));
    const stored = sessionStorage.getItem('maximusPaymentInitiation');
    if (stored) {
      try {
        const context = JSON.parse(stored);
        sessionStorage.removeItem('maximusPaymentInitiation');
        preparePayment(context).catch(error => setMessage(error instanceof Error ? error.message : 'Unable to prepare payment.'));
      } catch {
        sessionStorage.removeItem('maximusPaymentInitiation');
      }
    }
  }, []);

  const linkedMaintenance = useMemo(() => new Set(requests.map(row => text(row.data.related_maintenance_id)).filter(Boolean)), [requests]);
  const linkedMissions = useMemo(() => new Set(requests.map(row => text(row.data.related_mission_id)).filter(Boolean)), [requests]);
  const initiatedReferences = useMemo(() => new Set(initiations.map(row => text(row.data.reference_id)).filter(Boolean)), [initiations]);

  const pendingMaintenance = maintenance.filter(row =>
    row.status === 'validated' && !linkedMaintenance.has(row.id)
  );
  const pendingMissions = missions.filter(row =>
    row.status === 'validated' && !text(row.data.finance_request_id) && !linkedMissions.has(row.id)
  );
  const validatedRequests = requests.filter(row =>
    row.status === 'validated' && !initiatedReferences.has(row.id)
  );

  function initiateFinanceRequest(type: 'maintenance' | 'mission', row: Row) {
    const maintenanceType = type === 'maintenance';
    sessionStorage.setItem('maximusFinanceRequestPrefill', JSON.stringify({
      title: maintenanceType
        ? `Payment for Maintenance: ${text(row.data.vehicle_registration) || text(row.data.asset)}`
        : `Payment for Mission: ${text(row.data.requester_name)} to ${text(row.data.destination)}`,
      description: maintenanceType
        ? `Payment request for validated maintenance performed by ${text(row.data.provider)}.`
        : `Payment request for validated mission costs for ${text(row.data.requester_name)}.`,
      amount: maintenanceType ? amount(row.data.actual_cost || row.data.estimated_cost) : amount(row.data.total_cost),
      related_maintenance_id: maintenanceType ? row.id : null,
      related_mission_id: maintenanceType ? null : row.id,
    }));
    window.location.href = '/maximus/finance/requests';
  }

  async function preparePayment(context: Record<string, unknown> | Row) {
    const row = 'data' in context ? context as Row : null;
    const transferred = context as Record<string, unknown>;
    const referenceId = row?.id || text(transferred.reference_id);
    if (!referenceId || initiatedReferences.has(referenceId)) {
      if (referenceId) setMessage('A payment initiation already exists for this request.');
      return;
    }
    const source = row || requests.find(item => item.id === referenceId);
    const data = {
      reference_type: 'Financial Request',
      reference_id: referenceId,
      reference: source?.reference || text(transferred.reference),
      beneficiary: text(source?.data.requester) || text(source?.data.beneficiary),
      amount: amount(source?.data.amount || transferred.amount),
      budget_line: text(source?.data.budget_line) || text(transferred.budget_line),
      purpose: source?.title || text(transferred.purpose),
      payment_method: '',
      notes: '',
      prepared_at: new Date().toISOString(),
    };
    if (data.amount <= 0) return setMessage('The source request has no payable amount.');
    setBusy(referenceId);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'finance/payment-initiation',
        title: `Payment Preparation - ${source?.title || data.reference}`,
        data,
      }),
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
    if (!response.ok) return setMessage(payload.message || 'Unable to prepare payment.');
    setMessage('Payment initiation prepared and sent to the execution queue.');
    await load();
  }

  return <div className="grid gap-5 text-slate-950">
    <div className="flex items-center gap-4"><Link href="/maximus/finance/dashboard" title="Back to Finance" className="grid h-11 w-11 place-items-center rounded-md border bg-white"><ArrowLeft className="h-5 w-5" /></Link><h2 className="text-3xl font-black">Payment Initiation</h2></div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${message.includes('Unable') || message.includes('already') || message.includes('no payable') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{message}</div>}

    <Queue title="Pending Maintenance Payments" description="A list of all completed vehicle maintenance sessions awaiting payment processing." columns={['Maintenance ID','Vehicle','Vendor','Total Cost (FCFA)']} empty="No maintenance records are awaiting payment.">
      {pendingMaintenance.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td><td className="p-3">{text(row.data.vehicle_registration) || text(row.data.asset)}</td><td className="p-3">{text(row.data.provider)}</td><td className="p-3 font-semibold">{money(row.data.actual_cost || row.data.estimated_cost)}</td><td className="p-3 text-right"><button onClick={() => initiateFinanceRequest('maintenance', row)} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><Send className="h-4 w-4" />Initiate Finance Request</button></td></tr>)}
    </Queue>

    <Queue title="Pending Mission Payments" description="A list of all validated mission requests awaiting payment processing." columns={['Mission ID','Requestor','Destination','Total Cost (FCFA)']} empty="No mission requests are awaiting payment.">
      {pendingMissions.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td><td className="p-3">{text(row.data.requester_name)}</td><td className="p-3">{text(row.data.destination)}</td><td className="p-3 font-semibold">{money(row.data.total_cost)}</td><td className="p-3 text-right"><button onClick={() => initiateFinanceRequest('mission', row)} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><Send className="h-4 w-4" />Initiate Finance Request</button></td></tr>)}
    </Queue>

    <Queue title="Validated Financial Requests" description="Validated requests ready to enter the payment execution queue." columns={['Request ID','Title','Beneficiary','Amount (FCFA)']} empty="No validated financial requests are awaiting payment preparation.">
      {validatedRequests.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td><td className="p-3 font-semibold">{row.title}</td><td className="p-3">{text(row.data.requester) || text(row.data.beneficiary)}</td><td className="p-3 font-semibold">{money(row.data.amount)}</td><td className="p-3 text-right"><button disabled={busy === row.id} onClick={() => preparePayment(row)} className="inline-flex items-center gap-2 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{busy === row.id ? 'Preparing...' : 'Prepare Payment'}</button></td></tr>)}
    </Queue>
  </div>;
}

function Queue({ title, description, columns, empty, children }: {
  title: string;
  description: string;
  columns: string[];
  empty: string;
  children: React.ReactNode;
}) {
  const rows = Array.isArray(children) ? children.length : children ? 1 : 0;
  return <section className="rounded-lg border bg-white p-6 shadow-sm"><h3 className="text-xl font-black">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-slate-500">{columns.map(column => <th key={column} className="p-3">{column}</th>)}<th className="p-3 text-right">Actions</th></tr></thead><tbody>{rows ? children : <tr><td colSpan={columns.length + 1} className="h-28 text-center text-slate-500">{empty}</td></tr>}</tbody></table></div></section>;
}
