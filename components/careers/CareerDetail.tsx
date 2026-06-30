'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react';

type Offer = {
  id: string; reference: string; title: string; department: string; contract_type: string;
  location?: string; country?: string; region?: string; summary: string; terms_of_reference: string;
  responsibilities?: string; requirements?: string; application_instructions?: string; closing_at?: string;
};

export default function CareerDetail({ id }: { id: string }) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/careers/offers?id=${encodeURIComponent(id)}`).then(async response => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Offre introuvable.');
      setOffer(payload.item);
    }).catch(reason => setError(reason instanceof Error ? reason.message : 'Offre introuvable.'));
  }, [id]);
  if (error) return <div className="container-site py-20"><p className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">{error}</p></div>;
  if (!offer) return <div className="container-site py-20 text-center">Chargement...</div>;
  return <div className="container-site py-12">
    <Link href="/carrieres" className="inline-flex items-center gap-2 text-sm font-bold text-leaf"><ArrowLeft className="h-4 w-4" />Toutes les offres</Link>
    <header className="mt-8 border-b border-forest/10 pb-8"><p className="text-sm font-black uppercase tracking-widest text-orange">{offer.department}</p><h1 className="mt-3 max-w-4xl text-4xl font-black text-forest md:text-5xl">{offer.title}</h1><p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">{offer.summary}</p><div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-500"><span>{offer.contract_type}</span><span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[offer.location, offer.region, offer.country].filter(Boolean).join(', ')}</span>{offer.closing_at && <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />Cloture le {new Date(offer.closing_at).toLocaleDateString('fr-FR')}</span>}<span className="font-mono">{offer.reference}</span></div></header>
    <div className="grid gap-10 py-10 lg:grid-cols-[1fr_280px]"><div className="grid gap-9"><Section title="Termes de reference" value={offer.terms_of_reference} /><Section title="Responsabilites" value={offer.responsibilities} /><Section title="Profil recherche" value={offer.requirements} /><Section title="Modalites de candidature" value={offer.application_instructions} /></div><aside className="h-fit border-l-4 border-leaf bg-mint p-6"><h2 className="text-xl font-black text-forest">Vous souhaitez postuler ?</h2><p className="mt-3 text-sm leading-6 text-slate-600">Creez un compte candidat Staff distinct et suivez chaque etape depuis votre espace personnel.</p><Link href={`/staff-candidat?offer=${offer.id}`} className="btn-primary mt-6 w-full justify-center">Postuler maintenant</Link></aside></div>
  </div>;
}

function Section({ title, value }: { title: string; value?: string }) {
  if (!value) return null;
  return <section><h2 className="text-2xl font-black text-forest">{title}</h2><p className="mt-4 whitespace-pre-wrap leading-8 text-slate-700">{value}</p></section>;
}
