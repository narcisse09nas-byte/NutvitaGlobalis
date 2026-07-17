import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasLocalAdminMode, hasSupabaseConfig } from "@/lib/supabase/config";
import { createLocalClient } from "@/lib/supabase/local";
import { localPartnerUser } from "@/lib/local-seed";
import { createClient } from "@/lib/supabase/server";
export async function requirePartner(){if(hasLocalAdminMode()&&!hasSupabaseConfig()){if((await cookies()).get("nutvita_local_partner")?.value!=="1")redirect("/partenaire/connexion");const supabase=createLocalClient();const {data:profile}=await supabase.from("dietitian_profiles").select("*").eq("candidate_id",localPartnerUser.id).eq("status","active").maybeSingle();return{supabase,user:localPartnerUser,profile}}if(!hasSupabaseConfig())redirect("/connexion?erreur=configuration");const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/connexion?redirect=/choisir-acces");const {data:profile}=await supabase.from("dietitian_profiles").select("*").eq("candidate_id",user.id).eq("status","active").maybeSingle();if(!profile)redirect("/choisir-acces?erreur=partenaire_non_autorise");return{supabase,user,profile}}
