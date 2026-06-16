import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail } from "@/lib/system-email";

export async function GET(request: Request) {
  const url = new URL(request.url), code = url.searchParams.get("code"), rawNext = url.searchParams.get("next") || "/espace-client";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/espace-client";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {data:{user}}=await supabase.auth.getUser();
      if(user&&next!=="/mot-de-passe-oublie"){
        const admin=createAdminClient(),{data:profile}=await admin.from("client_profiles").select("full_name,email").eq("id",user.id).maybeSingle();
        if(profile?.email)await sendSystemEmail(admin,"account_welcome",profile.email,{name:profile.full_name||"Client",action_url:`${url.origin}/espace-client`},{user_id:user.id});
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL(`/connexion?erreur=confirmation`, url.origin));
}
