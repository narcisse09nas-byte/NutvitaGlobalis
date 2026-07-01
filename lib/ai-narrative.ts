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
    'Objectif qualite: produire un rapport excellent, exploitable, consistant, avec des paragraphes substantiels et des recommandations actionnables.',
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
              'Objectif qualite: produire un rapport excellent, exploitable, consistant, avec des paragraphes substantiels et des recommandations actionnables.',
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

export async function generateStructured<T>(
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
  crossIndicatorAnalysis?: string[];
  actionPlan?: {
    days30: string[];
    days90: string[];
    days180: string[];
    daily: string[];
    weekly: string[];
    monthly: string[];
    priorityIndicators: string[];
  };
  motivation?: string;
  limitations?: string[];
}>(analysis: T, locale: 'fr' | 'en'): Promise<T> {
  const result = await generateStructured<Pick<T, 'publicSummary' | 'professionalSummary' | 'recommendations' | 'publicConclusion' | 'professionalConclusion' | 'indicatorInsights' | 'crossIndicatorAnalysis' | 'actionPlan' | 'motivation' | 'limitations'>>(
    'ncie_health_followup_report',
    [
      'Tu es NutVitaGlobalis Clinical Intelligence Engine (NCIE) v1.0, specialise en nutrition clinique, sante publique, dietetique, anthropometrie, biochimie et epidemiologie nutritionnelle.',
      'Applique une approche fondee sur les preuves et compatible avec les recommandations reconnues (OMS, UNICEF, FAO, ESPEN, ASPEN, ADA, NICE, AHA, ESC, HAS) uniquement lorsqu elles sont pertinentes.',
      'Tu ne poses jamais de diagnostic definitif, ne prescris pas et ne modifies jamais un traitement. Tu distingues faits, hypotheses, risques, incertitudes et donnees manquantes.',
      `Langue de sortie: ${locale}.`,
      'Produire un resume executif de 250 mots maximum couvrant progres, risques, defis et recommandations prioritaires.',
      'Reecrivez CHAQUE indicateur avec un niveau de detail comparable a une note de suivi nutritionnel de qualite.',
      'Pour CHAQUE indicateur, produire une analyse de profondeur comparable a l exemple poids: valeur actuelle, historique disponible, comparaison a la norme/reference, variation depuis la premiere mesure et la precedente si disponible, interpretation simple, limites, donnees manquantes, risque ou benefice potentiel, puis conseil pratique.',
      'Pour la version grand public: utiliser un langage accessible, expliquer ce que la valeur peut signifier, ce qu elle ne permet pas de conclure seule, les precautions et les actions realistes pour la semaine suivante.',
      'Pour la version professionnelle: fournir les valeurs initiales et actuelles, les variations absolues et relatives disponibles, la vitesse d evolution, la classification/reference, les limites de mesure, les donnees manquantes, les hypotheses a verifier et des recommandations de suivi technique.',
      'Ne reduisez jamais un indicateur a une phrase generique. Si un indicateur manque de donnees, expliquer precisement quelles donnees manquent et pourquoi elles changeraient l interpretation.',
      'Conservez toutes les donnees historiques, references, listes de benefices, donnees manquantes et recommandations professionnelles fournies. Ne supprimez aucun indicateur et gardez le meme ordre.',
      'Les conclusions globales doivent integrer les interactions entre anthropometrie, biologie, alimentation et activite, tout en distinguant clairement faits, hypotheses et limites. Les conclusions doivent etre robustes et utilisables dans un rapport PDF.',
      'Produire une analyse transversale des interactions uniquement lorsqu elles sont plausibles au regard des donnees; ne jamais presenter une correlation comme une causalite.',
      'Produire un plan d action concret a 30, 90 et 180 jours, avec actions quotidiennes, hebdomadaires et mensuelles. Ne proposer aucun objectif chiffre non justifie par les donnees.',
      'La motivation doit valoriser les progres sans culpabiliser. La version professionnelle doit mentionner les hypotheses nutritionnelles possibles sans conclure a un diagnostic.',
      'Conserver les limites deterministes fournies et en ajouter uniquement si elles decoulent des donnees. Si une analyse est impossible, ecrire explicitement N/A et expliquer pourquoi.',
    ].join('\n'),
    {
      indicatorInsights: analysis.indicatorInsights,
      trends: analysis.trends,
      improvements: analysis.improvements,
      risks: analysis.risks,
      existingRecommendations: analysis.recommendations,
      deterministicCrossIndicatorAnalysis: analysis.crossIndicatorAnalysis,
      deterministicActionPlan: analysis.actionPlan,
      deterministicLimitations: analysis.limitations,
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
        crossIndicatorAnalysis: { type: 'array', items: { type: 'string' } },
        actionPlan: {
          type: 'object',
          additionalProperties: false,
          properties: {
            days30: { type: 'array', items: { type: 'string' } },
            days90: { type: 'array', items: { type: 'string' } },
            days180: { type: 'array', items: { type: 'string' } },
            daily: { type: 'array', items: { type: 'string' } },
            weekly: { type: 'array', items: { type: 'string' } },
            monthly: { type: 'array', items: { type: 'string' } },
            priorityIndicators: { type: 'array', items: { type: 'string' } },
          },
          required: ['days30', 'days90', 'days180', 'daily', 'weekly', 'monthly', 'priorityIndicators'],
        },
        motivation: { type: 'string' },
        limitations: { type: 'array', items: { type: 'string' } },
      },
      required: ['publicSummary', 'professionalSummary', 'recommendations', 'publicConclusion', 'professionalConclusion', 'indicatorInsights', 'crossIndicatorAnalysis', 'actionPlan', 'motivation', 'limitations'],
    },
  );
  if (!result.data) return { ...analysis, aiProvider: 'local', aiError: result.error };
  const enrichedByIndicator = new Map(result.data.indicatorInsights.map((item: any) => [String(item.indicator), item]));
  const indicatorInsights = analysis.indicatorInsights.map((item: any) => {
    const enriched = enrichedByIndicator.get(String(item.indicator)) as any;
    return enriched ? { ...item, ...enriched } : item;
  });
  return { ...analysis, ...result.data, indicatorInsights, aiProvider: result.provider || 'external', aiError: undefined };
}

export async function enrichChildGrowthNarrative<T extends {
  summary: string;
  professionalSummary: string;
  practicalAdvice: string[];
  parentConclusion: string;
  professionalConclusion: string;
  indicatorInsights: any[];
  positives: string[];
  attentionPoints: string[];
  alerts: unknown[];
  whoCurveAnalysis?: string[];
  growthStory?: string;
  influencingFactors?: Array<{ factor: string; analysis: string; status: string }>;
  developmentAnalysis?: Array<{ domain: string; analysis: string; status: string }>;
  actionPlan?: {
    days7: string[];
    days30: string[];
    days90: string[];
    days180: string[];
    daily: string[];
    weekly: string[];
    monthly: string[];
  };
  limitations?: string[];
}>(analysis: T): Promise<T> {
  const result = await generateStructured<Pick<T, 'summary' | 'professionalSummary' | 'practicalAdvice' | 'parentConclusion' | 'professionalConclusion' | 'indicatorInsights' | 'whoCurveAnalysis' | 'growthStory' | 'influencingFactors' | 'developmentAnalysis' | 'actionPlan' | 'limitations'>>(
    'ncgie_child_growth_report',
    [
      'Tu es NutVitaGlobalis Child Growth Intelligence Engine (NCGIE) v1.0, specialise en croissance de l enfant, nutrition pediatrique, anthropometrie OMS, IYCF, PCIMA/CMAM, IMCI et sante publique.',
      'Utilise uniquement les donnees et classifications fournies. Ne recalcule jamais un z-score et ne remplace jamais une classification deterministe.',
      'Ne pose jamais de diagnostic definitif. Distingue observations, hypotheses, facteurs protecteurs, risques, limites et besoins de confirmation clinique.',
      'Produis un resume executif de 250 mots maximum couvrant situation generale, progres, risques et objectifs.',
      'Produisez une version parent rassurante mais precise et une version professionnelle plus technique.',
      'Pour CHAQUE indicateur de croissance, produire une analyse consistante: valeur actuelle, historique disponible, comparaison a la reference OMS ou a la norme configuree, comparaison avec la mesure precedente si disponible, tendance depuis le debut du suivi, limites de mesure, donnees manquantes, implications possibles et recommandation pratique.',
      'La version parent doit expliquer simplement ce que la valeur peut signifier et ce qu elle ne permet pas de conclure seule.',
      'La version professionnelle doit inclure la classification, les seuils, les hypotheses a verifier, la qualite de mesure, le contexte clinique et les actions de suivi.',
      'Ne minimisez jamais un oedeme, une perte ponderale, un MUAC bas, une cassure de croissance ou une alerte critique.',
      'Conservez tous les indicateurs, dans le meme ordre, et conservez les champs history, reference, changeSummary, benefits, missingData et professionalRecommendations quand ils sont fournis.',
      'Les conclusions globales doivent integrer anthropometrie, MUAC, oedemes, appetit, maladies recentes, limites des donnees et priorites de suivi.',
      'Raconte l histoire de croissance dans l ordre chronologique sans inventer d evenement.',
      'Analyse chaque facteur influencant et chaque domaine du developpement. Quand une information manque, ecris explicitement N/A.',
      'Les courbes OMS doivent etre interpretees en termes de position, franchissement de couloir, cassure, ralentissement ou rattrapage uniquement si les series le permettent.',
      'Le plan personnalise doit couvrir 7, 30, 90 et 180 jours, puis les actions quotidiennes, hebdomadaires et mensuelles.',
      'Toute alerte doit etre reliee aux donnees disponibles et orienter vers une evaluation professionnelle adaptee, sans formulation alarmiste injustifiee.',
    ].join('\n'),
    {
      indicatorInsights: analysis.indicatorInsights,
      positives: analysis.positives,
      attentionPoints: analysis.attentionPoints,
      alerts: analysis.alerts,
      existingAdvice: analysis.practicalAdvice,
      deterministicWhoCurveAnalysis: analysis.whoCurveAnalysis,
      deterministicGrowthStory: analysis.growthStory,
      deterministicInfluencingFactors: analysis.influencingFactors,
      deterministicDevelopmentAnalysis: analysis.developmentAnalysis,
      deterministicActionPlan: analysis.actionPlan,
      deterministicLimitations: analysis.limitations,
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
        indicatorInsights: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              indicator: { type: 'string' },
              latest: { type: ['string', 'null'] },
              status: { type: 'string', enum: ['usual', 'watch', 'urgent', 'incomplete'] },
              parentInterpretation: { type: 'string' },
              professionalInterpretation: { type: 'string' },
              recommendation: { type: 'string' },
              history: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    date: { type: 'string' },
                    value: { type: 'string' },
                    secondary: { type: ['string', 'null'] },
                  },
                  required: ['date', 'value', 'secondary'],
                },
              },
              reference: { type: ['string', 'null'] },
              changeSummary: { type: ['string', 'null'] },
              benefits: { type: 'array', items: { type: 'string' } },
              missingData: { type: 'array', items: { type: 'string' } },
              professionalRecommendations: { type: 'array', items: { type: 'string' } },
            },
            required: ['indicator', 'latest', 'status', 'parentInterpretation', 'professionalInterpretation', 'recommendation', 'history', 'reference', 'changeSummary', 'benefits', 'missingData', 'professionalRecommendations'],
          },
        },
        whoCurveAnalysis: { type: 'array', items: { type: 'string' } },
        growthStory: { type: 'string' },
        influencingFactors: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              factor: { type: 'string' },
              analysis: { type: 'string' },
              status: { type: 'string', enum: ['documented', 'missing', 'attention'] },
            },
            required: ['factor', 'analysis', 'status'],
          },
        },
        developmentAnalysis: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              domain: { type: 'string' },
              analysis: { type: 'string' },
              status: { type: 'string', enum: ['documented', 'missing', 'attention'] },
            },
            required: ['domain', 'analysis', 'status'],
          },
        },
        actionPlan: {
          type: 'object',
          additionalProperties: false,
          properties: {
            days7: { type: 'array', items: { type: 'string' } },
            days30: { type: 'array', items: { type: 'string' } },
            days90: { type: 'array', items: { type: 'string' } },
            days180: { type: 'array', items: { type: 'string' } },
            daily: { type: 'array', items: { type: 'string' } },
            weekly: { type: 'array', items: { type: 'string' } },
            monthly: { type: 'array', items: { type: 'string' } },
          },
          required: ['days7', 'days30', 'days90', 'days180', 'daily', 'weekly', 'monthly'],
        },
        limitations: { type: 'array', items: { type: 'string' } },
      },
      required: ['summary', 'professionalSummary', 'practicalAdvice', 'parentConclusion', 'professionalConclusion', 'indicatorInsights', 'whoCurveAnalysis', 'growthStory', 'influencingFactors', 'developmentAnalysis', 'actionPlan', 'limitations'],
    },
  );
  if (!result.data) return analysis;
  const enriched = new Map((result.data.indicatorInsights || []).map((item: any) => [item.indicator, item]));
  const indicatorInsights = analysis.indicatorInsights.map((item: any) => {
    const match = enriched.get(item.indicator);
    return match ? { ...item, ...match } : item;
  });
  return { ...analysis, ...result.data, indicatorInsights };
}
