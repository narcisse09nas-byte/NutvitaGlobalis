import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const [
    { data: profile },
    { data: subscriptions },
    { data: consents },
    { data: privacyRequests },
    { data: appointments },
    { data: anthropometry },
    { data: biology },
    { data: food },
    { data: lifestyle },
  ] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("*").eq("client_id", user.id),
    supabase.from("user_consents").select("*").eq("user_id", user.id),
    supabase.from("privacy_requests").select("*").eq("user_id", user.id),
    supabase.from("appointments").select("*").eq("client_id", user.id),
    supabase.from("anthropometric_measurements").select("*").eq("client_id", user.id),
    supabase.from("biological_measurements").select("*").eq("client_id", user.id),
    supabase.from("food_history").select("*").eq("client_id", user.id),
    supabase.from("health_lifestyle_assessments").select("*").eq("client_id", user.id),
  ]);

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    profile,
    subscriptions: subscriptions || [],
    consents: consents || [],
    privacy_requests: privacyRequests || [],
    appointments: appointments || [],
    health_data: {
      anthropometry: anthropometry || [],
      biology: biology || [],
      food: food || [],
      lifestyle: lifestyle || [],
    },
  });
}
