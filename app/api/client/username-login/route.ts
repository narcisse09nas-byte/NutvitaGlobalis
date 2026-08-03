import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
export async function POST(request:Request){
  if(!hasSupabaseConfig()) return NextResponse.json({message:"Utilisez le compte client local de démonstration."},{status:400});
  const {identifier,password}=await request.json(); const entered=String(identifier||"").trim().toLowerCase(); let email=entered; const admin=createAdminClient();
  if(entered.includes("@")){const {data}=await admin.from("client_profiles").select("login_email").ilike("email",entered).maybeSingle();if(data?.login_email)email=data.login_email;}
  else{const {data}=await admin.from("client_profiles").select("login_email").eq("username",entered).maybeSingle();if(!data?.login_email)return NextResponse.json({message:"Identifiant inconnu."},{status:401});email=data.login_email;}
  const supabase=await createClient(),{error}=await supabase.auth.signInWithPassword({email,password});if(error)return NextResponse.json({message:"Identifiant ou mot de passe incorrect."},{status:401});return NextResponse.json({ok:true});
}
