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

type AiProvider = 'openai' | 'gemini' | 'openrouter';
type StructuredResult<T> = { data: T | null; provider?: AiProvider; error?: string };

function providerOrder(): AiProvider[] {
  const configured = (process.env.AI_PROVIDER_ORDER || 'openai,gemini,openrouter')
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter((item): item is AiProvider => ['openai', 'gemini', 'openrouter'].includes(item));
  return configured.length ? configured : ['openai', 'gemini', 'openrouter'];
}

function safeJsonParse<T>(text: string): T | null {
  if (!text.trim()) return null;
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned) as T;
}

function schemaPrompt(name: string, instructions: string, input: unknown, schema: Record<string, unknown>) {
  return [
    'Vous redigez une aide a la decision nutritionnelle pour NutVitaGlobalis.',
    'Les regles, alertes et calculs fournis sont deterministes et ne doivent jamais etre contredits.',
    'N inventez aucune valeur, ne posez aucun diagnostic et recommandez une evaluation professionnelle face aux signaux importants.',
    'Le texte doit etre detaille, clair, nuance et distinguer la version grand public de la version professionnelle.',
    instructions,
    '',
    `Retournez uniquement un objet JSON valide correspondant au schema "${name}".`,
    `Schema JSON: ${JSON.stringify(schema)}`,
    `Donnees: ${JSON.stringify(input)}`,
  ].join('\n');
}

async function generateWithOpenAI<T>(
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
): Promise<StructuredResult<T>> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { data: null, error: 'openai_missing_api_key' };
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
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const code = payload?.error?.code || payload?.error?.type;
    return {
      data: null,
      error: response.status === 401
        ? 'openai_invalid_api_key'
        : response.status === 429
          ? 'openai_quota_or_rate_limit'
          : code === 'model_not_found'
            ? 'openai_model_not_found'
            : `openai_http_${response.status}`,
    };
  }
  const text = extractOutputText(await response.json());
  return { data: text ? safeJsonParse<T>(text) : null, provider: 'openai', error: text ? undefined : 'openai_empty_response' };
}

async function generateWithGemini<T>(
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
): Promise<StructuredResult<T>> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) return { data: null, error: 'gemini_missing_api_key' };
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: schemaPrompt(name, instructions, input, schema) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return {
      data: null,
      error: response.status === 401 || response.status === 403
        ? 'gemini_invalid_api_key'
        : response.status === 429
          ? 'gemini_quota_or_rate_limit'
          : payload?.error?.status === 'NOT_FOUND'
            ? 'gemini_model_not_found'
            : `gemini_http_${response.status}`,
    };
  }
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).filter(Boolean).join('\n') || '';
  return { data: text ? safeJsonParse<T>(text) : null, provider: 'gemini', error: text ? undefined : 'gemini_empty_response' };
}

async function generateWithOpenRouter<T>(
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
): Promise<StructuredResult<T>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { data: null, error: 'openrouter_missing_api_key' };
  const model = process.env.OPENROUTER_MODEL;
  if (!model) return { data: null, error: 'openrouter_missing_model' };
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nutvitaglobalis.com',
      'X-Title': 'NutVitaGlobalis',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: schemaPrompt(name, instructions, input, schema) }],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) {
    return {
      data: null,
      error: response.status === 401 || response.status === 403
        ? 'openrouter_invalid_api_key'
        : response.status === 429
          ? 'openrouter_quota_or_rate_limit'
          : `openrouter_http_${response.status}`,
    };
  }
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || '';
  return { data: text ? safeJsonParse<T>(text) : null, provider: 'openrouter', error: text ? undefined : 'openrouter_empty_response' };
}

async function generateStructured<T>(
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
): Promise<StructuredResult<T>> {
  const errors: string[] = [];
  try {
    for (const provider of providerOrder()) {
      const result = provider === 'openai'
        ? await generateWithOpenAI<T>(name, instructions, input, schema)
        : provider === 'gemini'
          ? await generateWithGemini<T>(name, instructions, input, schema)
          : await generateWithOpenRouter<T>(name, instructions, input, schema);
      if (result.data) return result;
      if (result.error) errors.push(result.error);
    }
    console.error('External AI narrative providers failed', { errors });
    return { data: null, error: errors.join('|') || 'external_ai_unavailable' };
  } catch (error) {
    console.error('External AI narrative fallback', error);
    return {
      data: null,
      error: error instanceof DOMException && error.name === 'TimeoutError'
        ? 'timeout'
        : error instanceof SyntaxError
          ? 'invalid_ai_json'
          : 'external_ai_request_failed',
    };
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
  const result = await generateStructured<Pick<T, 'publicSummary' | 'professionalSummary' | 'recommendations' | 'publicConclusion' | 'professionalConclusion' | 'indicatorInsights'>>(
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
  return result.data
    ? { ...analysis, ...result.data, aiProvider: result.provider || 'external', aiError: undefined }
    : { ...analysis, aiProvider: 'local', aiError: result.error };
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
  const result = await generateStructured<Pick<T, 'summary' | 'professionalSummary' | 'practicalAdvice' | 'parentConclusion' | 'professionalConclusion'>>(
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
  return result.data ? { ...analysis, ...result.data } : analysis;
}
