import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", auth.user.id).single();
  const { error } = await supabase.from("live_attendance").insert({ session_id: sessionId, user_id: auth.user.id, full_name: profile?.full_name ?? "Participant" });
  if (error) return Response.json({ error: error.message }, { status: 403 });
  return Response.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const { error } = await supabase.from("live_attendance").update({ left_at: new Date().toISOString() }).eq("session_id", sessionId).eq("user_id", auth.user.id).is("left_at", null);
  if (error) return Response.json({ error: error.message }, { status: 403 });
  return Response.json({ success: true });
}
