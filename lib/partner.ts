import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocalAdminMode, hasSupabaseConfig } from "@/lib/supabase/config";
import { createLocalClient } from "@/lib/supabase/local";
import { localPartnerUser } from "@/lib/local-seed";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPrincipalEmail } from "@/lib/platform-services";

export async function requirePartner() {
  if (hasLocalAdminMode() && !hasSupabaseConfig()) {
    if ((await cookies()).get("nutvita_local_partner")?.value !== "1") redirect("/partenaire/connexion");
    const supabase = createLocalClient();
    const { data: profile } = await supabase.from("dietitian_profiles").select("*").eq("candidate_id", localPartnerUser.id).eq("status", "active").maybeSingle();
    return { supabase, user: localPartnerUser, profile };
  }
  if (!hasSupabaseConfig()) redirect("/connexion?erreur=configuration");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/choisir-acces");
  const [{ data: existing }, { data: admin }] = await Promise.all([
    supabase.from("dietitian_profiles").select("*").eq("candidate_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from("admin_users").select("role,active,full_name").eq("id", user.id).maybeSingle(),
  ]);
  let profile = existing;
  const principal = isPrincipalEmail(user.email) || Boolean(admin?.active && admin.role === "super_admin");
  if (!profile && principal) {
    const { data } = await createAdminClient().from("dietitian_profiles").upsert({
      id: user.id,
      candidate_id: user.id,
      application_id: null,
      status: "active",
      full_name: admin?.full_name || user.user_metadata.full_name || user.email || "Super administrateur",
      specialties: [],
      languages: [],
    }, { onConflict: "candidate_id" }).select("*").single();
    profile = data;
  }
  if (!profile) redirect("/choisir-acces?erreur=partenaire_non_autorise");
  return { supabase, user, profile };
}
