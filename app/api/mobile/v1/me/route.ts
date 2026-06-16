import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientEntitlements } from "@/lib/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });

  const [{ data: profile }, entitlements] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("id", user.id).maybeSingle(),
    getClientEntitlements(supabase, user.id),
  ]);

  return NextResponse.json({ user: { id: user.id, email: user.email }, profile, entitlements });
}
