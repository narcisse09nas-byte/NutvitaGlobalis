import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {getClientEntitlements} from "@/lib/client";
import {getCurrentLocale} from "@/lib/i18n-server";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const locale=await getCurrentLocale(),en=locale==="en";
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.redirect(new URL(`/connexion?redirect=${encodeURIComponent(new URL(request.url).pathname)}`,request.url));
  const access=await getClientEntitlements(supabase,user.id);
  if(!access.premiumResources)return NextResponse.json({message:en?"An active premium service is required.":"Un service premium actif est requis."},{status:403});
  const {id}=await params,{data,error}=await supabase.from("ressources_premium").select("file_url").eq("id",id).eq("status","published").maybeSingle();
  if(error||!data?.file_url)return NextResponse.json({message:en?"Resource not found.":"Ressource introuvable."},{status:404});
  return NextResponse.redirect(new URL(data.file_url,request.url));
}
