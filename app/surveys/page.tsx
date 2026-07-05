import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SurveyWorkspace from './SurveyWorkspace';

export const metadata = { title: 'Support Food Security and Nutrition Survey | NutVitaGlobalis' };

export default async function SurveysPage({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent('/surveys')}`);
  return (
    <main className="min-h-screen bg-slate-100 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/services" className="text-sm font-bold text-emerald-800">Retour aux services</Link>
        <div className="mb-8 mt-5">
          <p className="text-xs font-black uppercase tracking-widest text-orange">Service professionnel</p>
          <h1 className="mt-2 text-4xl font-black">Support Food Security and Nutrition Survey</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-500">Planification, collecte, controle qualite, analyse et restitution dans un espace centralise.</p>
        </div>
        {params.access === 'denied' && <div className="mb-6 border-l-4 border-red-600 bg-red-50 p-5 text-red-900"><p className="font-black">Accès non autorisé</p><p className="mt-1 text-sm">Ce compte est bien connecté, mais il ne dispose pas des droits nécessaires pour cette enquête. Revenez à la liste de vos enquêtes ou consultez les autres services NutVitaGlobalis.</p><Link href="/services" className="mt-3 inline-block font-bold underline">Consulter les autres services</Link></div>}
        <SurveyWorkspace />
      </div>
    </main>
  );
}
