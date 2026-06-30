'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, Eye, FileCheck, History, Loader2, Save, Send, Trash2, Truck } from 'lucide-react';

type RecordRow = {
  id: string;
  reference?: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type IngredientNeed = {
  item: string;
  quantity: number;
  unit: string;
};

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function ingredientRows(record: RecordRow): IngredientNeed[] {
  const raw = record.data.ingredient_items;
  if (Array.isArray(raw)) {
    return raw.map(value => {
      const row = value as Record<string, unknown>;
      return {
        item: stringValue(row.item) || stringValue(row.name) || 'Ingredient',
        quantity: Number(row.quantity || 0),
        unit: stringValue(row.unit),
      };
    }).filter(row => row.quantity > 0);
  }

  return stringValue(record.data.specific_ingredients).split(/\r?\n/).map(line => {
    const [item, quantity, unit] = line.split('|').map(value => value.trim());
    return { item, quantity: Number(quantity || 0), unit };
  }).filter(row => row.item && row.quantity > 0);
}

function weekKey(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function formatDate(value: unknown) {
  const source = stringValue(value);
  if (!source) return '-';
  return new Date(`${source}T12:00:00`).toLocaleDateString('en-US', { dateStyle: 'long' });
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  validated: 'Validated',
  delivered: 'Delivered',
  served: 'Acknowledged',
  rejected: 'Rejected',
};

export default function ConsolidatedDailyOrders() {
  const [kitchens, setKitchens] = useState<RecordRow[]>([]);
  const [orders, setOrders] = useState<RecordRow[]>([]);
  const [items, setItems] = useState<RecordRow[]>([]);
  const [kitchen, setKitchen] = useState('');
  const [week, setWeek] = useState('');
  const [date, setDate] = useState('');
  const [result, setResult] = useState<IngredientNeed[] | null>(null);
  const [inspected, setInspected] = useState<{ item: RecordRow; mode: 'details' | 'history' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function load() {
    const modules = ['production/central-kitchens', 'sales/daily-orders', 'production/consolidated-orders'];
    const results = await Promise.all(modules.map(async module => {
      const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
      return response.ok ? (await response.json()).items || [] : [];
    }));
    setKitchens(results[0]);
    setOrders(results[1]);
    setItems(results[2]);
  }

  useEffect(() => { load().catch(() => setMessage('Unable to load consolidated orders.')); }, []);

  const acknowledgedOrders = useMemo(() => orders.filter(order =>
    order.status === 'acknowledged' &&
    stringValue(order.data.central_kitchen) === kitchen
  ), [orders, kitchen]);

  const weeks = useMemo(() => {
    const values = [...new Set(acknowledgedOrders.map(order => weekKey(stringValue(order.data.order_date))).filter(Boolean))];
    return values.sort().map(value => {
      const end = new Date(`${value}T12:00:00`);
      end.setDate(end.getDate() + 6);
      return { value, label: `${formatDate(value)} - ${formatDate(end.toISOString().slice(0, 10))}` };
    });
  }, [acknowledgedOrders]);

  const dates = useMemo(() => [...new Set(acknowledgedOrders
    .map(order => stringValue(order.data.order_date))
    .filter(value => weekKey(value) === week)
  )].sort(), [acknowledgedOrders, week]);

  const selectedOrders = useMemo(() => acknowledgedOrders.filter(order =>
    stringValue(order.data.order_date) === date
  ), [acknowledgedOrders, date]);

  function calculate() {
    const totals = new Map<string, IngredientNeed>();
    selectedOrders.flatMap(ingredientRows).forEach(row => {
      const key = `${row.item.toLowerCase()}|${row.unit.toLowerCase()}`;
      const current = totals.get(key);
      totals.set(key, { ...row, quantity: (current?.quantity || 0) + row.quantity });
    });
    setResult([...totals.values()]);
    setMessage(selectedOrders.length ? '' : 'No acknowledged daily order is available for this selection.');
  }

  async function saveDraft() {
    if (!kitchen || !date || !result) return;
    setBusy(true);
    const kitchenRecord = kitchens.find(item => item.id === kitchen || stringValue(item.data.name) === kitchen);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'production/consolidated-orders',
        title: `Consolidated order - ${date}`,
        data: {
          production_date: date,
          central_kitchen: kitchen,
          central_kitchen_name: stringValue(kitchenRecord?.data.name) || kitchenRecord?.reference || kitchen,
          daily_order_count: selectedOrders.length,
          orders: selectedOrders.map(order => order.id),
          ingredient_items: result,
          needs: result,
        },
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save the consolidated order.');
    setMessage('Consolidated daily order saved as draft.');
    setResult(null);
    await load();
  }

  async function changeStatus(item: RecordRow, status: string) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status }),
    });
    const payload = await response.json();
    if (!response.ok) return setMessage(payload.message || 'Unable to update status.');
    await load();
  }

  async function remove(item: RecordRow) {
    if (!confirm('Delete this consolidated daily order?')) return;
    const response = await fetch(`/api/maximus/records?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
    if (!response.ok) return setMessage('Unable to delete this consolidated order.');
    await load();
  }

  return <div className="grid gap-8 text-slate-950">
    <h2 className="text-3xl font-black">Consolidated Daily Orders</h2>

    {message && <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Calculate Consolidated Daily Order</h3>
      <p className="mt-1 text-sm text-slate-500">Select a central kitchen, a week, and a date to consolidate acknowledged daily orders and calculate total ingredient needs.</p>
      <div className="mt-7 flex flex-col items-end gap-4 lg:flex-row">
        <label className="grid w-full gap-2 text-sm font-semibold lg:w-64">
          Select a Central Kitchen
          <select value={kitchen} onChange={event => { setKitchen(event.target.value); setWeek(''); setDate(''); setResult(null); }} className="admin-input">
            <option value="">Select a kitchen</option>
            {kitchens.map(item => <option key={item.id} value={stringValue(item.data.name) || item.id}>{stringValue(item.data.name) || item.reference}</option>)}
          </select>
        </label>
        <label className="grid w-full gap-2 text-sm font-semibold lg:w-64">
          Select a Week
          <select value={week} disabled={!kitchen} onChange={event => { setWeek(event.target.value); setDate(''); setResult(null); }} className="admin-input">
            <option value="">Select a week</option>
            {weeks.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="grid w-full gap-2 text-sm font-semibold lg:w-64">
          Select a Date
          <select value={date} disabled={!week} onChange={event => { setDate(event.target.value); setResult(null); }} className="admin-input">
            <option value="">Select a day</option>
            {dates.map(value => <option key={value} value={value}>{formatDate(value)}</option>)}
          </select>
        </label>
        <button type="button" onClick={calculate} disabled={!date} className="flex h-11 items-center gap-2 rounded-md bg-[#24945f] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">
          <Calculator className="h-4 w-4" />Calculate
        </button>
      </div>

      {result && <div className="mt-7 border-t pt-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500"><th className="p-3">Ingredient</th><th className="p-3">Total Quantity</th><th className="p-3">Unit</th></tr></thead>
            <tbody>{result.length ? result.map(row => <tr key={`${row.item}-${row.unit}`} className="border-b"><td className="p-3 font-semibold">{row.item}</td><td className="p-3">{row.quantity.toFixed(2)}</td><td className="p-3">{row.unit || '-'}</td></tr>) : <tr><td colSpan={3} className="p-8 text-center text-slate-500">No ingredient needs were found.</td></tr>}</tbody>
          </table>
        </div>
        <button type="button" onClick={saveDraft} disabled={busy || !result.length} className="mt-5 flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white disabled:opacity-45">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save as Draft
        </button>
      </div>}
    </section>

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Consolidated Daily Orders Register</h3>
      <p className="mt-1 text-sm text-slate-500">Track and manage the status of consolidated daily orders.</p>
      {items.length ? <div className="mt-7 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead><tr className="border-b text-slate-500"><th className="p-3">Need ID</th><th className="p-3">Central Kitchen</th><th className="p-3">Date</th><th className="p-3 text-center"># Daily Orders</th><th className="p-3">Status</th><th className="p-3">Created By</th><th className="p-3 text-right">Actions</th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id} className="border-b">
            <td className="p-3 font-mono text-xs">{item.reference || item.id.slice(0, 8)}</td>
            <td className="p-3">{stringValue(item.data.central_kitchen_name) || stringValue(item.data.central_kitchen) || '-'}</td>
            <td className="p-3">{formatDate(item.data.production_date)}</td>
            <td className="p-3 text-center">{Number(item.data.daily_order_count || 0)}</td>
            <td className="p-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{statusLabels[item.status] || item.status}</span></td>
            <td className="p-3 text-xs">Maximus</td>
            <td className="p-3"><div className="flex justify-end gap-2">
              <button title="View Details" onClick={() => setInspected({ item, mode: 'details' })} className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>
              <button title="View History" onClick={() => setInspected({ item, mode: 'history' })} className="rounded-md border p-2"><History className="h-4 w-4" /></button>
              {item.status === 'draft' && <button onClick={() => changeStatus(item, 'submitted')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><Send className="h-4 w-4" />Submit</button>}
              {item.status === 'submitted' && <button onClick={() => changeStatus(item, 'validated')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><FileCheck className="h-4 w-4" />Validate</button>}
              {item.status === 'validated' && <button onClick={() => changeStatus(item, 'delivered')} className="flex items-center gap-1 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><Truck className="h-4 w-4" />Mark as Delivered</button>}
              {item.status === 'draft' && <button title="Delete" onClick={() => remove(item)} className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button>}
            </div></td>
          </tr>)}</tbody>
        </table>
      </div> : <div className="py-20 text-center text-sm text-slate-500">No consolidated daily orders have been saved yet.</div>}
    </section>

    {inspected && <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4" onMouseDown={() => setInspected(null)}>
      <section className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">{inspected.mode === 'details' ? 'Consolidated Order Details' : 'Status History'}</h3>
            <p className="mt-1 text-sm text-slate-500">{inspected.item.reference || inspected.item.id.slice(0, 8)}</p>
          </div>
          <button onClick={() => setInspected(null)} className="rounded-md border px-3 py-2 text-sm font-bold">Close</button>
        </div>
        {inspected.mode === 'history' ? <div className="mt-6 grid gap-3">
          <div className="rounded-md border-l-4 border-emerald-600 bg-slate-50 p-4">
            <p className="font-bold">Created as Draft</p>
            <p className="mt-1 text-sm text-slate-500">{new Date(inspected.item.created_at).toLocaleString('en-US')}</p>
          </div>
          {inspected.item.status !== 'draft' && <div className="rounded-md border-l-4 border-emerald-600 bg-slate-50 p-4">
            <p className="font-bold">Current status: {statusLabels[inspected.item.status] || inspected.item.status}</p>
          </div>}
        </div> : <div className="mt-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-slate-500">Central Kitchen</dt><dd className="mt-1 font-bold">{stringValue(inspected.item.data.central_kitchen_name) || stringValue(inspected.item.data.central_kitchen)}</dd></div>
            <div><dt className="text-slate-500">Production Date</dt><dd className="mt-1 font-bold">{formatDate(inspected.item.data.production_date)}</dd></div>
            <div><dt className="text-slate-500">Daily Orders</dt><dd className="mt-1 font-bold">{Number(inspected.item.data.daily_order_count || 0)}</dd></div>
          </dl>
          <table className="mt-6 w-full text-left text-sm">
            <thead><tr className="border-b text-slate-500"><th className="p-3">Ingredient</th><th className="p-3">Quantity</th><th className="p-3">Unit</th></tr></thead>
            <tbody>{ingredientRows(inspected.item).map(row => <tr key={`${row.item}-${row.unit}`} className="border-b"><td className="p-3 font-semibold">{row.item}</td><td className="p-3">{row.quantity.toFixed(2)}</td><td className="p-3">{row.unit || '-'}</td></tr>)}</tbody>
          </table>
        </div>}
      </section>
    </div>}
  </div>;
}
