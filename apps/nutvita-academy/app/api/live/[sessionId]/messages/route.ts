import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const body = await request.json().catch(() => null) as { content?: string } | null;
  const content = body?.content?.trim() ?? "";
  if (!content || content.length > 2000) return Response.json({ error: "Message invalide." }, { status: 400 });
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", auth.user.id).single();
  const { error } = await supabase.from("live_messages").insert({ session_id: sessionId, user_id: auth.user.id, author_name: profile?.full_name ?? "Participant", content });
  if (error) return Response.json({ error: error.message }, { status: 403 });
  return Response.json({ success: true }, { status: 201 });
}
