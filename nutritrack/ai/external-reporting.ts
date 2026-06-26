import 'server-only';
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateStructured } from '@/lib/ai-narrative';

type ReportResult<T> = {
  value: T;
  provider: 'openai' | 'gemini' | 'openrouter' | 'external' | 'local';
  model: string | null;
  status: 'completed' | 'fallback' | 'failed';
};

export async function generateNutriTrackReport<T>({
  reportType,
  instructions,
  input,
  schema,
  fallback,
}: {
  reportType: string;
  instructions: string;
  input: unknown;
  schema: Record<string, unknown>;
  fallback: () => T;
}): Promise<ReportResult<T>> {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5.5';
  let result: ReportResult<T> = {
    value: fallback(),
    provider: 'local',
    model: null,
    status: 'fallback',
  };

  const generated = await generateStructured<T>(
    reportType.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60),
    [
      'Vous etes un analyste senior en nutrition publique, prise en charge integree de la malnutrition aigue et gestion de programmes.',
      'Produisez un rapport professionnel, factuel, consistant et directement exploitable par une equipe de district, formation sanitaire ou coordination programme.',
      'Ne posez aucun diagnostic individuel et ne fabriquez aucune donnee.',
      'Distinguez clairement constats, interpretation, limites des donnees, risques, recommandations et actions prioritaires.',
      'Utilisez les denominateurs disponibles, comparez les performances, signalez les donnees manquantes et proposez des actions avec responsables implicites, priorites et echeances.',
      instructions,
    ].join('\n'),
    { reportType, input },
    schema,
  );
  if (generated.data) {
    result = {
      value: generated.data,
      provider: generated.provider || 'external',
      model: generated.provider === 'openai'
        ? model
        : generated.provider === 'gemini'
          ? process.env.GEMINI_MODEL || null
          : generated.provider === 'openrouter'
            ? process.env.OPENROUTER_MODEL || null
            : null,
      status: 'completed',
    };
  } else if (key || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.OPENROUTER_API_KEY) {
    console.error('NutriTrack external AI fallback', generated.error);
  }

  try {
    const session = await createClient();
    const { data: { user } } = await session.auth.getUser();
    if (user) {
      const { data: member } = await session.rpc('nutritrack_current_member');
      if (member?.organization_id) {
        const inputHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
        await createAdminClient().from('nutritrack_ai_reports').insert({
          organization_id: member.organization_id,
          requested_by: user.id,
          report_type: reportType,
          provider: result.provider,
          model: result.model,
          status: result.status,
          input_summary: { hash: inputHash, generated_at: new Date().toISOString() },
          output: result.value,
        });
      }
    }
  } catch (error) {
    console.error('NutriTrack AI report logging', error);
  }

  return result;
}
