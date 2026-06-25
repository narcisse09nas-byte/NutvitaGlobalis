'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Archive, Boxes, Building2, Car, ChevronDown, ChevronRight, ClipboardList,
  Handshake, LayoutDashboard, Menu, ShoppingCart, Users, Utensils, Wallet, X,
} from 'lucide-react';
import type { MaximusModule } from '@/lib/maximus-modules';
import { maximusModules } from '@/lib/maximus-modules';
import MaximusRecords from './MaximusRecords';

const groupIcons = {
  'Restauration': Utensils,
  'Ventes': ShoppingCart,
  'Approvisionnement et stock': Boxes,
  'Production': Building2,
  'Ressources humaines': Users,
  'Partenaires et fournisseurs': Handshake,
  'Actifs': Archive,
  'Flotte': Car,
  'Finance': Wallet,
} as const;

export default function MaximusWorkspace({ adminName, module }: { adminName: string; module?: MaximusModule }) {
  const groups = useMemo(() => {
    const result = new Map<string, MaximusModule[]>();
    maximusModules.filter(item => item.group !== 'Restauration').forEach(item => result.set(item.group, [...(result.get(item.group) || []), item]));
    const financeOrder = ['finance/dashboard','finance/reports','finance/budget-lines','finance/requests','finance/payment-initiation','finance/my-payments','finance/cash-supply-requests','finance/cost-estimations','finance/payments','finance/payment-register','finance/operational-advances','finance/petty-cash','finance/bank-transfers','finance/cash-deposits'];
    return Array.from(result).map(([group, items]) => [group, group === 'Finance' ? [...items].sort((a, b) => financeOrder.indexOf(a.slug) - financeOrder.indexOf(b.slug)) : items] as const);
  }, []);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Restauration: true,
    Ventes: true,
    Finance: true,
    ...(module ? { [module.group]: true } : {}),
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  return <main className="min-h-screen bg-[#f4f7f6] text-slate-900">
    <button onClick={() => setMobileOpen(true)} className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-md bg-[#123d32] text-white shadow-lg lg:hidden"><Menu className="h-5" /></button>
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-[#123d32] text-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
        <div><p className="text-xl font-black">Maximus</p><p className="text-xs text-white/55">Cabinet et restauration NutVita</p></div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden"><X className="h-5" /></button>
      </div>
      <nav className="p-3">
        <Link href="/maximus" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${!module ? 'bg-[#ef7f3b] text-white' : 'text-white/75 hover:bg-white/10'}`}><LayoutDashboard className="h-5" />Tableau de bord</Link>
        <Link href="/admin/collaboration" className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-white/75 hover:bg-white/10"><ClipboardList className="h-5" />Messagerie interne</Link>
        <Link href="/admin/appels" className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold text-white/75 hover:bg-white/10"><ClipboardList className="h-5" />Réunions</Link>
        <Link href="/maximus/menus" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${module?.slug === 'menus' ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10'}`}><Utensils className="h-5" />Menus</Link>
        {groups.map(([group, items]) => {
          const Icon = groupIcons[group as keyof typeof groupIcons] || ClipboardList;
          return <div key={group} className="mt-2">
            <button onClick={() => setOpenGroups(current => ({ ...current, [group]: !current[group] }))} className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-bold text-white/80 hover:bg-white/10"><Icon className="h-5" /><span className="flex-1">{group}</span>{openGroups[group] ? <ChevronDown className="h-4" /> : <ChevronRight className="h-4" />}</button>
            {openGroups[group] && <div className="ml-5 border-l border-white/15 pl-2">{items.map(item => <Link key={item.slug} href={`/maximus/${item.slug}`} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${module?.slug === item.slug ? 'bg-white/15 font-bold text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`}><ClipboardList className="h-4" />{item.title}</Link>)}</div>}
          </div>;
        })}
        <Link href="/maximus/nutrition-analysis" onClick={() => setMobileOpen(false)} className={`mt-2 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold ${module?.slug === 'nutrition-analysis' ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10'}`}><Utensils className="h-5" />Analyse nutritionnelle</Link>
      </nav>
    </aside>

    <section className="min-h-screen lg:pl-72">
      <header className="flex min-h-20 items-center justify-between border-b bg-white px-6 pl-20 lg:pl-8">
        <div><p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Gestion interne</p><h1 className="text-2xl font-black">{module?.title || 'Tableau de bord'}</h1></div>
        <div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-black">{adminName}</p><p className="text-xs text-slate-500">Super administrateur</p></div><span className="grid h-11 w-11 place-items-center rounded-full bg-[#123d32] font-black text-white">{adminName.slice(0, 2).toUpperCase()}</span></div>
      </header>
      <div className="p-5 lg:p-8">{module ? <MaximusRecords module={module} /> : <Dashboard />}</div>
    </section>
  </main>;
}

function Dashboard() {
  const metrics = [
    ['Chiffre d’affaires', '0 FCFA', ShoppingCart, 'Ventes consolidées du mois'],
    ['Personnel actif', '0', Users, 'Cabinet, cuisines et points de vente'],
    ['Commandes du jour', '0', ClipboardList, 'Toutes unités confondues'],
    ['Actifs enregistrés', '0', Archive, 'Équipements et flotte'],
  ] as const;
  return <div className="grid gap-6">
    <section><h2 className="text-2xl font-black">Vue d’ensemble opérationnelle</h2><p className="mt-1 text-slate-500">Pilotage du cabinet, de la restauration, des équipes et des ressources.</p></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon, note]) => <article key={label} className="rounded-lg border bg-white p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-3 text-3xl font-black">{value}</p></div><span className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-700"><Icon className="h-5" /></span></div><p className="mt-4 text-xs text-slate-400">{note}</p></article>)}</section>
    <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <article className="rounded-lg border bg-white p-6"><h3 className="text-lg font-black">Activité mensuelle</h3><div className="mt-6 flex h-72 items-end gap-3 border-b border-l p-5">{[28,44,37,62,55,74,69,86,72,91,83,96].map((height, index) => <div key={index} className="flex-1 rounded-t bg-[#24945f]" style={{ height: `${height}%` }} title={`Mois ${index + 1}`} />)}</div></article>
      <article className="rounded-lg border bg-white p-6"><h3 className="text-lg font-black">Priorités de gestion</h3><div className="mt-5 grid gap-3">{['Valider les demandes financières', 'Consolider les commandes des points de vente', 'Contrôler les seuils du stock central', 'Mettre à jour les présences du personnel'].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-md bg-slate-50 p-4"><span className="grid h-8 w-8 place-items-center rounded-full bg-white font-black text-emerald-700">{index + 1}</span><p className="text-sm font-bold">{item}</p></div>)}</div></article>
    </section>
  </div>;
}
