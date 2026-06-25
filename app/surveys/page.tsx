import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SurveyWorkspace from './SurveyWorkspace';

export const metadata = { title: 'Support Food Security and Nutrition Survey | NutVitaGlobalis' };

export default async function SurveysPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/connexion?retour=/surveys');
  return (
    <main className="min-h-screen bg-slate-100 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/services" className="text-sm font-bold text-emerald-800">Retour aux services</Link>
        <div className="mb-8 mt-5">
          <p className="text-xs font-black uppercase tracking-widest text-orange">Service professionnel</p>
          <h1 className="mt-2 text-4xl font-black">Support Food Security and Nutrition Survey</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-500">Planification, collecte, controle qualite, analyse et restitution dans un espace centralise.</p>
        </div>
        <SurveyWorkspace />
      </div>
    </main>
  );
}
