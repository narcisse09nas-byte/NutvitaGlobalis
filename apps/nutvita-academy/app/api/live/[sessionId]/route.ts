import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { apiText } from "@/lib/api-i18n";

export async function PATCH(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  if (!isSupabaseConfigured()) return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const { sessionId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification requise." }, { status: 401 });
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (!body?.status || !["scheduled", "live", "completed", "cancelled"].includes(body.status)) return Response.json({ error: "Statut invalide." }, { status: 400 });
  const { error } = await supabase.from("live_sessions").update({ status: body.status }).eq("id", sessionId);
  if (error) return Response.json({ error: error.message }, { status: 403 });
  return Response.json({ success: true });
}
