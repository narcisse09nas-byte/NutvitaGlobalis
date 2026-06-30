'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Eye, Loader2, Save, Send, Trash2, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type Need = {
  item: string;
  quantity: number;
  unit: string;
  unit_price: number;
  estimated_cost: number;
};

const text = (input: unknown) => typeof input === 'string' ? input : '';
const numeric = (input: unknown) => Number(input || 0);

function isoWeek(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: target.getUTCFullYear(), week };
}

function weekOptions() {
  const result: Array<{ value: string; label: string }> = [];
  const today = new Date();
  for (let offset = -1; offset <= 3; offset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + (offset * 7));
    const current = isoWeek(date);
    let suffix = '';
    if (offset === -1) suffix = ' (Previous)';
    if (offset === 0) suffix = ' (Current)';
    result.push({
      value: `${current.year}-${String(current.week).padStart(2, '0')}`,
      label: `Week ${current.week} - ${current.year}${suffix}`,
    });
  }
  return result;
}

function periodForWeek(input: string) {
  const [year, week] = input.split('-').map(Number);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - ((januaryFourth.getUTCDay() + 6) % 7) + ((week - 1) * 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function parseNeeds(input: unknown): Array<{ item: string; quantity: number; unit: string }> {
  if (!Array.isArray(input)) return [];
  return input.map(raw => {
    const row = raw as Record<string, unknown>;
    return {
      item: text(row.item) || text(row.name),
      quantity: numeric(row.quantity || row.totalQuantity),
      unit: text(row.unit),
    };
  }).filter(row => row.item && row.quantity > 0);
}

export default function ConsolidatedWeeklyNeeds() {
  const [records, setRecords] = useState<Row[]>([]);
  const [plans, setPlans] = useState<Row[]>([]);
  const [kitchens, setKitchens] = useState<Row[]>([]);
  const [ingredients, setIngredients] = useState<Row[]>([]);
  const [kitchenId, setKitchenId] = useState('');
  const [week, setWeek] = useState('');
  const [result, setResult] = useState<{ needs: Need[]; planCount: number } | null>(null);
  const [details, setDetails] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const weeks = useMemo(weekOptions, []);

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [recordRows, planRows, kitchenRows, ingredientRows] = await Promise.all([
      fetchModule('supply/consolidated-needs'),
      fetchModule('production/planning'),
      fetchModule('production/central-kitchens'),
      fetchModule('supply/ingredients'),
    ]);
    setRecords(recordRows);
    setPlans(planRows);
    setKitchens(kitchenRows);
    setIngredients(ingredientRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load weekly needs.'));
  }, []);

  const kitchen = kitchens.find(row => row.id === kitchenId);
  const kitchenName = text(kitchen?.data.name) || kitchen?.title || '';
  const validatedKeys = new Set(records
    .filter(row => row.status === 'validated')
    .map(row => `${text(row.data.central_kitchen_id) || text(row.data.central_kitchen)}|${text(row.data.week)}`));

  function calculate() {
    if (!kitchenId || !week) return;
    const selectedPlans = plans.filter(row => {
      if (row.status !== 'validated' || row.data.record_type === 'weekly_menu_plan') return false;
      const planKitchen = text(row.data.central_kitchen);
      const planWeek = text(row.data.period_start).replace('-W', '-');
      return planKitchen === kitchenName && planWeek === week;
    });
    if (!selectedPlans.length) {
      setResult(null);
      setMessage('No validated production plans were found for this kitchen and week.');
      return;
    }

    const totals = new Map<string, { item: string; quantity: number; unit: string }>();
    selectedPlans.forEach(plan => parseNeeds(plan.data.ingredient_items).forEach(need => {
      const key = `${need.item.toLowerCase()}|${need.unit.toLowerCase()}`;
      const current = totals.get(key);
      totals.set(key, { ...need, quantity: (current?.quantity || 0) + need.quantity });
    }));

    const needs = Array.from(totals.values()).map(need => {
      const ingredient = ingredients.find(row =>
        (text(row.data.name) || row.title).toLowerCase() === need.item.toLowerCase()
      );
      const unitPrice = numeric(ingredient?.data.unit_price);
      return {
        ...need,
        quantity: Number(need.quantity.toFixed(2)),
        unit_price: unitPrice,
        estimated_cost: Number((need.quantity * unitPrice).toFixed(2)),
      };
    }).sort((a, b) => a.item.localeCompare(b.item));

    setResult({ needs, planCount: selectedPlans.length });
    setMessage(`Consolidated needs calculated from ${selectedPlans.length} validated production plan(s).`);
  }

  async function saveDraft() {
    if (!result || !kitchenId || !week) return;
    const period = periodForWeek(week);
    const estimatedCost = result.needs.reduce((total, need) => total + need.estimated_cost, 0);
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'supply/consolidated-needs',
        title: `${kitchenName} - Week ${week.split('-')[1]}/${week.split('-')[0]}`,
        data: {
          week,
          period_start: period.start,
          period_end: period.end,
          central_kitchen_id: kitchenId,
          central_kitchen: kitchenName,
          production_plan_count: result.planCount,
          needs: result.needs,
          estimated_cost: estimatedCost,
        },
      }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save consolidated needs.');
    setResult(null);
    setWeek('');
    setMessage('Consolidated weekly needs saved as draft.');
    await load();
  }

  async function changeStatus(row: Row, status: string) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status }),
    });
    if (!response.ok) return setMessage('Unable to update the estimation status.');
    setMessage(`Estimation ${status}.`);
    await load();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const response = await fetch(`/api/maximus/records?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    if (!response.ok) return setMessage('Unable to delete the estimation.');
    setMessage('Estimation deleted.');
    await load();
  }

  return <div className="grid gap-7 text-slate-950">
    <h2 className="text-3xl font-black">Consolidated Weekly Needs Estimation</h2>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
      message.includes('Unable') || message.startsWith('No validated')
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Calculate Consolidated Weekly Need</h3>
      <p className="mt-1 text-sm text-slate-500">
        Select a central kitchen and a week to consolidate validated production plans and calculate total ingredient needs.
      </p>
      <div className="mt-6 flex flex-col items-end gap-4 sm:flex-row">
        <label className="grid w-full gap-2 text-sm font-semibold sm:w-64">Select a Central Kitchen
          <select className="admin-input" value={kitchenId} onChange={event => { setKitchenId(event.target.value); setWeek(''); setResult(null); }}>
            <option value="">Select a kitchen</option>
            {kitchens.map(row => <option key={row.id} value={row.id}>{text(row.data.name) || row.title}</option>)}
          </select>
        </label>
        <label className="grid w-full gap-2 text-sm font-semibold sm:w-64">Select a Week
          <select className="admin-input" disabled={!kitchenId} value={week} onChange={event => { setWeek(event.target.value); setResult(null); }}>
            <option value="">Select a week</option>
            {weeks.map(option => <option key={option.value} value={option.value}
              disabled={validatedKeys.has(`${kitchenId}|${option.value}`) || validatedKeys.has(`${kitchenName}|${option.value}`)}>
              {option.label}
            </option>)}
          </select>
        </label>
        <button onClick={calculate} disabled={!week || !kitchenId} className="flex h-11 items-center gap-2 rounded-md bg-[#24945f] px-5 text-sm font-bold text-white disabled:opacity-45">
          <Calculator className="h-4 w-4" />Calculate
        </button>
      </div>

      {result && <div className="mt-7 border-t pt-6">
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
          <thead><tr className="border-b text-slate-500"><th className="p-3">Ingredient</th><th className="p-3">Total Quantity</th>
            <th className="p-3">Unit</th><th className="p-3">Unit Price (FCFA)</th><th className="p-3 text-right">Estimated Cost</th></tr></thead>
          <tbody>{result.needs.map(need => <tr key={`${need.item}-${need.unit}`} className="border-b">
            <td className="p-3 font-semibold">{need.item}</td><td className="p-3">{need.quantity.toLocaleString('fr-FR')}</td>
            <td className="p-3">{need.unit}</td><td className="p-3">{need.unit_price.toLocaleString('fr-FR')}</td>
            <td className="p-3 text-right font-semibold">{need.estimated_cost.toLocaleString('fr-FR')}</td>
          </tr>)}</tbody>
        </table></div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">{result.planCount} validated production plan(s) consolidated.</p>
          <button onClick={saveDraft} disabled={busy} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{busy ? 'Saving...' : 'Save as Draft'}
          </button>
        </div>
      </div>}
    </section>

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Consolidated Weekly Needs Register</h3>
      <p className="mt-1 text-sm text-slate-500">Track and manage the status of consolidated weekly needs.</p>
      {records.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[980px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Need ID</th><th className="p-3">Central Kitchen</th>
          <th className="p-3">Week</th><th className="p-3"># Production Plans</th><th className="p-3">Estimated Cost</th>
          <th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{records.map(row => <tr key={row.id} className="border-b">
          <td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8).toUpperCase()}</td>
          <td className="p-3 font-semibold">{text(row.data.central_kitchen)}</td>
          <td className="p-3">Week {text(row.data.week).split('-')[1]}, {text(row.data.week).split('-')[0]}</td>
          <td className="p-3 text-center">{numeric(row.data.production_plan_count)}</td>
          <td className="p-3">{numeric(row.data.estimated_cost).toLocaleString('fr-FR')} FCFA</td>
          <td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize">{row.status}</span></td>
          <td className="p-3"><div className="flex justify-end gap-2">
            <button onClick={() => setDetails(row)} title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>
            {row.status === 'draft' && <button onClick={() => changeStatus(row, 'submitted')} title="Submit" className="rounded-md border p-2 text-emerald-700"><Send className="h-4 w-4" /></button>}
            {row.status === 'submitted' && <button onClick={() => changeStatus(row, 'validated')} title="Validate" className="rounded-md bg-[#24945f] p-2 text-white"><CheckCircle2 className="h-4 w-4" /></button>}
            {row.status === 'draft' && <button onClick={() => remove(row)} title="Delete" className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button>}
          </div></td>
        </tr>)}</tbody>
      </table></div> : <div className="py-16 text-center text-sm text-slate-500">
        No consolidated weekly needs estimations have been saved yet.
      </div>}
    </section>

    {details && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDetails(null)}>
      <section className="my-6 w-full max-w-3xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">{details.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{details.reference} | {details.status}</p></div>
          <button onClick={() => setDetails(null)} title="Close"><X className="h-5 w-5" /></button></header>
        <div className="p-6"><div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div><p className="text-xs text-slate-500">Central Kitchen</p><p className="font-semibold">{text(details.data.central_kitchen)}</p></div>
          <div><p className="text-xs text-slate-500">Period</p><p className="font-semibold">{text(details.data.period_start)} - {text(details.data.period_end)}</p></div>
          <div><p className="text-xs text-slate-500">Production Plans</p><p className="font-semibold">{numeric(details.data.production_plan_count)}</p></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b text-slate-500">
          <th className="p-3">Ingredient</th><th className="p-3">Quantity</th><th className="p-3">Unit</th><th className="p-3 text-right">Estimated Cost</th>
        </tr></thead><tbody>{(Array.isArray(details.data.needs) ? details.data.needs as Need[] : []).map(need => <tr key={`${need.item}-${need.unit}`} className="border-b">
          <td className="p-3 font-semibold">{need.item}</td><td className="p-3">{numeric(need.quantity).toLocaleString('fr-FR')}</td>
          <td className="p-3">{need.unit}</td><td className="p-3 text-right">{numeric(need.estimated_cost).toLocaleString('fr-FR')} FCFA</td>
        </tr>)}</tbody></table></div></div>
      </section>
    </div>}
  </div>;
}
