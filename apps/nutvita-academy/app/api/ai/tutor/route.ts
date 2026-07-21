import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { generateAcademyStructured } from "@/lib/ai-provider";

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
  const body = (await request.json().catch(() => null)) as {
    question?: string;
    locale?: "fr" | "en";
    context?: unknown;
  } | null;
  const question = body?.question?.trim().slice(0, 8000);
  if (!question)
    return Response.json({ error: "QUESTION_REQUIRED" }, { status: 400 });
  const result = await generateAcademyStructured<{ content: string }>(
    "academy_tutor_answer",
    `Vous êtes le tuteur pédagogique bilingue de NutVitaGlobalis Academy. Répondez dans la langue demandée (${body?.locale || "fr"}). Soyez exact, pédagogique et pratique. N'inventez pas de faits. Signalez clairement les limites et recommandez une vérification professionnelle pour toute question clinique individuelle.`,
    { question, context: body?.context },
    {
      type: "object",
      additionalProperties: false,
      properties: { content: { type: "string" } },
      required: ["content"],
    },
  );
  if (!result.data)
    return Response.json(
      { error: result.error || "AI_UNAVAILABLE" },
      { status: 503 },
    );
  return Response.json({ ...result.data, provider: result.provider });
}
