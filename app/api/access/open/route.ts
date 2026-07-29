import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {getAccessChoices,getPlatformIdentity} from "@/lib/platform-access";
import {findPlatformRole,platformServices,type PlatformRole,type PlatformServiceKey} from "@/lib/platform-services";
import {purchaseDestination,safeInternalPath} from "@/lib/service-entry";

const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:60*60*12};

export async function GET(request:Request){
  const url=new URL(request.url);
  const service=String(url.searchParams.get("service")||"") as PlatformServiceKey;
  const requestedRole=(url.searchParams.get("role")||"") as PlatformRole;
  const returnTo=safeInternalPath(url.searchParams.get("return"),"");
  const definition=platformServices.find(item=>item.key===service);
  if(!definition)return NextResponse.redirect(new URL("/services?erreur=service-inconnu",url.origin));

  const identity=await getPlatformIdentity();
  if(!identity){
    const requested=`${url.pathname}${url.search}`;
    return NextResponse.redirect(new URL(`/connexion?redirect=${encodeURIComponent(requested)}`,url.origin));
  }

  const access=await getAccessChoices();
  const choices=access.choices.filter(choice=>choice.service===service&&(!requestedRole||choice.role===requestedRole));
  const choice=choices[0];
  if(!choice){
    const purchase=purchaseDestination(service);
    return NextResponse.redirect(new URL(purchase,url.origin));
  }

  const roleDefinition=findPlatformRole(service,choice.role);
  const destination=returnTo||roleDefinition?.href||choice.href;
  const response=NextResponse.redirect(new URL(destination,url.origin));
  response.cookies.set("nutvita_active_service",choice.service,cookieOptions);
  response.cookies.set("nutvita_active_role",choice.role,cookieOptions);
  if(identity.supabase){
    await createAdminClient().from("platform_session_selections").insert({
      user_id:identity.user.id,service_key:choice.service,role_key:choice.role,
      selected_at:new Date().toISOString(),user_agent:request.headers.get("user-agent"),
    });
  }
  return response;
}
