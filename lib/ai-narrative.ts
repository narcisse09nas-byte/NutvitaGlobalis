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
  indicatorInsights: unknown[];
  trends: string[];
  improvements: string[];
  risks: string[];
}>(analysis: T, locale: 'fr' | 'en'): Promise<T> {
  const narrative = await generateStructured<Pick<T, 'publicSummary' | 'professionalSummary' | 'recommendations' | 'publicConclusion' | 'professionalConclusion'>>(
    'health_followup_narrative',
    `Langue de sortie: ${locale}. Analysez indicateur par indicateur, les tendances par rapport aux valeurs precedentes, les limites des donnees et les interactions plausibles sans affirmer de causalite.`,
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
      },
      required: ['publicSummary', 'professionalSummary', 'recommendations', 'publicConclusion', 'professionalConclusion'],
    },
  );
  return narrative ? { ...analysis, ...narrative } : analysis;
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
