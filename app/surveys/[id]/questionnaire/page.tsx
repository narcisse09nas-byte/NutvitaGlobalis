import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import QuestionnaireBuilder from './QuestionnaireBuilder';

export default async function QuestionnaireBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ form?: string }>;
}) {
  const { id } = await params;
  const { form } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?retour=/surveys/${id}/questionnaire`);
  const { data: survey } = await supabase.from('survey_projects').select('id,title').eq('id', id).maybeSingle();
  if (!survey) notFound();
  let initialForm = null;
  if (form) {
    const result = await supabase.from('survey_forms').select('*').eq('id', form).eq('survey_id', id).maybeSingle();
    initialForm = result.data;
  }
  return <QuestionnaireBuilder survey={survey} initialForm={initialForm} />;
}
