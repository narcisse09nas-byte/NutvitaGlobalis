'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Factory, PackageCheck, ShoppingCart, Truck } from 'lucide-react';
import type { MaximusModule } from '@/lib/maximus-modules';
import MaximusRecords from '../MaximusRecords';

type RecordRow = {
  id: string;
  title: string;
  status: string;
  data: Record<string, unknown>;
};

const linkedModules = [
  'sales/daily-orders',
  'production/planning',
  'production/consolidated-orders',
  'sales/delivery-register',
  'sales/reports',
];

const stageLabels: Record<string, string> = {
  'sales/daily-orders': 'Commandes',
  'production/planning': 'Plans de production',
  'production/consolidated-orders': 'Commandes consolidees',
  'sales/delivery-register': 'Livraisons',
  'sales/reports': 'Rapports de vente',
};

export default function ProductionSalesRecords({ module }: { module: MaximusModule }) {
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

  const metrics = useMemo(() => linkedModules.map(slug => {
    const rows = recordsByModule[slug] || [];
    return {
      slug,
      label: stageLabels[slug],
      total: rows.length,
      pending: rows.filter(row => ['draft', 'submitted', 'endorsed'].includes(row.status)).length,
      ready: rows.filter(row => ['validated', 'acknowledged', 'delivered', 'served'].includes(row.status)).length,
    };
  }), [recordsByModule]);

  const currentStage = metrics.find(item => item.slug === module.slug);

  return <div className="grid gap-6">
    <section className="rounded-lg border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Flux restauration</p>
          <h2 className="mt-2 text-2xl font-black">Production, livraison et ventes</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Vue specialisee alignee sur le circuit source : commandes des points de vente, consolidation, production,
            bordereaux de livraison, rapports de vente et comptabilisation.
          </p>
        </div>
        {currentStage && <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800">
          {currentStage.total} element(s) dans ce registre
        </div>}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {metrics.map((item, index) => {
          const icons = [ShoppingCart, Factory, ClipboardList, Truck, PackageCheck];
          const Icon = icons[index] || CheckCircle2;
          return <article key={item.slug} className={`rounded-lg border p-4 ${item.slug === module.slug ? 'border-emerald-300 bg-emerald-50' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between gap-3">
              <Icon className="h-5 text-emerald-700" />
              <span className="text-xs font-black text-slate-400">Step {index + 1}</span>
            </div>
            <p className="mt-3 text-sm font-black">{item.label}</p>
            <div className="mt-3 flex gap-3 text-xs text-slate-500">
              <span>{item.total} total</span>
              <span>{item.pending} en cours</span>
              <span>{item.ready} prets</span>
            </div>
          </article>;
        })}
      </div>
    </section>
    <MaximusRecords module={module} embedded />
  </div>;
}
