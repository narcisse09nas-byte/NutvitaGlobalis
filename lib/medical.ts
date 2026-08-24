import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireActivePlatformSession } from "@/lib/active-platform-session";

// Mirrors lib/partner.ts's requirePartner() exactly, kept fully separate (medical_specialists
// instead of dietitian_profiles, service "medical_consultation" / role "specialist" instead of
// health|child_growth|teleconsultation / nutritionist) so the two professional workspaces stay
// well-partitioned end to end.
export async function requireSpecialist() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/api/access/open?service=medical_consultation&role=specialist");
  await requireActivePlatformSession(["medical_consultation"], "specialist");
  const { data: profile } = await supabase.from("medical_specialists").select("*").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (!profile) redirect("/rejoindre-medecins-specialistes?acces=professionnel-requis");
  return { supabase, user, profile };
}

// medical_consultations.client_id references auth.users(id), not client_profiles(id) directly
// (unlike partner_consultations.client_id, which does reference client_profiles(id)) — so
// PostgREST can't auto-embed client_profiles(...) on medical_consultations. This attaches it
// manually so every médecin page can read row.client_profiles?.full_name exactly like the
// nutritionist pages do.
export async function attachClientProfiles<T extends { client_id: string }>(supabase: SupabaseClient, rows: T[]): Promise<Array<T & { client_profiles: { full_name?: string; email?: string; client_number?: string } | null }>> {
  const ids = Array.from(new Set(rows.map(row => row.client_id).filter(Boolean)));
  if (!ids.length) return rows.map(row => ({ ...row, client_profiles: null }));
  const { data } = await supabase.from("client_profiles").select("id,full_name,email,client_number").in("id", ids);
  const byId = new Map((data || []).map(item => [item.id, item]));
  return rows.map(row => ({ ...row, client_profiles: byId.get(row.client_id) || null }));
}
