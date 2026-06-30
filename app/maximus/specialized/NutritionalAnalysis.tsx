'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, FlaskConical, Loader2, Printer, RefreshCw } from 'lucide-react';
import type { MaximusNutritionAnalysis, NutritionMeasure } from '@/lib/maximus-nutrition-analysis';

type Row = {
  id: string;
  reference?: string | null;
  title: string;
  status: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const number = (value: unknown) => Number(value || 0);

function format(value: number, unit: string) {
  return value > 0 ? `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}` : 'N/D';
}

function MeasureGrid({ measure }: { measure: NutritionMeasure }) {
  const items = [
    ['Energy', format(measure.calories, 'kcal')],
    ['Protein', format(measure.protein_g, 'g')],
    ['Carbohydrates', format(measure.carbohydrates_g, 'g')],
    ['Fat', format(measure.fat_g, 'g')],
    ['Fiber', format(measure.fiber_g, 'g')],
    ['Sodium', format(measure.sodium_mg, 'mg')],
  ];
  return <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{items.map(([label, value]) =>
    <div key={label} className="rounded-md border bg-slate-50 p-4 text-center"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-lg font-black text-emerald-800">{value}</p></div>
  )}</div>;
}

function ListSection({ title, items, tone = 'normal' }: { title: string; items: string[]; tone?: 'normal' | 'warning' | 'success' }) {
  if (!items.length) return null;
  const style = tone === 'warning' ? 'border-amber-200 bg-amber-50' : tone === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white';
  return <section className={`rounded-md border p-5 ${style}`}><h4 className="font-black">{title}</h4><ul className="mt-3 grid gap-2 text-sm leading-6">{items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />{item}</li>)}</ul></section>;
}

export default function NutritionalAnalysis() {
  const [menus, setMenus] = useState<Row[]>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<Row[]>([]);
  const [menuId, setMenuId] = useState('');
  const [language, setLanguage] = useState<'en' | 'fr'>('en');
  const [analysis, setAnalysis] = useState<MaximusNutritionAnalysis | null>(null);
  const [source, setSource] = useState<'new' | 'cache' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function fetchModule(module: string) {
    const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(module)}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || `Unable to load ${module}.`);
    return payload.items || [];
  }

  async function load() {
    const [menuRows, analysisRows] = await Promise.all([fetchModule('menus'), fetchModule('nutrition-analysis')]);
    setMenus(menuRows.filter((row: Row) => row.status !== 'archived'));
    setSavedAnalyses(analysisRows);
  }

  useEffect(() => {
    load().catch(error => setMessage(error instanceof Error ? error.message : 'Unable to load nutritional analysis.'));
  }, []);

  const selectedMenu = useMemo(() => menus.find(row => row.id === menuId), [menus, menuId]);

  function cachedAnalysis(menu: Row) {
    return savedAnalyses.find(row =>
      text(row.data.menu_id) === menu.id &&
      text(row.data.language) === language &&
      text(row.data.source_menu_updated_at) === (menu.updated_at || menu.created_at) &&
      row.data.analysis &&
      typeof row.data.analysis === 'object'
    );
  }

  async function persist(result: MaximusNutritionAnalysis, menu: Row) {
    if (result.ai_provider === 'local') return;
    const existing = savedAnalyses.find(row => text(row.data.menu_id) === menu.id && text(row.data.language) === language);
    const data = {
      menu_id: menu.id,
      menu: menu.title,
      language,
      source_menu_updated_at: menu.updated_at || menu.created_at,
      serving_size: result.serving_description,
      energy_kcal: result.portion.calories,
      protein_g: result.portion.protein_g,
      carbohydrates_g: result.portion.carbohydrates_g,
      fat_g: result.portion.fat_g,
      fiber_g: result.portion.fiber_g,
      micronutrients: result.micronutrients,
      interpretation: result.nutritional_summary,
      analysis: result,
      analyzed_at: new Date().toISOString(),
      ai_provider: result.ai_provider,
    };
    const response = await fetch('/api/maximus/records', {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing
        ? { id: existing.id, title: `Nutrition - ${menu.title} (${language})`, data }
        : { module: 'nutrition-analysis', title: `Nutrition - ${menu.title} (${language})`, data }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Unable to cache the analysis.');
    if (!existing) {
      await fetch('/api/maximus/records', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payload.item.id, status: 'validated', data }),
      });
    }
  }

  async function analyze(force = false) {
    if (!selectedMenu) return setMessage('Please select a menu.');
    if (!selectedMenu.data.ingredients || number(selectedMenu.data.servings) <= 0) {
      return setMessage('The selected menu requires ingredients and a valid number of servings.');
    }
    const cached = cachedAnalysis(selectedMenu);
    if (cached && !force) {
      setAnalysis(cached.data.analysis as MaximusNutritionAnalysis);
      setSource('cache');
      setMessage('Previously validated analysis loaded from cache.');
      return;
    }
    setBusy(true);
    setAnalysis(null);
    setMessage('');
    try {
      const response = await fetch('/api/maximus/nutrition-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu: { title: selectedMenu.title, ...selectedMenu.data }, language }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Nutritional analysis failed.');
      const result = payload.analysis as MaximusNutritionAnalysis;
      setAnalysis(result);
      setSource('new');
      await persist(result, selectedMenu);
      await load();
      setMessage(result.ai_provider === 'local'
        ? 'External AI is unavailable. A cautious local fallback is displayed without invented nutrient values.'
        : `Analysis completed with ${result.ai_provider} and saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nutritional analysis failed.');
    } finally {
      setBusy(false);
    }
  }

  function changeMenu(value: string) {
    setMenuId(value);
    setAnalysis(null);
    setSource(null);
    setMessage('');
  }

  function changeLanguage(value: 'en' | 'fr') {
    setLanguage(value);
    setAnalysis(null);
    setSource(null);
    setMessage('');
  }

  return <div className="grid gap-7 text-slate-950">
    <h2 className="text-3xl font-black">Nutritional Analysis (AI-Powered)</h2>

    <section className="mx-auto w-full max-w-4xl rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700"><FlaskConical className="h-5 w-5" /></span><div><h3 className="text-xl font-black">Analyze a Meal</h3><p className="mt-1 text-sm text-slate-500">Select a menu and language to generate a structured nutritional assessment. Valid results are cached until the menu changes.</p></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">Select a Menu<select className="admin-input" value={menuId} onChange={event => changeMenu(event.target.value)}><option value="">Select a menu</option>{menus.map(row => <option key={row.id} value={row.id}>{text(row.data.name) || row.title}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-semibold">Language<select className="admin-input" value={language} onChange={event => changeLanguage(event.target.value as 'en' | 'fr')}><option value="en">English</option><option value="fr">Français</option></select></label>
      </div>
      {selectedMenu && <div className="mt-4 grid gap-2 rounded-md border bg-slate-50 p-4 text-sm sm:grid-cols-3"><div><span className="text-slate-500">Servings</span><p className="font-bold">{number(selectedMenu.data.servings) || 'Missing'}</p></div><div><span className="text-slate-500">Meal</span><p className="font-bold">{text(selectedMenu.data.meal_type) || 'Not specified'}</p></div><div><span className="text-slate-500">Ingredients</span><p className="truncate font-bold">{text(selectedMenu.data.ingredients) || 'Missing'}</p></div></div>}
      <button onClick={() => analyze(false)} disabled={busy || !selectedMenu} className="mt-5 flex items-center gap-2 rounded-md bg-[#24945f] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}Analyze Nutrition</button>
    </section>

    {message && <div className={`mx-auto flex w-full max-w-4xl items-start gap-3 rounded-md border px-4 py-3 text-sm font-semibold ${
      message.includes('failed') || message.includes('requires') || message.includes('unavailable')
        ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'
    }`}>{message.includes('failed') || message.includes('requires') || message.includes('unavailable') ? <AlertTriangle className="h-5 shrink-0" /> : <CheckCircle2 className="h-5 shrink-0" />}{message}</div>}

    {busy ? <div className="grid place-items-center gap-4 py-16 text-slate-500"><Loader2 className="h-11 w-11 animate-spin text-emerald-700" /><p>Analyzing ingredients, portions, nutrients, and limitations...</p></div>
      : analysis ? <article id="maximus-nutrition-report" className="mx-auto grid w-full max-w-6xl gap-5 print:max-w-none">
        <header className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Nutritional Analysis</p><h3 className="mt-2 text-3xl font-black">{analysis.menu_name}</h3><p className="mt-2 text-sm text-slate-500">{analysis.serving_description} | {analysis.servings} servings | Confidence: <strong className="uppercase">{analysis.confidence}</strong></p></div><div className="flex gap-2 print:hidden"><button onClick={() => analyze(true)} disabled={busy} title="Refresh Analysis" className="rounded-md border p-3"><RefreshCw className="h-4 w-4" /></button><button onClick={() => window.print()} title="Print Analysis" className="rounded-md bg-[#24945f] p-3 text-white"><Printer className="h-4 w-4" /></button></div></div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Provider: {analysis.ai_provider}</span>{source && <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Source: {source}</span>}</div>
        </header>

        <section className="rounded-lg border bg-white p-6 shadow-sm"><h4 className="text-lg font-black">Estimated nutrients per serving</h4><div className="mt-4"><MeasureGrid measure={analysis.portion} /></div><h4 className="mt-7 text-lg font-black">Estimated totals for complete recipe</h4><div className="mt-4"><MeasureGrid measure={analysis.recipe_total} /></div></section>

        <section className="rounded-lg border bg-white p-6 shadow-sm"><h4 className="text-lg font-black">Integrated interpretation</h4><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{analysis.nutritional_summary}</p></section>

        <div className="grid gap-5 lg:grid-cols-2"><ListSection title="Potential nutritional benefits" items={analysis.health_benefits} tone="success" /><ListSection title="Attention points" items={analysis.attention_points} tone="warning" /><ListSection title="Operational recommendations" items={analysis.operational_recommendations} /><ListSection title="Methodological limitations" items={analysis.limitations} tone="warning" /></div>

        {analysis.micronutrients.length > 0 && <section className="rounded-lg border bg-white p-6 shadow-sm"><h4 className="text-lg font-black">Micronutrients</h4><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Nutrient</th><th className="p-3">Estimated amount</th><th className="p-3">Interpretation</th></tr></thead><tbody>{analysis.micronutrients.map((row, index) => <tr key={`${row.nutrient}-${index}`} className="border-b"><td className="p-3 font-bold">{row.nutrient}</td><td className="p-3">{row.amount === null ? 'N/D' : `${row.amount} ${row.unit}`}</td><td className="p-3 leading-6">{row.significance}</td></tr>)}</tbody></table></div></section>}

        {analysis.ingredient_assessment.length > 0 && <section className="rounded-lg border bg-white p-6 shadow-sm"><h4 className="text-lg font-black">Ingredient-by-ingredient assessment</h4><div className="mt-4 grid gap-3">{analysis.ingredient_assessment.map((row, index) => <div key={`${row.ingredient}-${index}`} className="grid gap-2 rounded-md border p-4 md:grid-cols-[180px_1fr_1fr]"><p className="font-black">{row.ingredient}</p><p className="text-sm leading-6"><strong>Contribution:</strong> {row.contribution}</p><p className="text-sm leading-6"><strong>Attention:</strong> {row.attention}</p></div>)}</div></section>}

        <section className="rounded-lg border bg-white p-6 shadow-sm"><h4 className="text-lg font-black">Likely allergens</h4><p className="mt-3 text-sm leading-6 text-slate-700">{analysis.allergens.length ? analysis.allergens.join(', ') : 'No allergen could be identified from the supplied information. Cross-contamination and brand-specific ingredients remain possible.'}</p><p className="mt-5 border-t pt-4 text-xs leading-5 text-slate-500">AI-powered nutritional estimate for operational guidance. Values may vary with ingredient variety, brand, edible yield, cooking losses, portioning, and recipe execution. This report does not replace laboratory analysis or individualized clinical advice.</p></section>
      </article>
      : <div className="py-14 text-center text-slate-500">Select a menu and click “Analyze Nutrition” to see the detailed results.</div>}
  </div>;
}
