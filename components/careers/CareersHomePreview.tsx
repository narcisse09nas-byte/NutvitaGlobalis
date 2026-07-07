'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, MapPin } from 'lucide-react';
import { normalizeLocale, stripLocale } from '@/lib/i18n';

type Offer = { id: string; title: string; department: string; contract_type: string; location?: string };

export default function CareersHomePreview() {
  const english = normalizeLocale(stripLocale(usePathname()).locale) === 'en';
  const [offers, setOffers] = useState<Offer[]>([]);
  useEffect(() => {
    fetch('/api/careers/offers')
      .then(response => response.ok ? response.json() : { items: [] })
      .then(payload => setOffers((payload.items || []).slice(0, 3)))
      .catch(() => setOffers([]));
  }, []);
  if (!offers.length) return null;
  return <section className="section bg-mint/45"><div className="container-site">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><span className="eyebrow bg-white"><BriefcaseBusiness className="mr-2 h-4" />{english ? 'Join us' : 'Nous rejoindre'}</span><h2 className="text-4xl font-black">{english ? 'Open staff opportunities' : 'Opportunités Staff ouvertes'}</h2><p className="mt-3 max-w-2xl text-slate-600">{english ? 'Put your skills to work for nutrition, health and meaningful impact.' : 'Mettez vos compétences au service de la nutrition, de la santé et de l’impact.'}</p></div><Link href="/carrieres" className="inline-flex items-center gap-2 font-black text-leaf">{english ? 'View all opportunities' : 'Voir toutes les offres'} <ArrowRight className="h-4 w-4" /></Link></div>
    <div className="mt-9 divide-y divide-forest/10 border-y border-forest/10">{offers.map(offer => <article key={offer.id} className="flex flex-col justify-between gap-4 py-6 md:flex-row md:items-center"><div><p className="text-xs font-black uppercase tracking-wide text-leaf">{offer.department} · {offer.contract_type}</p><h3 className="mt-2 text-2xl font-black text-forest">{offer.title}</h3><p className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" />{offer.location || (english ? 'Location to be confirmed' : 'Lieu à préciser')}</p></div><Link href={`/carrieres/${offer.id}`} className="inline-flex items-center gap-2 font-bold text-leaf">{english ? 'View' : 'Consulter'} <ArrowRight className="h-4 w-4" /></Link></article>)}</div>
  </div></section>;
}
