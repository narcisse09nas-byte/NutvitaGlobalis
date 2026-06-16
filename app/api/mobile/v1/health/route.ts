import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientEntitlements } from "@/lib/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const access = await getClientEntitlements(supabase, user.id);
  if (!access.health) return NextResponse.json({ message: "Abonnement sante requis." }, { status: 402 });

  const [{ data: anthropometry }, { data: biology }, { data: food }] = await Promise.all([
    supabase.from("anthropometric_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("biological_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("food_history").select("*").eq("client_id", user.id).order("entry_date"),
  ]);

  return NextResponse.json({
    anthropometry: anthropometry || [],
    biology: biology || [],
    food: food || [],
  });
}
