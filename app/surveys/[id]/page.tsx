import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import SurveyManager from './SurveyManager';

export default async function SurveyProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/surveys/${id}`)}`);
  const { data: survey } = await supabase.from('survey_projects').select('*').eq('id', id).maybeSingle();
  if (!survey) redirect('/surveys?access=denied');
  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b bg-white px-5 py-5">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4">
          <div><Link href="/surveys" className="text-sm font-bold text-emerald-800">Toutes les enquetes</Link><h1 className="mt-2 text-2xl font-black">{survey.title}</h1><p className="text-sm text-slate-500">Support Food Security and Nutrition Survey</p></div>
          <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black uppercase text-emerald-800">{survey.status}</span>
        </div>
      </header>
      <SurveyManager initialSurvey={survey} />
    </main>
  );
}
