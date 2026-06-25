import 'server-only';
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type ReportResult<T> = {
  value: T;
  provider: 'openai' | 'local';
  model: string | null;
  status: 'completed' | 'fallback';
};

function outputText(response: any) {
  if (typeof response?.output_text === 'string') return response.output_text;
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') return content.text;
    }
  }
  return '';
}

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

  if (key) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content: [{
                type: 'input_text',
                text: [
                  'Vous etes un analyste senior en nutrition publique et gestion de programmes.',
                  'Produisez un rapport professionnel, factuel et directement exploitable.',
                  'Ne posez aucun diagnostic individuel et ne fabriquez aucune donnee.',
                  'Distinguez clairement constats, limites des donnees, risques, recommandations et actions.',
                  'Utilisez les denominateurs disponibles, comparez les performances et signalez les donnees manquantes.',
                  instructions,
                ].join('\n'),
              }],
            },
            {
              role: 'user',
              content: [{
                type: 'input_text',
                text: `Donnees agregees NutriTrack:\n${JSON.stringify(input)}`,
              }],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: reportType.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60),
              strict: true,
              schema,
            },
          },
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!response.ok) throw new Error(`OPENAI_${response.status}`);
      const body = await response.json();
      const text = outputText(body);
      if (!text) throw new Error('OPENAI_EMPTY_OUTPUT');
      result = {
        value: JSON.parse(text) as T,
        provider: 'openai',
        model,
        status: 'completed',
      };
    } catch (error) {
      console.error('NutriTrack external AI fallback', error);
    }
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
