'use client';

import { useEffect, useMemo, useState } from 'react';
import { Car, Fuel, Package, Route, Wrench } from 'lucide-react';
import type { MaximusModule } from '@/lib/maximus-modules';
import MaximusRecords from '../MaximusRecords';

type RecordRow = {
  id: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

const linkedModules = ['assets/inventory', 'fleet/fueling', 'fleet/maintenance', 'fleet/movements'];

const labels: Record<string, string> = {
  'assets/inventory': 'Inventaire',
  'fleet/fueling': 'Carburant',
  'fleet/maintenance': 'Maintenance',
  'fleet/movements': 'Missions',
};

function money(value: number) {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

export default function AssetFleetRecords({ module }: { module: MaximusModule }) {
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
    const assets = recordsByModule['assets/inventory'] || [];
    const fuel = recordsByModule['fleet/fueling'] || [];
    const maintenance = recordsByModule['fleet/maintenance'] || [];
    const movements = recordsByModule['fleet/movements'] || [];
    return {
      assets: assets.length,
      assigned: assets.filter(row => String(row.data.asset_status || '').toLowerCase() === 'assigned').length,
      fuelAmount: fuel.reduce((sum, row) => sum + Number(row.data.amount || 0), 0),
      maintenanceAmount: maintenance.reduce((sum, row) => sum + Number(row.data.actual_cost || row.data.estimated_cost || 0), 0),
      openMovements: movements.filter(row => !['served', 'executed', 'archived', 'rejected'].includes(row.status)).length,
    };
  }, [recordsByModule]);

  const cards = [
    ['Actifs', `${summary.assets}`, Package, `${summary.assigned} affecte(s)`],
    ['Carburant', money(summary.fuelAmount), Fuel, 'Cout enregistre'],
    ['Maintenance', money(summary.maintenanceAmount), Wrench, 'Cout estime/reel'],
    ['Missions ouvertes', `${summary.openMovements}`, Route, 'Demandes et trajets'],
  ] as const;

  return <div className="grid gap-6">
    <section className="rounded-lg border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Actifs et flotte</p>
          <h2 className="mt-2 text-2xl font-black">Inventaire, carburant, maintenance et mouvements</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Vue specialisee inspiree du rendu source avec suivi des actifs, statuts d'affectation, couts carburant,
            couts de maintenance et missions de flotte.
          </p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-md bg-emerald-50 text-emerald-700">
          <Car className="h-6" />
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {cards.map(([label, value, Icon, note]) => <article key={label} className="rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <Icon className="h-5 text-emerald-700" />
            <span className="text-xs font-black uppercase text-slate-400">{labels[module.slug] || module.group}</span>
          </div>
          <p className="mt-3 text-sm font-black text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-black">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{note}</p>
        </article>)}
      </div>
    </section>
    <MaximusRecords module={module} embedded />
  </div>;
}
