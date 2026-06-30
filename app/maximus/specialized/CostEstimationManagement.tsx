'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Eye, FileCheck, Loader2, Save, Send, Trash2, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type EstimationItem = {
  name: string;
  unit: string;
  required: number;
  in_stock: number;
  to_purchase: number;
  unit_price: number;
  total_price: number;
};

const text = (input: unknown) => typeof input === 'string' ? input : '';
const numeric = (input: unknown) => Number(input || 0);
const normalize = (input: string) => input.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function itemName(row: Row) {
  return text(row.data.name) || row.title;
}

function needItems(row: Row) {
  if (!Array.isArray(row.data.needs)) return [];
  return (row.data.needs as Array<Record<string, unknown>>).map(item => ({
    name: text(item.item) || text(item.name),
    unit: text(item.unit),
    quantity: numeric(item.quantity || item.totalQuantity),
  })).filter(item => item.name && item.quantity > 0);
}

export default function CostEstimationManagement() {
  const [estimations, setEstimations] = useState<Row[]>([]);
  const [needs, setNeeds] = useState<Row[]>([]);
  const [kitchens, setKitchens] = useState<Row[]>([]);
  const [ingredients, setIngredients] = useState<Row[]>([]);
  const [stockMovements, setStockMovements] = useState<Row[]>([]);
  const [kitchenId, setKitchenId] = useState('');
  const [needId, setNeedId] = useState('');
  const [calculation, setCalculation] = useState<{ need: Row; items: EstimationItem[]; total: number } | null>(null);
  const [details, setDetails] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [estimationRows, needRows, kitchenRows, ingredientRows, stockRows] = await Promise.all([
      fetchModule('supply/cost-estimation'),
      fetchModule('supply/consolidated-needs'),
      fetchModule('production/central-kitchens'),
      fetchModule('supply/ingredients'),
      fetchModule('supply/central-stock'),
    ]);
    setEstimations(estimationRows);
    setNeeds(needRows);
    setKitchens(kitchenRows);
    setIngredients(ingredientRows);
    setStockMovements(stockRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load cost estimations.'));
  }, []);

  const kitchen = kitchens.find(row => row.id === kitchenId);
  const kitchenName = kitchen ? itemName(kitchen) : '';
  const estimatedNeedIds = new Set(estimations.map(row => text(row.data.consolidated_need_id)));
  const availableNeeds = needs.filter(row =>
    row.status === 'validated' &&
    !estimatedNeedIds.has(row.id) &&
    (text(row.data.central_kitchen_id) === kitchenId || text(row.data.central_kitchen) === kitchenName)
  );

  const centralStock = useMemo(() => {
    const balances = new Map<string, number>();
    stockMovements.forEach(row => {
      if (!['validated', 'acknowledged', 'executed'].includes(row.status)) return;
      const name = text(row.data.item) || row.title;
      const movement = normalize(text(row.data.movement_type));
      const quantity = Math.abs(numeric(row.data.quantity));
      const direction = text(row.data.direction);
      const sign = direction === 'out' || movement.includes('sortie') || movement.includes('perte') ? -1 : 1;
      const stockKey = `${text(row.data.central_kitchen_id)}|${name.toLowerCase()}`;
      balances.set(stockKey, (balances.get(stockKey) || 0) + (sign * quantity));
    });
    return balances;
  }, [stockMovements]);

  function calculate() {
    const selectedNeed = needs.find(row => row.id === needId);
    if (!selectedNeed) return;
    const items = needItems(selectedNeed).map(need => {
      const ingredient = ingredients.find(row => itemName(row).toLowerCase() === need.name.toLowerCase());
      const needKitchenId = text(selectedNeed.data.central_kitchen_id);
      const inStock = Math.max(0, centralStock.get(`${needKitchenId}|${need.name.toLowerCase()}`) || 0);
      const toPurchase = Math.max(0, need.quantity - inStock);
      const unitPrice = numeric(ingredient?.data.unit_price);
      return {
        name: need.name,
        unit: need.unit,
        required: need.quantity,
        in_stock: inStock,
        to_purchase: toPurchase,
        unit_price: unitPrice,
        total_price: Number((toPurchase * unitPrice).toFixed(2)),
      };
    });
    setCalculation({
      need: selectedNeed,
      items,
      total: items.reduce((sum, item) => sum + item.total_price, 0),
    });
    setMessage('Cost estimation calculated from current stock and reference prices.');
  }

  async function save(status: 'draft' | 'submitted') {
    if (!calculation) return;
    const need = calculation.need;
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'supply/cost-estimation',
        title: `Cost Estimation - ${need.title}`,
        data: {
          consolidated_need_id: need.id,
          consolidated_need_reference: need.reference,
          title: `Purchase needs - ${need.title}`,
          central_kitchen_id: text(need.data.central_kitchen_id),
          central_kitchen: text(need.data.central_kitchen),
          period: `${text(need.data.period_start)} - ${text(need.data.period_end)}`,
          week: text(need.data.week),
          items: calculation.items,
          total_amount: calculation.total,
        },
      }),
    });
    const payload = await response.json();
    if (response.ok && status === 'submitted') {
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.item.id, status }),
      });
    }
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save the estimation.');
    setCalculation(null);
    setNeedId('');
    setMessage(`Cost estimation saved as ${status}.`);
    await load();
  }

  async function changeStatus(row: Row, status: 'endorsed' | 'validated') {
    setBusy(true);
    let financeRecordId = text(row.data.finance_record_id);
    if (status === 'validated' && !financeRecordId) {
      const financeResponse = await fetch('/api/maximus/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'finance/cost-estimations',
          title: row.title,
          data: {
            title: row.title,
            requester: 'Supply Chain',
            items: row.data.items,
            total_amount: row.data.total_amount,
            budget_line: row.data.budget_line || '',
            source_estimation_id: row.id,
            source_estimation_reference: row.reference,
            central_kitchen: row.data.central_kitchen,
            period: row.data.period,
          },
        }),
      });
      const financePayload = await financeResponse.json();
      if (!financeResponse.ok) {
        setBusy(false);
        return setMessage(financePayload.message || 'Unable to transmit the estimation to Finance.');
      }
      financeRecordId = financePayload.item.id;
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: financeRecordId,
          status: 'validated',
          data: {
            ...financePayload.item.data,
            status_history: [{ status: 'validated', timestamp: new Date().toISOString(), source: 'Supply validation' }],
          },
        }),
      });
    }
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: row.id,
        status,
        ...(financeRecordId ? { data: { ...row.data, finance_record_id: financeRecordId } } : {}),
      }),
    });
    setBusy(false);
    if (!response.ok) return setMessage('Unable to update the estimation status.');
    setMessage(status === 'validated' ? 'Estimation validated and transmitted to Finance.' : 'Estimation endorsed.');
    await load();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete "${row.title}"?`)) return;
    const response = await fetch(`/api/maximus/records?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
    if (!response.ok) return setMessage('Unable to delete the estimation.');
    setMessage('Cost estimation deleted.');
    await load();
  }

  return <div className="grid gap-7 text-slate-950">
    <h2 className="text-3xl font-black">Cost Estimation</h2>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
      message.includes('Unable') ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Create Cost Estimation for Purchase Order</h3>
      <p className="mt-1 text-sm text-slate-500">Select a validated consolidated weekly need to generate a cost estimation.</p>
      <div className="mt-6 flex flex-col items-end gap-4 md:flex-row">
        <label className="grid w-full gap-2 text-sm font-semibold md:w-1/3">Select a Central Kitchen
          <select className="admin-input" value={kitchenId} onChange={event => { setKitchenId(event.target.value); setNeedId(''); setCalculation(null); }}>
            <option value="">Select a kitchen</option>
            {kitchens.map(row => <option key={row.id} value={row.id}>{itemName(row)}</option>)}
          </select>
        </label>
        <label className="grid w-full gap-2 text-sm font-semibold md:w-1/3">Select a Consolidated Weekly Need
          <select className="admin-input" disabled={!kitchenId} value={needId} onChange={event => { setNeedId(event.target.value); setCalculation(null); }}>
            <option value="">{kitchenId ? 'Select a need' : 'Select a kitchen first'}</option>
            {availableNeeds.map(row => <option key={row.id} value={row.id}>
              {row.reference} - Week {text(row.data.week).split('-')[1]}, {text(row.data.week).split('-')[0]}
            </option>)}
          </select>
        </label>
        <button onClick={calculate} disabled={!needId} className="flex h-11 items-center gap-2 rounded-md bg-[#24945f] px-5 text-sm font-bold text-white disabled:opacity-45">
          <Calculator className="h-4 w-4" />Create Estimation
        </button>
      </div>
    </section>

    {calculation && <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Estimation for: {calculation.need.reference}</h3>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Ingredient</th><th className="p-3">Required</th>
          <th className="p-3">In Stock</th><th className="p-3">To Purchase</th><th className="p-3">Unit Price (FCFA)</th>
          <th className="p-3 text-right">Total Price (FCFA)</th></tr></thead>
        <tbody>{calculation.items.map(item => <tr key={`${item.name}-${item.unit}`} className="border-b">
          <td className="p-3 font-semibold">{item.name}</td><td className="p-3">{item.required.toLocaleString('fr-FR')} {item.unit}</td>
          <td className="p-3">{item.in_stock.toLocaleString('fr-FR')} {item.unit}</td>
          <td className="p-3 font-semibold">{item.to_purchase.toLocaleString('fr-FR')} {item.unit}</td>
          <td className="p-3">{item.unit_price.toLocaleString('fr-FR')}</td>
          <td className="p-3 text-right">{item.total_price.toLocaleString('fr-FR')}</td>
        </tr>)}</tbody>
        <tfoot><tr className="bg-slate-50 text-lg font-black"><td colSpan={5} className="p-4">Grand Total</td>
          <td className="p-4 text-right">{calculation.total.toLocaleString('fr-FR')} FCFA</td></tr></tfoot>
      </table></div>
      <div className="mt-5 flex justify-end gap-3">
        <button onClick={() => save('draft')} disabled={busy} className="flex items-center gap-2 rounded-md border px-5 py-3 text-sm font-bold">
          <Save className="h-4 w-4" />Save as Draft
        </button>
        <button onClick={() => save('submitted')} disabled={busy} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit
        </button>
      </div>
    </section>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Cost Estimation Register</h3>
      <p className="mt-1 text-sm text-slate-500">Track the status of all cost estimations.</p>
      {estimations.length ? <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Estimation ID</th><th className="p-3">Plan Name</th>
          <th className="p-3">Central Kitchen</th><th className="p-3">Created On</th><th className="p-3">Total (FCFA)</th>
          <th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{estimations.map(row => <tr key={row.id} className="border-b">
          <td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8).toUpperCase()}</td>
          <td className="p-3 font-semibold">{row.title}</td><td className="p-3">{text(row.data.central_kitchen)}</td>
          <td className="p-3">{new Date(row.created_at).toLocaleDateString('fr-FR')}</td>
          <td className="p-3">{numeric(row.data.total_amount).toLocaleString('fr-FR')}</td>
          <td className="p-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize">{row.status}</span></td>
          <td className="p-3"><div className="flex justify-end gap-2">
            <button onClick={() => setDetails(row)} title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button>
            {row.status === 'submitted' && <button onClick={() => changeStatus(row, 'endorsed')} title="Endorse" className="rounded-md border p-2 text-emerald-700"><FileCheck className="h-4 w-4" /></button>}
            {row.status === 'endorsed' && <button onClick={() => changeStatus(row, 'validated')} title="Validate" className="rounded-md bg-[#24945f] p-2 text-white"><CheckCircle2 className="h-4 w-4" /></button>}
            {row.status === 'draft' && <button onClick={() => remove(row)} title="Delete" className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button>}
          </div></td>
        </tr>)}</tbody>
      </table></div> : <div className="py-16 text-center text-sm text-slate-500">No cost estimations found.</div>}
    </section>

    {details && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDetails(null)}>
      <section className="my-6 w-full max-w-4xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">{details.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{details.reference} | {details.status}</p></div>
          <button onClick={() => setDetails(null)} title="Close"><X className="h-5 w-5" /></button></header>
        <div className="p-6"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead><tr className="border-b text-slate-500"><th className="p-3">Ingredient</th><th className="p-3">Required</th>
            <th className="p-3">In Stock</th><th className="p-3">To Purchase</th><th className="p-3 text-right">Total</th></tr></thead>
          <tbody>{(Array.isArray(details.data.items) ? details.data.items as EstimationItem[] : []).map(item => <tr key={`${item.name}-${item.unit}`} className="border-b">
            <td className="p-3 font-semibold">{item.name}</td><td className="p-3">{numeric(item.required).toLocaleString('fr-FR')} {item.unit}</td>
            <td className="p-3">{numeric(item.in_stock).toLocaleString('fr-FR')}</td><td className="p-3">{numeric(item.to_purchase).toLocaleString('fr-FR')}</td>
            <td className="p-3 text-right">{numeric(item.total_price).toLocaleString('fr-FR')} FCFA</td>
          </tr>)}</tbody></table></div></div>
      </section>
    </div>}
  </div>;
}
