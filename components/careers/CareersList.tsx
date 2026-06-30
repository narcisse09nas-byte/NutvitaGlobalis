'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CalendarDays, MapPin } from 'lucide-react';

type Offer = {
  id: string;
  reference: string;
  title: string;
  department: string;
  contract_type: string;
  location?: string;
  country?: string;
  summary: string;
  closing_at?: string;
};

export default function CareersList() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/careers/offers')
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Impossible de charger les offres.');
        setOffers(payload.items || []);
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Impossible de charger les offres.'))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="py-20 text-center text-slate-500">Chargement des opportunites...</div>;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error}</div>;
  return <div className="grid gap-4">
    {offers.length ? offers.map(offer => <article key={offer.id} className="border-b border-forest/10 bg-white py-7 first:border-t">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-leaf"><span>{offer.department}</span><span>•</span><span>{offer.contract_type}</span></div><h2 className="mt-2 text-2xl font-black text-forest">{offer.title}</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{offer.summary}</p><div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[offer.location, offer.country].filter(Boolean).join(', ') || 'Lieu a preciser'}</span>{offer.closing_at && <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />Cloture le {new Date(offer.closing_at).toLocaleDateString('fr-FR')}</span>}<span className="font-mono">{offer.reference}</span></div></div>
        <Link href={`/carrieres/${offer.id}`} className="inline-flex shrink-0 items-center gap-2 font-black text-leaf">Voir l offre <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </article>) : <div className="grid min-h-64 place-items-center text-center"><div><BriefcaseBusiness className="mx-auto h-12 w-12 text-slate-300" /><h2 className="mt-4 text-xl font-black text-forest">Aucune offre ouverte</h2><p className="mt-2 text-sm text-slate-500">Revenez prochainement pour decouvrir nos opportunites.</p></div></div>}
  </div>;
}
