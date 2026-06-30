'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Edit, Filter, Minus, Plus, Trash2, X } from 'lucide-react';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type Direction = 'in' | 'out';

const text = (input: unknown) => typeof input === 'string' ? input : '';
const numeric = (input: unknown) => Number(input || 0);

function rowName(row: Row, key = 'name') {
  return text(row.data[key]) || row.title;
}

export default function CentralStockManagement() {
  const [movements, setMovements] = useState<Row[]>([]);
  const [kitchens, setKitchens] = useState<Row[]>([]);
  const [ingredients, setIngredients] = useState<Row[]>([]);
  const [salePoints, setSalePoints] = useState<Row[]>([]);
  const [stockKitchenFilter, setStockKitchenFilter] = useState('all');
  const [kitchenFilter, setKitchenFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [recipientFilter, setRecipientFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [dialogType, setDialogType] = useState<Direction | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [kitchenId, setKitchenId] = useState('');
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
    const [movementRows, kitchenRows, ingredientRows, pointRows] = await Promise.all([
      fetchModule('supply/central-stock'),
      fetchModule('production/central-kitchens'),
      fetchModule('supply/ingredients'),
      fetchModule('sales/sale-points'),
    ]);
    setMovements(movementRows);
    setKitchens(kitchenRows);
    setIngredients(ingredientRows);
    setSalePoints(pointRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load central stock.'));
  }, []);

  const kitchenMap = useMemo(() => new Map(kitchens.map(row => [row.id, rowName(row)])), [kitchens]);
  const stock = useMemo(() => {
    const balances = new Map<string, {
      kitchenId: string;
      kitchenName: string;
      ingredient: string;
      category: string;
      quantity: number;
      unit: string;
      updatedAt: string;
    }>();
    movements.forEach(row => {
      if (['rejected', 'archived'].includes(row.status)) return;
      const currentKitchenId = text(row.data.central_kitchen_id);
      if (!currentKitchenId) return;
      const ingredient = text(row.data.item) || row.title;
      const key = `${currentKitchenId}|${ingredient.toLowerCase()}`;
      const current = balances.get(key) || {
        kitchenId: currentKitchenId,
        kitchenName: text(row.data.central_kitchen) || kitchenMap.get(currentKitchenId) || 'Unknown Kitchen',
        ingredient,
        category: text(row.data.category),
        quantity: 0,
        unit: text(row.data.unit),
        updatedAt: row.updated_at || row.created_at,
      };
      const direction = text(row.data.direction) === 'out' ? -1 : 1;
      current.quantity += direction * Math.abs(numeric(row.data.quantity));
      if (new Date(row.updated_at || row.created_at) > new Date(current.updatedAt)) current.updatedAt = row.updated_at || row.created_at;
      balances.set(key, current);
    });
    return Array.from(balances.values())
      .filter(item => Math.abs(item.quantity) > 0.001)
      .sort((a, b) => a.kitchenName.localeCompare(b.kitchenName) || a.ingredient.localeCompare(b.ingredient));
  }, [movements, kitchenMap]);
  const displayedStock = stock.filter(item => stockKitchenFilter === 'all' || item.kitchenId === stockKitchenFilter);

  const sources = useMemo(() => [...new Set(movements.map(row => text(row.data.source)).filter(Boolean))].sort(), [movements]);
  const recipients = useMemo(() => [...new Set(movements.map(row => text(row.data.recipient)).filter(Boolean))].sort(), [movements]);
  const filteredMovements = movements.filter(row =>
    (kitchenFilter === 'all' || text(row.data.central_kitchen_id) === kitchenFilter) &&
    (typeFilter === 'all' || text(row.data.direction) === typeFilter) &&
    (sourceFilter === 'all' || text(row.data.source) === sourceFilter) &&
    (recipientFilter === 'all' || text(row.data.recipient) === recipientFilter)
  );

  const selectedIngredient = ingredients.find(row => rowName(row).toLowerCase() === ingredientName.toLowerCase());
  const selectedKitchenName = kitchenMap.get(kitchenId) || '';
  const available = stock.find(item => item.kitchenId === kitchenId && item.ingredient === ingredientName)?.quantity || 0;

  function openDialog(type: Direction, row?: Row) {
    setDialogType(type);
    setEditing(row || null);
    setKitchenId(text(row?.data.central_kitchen_id));
    setIngredientName(text(row?.data.item));
    const party = type === 'in' ? text(row?.data.source) : text(row?.data.recipient);
    const standardParties = [
      'Market (Supplier)', 'Direct Sale', 'Donation / Spoilage', 'Kitchen Use',
      ...salePoints.map(item => rowName(item)), ...kitchens.map(item => rowName(item)),
    ];
    setCounterparty(party && !standardParties.includes(party) ? 'Other' : party);
    setOtherCounterparty(party && !standardParties.includes(party) ? party : '');
    setMessage('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogType || !selectedIngredient || !kitchenId) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const quantity = numeric(fields.quantity);
    const party = counterparty === 'Other' ? otherCounterparty.trim() : counterparty;
    if (!party) return setMessage('Specify the source or recipient.');
    if (quantity <= 0) return setMessage('Quantity must be greater than zero.');
    const previousQuantity = editing ? numeric(editing.data.quantity) : 0;
    const maximum = available + (editing && text(editing.data.direction) === 'out' ? previousQuantity : 0);
    if (dialogType === 'out' && quantity > maximum) {
      return setMessage(`Insufficient stock. Available: ${maximum.toLocaleString('fr-FR')} ${text(selectedIngredient.data.unit)}.`);
    }
    const data = {
      central_kitchen_id: kitchenId,
      central_kitchen: selectedKitchenName,
      date: fields.date,
      direction: dialogType,
      movement_type: dialogType === 'in' ? 'Entrée' : 'Sortie',
      item: ingredientName,
      ingredient_id: selectedIngredient.id,
      category: text(selectedIngredient.data.category),
      quantity,
      unit: text(selectedIngredient.data.unit),
      source: dialogType === 'in' ? party : 'Central Stock',
      recipient: dialogType === 'in' ? 'Central Stock' : party,
      counterparty_type: counterparty,
      price: numeric(fields.price),
      notes: fields.notes,
    };
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing
        ? { id: editing.id, title: `${dialogType === 'in' ? 'Receipt' : 'Issue'} - ${ingredientName}`, data }
        : { module: 'supply/central-stock', title: `${dialogType === 'in' ? 'Receipt' : 'Issue'} - ${ingredientName}`, data }),
    });
    const payload = await response.json();
    if (response.ok && !editing && payload.item?.id) {
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.item.id, status: 'acknowledged' }),
      });
    }
    setBusy(false);
    if (!response.ok) return setMessage(payload.message || 'Unable to save the stock movement.');
    setDialogType(null);
    setEditing(null);
    setMessage(editing ? 'Stock movement updated.' : 'Stock movement recorded.');
    await load();
  }

  async function remove(ids: string[]) {
    if (!ids.length || !confirm(`Delete ${ids.length} stock movement(s)?`)) return;
    await Promise.all(ids.map(id => fetch(`/api/maximus/records?id=${encodeURIComponent(id)}`, { method: 'DELETE' })));
    setSelected([]);
    setMessage(`${ids.length} stock movement(s) deleted.`);
    await load();
  }

  const counterparties = dialogType === 'in'
    ? ['Market (Supplier)', ...salePoints.map(row => rowName(row)), ...kitchens.filter(row => row.id !== kitchenId).map(row => rowName(row)), 'Other']
    : ['Direct Sale', 'Donation / Spoilage', 'Kitchen Use', ...salePoints.map(row => rowName(row)), ...kitchens.filter(row => row.id !== kitchenId).map(row => rowName(row)), 'Other'];

  return <div className="grid gap-7 text-slate-950">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-3xl font-black">Central Stock Management</h2>
      <div className="flex gap-2">
        <button onClick={() => openDialog('in')} className="flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Receipt Stock</button>
        <button onClick={() => openDialog('out')} className="flex items-center gap-2 rounded-md border bg-white px-5 py-3 text-sm font-bold"><Minus className="h-4 w-4" />Move Out Stock</button>
      </div>
    </div>
    {message && <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
      message.includes('Unable') || message.includes('Insufficient') || message.includes('Specify') || message.includes('greater')
        ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Central Kitchen Stock Levels</h3>
      <p className="mt-1 text-sm text-slate-500">Stock levels for each Central Kitchen&apos;s central warehouse. This does not include stock at individual sale points.</p>
      <div className="mt-4 flex max-w-xl items-center gap-4"><Filter className="h-5 w-5 text-slate-500" />
        <select className="admin-input" value={stockKitchenFilter} onChange={event => setStockKitchenFilter(event.target.value)}>
          <option value="all">All Kitchens</option>{kitchens.map(row => <option key={row.id} value={row.id}>{rowName(row)}</option>)}
        </select>
      </div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm">
        <thead><tr className="border-b text-slate-500"><th className="p-3">Central Kitchen</th><th className="p-3">Ingredient</th>
          <th className="p-3">Category</th><th className="p-3">Quantity</th><th className="p-3">Unit</th><th className="p-3">Last Updated</th></tr></thead>
        <tbody>{displayedStock.length ? displayedStock.map(item => <tr key={`${item.kitchenId}-${item.ingredient}`} className="border-b">
          <td className="p-3 font-semibold">{item.kitchenName}</td><td className="p-3">{item.ingredient}</td><td className="p-3">{item.category || 'N/A'}</td>
          <td className="p-3 font-semibold">{item.quantity.toLocaleString('fr-FR')}</td><td className="p-3">{item.unit}</td>
          <td className="p-3">{new Date(item.updatedAt).toLocaleDateString('fr-FR')}</td>
        </tr>) : <tr><td colSpan={6} className="h-28 text-center text-slate-500">No stock items to display for the selected filter.</td></tr>}</tbody>
      </table></div>
    </section>

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-black">Stock Movements</h3>
        <p className="mt-1 text-sm text-slate-500">A log of all recent stock movements. Use the filters to narrow down the results.</p></div>
        {selected.length > 0 && <button onClick={() => remove(selected)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white">Delete Selected ({selected.length})</button>}
      </div>
      <div className="mt-5 flex items-center gap-4"><Filter className="hidden h-5 w-5 text-slate-500 md:block" />
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select className="admin-input" value={kitchenFilter} onChange={event => setKitchenFilter(event.target.value)}><option value="all">All Kitchens</option>{kitchens.map(row => <option key={row.id} value={row.id}>{rowName(row)}</option>)}</select>
          <select className="admin-input" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}><option value="all">All Types</option><option value="in">In</option><option value="out">Out</option></select>
          <select className="admin-input" value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}><option value="all">All Sources</option>{sources.map(source => <option key={source}>{source}</option>)}</select>
          <select className="admin-input" value={recipientFilter} onChange={event => setRecipientFilter(event.target.value)}><option value="all">All Recipients</option>{recipients.map(recipient => <option key={recipient}>{recipient}</option>)}</select>
        </div>
      </div>
      <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[1200px] text-left text-sm">
        <thead><tr className="border-b text-slate-500">
          <th className="w-12 p-3"><input type="checkbox" checked={filteredMovements.length > 0 && filteredMovements.every(row => selected.includes(row.id))}
            onChange={event => setSelected(event.target.checked ? filteredMovements.map(row => row.id) : [])} /></th>
          <th className="p-3">Date</th><th className="p-3">Ingredient</th><th className="p-3">Type</th><th className="p-3">Quantity</th>
          <th className="p-3">Source</th><th className="p-3">Recipient</th><th className="p-3">Central Kitchen</th><th className="p-3">Price (FCFA)</th><th className="p-3 text-right">Actions</th>
        </tr></thead>
        <tbody>{filteredMovements.length ? filteredMovements.map(row => {
          const direction = text(row.data.direction) as Direction;
          return <tr key={row.id} className="border-b">
            <td className="p-3"><input type="checkbox" checked={selected.includes(row.id)} onChange={event => setSelected(current => event.target.checked ? [...new Set([...current, row.id])] : current.filter(id => id !== row.id))} /></td>
            <td className="p-3">{new Date(text(row.data.date) || row.created_at).toLocaleDateString('fr-FR')}</td><td className="p-3 font-semibold">{text(row.data.item) || row.title}</td>
            <td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${direction === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{direction === 'in' ? 'In' : 'Out'}</span></td>
            <td className="p-3">{numeric(row.data.quantity).toLocaleString('fr-FR')} {text(row.data.unit)}</td><td className="p-3">{text(row.data.source)}</td>
            <td className="p-3">{text(row.data.recipient)}</td><td className="p-3">{text(row.data.central_kitchen)}</td>
            <td className="p-3">{numeric(row.data.price) ? numeric(row.data.price).toLocaleString('fr-FR') : 'N/A'}</td>
            <td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => openDialog(direction || 'in', row)} title="Edit" className="rounded-md border p-2"><Edit className="h-4 w-4" /></button>
              <button onClick={() => remove([row.id])} title="Delete" className="rounded-md bg-red-600 p-2 text-white"><Trash2 className="h-4 w-4" /></button></div></td>
          </tr>;
        }) : <tr><td colSpan={10} className="h-28 text-center text-slate-500">No stock movements found for the selected filters.</td></tr>}</tbody>
      </table></div>
    </section>

    {dialogType && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/55 p-4" onMouseDown={() => setDialogType(null)}>
      <section className="my-6 w-full max-w-2xl rounded-lg bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b p-6"><div><h3 className="text-2xl font-black">{editing ? 'Edit Stock Movement' : dialogType === 'in' ? 'Receipt New Stock' : 'Move Out Stock'}</h3>
          <p className="mt-1 text-sm text-slate-500">Record a central kitchen stock movement.</p></div><button onClick={() => setDialogType(null)} title="Close"><X className="h-5 w-5" /></button></header>
        <form onSubmit={save} className="grid gap-5 p-6">
          <label className="grid gap-2 text-sm font-semibold">Central Kitchen<select className="admin-input" required value={kitchenId} onChange={event => { setKitchenId(event.target.value); setIngredientName(''); }}>
            <option value="">Select a kitchen</option>{kitchens.map(row => <option key={row.id} value={row.id}>{rowName(row)}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">Date of Movement<input className="admin-input" name="date" type="date" required defaultValue={text(editing?.data.date) || new Date().toISOString().slice(0, 10)} /></label>
          <label className="grid gap-2 text-sm font-semibold">{dialogType === 'in' ? 'Source' : 'Recipient'}<select className="admin-input" required value={counterparty} onChange={event => setCounterparty(event.target.value)}>
            <option value="">Select {dialogType === 'in' ? 'a source' : 'a recipient'}...</option>{[...new Set(counterparties)].map(option => <option key={option}>{option}</option>)}</select></label>
          {counterparty === 'Other' && <label className="grid gap-2 text-sm font-semibold">Specify Other<input className="admin-input" required value={otherCounterparty} onChange={event => setOtherCounterparty(event.target.value)} /></label>}
          <label className="grid gap-2 text-sm font-semibold">Ingredient<select className="admin-input" required value={ingredientName} onChange={event => setIngredientName(event.target.value)}>
            <option value="">Select an ingredient</option>{ingredients.map(row => {
              const name = rowName(row); const quantity = stock.find(item => item.kitchenId === kitchenId && item.ingredient === name)?.quantity || 0;
              return <option key={row.id} value={name} disabled={dialogType === 'out' && quantity <= 0}>{name}{dialogType === 'out' ? ` (${quantity.toLocaleString('fr-FR')} ${text(row.data.unit)} available)` : ''}</option>;
            })}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold">Quantity<div className="flex items-center gap-2"><input className="admin-input" name="quantity" type="number" min="0.001" step="any" required defaultValue={numeric(editing?.data.quantity) || ''} />
            <span className="text-sm text-slate-500">{text(selectedIngredient?.data.unit)}</span></div></label>
            {dialogType === 'out' && counterparty === 'Direct Sale' && <label className="grid gap-2 text-sm font-semibold">Price (FCFA)<input className="admin-input" name="price" type="number" min="0" required defaultValue={numeric(editing?.data.price) || ''} /></label>}</div>
          <label className="grid gap-2 text-sm font-semibold">Notes (Optional)<textarea className="admin-input min-h-20" name="notes" defaultValue={text(editing?.data.notes)} /></label>
          <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={() => setDialogType(null)} className="btn-secondary">Cancel</button>
            <button disabled={busy} className="rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white">{busy ? 'Saving...' : editing ? 'Save Changes' : 'Confirm Movement'}</button></div>
        </form>
      </section>
    </div>}
  </div>;
}
