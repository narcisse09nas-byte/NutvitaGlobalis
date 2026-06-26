'use client';

import { useEffect, useMemo, useState } from 'react';
import { Apple, ChefHat, Flame, Salad, Scale } from 'lucide-react';
import type { MaximusModule } from '@/lib/maximus-modules';
import MaximusRecords from '../MaximusRecords';

type RecordRow = {
  id: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

const linkedModules = ['menus', 'nutrition-analysis'];

export default function MenuNutritionRecords({ module }: { module: MaximusModule }) {
  const [recordsByModule, setRecordsByModule] = useState<Record<string, RecordRow[]>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(linkedModules.map(async slug => {
      const response = await fetch(`/api/maximus/records?module=${encodeURIComponent(slug)}`);
      const result = response.ok ? await response.json() : { items: [] };
      return [slug, result.items || []] as const;
    })).then(entries => {
      if (!cancelled) setRecordsByModule(Object.fromEntries(entries));
    }).catch(() => {
      if (!cancelled) setRecordsByModule({});
    });
    return () => { cancelled = true; };
  }, [module.slug]);

  const summary = useMemo(() => {
    const menus = recordsByModule.menus || [];
    const analyses = recordsByModule['nutrition-analysis'] || [];
    const calories = analyses.reduce((sum, row) => sum + Number(row.data.energy_kcal || 0), 0);
    const proteins = analyses.reduce((sum, row) => sum + Number(row.data.protein_g || 0), 0);
    return {
      menus: menus.length,
      analyses: analyses.length,
      averageCalories: analyses.length ? Math.round(calories / analyses.length) : 0,
      averageProtein: analyses.length ? Math.round((proteins / analyses.length) * 10) / 10 : 0,
    };
  }, [recordsByModule]);

  const cards = [
    ['Menus', `${summary.menus}`, ChefHat, 'Recettes, portions et processus'],
    ['Analyses', `${summary.analyses}`, Salad, 'Fiches nutritionnelles'],
    ['Energie moyenne', `${summary.averageCalories} kcal`, Flame, 'Par analyse enregistree'],
    ['Proteines moyennes', `${summary.averageProtein} g`, Scale, 'Par portion analysee'],
  ] as const;

  return <div className="grid gap-6">
    <section className="rounded-lg border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Restauration</p>
          <h2 className="mt-2 text-2xl font-black">Menus, portions et analyse nutritionnelle</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Espace specialise pour construire les menus Maximus, documenter les ingredients, puis relier chaque menu
            a son profil nutritionnel.
          </p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-md bg-emerald-50 text-emerald-700">
          <Apple className="h-6" />
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {cards.map(([label, value, Icon, note]) => <article key={label} className="rounded-lg border bg-slate-50 p-4">
          <Icon className="h-5 text-emerald-700" />
          <p className="mt-3 text-sm font-black text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-black">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{note}</p>
        </article>)}
      </div>
    </section>
    <MaximusRecords module={module} embedded />
  </div>;
}
