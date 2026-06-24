import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireFosaMember() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/fosa/connexion");
  const { data: member } = await supabase
    .from("fosa_members")
    .select("*, fosa_organizations(*)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) redirect("/fosa/inscription");
  const organization = member.fosa_organizations;
  return { supabase, user, member, organization };
}

export async function requireActiveFosaMember() {
  const context = await requireFosaMember();
  if (context.member.status !== "active" || context.organization?.status !== "approved") {
    redirect("/fosa/espace?statut=en-attente");
  }
  if (context.member.must_change_password) redirect("/mot-de-passe-oublie");
  return context;
}

export async function requireFosaAdmin() {
  const context = await requireActiveFosaMember();
  if (context.member.role !== "organization_admin") redirect("/fosa/espace?acces=refuse");
  return context;
}
