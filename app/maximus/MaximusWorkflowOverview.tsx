'use client';

import { useEffect, useState } from 'react';
import { Boxes, GitBranch, RefreshCw, Scale } from 'lucide-react';

type WorkflowEvent = {
  id: string;
  action: string;
  source_module?: string;
  target_module?: string;
  details?: Record<string, unknown>;
  created_at: string;
};

type StockBalance = {
  item_code: string;
  location: string;
  unit: string;
  quantity: number;
  inventory_value: number;
};

type TrialBalance = {
  account_code: string;
  currency: string;
  total_debit: number;
  total_credit: number;
  balance: number;
};

const actionLabels: Record<string, string> = {
  record_stock_movement: 'Mouvement de stock',
  plan_production: 'Commande vers production',
  complete_production: 'Production vers livraison',
  confirm_delivery: 'Livraison vers vente',
  post_sales: 'Vente vers comptabilité',
  post_deposit: 'Dépôt vers banque',
};

export default function MaximusWorkflowOverview() {
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [stock, setStock] = useState<StockBalance[]>([]);
  const [accounts, setAccounts] = useState<TrialBalance[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch('/api/maximus/workflow');
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setMessage(result.message || 'Chargement impossible.');
    setEvents(result.events || []);
    setStock(result.stockBalances || []);
    setAccounts(result.trialBalance || []);
    setMessage(result.local ? 'Mode local : les événements sont disponibles; les soldes comptables sont calculés après migration Supabase.' : '');
  }

  useEffect(() => { load(); }, []);

  const stockValue = stock.reduce((sum, row) => sum + Number(row.inventory_value || 0), 0);
  const debit = accounts.reduce((sum, row) => sum + Number(row.total_debit || 0), 0);
  const credit = accounts.reduce((sum, row) => sum + Number(row.total_credit || 0), 0);

  return <div className="grid gap-6">
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-[#ef7f3b]">Pilotage transversal</p>
        <h2 className="mt-2 text-3xl font-black">Flux centralisés</h2>
        <p className="mt-2 max-w-3xl leading-7 text-slate-500">Traçabilité de la commande jusqu’à la comptabilité, avec mouvements de stock et écritures en partie double.</p>
      </div>
      <button onClick={load} disabled={loading} className="btn-secondary"><RefreshCw className={`mr-2 h-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</button>
    </section>

    {message && <p className="rounded-md bg-amber-50 p-4 text-sm font-bold text-amber-900">{message}</p>}

    <section className="grid gap-4 md:grid-cols-3">
      <article className="rounded-lg border bg-white p-5"><GitBranch className="h-5 text-violet-700" /><p className="mt-4 text-sm font-bold text-slate-500">Étapes exécutées</p><p className="mt-1 text-3xl font-black">{events.length}</p></article>
      <article className="rounded-lg border bg-white p-5"><Boxes className="h-5 text-emerald-700" /><p className="mt-4 text-sm font-bold text-slate-500">Valeur du stock</p><p className="mt-1 text-3xl font-black">{stockValue.toLocaleString('fr-FR')} XAF</p></article>
      <article className="rounded-lg border bg-white p-5"><Scale className="h-5 text-blue-700" /><p className="mt-4 text-sm font-bold text-slate-500">Équilibre comptable</p><p className={`mt-1 text-3xl font-black ${debit === credit ? 'text-emerald-700' : 'text-red-700'}`}>{(debit - credit).toLocaleString('fr-FR')} XAF</p></article>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <article className="rounded-lg border bg-white">
        <header className="border-b p-5"><h3 className="text-lg font-black">Situation du stock</h3></header>
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-4">Article</th><th className="p-4">Localisation</th><th className="p-4 text-right">Quantité</th></tr></thead>
            <tbody>{stock.map(row => <tr key={`${row.item_code}-${row.location}-${row.unit}`} className="border-t"><td className="p-4 font-bold">{row.item_code}</td><td className="p-4">{row.location}</td><td className="p-4 text-right">{Number(row.quantity).toLocaleString('fr-FR')} {row.unit}</td></tr>)}</tbody>
          </table>
          {!stock.length && <p className="p-8 text-center text-sm text-slate-500">Aucun mouvement de stock comptabilisé.</p>}
        </div>
      </article>

      <article className="rounded-lg border bg-white">
        <header className="border-b p-5"><h3 className="text-lg font-black">Balance comptable</h3></header>
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-4">Compte</th><th className="p-4 text-right">Débit</th><th className="p-4 text-right">Crédit</th></tr></thead>
            <tbody>{accounts.map(row => <tr key={`${row.account_code}-${row.currency}`} className="border-t"><td className="p-4 font-bold">{row.account_code}</td><td className="p-4 text-right">{Number(row.total_debit).toLocaleString('fr-FR')}</td><td className="p-4 text-right">{Number(row.total_credit).toLocaleString('fr-FR')}</td></tr>)}</tbody>
          </table>
          {!accounts.length && <p className="p-8 text-center text-sm text-slate-500">Aucune écriture comptable générée.</p>}
        </div>
      </article>
    </section>

    <section className="rounded-lg border bg-white">
      <header className="border-b p-5"><h3 className="text-lg font-black">Journal des workflows</h3></header>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-4">Étape</th><th className="p-4">Source</th><th className="p-4">Destination</th><th className="p-4">Date</th></tr></thead>
        <tbody>{events.map(event => <tr key={event.id} className="border-t"><td className="p-4 font-bold">{actionLabels[event.action] || event.action}</td><td className="p-4">{event.source_module || String(event.details?.source_module || '-')}</td><td className="p-4">{event.target_module || String(event.details?.target_module || '-')}</td><td className="p-4">{new Date(event.created_at).toLocaleString('fr-FR')}</td></tr>)}</tbody>
      </table></div>
      {!events.length && <p className="p-8 text-center text-sm text-slate-500">Aucun workflow exécuté.</p>}
    </section>
  </div>;
}
