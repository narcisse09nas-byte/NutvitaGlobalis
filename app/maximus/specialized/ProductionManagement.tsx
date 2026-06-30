'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, History, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react';

type Row = {
  id: string;
  reference?: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
};

type Need = { item: string; quantity: number; unit: string };
type MenuQuantity = { id: string; name: string; dishes: number };

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function weekOptions() {
  const result: Array<{ value: string; label: string }> = [];
  const now = new Date();
  for (let offset = -2; offset <= 8; offset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset * 7);
    const firstThursday = new Date(date.getFullYear(), 0, 4);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const yearStart = new Date(firstThursday);
    yearStart.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7));
    const week = Math.floor((weekStart.getTime() - yearStart.getTime()) / 604800000) + 1;
    const value = `${weekStart.getFullYear()}-${String(week).padStart(2, '0')}`;
    result.push({ value, label: `Week ${week}, ${weekStart.getFullYear()}` });
  }
  return result;
}

function parseIngredients(value: unknown): Need[] {
  if (Array.isArray(value)) {
    return value.map(raw => {
      const row = raw as Record<string, unknown>;
      return { item: text(row.item) || text(row.name), quantity: number(row.quantity), unit: text(row.unit) };
    }).filter(row => row.item && row.quantity > 0);
  }
  return text(value).split(/\r?\n/).map(line => {
    const [item, quantity, unit] = line.split('|').map(part => part.trim());
    return { item, quantity: number(quantity), unit };
  }).filter(row => row.item && row.quantity > 0);
}

export default function ProductionManagement() {
  const [records, setRecords] = useState<Row[]>([]);
  const [kitchens, setKitchens] = useState<Row[]>([]);
  const [salePoints, setSalePoints] = useState<Row[]>([]);
  const [menus, setMenus] = useState<Row[]>([]);
  const [ingredients, setIngredients] = useState<Row[]>([]);
  const [weeklyKitchen, setWeeklyKitchen] = useState('');
  const [weeklyWeek, setWeeklyWeek] = useState('');
  const [weeklyKitchenFilter, setWeeklyKitchenFilter] = useState('all');
  const [weeklyStatusFilter, setWeeklyStatusFilter] = useState('all');
  const [planName, setPlanName] = useState('');
  const [salePoint, setSalePoint] = useState('');
  const [weekPlan, setWeekPlan] = useState('');
  const [menuQuantities, setMenuQuantities] = useState<MenuQuantity[]>([]);
  const [specificNeeds, setSpecificNeeds] = useState<Need[]>([]);
  const [needs, setNeeds] = useState<Need[] | null>(null);
  const [search, setSearch] = useState('');
  const [productionKitchenFilter, setProductionKitchenFilter] = useState('all');
  const [productionStatusFilter, setProductionStatusFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const weeks = useMemo(weekOptions, []);

  async function load() {
    const modules = ['production/planning', 'production/central-kitchens', 'sales/sale-points', 'menus', 'supply/ingredients'];
    const values = await Promise.all(modules.map(async module => {
      const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
      return response.ok ? (await response.json()).items || [] : [];
    }));
    setRecords(values[0]);
    setKitchens(values[1]);
    setSalePoints(values[2]);
    setMenus(values[3]);
    setIngredients(values[4]);
  }

  useEffect(() => { load().catch(() => setMessage('Unable to load production data.')); }, []);

  const weeklyPlans = records.filter(row => row.data.record_type === 'weekly_menu_plan');
  const productionPlans = records.filter(row => row.data.record_type !== 'weekly_menu_plan');
  const selectedSalePoint = salePoints.find(row => row.id === salePoint || text(row.data.name) === salePoint);
  const attachedKitchen = text(selectedSalePoint?.data.central_kitchen);
  const validatedWeeks = weeklyPlans.filter(row =>
    row.status === 'validated' && (!attachedKitchen || text(row.data.central_kitchen) === attachedKitchen)
  );

  const filteredWeekly = weeklyPlans.filter(row =>
    (weeklyKitchenFilter === 'all' || text(row.data.central_kitchen) === weeklyKitchenFilter) &&
    (weeklyStatusFilter === 'all' || row.status === weeklyStatusFilter)
  );

  const filteredProduction = productionPlans.filter(row =>
    (!search || text(row.data.plan_name).toLowerCase().includes(search.toLowerCase())) &&
    (productionKitchenFilter === 'all' || text(row.data.central_kitchen) === productionKitchenFilter) &&
    (productionStatusFilter === 'all' || row.status === productionStatusFilter)
  );

  async function createRecord(data: Record<string, unknown>, title: string) {
    setBusy(true);
    const response = await fetch('/api/maximus/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'production/planning', title, data }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.message || 'Unable to save the production plan.');
      return false;
    }
    await load();
    return true;
  }

  async function saveWeeklyPlan() {
    if (!weeklyKitchen || !weeklyWeek) return;
    const [year, week] = weeklyWeek.split('-');
    const ok = await createRecord({
      record_type: 'weekly_menu_plan',
      central_kitchen: weeklyKitchen,
      year: Number(year),
      week_number: Number(week),
      menu_assignments: [],
    }, `${weeklyKitchen} - Week ${week}/${year}`);
    if (ok) setMessage('Weekly menu plan saved as draft.');
  }

  function calculateNeeds() {
    const totals = new Map<string, Need>();
    const add = (row: Need, multiplier = 1) => {
      const key = `${row.item.toLowerCase()}|${row.unit.toLowerCase()}`;
      const current = totals.get(key);
      totals.set(key, { ...row, quantity: (current?.quantity || 0) + row.quantity * multiplier });
    };
    menuQuantities.filter(row => row.dishes > 0).forEach(selection => {
      const menu = menus.find(row => row.id === selection.id);
      if (!menu) return;
      const servings = Math.max(number(menu.data.servings), 1);
      parseIngredients(menu.data.ingredients).forEach(row => add(row, (selection.dishes * 7) / servings));
    });
    specificNeeds.forEach(row => add(row));
    setNeeds([...totals.values()].map(row => ({ ...row, quantity: Number(row.quantity.toFixed(2)) })));
  }

  async function saveProductionPlan() {
    if (!needs || !planName || !salePoint || !weekPlan) return;
    const selectedWeek = weeklyPlans.find(row => row.id === weekPlan);
    const selectedPointName = text(selectedSalePoint?.data.name) || salePoint;
    const ok = await createRecord({
      record_type: 'production_plan',
      plan_name: planName,
      sale_point: selectedPointName,
      central_kitchen: attachedKitchen || text(selectedWeek?.data.central_kitchen),
      week_plan_id: weekPlan,
      period_start: `${selectedWeek?.data.year || ''}-W${String(selectedWeek?.data.week_number || '').padStart(2, '0')}`,
      menus_quantities: menuQuantities.filter(row => row.dishes > 0),
      specific_ingredients: specificNeeds,
      ingredient_items: needs,
    }, planName);
    if (ok) {
      setMessage('Production plan saved.');
      setNeeds(null);
      setPlanName('');
    }
  }

  async function changeStatus(row: Row, status: string) {
    const response = await fetch('/api/maximus/records', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: row.id, status }),
    });
    if (!response.ok) return setMessage('Unable to update the plan status.');
    await load();
  }

  function chooseWeekPlan(value: string) {
    setWeekPlan(value);
    setNeeds(null);
    setMenuQuantities(menus.map(menu => ({ id: menu.id, name: text(menu.data.name) || menu.reference || 'Menu', dishes: 0 })));
  }

  return <div className="grid gap-8 text-slate-950">
    <h2 className="text-3xl font-black">Production Management</h2>
    {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{message}</div>}

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Weekly Menu Planning</h3>
      <p className="mt-1 text-sm text-slate-500">Select a kitchen and a week to assign classic and special menus for each day.</p>
      <div className="mt-6 flex flex-col items-end gap-4 sm:flex-row">
        <label className="grid w-full gap-2 text-sm font-semibold sm:w-64">Central Kitchen
          <select className="admin-input" value={weeklyKitchen} onChange={event => setWeeklyKitchen(event.target.value)}>
            <option value="">Select a kitchen</option>
            {kitchens.map(row => <option key={row.id} value={text(row.data.name) || row.id}>{text(row.data.name) || row.reference}</option>)}
          </select>
        </label>
        <label className="grid w-full gap-2 text-sm font-semibold sm:w-64">Week
          <select className="admin-input" value={weeklyWeek} onChange={event => setWeeklyWeek(event.target.value)}>
            <option value="">Select a week</option>{weeks.map(row => <option key={row.value} value={row.value}>{row.label}</option>)}
          </select>
        </label>
        <button onClick={saveWeeklyPlan} disabled={!weeklyKitchen || !weeklyWeek || busy} className="ml-auto flex h-11 items-center gap-2 rounded-md bg-[#24945f] px-5 text-sm font-bold text-white disabled:opacity-45"><Save className="h-4 w-4" />Save Menu Plan</button>
      </div>
    </section>

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Weekly Menu Plan Register</h3>
      <p className="mt-1 text-sm text-slate-500">This register displays all the weekly menu plans that have been created.</p>
      <div className="mt-5 flex gap-4">
        <select className="admin-input max-w-60" value={weeklyKitchenFilter} onChange={event => setWeeklyKitchenFilter(event.target.value)}><option value="all">All Kitchens</option>{kitchens.map(row => <option key={row.id} value={text(row.data.name)}>{text(row.data.name)}</option>)}</select>
        <select className="admin-input max-w-52" value={weeklyStatusFilter} onChange={event => setWeeklyStatusFilter(event.target.value)}><option value="all">All Statuses</option><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="validated">Validated</option></select>
      </div>
      {filteredWeekly.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Plan ID</th><th className="p-3">Central Kitchen</th><th className="p-3">Year</th><th className="p-3">Week</th><th className="p-3">Last Updated</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>
        {filteredWeekly.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-mono">{row.reference || row.id.slice(0, 8)}</td><td className="p-3">{text(row.data.central_kitchen)}</td><td className="p-3">{number(row.data.year)}</td><td className="p-3">{number(row.data.week_number)}</td><td className="p-3">{new Date(row.created_at).toLocaleString('en-US')}</td><td className="p-3">{row.status}</td><td className="p-3 text-right">{row.status !== 'validated' && <button onClick={() => changeStatus(row, 'validated')} className="rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white">Validate</button>}</td></tr>)}
      </tbody></table></div> : <div className="py-14 text-center text-sm text-slate-500">No weekly menu plans have been created yet.</div>}
    </section>

    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">Food Needs Evaluation</h3>
        <p className="mt-1 text-sm text-slate-500">Select a sale point, a validated weekly plan, and menus to calculate total ingredient needs.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">Plan Name<input className="admin-input" placeholder="e.g., Week 42 Production" value={planName} onChange={event => setPlanName(event.target.value)} /></label>
          <label className="grid gap-2 text-sm font-semibold">Sale Point<select className="admin-input" value={salePoint} onChange={event => { setSalePoint(event.target.value); setWeekPlan(''); setNeeds(null); }}><option value="">Select a sale point...</option>{salePoints.map(row => <option key={row.id} value={row.id}>{text(row.data.name) || row.reference}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">Attached Central Kitchen<input className="admin-input bg-slate-50" readOnly value={attachedKitchen} /></label>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">Week Plan<select className="admin-input" disabled={!salePoint} value={weekPlan} onChange={event => chooseWeekPlan(event.target.value)}><option value="">Select a week plan...</option>{validatedWeeks.map(row => <option key={row.id} value={row.id}>{text(row.data.central_kitchen)} - Week {number(row.data.week_number)}/{number(row.data.year)}</option>)}</select></label>
        </div>
        <div className="mt-6">
          <p className="text-sm font-semibold">Menus &amp; Production Quantity per Day</p>
          <p className="mt-1 text-xs text-slate-500">Select menus and enter the number of dishes you plan to produce each selected day.</p>
          <div className="mt-3 max-h-64 overflow-y-auto rounded-md border p-4">
            {weekPlan ? menuQuantities.map((row, index) => <div key={row.id} className="flex items-center gap-4 border-b py-3 last:border-0"><span className="flex-1 text-sm font-semibold">{row.name}</span><input className="admin-input w-36" type="number" min="0" placeholder="Dishes/day" value={row.dishes || ''} onChange={event => setMenuQuantities(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, dishes: number(event.target.value) } : item))} /></div>) : <p className="py-5 text-center text-sm text-slate-500">Please select a week plan to see menus.</p>}
          </div>
        </div>
        <div className="mt-6">
          <p className="text-sm font-semibold">Specific Ingredients (Optional)</p>
          <p className="mt-1 text-xs text-slate-500">Add any individual ingredients not covered by the menus above.</p>
          <div className="mt-3 grid gap-3">{specificNeeds.map((row, index) => <div key={index} className="grid grid-cols-[1fr_140px_110px_44px] gap-2"><select className="admin-input" value={row.item} onChange={event => { const ingredient = ingredients.find(item => text(item.data.name) === event.target.value); setSpecificNeeds(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, item: event.target.value, unit: text(ingredient?.data.unit) } : item)); }}><option value="">Select an ingredient</option>{ingredients.map(item => <option key={item.id} value={text(item.data.name)}>{text(item.data.name)}</option>)}</select><input className="admin-input" type="number" value={row.quantity || ''} onChange={event => setSpecificNeeds(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: number(event.target.value) } : item))} /><input className="admin-input bg-slate-50" readOnly value={row.unit} /><button onClick={() => setSpecificNeeds(current => current.filter((_, itemIndex) => itemIndex !== index))} className="grid place-items-center rounded-md bg-red-600 text-white"><Trash2 className="h-4 w-4" /></button></div>)}</div>
          <button onClick={() => setSpecificNeeds(current => [...current, { item: '', quantity: 0, unit: '' }])} className="mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold"><Plus className="h-4 w-4" />Add Specific Ingredient</button>
        </div>
        <div className="mt-6 flex gap-3"><button onClick={calculateNeeds} disabled={!weekPlan} className="rounded-md bg-[#24945f] px-4 py-3 text-sm font-bold text-white disabled:opacity-45">Calculate Needs</button><button onClick={saveProductionPlan} disabled={!needs || busy} className="flex items-center gap-2 rounded-md bg-[#24945f] px-4 py-3 text-sm font-bold text-white disabled:opacity-45">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Plan</button></div>
      </section>

      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black">Consolidated Ingredient List</h3>
        <p className="mt-1 text-sm text-slate-500">Total ingredients required for your production plan.</p>
        {needs ? <table className="mt-6 w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Ingredient</th><th className="p-3 text-right">Total Quantity</th></tr></thead><tbody>{needs.map(row => <tr key={`${row.item}-${row.unit}`} className="border-b"><td className="p-3 font-semibold">{row.item}</td><td className="p-3 text-right">{row.quantity.toLocaleString()} {row.unit}</td></tr>)}</tbody></table> : <div className="py-20 text-center text-sm text-slate-500">Calculation results will appear here.</div>}
      </section>
    </div>

    <section className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black">Food Needs register</h3>
      <p className="mt-1 text-sm text-slate-500">Review and validate your saved production plans.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input className="admin-input pl-10" placeholder="Search by plan name..." value={search} onChange={event => setSearch(event.target.value)} /></label><select className="admin-input sm:max-w-60" value={productionKitchenFilter} onChange={event => setProductionKitchenFilter(event.target.value)}><option value="all">All Kitchens</option>{kitchens.map(row => <option key={row.id} value={text(row.data.name)}>{text(row.data.name)}</option>)}</select><select className="admin-input sm:max-w-52" value={productionStatusFilter} onChange={event => setProductionStatusFilter(event.target.value)}><option value="all">All Statuses</option><option value="draft">Draft</option><option value="submitted">Submitted</option><option value="validated">Validated</option></select></div>
      {filteredProduction.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Plan ID</th><th className="p-3">Plan Name</th><th className="p-3">Sale Point</th><th className="p-3">Central Kitchen</th><th className="p-3">Start Date</th><th className="p-3">Week Plan</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{filteredProduction.map(row => <tr key={row.id} className="border-b"><td className="p-3 font-mono text-xs">{row.reference || row.id.slice(0, 8)}</td><td className="p-3 font-semibold">{text(row.data.plan_name) || row.reference}</td><td className="p-3">{text(row.data.sale_point)}</td><td className="p-3">{text(row.data.central_kitchen)}</td><td className="p-3">{text(row.data.period_start) || '-'}</td><td className="p-3 font-mono text-xs">{text(row.data.week_plan_id) || 'N/A'}</td><td className="p-3">{row.status}</td><td className="p-3"><div className="flex justify-end gap-2"><button title="View Details" className="rounded-md border p-2"><Eye className="h-4 w-4" /></button><button title="History" className="rounded-md border p-2"><History className="h-4 w-4" /></button>{row.status !== 'validated' && <button onClick={() => changeStatus(row, 'validated')} className="flex items-center gap-2 rounded-md bg-[#24945f] px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4" />Validate</button>}</div></td></tr>)}</tbody></table></div> : <div className="py-16 text-center text-sm text-slate-500">You haven't saved any production plans yet.</div>}
    </section>
  </div>;
}
