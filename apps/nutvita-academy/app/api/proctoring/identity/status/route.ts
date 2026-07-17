import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiText } from "@/lib/api-i18n";

export async function GET(request: Request) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return Response.json({ error: apiText(request, "Supabase non configuré.", "Supabase is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return Response.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  const bookingReference = new URL(request.url).searchParams.get(
    "bookingReference",
  );
  if (!bookingReference)
    return Response.json({ error: apiText(request, "Référence manquante.", "Missing reference.") }, { status: 400 });
  const { data } = await createSupabaseAdminClient()
    .from("identity_verifications")
    .select(
      "status, identity_score, profile_data_matched, decision_reasons, assessed_at",
    )
    .eq("booking_reference", bookingReference)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return Response.json(data ?? { status: "not_started" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
