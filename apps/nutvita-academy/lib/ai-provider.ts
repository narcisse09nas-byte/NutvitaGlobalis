import "server-only";

export type AiProvider = "openai" | "gemini" | "openrouter";
export type AiResult<T> = {
  data: T | null;
  provider?: AiProvider;
  error?: string;
};

const order = (): AiProvider[] => {
  const configured = (
    process.env.AI_PROVIDER_ORDER || "openai,gemini,openrouter"
  )
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AiProvider =>
      ["openai", "gemini", "openrouter"].includes(item),
    );
  return configured.length ? configured : ["openai", "gemini", "openrouter"];
};

const parse = <T>(value: string): T =>
  JSON.parse(
    value
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim(),
  ) as T;
const prompt = (
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
) =>
  `${instructions}\nRetournez uniquement un objet JSON valide nommé ${name}.\nSchéma: ${JSON.stringify(schema)}\nDonnées: ${JSON.stringify(input)}`;

async function openai<T>(
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
): Promise<AiResult<T>> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { data: null, error: "openai_missing_api_key" };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      store: false,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: instructions }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(input) }],
        },
      ],
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok)
    return {
      data: null,
      error:
        response.status === 401
          ? "openai_invalid_api_key"
          : response.status === 429
            ? "openai_quota_or_rate_limit"
            : `openai_http_${response.status}`,
    };
  const payload = (await response.json()) as {
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const text =
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.text)?.text || "";
  return text
    ? { data: parse<T>(text), provider: "openai" }
    : { data: null, error: "openai_empty_response" };
}
async function gemini<T>(
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
): Promise<AiResult<T>> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!key) return { data: null, error: "gemini_missing_api_key" };
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt(name, instructions, input, schema) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(45000),
    },
  );
  if (!response.ok)
    return {
      data: null,
      error:
        response.status === 401 || response.status === 403
          ? "gemini_invalid_api_key"
          : response.status === 429
            ? "gemini_quota_or_rate_limit"
            : `gemini_http_${response.status}`,
    };
  const payload = await response.json();
  const text =
    payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text)
      .filter(Boolean)
      .join("\n") || "";
  return text
    ? { data: parse<T>(text), provider: "gemini" }
    : { data: null, error: "gemini_empty_response" };
}
async function openrouter<T>(
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
): Promise<AiResult<T>> {
  const key = process.env.OPENROUTER_API_KEY,
    model = process.env.OPENROUTER_MODEL;
  if (!key || !model)
    return {
      data: null,
      error: !key ? "openrouter_missing_api_key" : "openrouter_missing_model",
    };
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL || "https://www.nutvitaglobalis.com",
        "X-Title": "NutVitaGlobalis Academy",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "user", content: prompt(name, instructions, input, schema) },
        ],
      }),
      signal: AbortSignal.timeout(45000),
    },
  );
  if (!response.ok)
    return {
      data: null,
      error:
        response.status === 401 || response.status === 403
          ? "openrouter_invalid_api_key"
          : response.status === 429
            ? "openrouter_quota_or_rate_limit"
            : `openrouter_http_${response.status}`,
    };
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content || "";
  return text
    ? { data: parse<T>(text), provider: "openrouter" }
    : { data: null, error: "openrouter_empty_response" };
}

export async function generateAcademyStructured<T>(
  name: string,
  instructions: string,
  input: unknown,
  schema: Record<string, unknown>,
): Promise<AiResult<T>> {
  const errors: string[] = [];
  try {
    for (const provider of order()) {
      const result =
        provider === "openai"
          ? await openai<T>(name, instructions, input, schema)
          : provider === "gemini"
            ? await gemini<T>(name, instructions, input, schema)
            : await openrouter<T>(name, instructions, input, schema);
      if (result.data) return result;
      if (result.error) errors.push(result.error);
    }
    return { data: null, error: errors.join("|") || "external_ai_unavailable" };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof DOMException && error.name === "TimeoutError"
          ? "timeout"
          : error instanceof SyntaxError
            ? "invalid_ai_json"
            : "external_ai_request_failed",
    };
  }
}
