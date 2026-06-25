import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function outputText(response: any) {
  if (typeof response?.output_text === 'string') return response.output_text;
  for (const item of response?.output || []) {
    for (const content of item?.content || []) if (typeof content?.text === 'string') return content.text;
  }
  return '';
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const { data: survey } = await supabase.from('survey_projects').select('title,survey_type,country').eq('id', id).maybeSingle();
  if (!survey) return NextResponse.json({ message: 'Enquete introuvable.' }, { status: 404 });
  const body = await request.json();
  const fallback = {
    summary: 'Les resultats doivent etre interpretes en tenant compte du plan de sondage, de la completude des donnees et des controles de plausibilite.',
    findings: ['Verifier les variables presentant une forte proportion de valeurs manquantes ou des distributions atypiques.'],
    limitations: ['L interpretation automatisee ne remplace pas la validation statistique et programmatique par un analyste qualifie.'],
    recommendations: ['Documenter le nettoyage, appliquer les ponderations du plan de sondage et valider les indicateurs avant diffusion.'],
  };
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ analysis: fallback, provider: 'local' });
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.5',
        input: [
          { role: 'system', content: [{ type: 'input_text', text: 'Vous etes un statisticien senior specialise en enquetes SMART, securite alimentaire et nutrition. Analysez uniquement les donnees agregees fournies. Distinguez constats, limites, risques et recommandations. Ne fabriquez aucune donnee.' }] },
          { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ survey, dataset: body.summary, quality: body.quality, nutritionalStatus: body.nutritionalStatus, crossTab: body.crossTab }) }] },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'survey_analysis',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                summary: { type: 'string' },
                findings: { type: 'array', items: { type: 'string' } },
                limitations: { type: 'array', items: { type: 'string' } },
                recommendations: { type: 'array', items: { type: 'string' } },
              },
              required: ['summary', 'findings', 'limitations', 'recommendations'],
            },
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`OPENAI_${response.status}`);
    return NextResponse.json({ analysis: JSON.parse(outputText(await response.json())), provider: 'openai' });
  } catch (error) {
    console.error('Survey AI analysis fallback', error);
    return NextResponse.json({ analysis: fallback, provider: 'local' });
  }
}
