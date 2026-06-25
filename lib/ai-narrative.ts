import 'server-only';

function extractOutputText(response: any) {
  if (typeof response?.output_text === 'string') return response.output_text;
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') return content.text;
    }
  }
  return '';
}

async function generateStructured<T>(
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
): Promise<T | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.5',
        input: [
          {
            role: 'system',
            content: [{
              type: 'input_text',
              text: [
                'Vous redigez une aide a la decision nutritionnelle pour NutVitaGlobalis.',
                'Les regles, alertes et calculs fournis sont deterministes et ne doivent jamais etre contredits.',
                'N inventez aucune valeur, ne posez aucun diagnostic et recommandez une evaluation professionnelle face aux signaux importants.',
                'Le texte doit etre detaille, clair, nuance et distinguer la version grand public de la version professionnelle.',
                instructions,
              ].join('\n'),
            }],
          },
          { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(input) }] },
        ],
        text: {
          format: {
            type: 'json_schema',
            name,
            strict: true,
            schema,
          },
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`OPENAI_${response.status}`);
    const text = extractOutputText(await response.json());
    return text ? JSON.parse(text) as T : null;
  } catch (error) {
    console.error('External AI narrative fallback', error);
    return null;
  }
}

export async function enrichHealthNarrative<T extends {
  publicSummary: string;
  professionalSummary: string;
  recommendations: string[];
  publicConclusion: string;
  professionalConclusion: string;
  indicatorInsights: any[];
  trends: string[];
  improvements: string[];
  risks: string[];
}>(analysis: T, locale: 'fr' | 'en'): Promise<T> {
  const narrative = await generateStructured<Pick<T, 'publicSummary' | 'professionalSummary' | 'recommendations' | 'publicConclusion' | 'professionalConclusion' | 'indicatorInsights'>>(
    'health_followup_narrative',
    [
      `Langue de sortie: ${locale}.`,
      'Reecrivez CHAQUE indicateur avec un niveau de detail comparable a une note de suivi nutritionnel de qualite.',
      'Pour la version grand public: expliquez clairement la valeur actuelle, la comparaison avec la norme, la variation depuis la premiere et la precedente mesure, les benefices possibles, les precautions et les conseils pratiques.',
      'Pour la version professionnelle: fournissez les valeurs initiales et actuelles, les variations absolues et relatives disponibles, la vitesse d evolution, la classification, les limites, les donnees manquantes et des recommandations de suivi.',
      'Conservez toutes les donnees historiques, references, listes de benefices et donnees manquantes fournies. Ne supprimez aucun indicateur.',
      'Les conclusions globales doivent integrer les interactions entre anthropometrie, biologie, alimentation et activite, tout en distinguant clairement faits, hypotheses et limites.',
    ].join('\n'),
    {
      indicatorInsights: analysis.indicatorInsights,
      trends: analysis.trends,
      improvements: analysis.improvements,
      risks: analysis.risks,
      existingRecommendations: analysis.recommendations,
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        publicSummary: { type: 'string' },
        professionalSummary: { type: 'string' },
        recommendations: { type: 'array', items: { type: 'string' } },
        publicConclusion: { type: 'string' },
        professionalConclusion: { type: 'string' },
        indicatorInsights: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              indicator: { type: 'string' },
              latest: { type: ['string', 'null'] },
              status: { type: 'string', enum: ['stable', 'improving', 'watch', 'urgent', 'incomplete'] },
              publicInterpretation: { type: 'string' },
              professionalInterpretation: { type: 'string' },
              recommendation: { type: 'string' },
              history: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { date: { type: 'string' }, value: { type: 'string' }, secondary: { type: ['string', 'null'] } }, required: ['date', 'value', 'secondary'] } },
              reference: { type: ['string', 'null'] },
              changeSummary: { type: ['string', 'null'] },
              benefits: { type: 'array', items: { type: 'string' } },
              missingData: { type: 'array', items: { type: 'string' } },
              professionalRecommendations: { type: 'array', items: { type: 'string' } },
            },
            required: ['indicator', 'latest', 'status', 'publicInterpretation', 'professionalInterpretation', 'recommendation', 'history', 'reference', 'changeSummary', 'benefits', 'missingData', 'professionalRecommendations'],
          },
        },
      },
      required: ['publicSummary', 'professionalSummary', 'recommendations', 'publicConclusion', 'professionalConclusion', 'indicatorInsights'],
    },
  );
  return narrative ? { ...analysis, ...narrative, aiProvider: 'openai' } : { ...analysis, aiProvider: 'local' };
}

export async function enrichChildGrowthNarrative<T extends {
  summary: string;
  professionalSummary: string;
  practicalAdvice: string[];
  parentConclusion: string;
  professionalConclusion: string;
  indicatorInsights: unknown[];
  positives: string[];
  attentionPoints: string[];
  alerts: unknown[];
}>(analysis: T): Promise<T> {
  const narrative = await generateStructured<Pick<T, 'summary' | 'professionalSummary' | 'practicalAdvice' | 'parentConclusion' | 'professionalConclusion'>>(
    'child_growth_narrative',
    'Produisez une version parent rassurante mais precise et une version professionnelle plus technique. Comparez chaque indicateur a sa reference et a la mesure precedente lorsqu elles sont fournies. Ne minimisez jamais un oedeme, une perte ponderale ou une alerte critique.',
    {
      indicatorInsights: analysis.indicatorInsights,
      positives: analysis.positives,
      attentionPoints: analysis.attentionPoints,
      alerts: analysis.alerts,
      existingAdvice: analysis.practicalAdvice,
    },
    {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string' },
        professionalSummary: { type: 'string' },
        practicalAdvice: { type: 'array', items: { type: 'string' } },
        parentConclusion: { type: 'string' },
        professionalConclusion: { type: 'string' },
      },
      required: ['summary', 'professionalSummary', 'practicalAdvice', 'parentConclusion', 'professionalConclusion'],
    },
  );
  return narrative ? { ...analysis, ...narrative } : analysis;
}
