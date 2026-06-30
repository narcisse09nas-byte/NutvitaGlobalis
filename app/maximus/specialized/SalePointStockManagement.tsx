'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Filter, Minus, Plus, X } from 'lucide-react';

type RecordRow = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type SourceRow = {
  id: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

type MovementType = 'in' | 'out';

const value = (input: unknown) => typeof input === 'string' ? input : '';
const numberValue = (input: unknown) => Number(input || 0);

function sourceName(row: SourceRow, key: string) {
  return value(row.data[key]) || row.title;
}

export default function SalePointStockManagement() {
  const [movements, setMovements] = useState<RecordRow[]>([]);
  const [salePoints, setSalePoints] = useState<SourceRow[]>([]);
  const [ingredients, setIngredients] = useState<SourceRow[]>([]);
  const [kitchens, setKitchens] = useState<SourceRow[]>([]);
  const [salePoint, setSalePoint] = useState('');
  const [dialogType, setDialogType] = useState<MovementType | null>(null);
  const [ingredientName, setIngredientName] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [otherCounterparty, setOtherCounterparty] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [movementRows, pointRows, ingredientRows, kitchenRows] = await Promise.all([
      fetchModule('sales/partner-stock'),
      fetchModule('sales/sale-points'),
      fetchModule('supply/ingredients'),
      fetchModule('production/central-kitchens'),
    ]);
    setMovements(movementRows);
    setSalePoints(pointRows);
    setIngredients(ingredientRows);
    setKitchens(kitchenRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load stock.'));
  }, []);

  const selectedPointName = useMemo(() => {
    const row = salePoints.find(item => item.id === salePoint);
    return row ? sourceName(row, 'name') : '';
  }, [salePoint, salePoints]);

  const pointMovements = useMemo(() => movements.filter(row => {
    const pointId = value(row.data.sale_point_id);
    const pointName = value(row.data.sale_point);
    return salePoint && (pointId === salePoint || pointName === selectedPointName);
  }), [movements, salePoint, selectedPointName]);

  const stock = useMemo(() => {
    const balances = new Map<string, {
      name: string;
      category: string;
      unit: string;
      quantity: number;
      updatedAt: string;
    }>();

    pointMovements.forEach(row => {
      if (['rejected', 'archived'].includes(row.status)) return;
      const name = value(row.data.item) || row.title;
      if (!name) return;
      const current = balances.get(name) || {
        name,
        category: value(row.data.category),
        unit: value(row.data.unit),
        quantity: 0,
        updatedAt: row.updated_at || row.created_at,
      };
      const direction = value(row.data.direction) || (
        ['Sortie', 'Perte'].includes(value(row.data.movement_type)) ? 'out' : 'in'
      );
      current.quantity += (direction === 'out' ? -1 : 1) * Math.abs(numberValue(row.data.quantity));
      if (new Date(row.updated_at || row.created_at) > new Date(current.updatedAt)) {
        current.updatedAt = row.updated_at || row.created_at;
      }
      if (!current.category) current.category = value(row.data.category);
      if (!current.unit) current.unit = value(row.data.unit);
      balances.set(name, current);
    });

    return Array.from(balances.values())
      .filter(item => Math.abs(item.quantity) > 0.001)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pointMovements]);

  const availableQuantity = stock.find(item => item.name === ingredientName)?.quantity || 0;
  const selectedIngredient = ingredients.find(row => sourceName(row, 'name') === ingredientName);
  const ingredientUnit = value(selectedIngredient?.data.unit);

  function openDialog(type: MovementType) {
    if (!salePoint) {
      setMessage('Select a sale point before recording a movement.');
      return;
    }
    setIngredientName('');
    setCounterparty('');
    setOtherCounterparty('');
    setMessage('');
    setDialogType(type);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogType || !selectedIngredient) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const quantity = numberValue(fields.quantity);
    if (quantity <= 0) return setMessage('Quantity must be greater than zero.');
    if (dialogType === 'out' && quantity > availableQuantity) {
      return setMessage(`Insufficient stock. Available: ${availableQuantity.toLocaleString('fr-FR')} ${ingredientUnit}.`);
    }

    const counterpartyName = counterparty === 'Other' ? otherCounterparty.trim() : counterparty;
    if (!counterpartyName) return setMessage('Specify the source or recipient.');
    const source = dialogType === 'out' ? selectedPointName : counterpartyName;
    const recipient = dialogType === 'in' ? selectedPointName : counterpartyName;
    const data = {
      sale_point_id: salePoint,
      sale_point: selectedPointName,
      movement_date: fields.movement_date,
      direction: dialogType,
      movement_type: dialogType === 'in' ? 'Entrée' : 'Sortie',
      item: ingredientName,
      ingredient_id: selectedIngredient.id,
      category: value(selectedIngredient.data.category),
      quantity,
      unit: ingredientUnit,
      source,
      recipient,
      counterparty_type: fields.counterparty_type,
      price: numberValue(fields.price),
      notes: fields.notes,
    };

    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        module: 'sales/partner-stock',
        title: `${dialogType === 'in' ? 'Receipt' : 'Issue'} - ${ingredientName}`,
        data,
      }),
    });
    const payload = await response.json();
    if (response.ok && payload.item?.id) {
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.item.id, status: 'acknowledged' }),
      });
    }
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save movement.');
    setDialogType(null);
    setMessage('Stock movement recorded.');
    await load();
  }

  const counterparties = dialogType === 'in'
    ? [
        { value: 'Market (Supplier)', label: 'Market (Supplier)' },
        ...kitchens.map(row => ({ value: sourceName(row, 'name'), label: sourceName(row, 'name') })),
        ...salePoints.filter(row => row.id !== salePoint).map(row => ({ value: sourceName(row, 'name'), label: sourceName(row, 'name') })),
        { value: 'Other', label: 'Other' },
      ]
    : [
        { value: 'Direct Sale', label: 'Direct Sale' },
        { value: 'Donation / Spoilage', label: 'Donation / Spoilage' },
        { value: 'Kitchen Use', label: 'Kitchen Use' },
        ...kitchens.map(row => ({ value: sourceName(row, 'name'), label: sourceName(row, 'name') })),
        ...salePoints.filter(row => row.id !== salePoint).map(row => ({ value: sourceName(row, 'name'), label: sourceName(row, 'name') })),
        { value: 'Other', label: 'Other' },
      ];

  return <div className="grid gap-7 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-3xl font-black">Sale Point Stock Management</h2>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => openDialog('in')} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">
          <Plus className="h-4 w-4" />Receipt Stock
        </button>
        <button onClick={() => openDialog('out')} className="flex items-center gap-2 rounded-md border bg-white px-5 py-3 text-sm font-bold">
          <Minus className="h-4 w-4" />Move Out Stock
        </button>
      </div>
    </div>

    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
      message.includes('Unable') || message.includes('Select') || message.includes('Insufficient') || message.includes('greater')
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Sale Point Stock Levels</h3>
      <p className="mt-1 text-sm text-slate-500">An overview of ingredient stock levels for a specific sale point.</p>
      <div className="mt-4 flex max-w-xl items-center gap-4">
        <Filter className="h-5 w-5 text-slate-500" />
        <select className="admin-input" value={salePoint} onChange={event => setSalePoint(event.target.value)}>
          <option value="">Filter by sale point...</option>
          {salePoints.map(row => <option key={row.id} value={row.id}>{sourceName(row, 'name')}</option>)}
        </select>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead><tr className="border-b text-slate-500">
            <th className="p-3">Ingredient</th><th className="p-3">Category</th><th className="p-3">Quantity</th>
            <th className="p-3">Unit</th><th className="p-3">Last Updated</th>
          </tr></thead>
          <tbody>{stock.length ? stock.map(item => <tr key={item.name} className="border-b">
            <td className="p-3 font-semibold">{item.name}</td><td className="p-3">{item.category || 'N/A'}</td>
            <td className={`p-3 font-bold ${item.quantity < 0 ? 'text-red-700' : ''}`}>{item.quantity.toLocaleString('fr-FR')}</td>
            <td className="p-3">{item.unit || 'N/A'}</td><td className="p-3">{new Date(item.updatedAt).toLocaleDateString('fr-FR')}</td>
          </tr>) : <tr><td colSpan={5} className="h-28 text-center text-slate-500">
            No stock items to display for the selected sale point.
          </td></tr>}</tbody>
        </table>
      </div>
    </section>

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Stock Movements</h3>
      <p className="mt-1 text-sm text-slate-500">A log of all recent stock movements for the selected sale point.</p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead><tr className="border-b text-slate-500">
            <th className="p-3">Date</th><th className="p-3">Movement ID</th><th className="p-3">Ingredient</th>
            <th className="p-3">Type/Status</th><th className="p-3">Quantity</th><th className="p-3">Source</th>
            <th className="p-3">Recipient</th><th className="p-3">Sale Price (FCFA)</th>
          </tr></thead>
          <tbody>{pointMovements.length ? pointMovements.map(row => {
            const direction = value(row.data.direction);
            return <tr key={row.id} className="border-b">
              <td className="p-3">{new Date(value(row.data.movement_date) || row.created_at).toLocaleDateString('fr-FR')}</td>
              <td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8).toUpperCase()}</td>
              <td className="p-3 font-semibold">{value(row.data.item) || row.title}</td>
              <td className="p-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                direction === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}>{direction === 'in' ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                {direction === 'in' ? 'In' : 'Out'}
              </span></td>
              <td className="p-3">{numberValue(row.data.quantity).toLocaleString('fr-FR')} {value(row.data.unit)}</td>
              <td className="p-3">{value(row.data.source) || 'N/A'}</td><td className="p-3">{value(row.data.recipient) || 'N/A'}</td>
              <td className="p-3">{numberValue(row.data.price) > 0 ? numberValue(row.data.price).toLocaleString('fr-FR') : 'N/A'}</td>
            </tr>;
          }) : <tr><td colSpan={8} className="h-28 text-center text-slate-500">No stock movements found.</td></tr>}</tbody>
        </table>
      </div>
    </section>

    {dialogType && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDialogType(null)}>
      <section className="my-6 w-full max-w-2xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6">
          <div><h3 className="text-2xl font-black">{dialogType === 'in' ? 'Receipt New Stock' : 'Move Out Stock'}</h3>
            <p className="mt-1 text-sm text-slate-500">Record a new stock movement. Fill in the details below.</p></div>
          <button onClick={() => setDialogType(null)} title="Close"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={save} className="grid gap-5 p-6">
          <label className="grid gap-2 text-sm font-semibold">Sale Point
            <input className="admin-input bg-slate-50" value={selectedPointName} readOnly />
          </label>
          <label className="grid gap-2 text-sm font-semibold">Date of Movement
            <input className="admin-input" name="movement_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">{dialogType === 'in' ? 'Source' : 'Recipient'}
            <select className="admin-input" name="counterparty_type" required value={counterparty} onChange={event => setCounterparty(event.target.value)}>
              <option value="">Select {dialogType === 'in' ? 'a source' : 'a recipient'}...</option>
              {counterparties.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {counterparty === 'Other' && <label className="grid gap-2 text-sm font-semibold">Specify Other
            <input className="admin-input" required value={otherCounterparty} onChange={event => setOtherCounterparty(event.target.value)} placeholder="Enter the source or recipient" />
          </label>}
          <label className="grid gap-2 text-sm font-semibold">Ingredient
            <select className="admin-input" required value={ingredientName} onChange={event => setIngredientName(event.target.value)}>
              <option value="">Select an ingredient...</option>
              {ingredients.map(row => {
                const name = sourceName(row, 'name');
                const available = stock.find(item => item.name === name)?.quantity || 0;
                return <option key={row.id} value={name} disabled={dialogType === 'out' && available <= 0}>
                  {name}{dialogType === 'out' ? ` (${available.toLocaleString('fr-FR')} ${value(row.data.unit)} available)` : ''}
                </option>;
              })}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">Quantity
              <div className="flex items-center gap-2"><input className="admin-input" name="quantity" type="number" min="0.001" step="any" required />
                {ingredientUnit && <span className="text-sm text-slate-500">{ingredientUnit}</span>}</div>
            </label>
            {dialogType === 'out' && counterparty === 'Direct Sale' && <label className="grid gap-2 text-sm font-semibold">Sale Price (FCFA)
              <input className="admin-input" name="price" type="number" min="0" required />
            </label>}
          </div>
          <label className="grid gap-2 text-sm font-semibold">Notes (Optional)
            <textarea className="admin-input min-h-20" name="notes" />
          </label>
          <div className="flex justify-end gap-3 border-t pt-5">
            <button type="button" onClick={() => setDialogType(null)} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">
              {busy ? 'Saving...' : 'Confirm Movement'}
            </button>
          </div>
        </form>
      </section>
    </div>}
  </div>;
}
