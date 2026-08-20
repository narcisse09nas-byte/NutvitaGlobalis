import { NextResponse } from "next/server";
import { getClientEntitlements } from "@/lib/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "medical" ? "medical" : "dietetic";
  const finder = type === "medical" ? "/consultations-medicales/specialistes" : "/nutritionnistes";
  const service = type === "medical" ? "medical_consultation" : "teleconsultation";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/connexion", url.origin);
    login.searchParams.set("redirect", finder);
    return NextResponse.redirect(login);
  }

  const entitlements = await getClientEntitlements(supabase, user.id);
  const hasEntitlement = type === "medical" ? entitlements.medicalConsultation : entitlements.teleconsultation;
  if (hasEntitlement) {
    return NextResponse.redirect(new URL(`/api/access/open?service=${service}&role=client`, url.origin));
  }
  return NextResponse.redirect(new URL(finder, url.origin));
}
