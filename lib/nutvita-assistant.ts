import "server-only";

export type ChatMessage = { role: "user" | "assistant"; content: string };
type AiProvider = "openai" | "gemini" | "openrouter";
type ChatResult = { text: string | null; provider?: AiProvider; error?: string };

function providerOrder(): AiProvider[] {
  const configured = (process.env.AI_PROVIDER_ORDER || "openai,gemini,openrouter")
    .split(",")
    .map(item => item.trim().toLowerCase())
    .filter((item): item is AiProvider => ["openai", "gemini", "openrouter"].includes(item));
  return configured.length ? configured : ["openai", "gemini", "openrouter"];
}

function systemPrompt(locale: "fr" | "en", context: string) {
  const fr = locale !== "en";
  return fr
    ? [
      "Tu es NutVita AI, l'assistant nutrition et santé de NutVitaGlobalis, integre dans l'espace personnel du client.",
      "Tu reponds de facon claire, bienveillante et professionnelle, comprehensible par le grand public.",
      "Tu t'appuies uniquement sur les donnees reelles fournies ci-dessous. N'invente jamais de valeur, de mesure ou de resultat absent du contexte.",
      "Tu ne poses jamais de diagnostic, ne prescris rien et ne remplaces pas un professionnel de sante. Pour tout signal preoccupant, recommande explicitement une consultation.",
      "Si une question sort du cadre nutrition/sante/suivi NutVitaGlobalis, redirige poliment vers un professionnel ou le support NutVitaGlobalis.",
      "Reponses concises (150 mots maximum sauf demande explicite de detail), en francais, sans jargon non explique.",
      "",
      "Contexte du client (donnees reelles disponibles) :",
      context || "Aucune donnee de suivi disponible pour le moment.",
    ].join("\n")
    : [
      "You are NutVita AI, NutVitaGlobalis' nutrition and health assistant, embedded in the client's personal space.",
      "Answer clearly, kindly and professionally, understandable by the general public.",
      "Rely only on the real data provided below. Never invent a value, measurement or result absent from the context.",
      "Never provide a diagnosis, never prescribe, and never replace a healthcare professional. For any concerning signal, explicitly recommend a consultation.",
      "If a question falls outside nutrition/health/NutVitaGlobalis follow-up, politely redirect to a professional or NutVitaGlobalis support.",
      "Keep answers concise (150 words maximum unless detail is explicitly requested), in English, without unexplained jargon.",
      "",
      "Client context (real available data):",
      context || "No follow-up data available yet.",
    ].join("\n");
}

async function chatWithOpenAI(system: string, history: ChatMessage[]): Promise<ChatResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { text: null, error: "openai_missing_api_key" };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        ...history.map(message => ({ role: message.role, content: [{ type: "input_text", text: message.content }] })),
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { text: null, error: `openai_http_${response.status}` };
  const payload = await response.json();
  const text = typeof payload?.output_text === "string" ? payload.output_text : (payload?.output || []).flatMap((item: any) => item?.content || []).map((content: any) => content?.text).filter(Boolean).join("\n");
  return { text: text || null, provider: "openai", error: text ? undefined : "openai_empty_response" };
}

async function chatWithGemini(system: string, history: ChatMessage[]): Promise<ChatResult> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) return { text: null, error: "gemini_missing_api_key" };
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: history.map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
      generationConfig: { temperature: 0.4 },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { text: null, error: `gemini_http_${response.status}` };
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text).filter(Boolean).join("\n") || "";
  return { text: text || null, provider: "gemini", error: text ? undefined : "gemini_empty_response" };
}

async function chatWithOpenRouter(system: string, history: ChatMessage[]): Promise<ChatResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { text: null, error: "openrouter_missing_api_key" };
  const model = process.env.OPENROUTER_MODEL;
  if (!model) return { text: null, error: "openrouter_missing_model" };
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://www.nutvitaglobalis.com",
      "X-Title": "NutVitaGlobalis",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [{ role: "system", content: system }, ...history],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) return { text: null, error: `openrouter_http_${response.status}` };
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || "";
  return { text: text || null, provider: "openrouter", error: text ? undefined : "openrouter_empty_response" };
}

export async function askNutvitaAssistant(history: ChatMessage[], context: string, locale: "fr" | "en" = "fr"): Promise<ChatResult> {
  const system = systemPrompt(locale, context);
  const errors: string[] = [];
  try {
    for (const provider of providerOrder()) {
      const result = provider === "openai" ? await chatWithOpenAI(system, history)
        : provider === "gemini" ? await chatWithGemini(system, history)
          : await chatWithOpenRouter(system, history);
      if (result.text) return result;
      if (result.error) errors.push(result.error);
    }
    console.error("NutVita AI providers failed", { errors });
    return { text: null, error: errors.join("|") || "external_ai_unavailable" };
  } catch (error) {
    console.error("NutVita AI request failed", error);
    return { text: null, error: error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "request_failed" };
  }
}
