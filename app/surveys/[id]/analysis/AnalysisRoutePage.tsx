import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SurveyAnalysisWorkspace, { type SurveyAnalysisMode } from '../SurveyAnalysisWorkspace';

const labels: Record<SurveyAnalysisMode, { title: string; text: string }> = {
  anthropometry: {
    title: 'Analyse anthropométrique nutritionnelle',
    text: 'Calculs OMS, contrôle ENA/SMART, visualisation des données et rapports nutritionnels.',
  },
  advanced: {
    title: 'Analyse des modules avancés',
    text: 'Sélectionnez un module, associez ses variables puis calculez et conservez les indicateurs dérivés.',
  },
  other: {
    title: 'Autres analyses statistiques',
    text: 'Recodage, qualité des données, distributions, tests statistiques, modèles et diagnostics.',
  },
};

export default async function AnalysisRoutePage({ id, mode }: { id: string; mode: SurveyAnalysisMode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const slug = mode === 'anthropometry' ? 'anthropometrie' : mode === 'advanced' ? 'modules-avances' : 'autres-analyses';
  if (!user) redirect(`/connexion?redirect=${encodeURIComponent(`/surveys/${id}/analysis/${slug}`)}`);
  const [{ data: survey }, { data: forms }, { data: responses }] = await Promise.all([
    supabase.from('survey_projects').select('*').eq('id', id).maybeSingle(),
    supabase.from('survey_forms').select('*').eq('survey_id', id).order('created_at', { ascending: false }),
    supabase.from('survey_responses').select('*').eq('survey_id', id).order('submitted_at', { ascending: false }),
  ]);
  if (!survey) notFound();
  const copy = labels[mode];
  return <main className="min-h-screen bg-slate-100">
    <header className="border-b bg-white px-5 py-5">
      <div className="mx-auto max-w-[1500px]">
        <Link href={`/surveys/${id}`} className="text-sm font-black text-emerald-800">Retour à l’enquête</Link>
        <h1 className="mt-2 text-2xl font-black">{copy.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{copy.text}</p>
      </div>
    </header>
    <div className="mx-auto max-w-[1500px] p-5">
      <SurveyAnalysisWorkspace
        survey={survey}
        forms={forms || []}
        responses={responses || []}
        mode={mode}
      />
    </div>
  </main>;
}
