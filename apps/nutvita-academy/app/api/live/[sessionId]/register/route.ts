import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const { error } = await supabase.rpc("register_for_live_session", { target_session_id: sessionId });
  if (error) return Response.json({ error: error.message.includes("session_full") ? apiText(request, "Cette session est complète.", "This session is full.") : error.message }, { status: 409 });
  return Response.json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const { error } = await supabase.from("live_registrations").delete().eq("session_id", sessionId).eq("user_id", auth.user.id);
  if (error) return Response.json({ error: error.message }, { status: 403 });
  return Response.json({ success: true });
}
