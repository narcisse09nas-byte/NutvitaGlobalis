import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { generateAcademyStructured } from "@/lib/ai-provider";
import type { AiProRequest, AiProResponse } from "@/types/ai-pro";

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return Response.json({ error: "Supabase non configuré." }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return Response.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  const body = (await request.json().catch(() => null)) as AiProRequest | null;
  if (!body?.prompt?.trim())
    return Response.json({ error: "PROMPT_REQUIRED" }, { status: 400 });
  const result = await generateAcademyStructured<AiProResponse>(
    "academy_instructor_pro",
    `Vous êtes l'assistant de conception pédagogique de NutVitaGlobalis Academy. Mode demandé: ${body.mode}. Langue: ${body.locale || "fr"}. Produisez un contenu exploitable, rigoureux et adapté au contexte fourni. Pour les quiz et cas, fournissez du contenu original et un corrigé pédagogique.`,
    { prompt: body.prompt.slice(0, 12000), context: body.context },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        content: { type: "string" },
        suggestions: { type: "array", items: { type: "string" } },
      },
      required: ["title", "content", "suggestions"],
    },
  );
  if (!result.data)
    return Response.json(
      { error: result.error || "AI_UNAVAILABLE" },
      { status: 503 },
    );
  return Response.json({ ...result.data, provider: result.provider });
}
