import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStructured } from '@/lib/ai-narrative';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: 'Authentification requise.' }, { status: 401 });
  const { data: survey } = await supabase.from('survey_projects').select('title,survey_type,country').eq('id', id).maybeSingle();
  if (!survey) return NextResponse.json({ message: 'Enquete introuvable.' }, { status: 404 });
  const body = await request.json();
  const fallback = {
    summary: 'Les resultats doivent etre interpretes en tenant compte du plan de sondage, de la completude des donnees, des controles de plausibilite, des ponderations et des limites operationnelles de collecte.',
    findings: ['Verifier les variables presentant une forte proportion de valeurs manquantes, des distributions atypiques, des denominators faibles ou des incoherences entre modules.'],
    limitations: ['L interpretation automatisee ne remplace pas la validation statistique et programmatique par un analyste qualifie, notamment pour les ponderations, intervalles de confiance et effets de grappe.'],
    recommendations: ['Documenter le nettoyage, appliquer les ponderations du plan de sondage, produire les tableaux de qualite et valider les indicateurs avant diffusion.'],
  };
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      findings: { type: 'array', items: { type: 'string' } },
      limitations: { type: 'array', items: { type: 'string' } },
      recommendations: { type: 'array', items: { type: 'string' } },
    },
    required: ['summary', 'findings', 'limitations', 'recommendations'],
  };
  const generated = await generateStructured<typeof fallback>(
    'survey_analysis',
    [
      'Vous etes un statisticien senior specialise en enquetes SMART, securite alimentaire et nutrition.',
      'Analysez uniquement les donnees agregees fournies. Ne fabriquez aucune donnee.',
      'Le niveau attendu est celui d un rapport technique excellent: constats precis, interpretation statistique prudente, limites de qualite, risques de biais et recommandations operationnelles.',
      'Pour chaque constat important, preciser le signal observe, l interpretation possible, les limites, la verification requise et l action recommandee.',
      'Distinguez constats, limites, risques et recommandations. Mentionnez ponderations, effet de grappe, denominateurs, valeurs manquantes et plausibilite quand applicable.',
    ].join('\n'),
    {
      survey,
      dataset: body.summary,
      quality: body.quality,
      nutritionalStatus: body.nutritionalStatus,
      crossTab: body.crossTab,
      statisticalResult: body.statisticalResult,
      deterministicInterpretation: body.deterministicInterpretation,
    },
    schema,
  );
  return NextResponse.json({ analysis: generated.data || fallback, provider: generated.provider || 'local' });
}
