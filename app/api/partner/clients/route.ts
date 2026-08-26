import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {hasLocalAdminMode,hasSupabaseConfig} from "@/lib/supabase/config";
const clean=(v:string)=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9.]+/g,".").replace(/^\.+|\.+$/g,"");
const code=()=>`NVGC${crypto.randomUUID().split("-").join("").slice(0,6).toUpperCase()}`;
const addMonths=(date:Date,months:number)=>{const copy=new Date(date);copy.setMonth(copy.getMonth()+Math.max(1,months||3));return copy};
export async function POST(request:Request){
 const body=await request.json(),amount=Number(body.amount||0),periodMonths=Number(body.period_months||3);
 const paymentStatus=String(body.payment_status||(amount>0?"paid":"waived")),startsAt=body.starts_at?new Date(String(body.starts_at)):new Date(),expiresAt=addMonths(startsAt,periodMonths);
 const common={full_name:body.full_name,email:body.email||null,phone:body.phone||null,whatsapp_phone:body.whatsapp_phone||body.phone||null,country:body.country||null,city:body.city||null,state_region:body.state_region||null,birth_date:body.birth_date||null,sex:body.sex||null,complaints:body.complaints||null,objectives:body.objectives||null};
 if(hasLocalAdminMode()&&!hasSupabaseConfig()){
  const id=crypto.randomUUID(),username=clean(body.username||body.full_name)||`client.${id.slice(0,6)}`,password=body.password||`Nvg-${crypto.randomUUID().slice(0,8)}!`;
  return NextResponse.json({ok:true,local:true,client:{id,...common,username,login_email:`${username}@accounts.nutvitaglobalis.local`,client_number:code(),origin:"onsite",must_change_password:true,partner_access_starts_at:startsAt.toISOString(),partner_access_expires_at:expiresAt.toISOString(),partner_assignment_status:"active"},payment:{amount,payment_status:paymentStatus,period_months:periodMonths,expires_at:expiresAt.toISOString()},password});
 }
 const session=await createClient(),{data:{user}}=await session.auth.getUser();
 if(!user)return NextResponse.json({message:"Non authentifié."},{status:401});
 const {data:partner}=await session.from("dietitian_profiles").select("id,free_onsite_creation").eq("candidate_id",user.id).eq("status","active").maybeSingle();
 if(!partner)return NextResponse.json({message:"Partenaire actif requis."},{status:403});
 if(!partner.free_onsite_creation)return NextResponse.json({message:"La création de clients sur site est réservée aux partenaires autorisés. Utilisez la facturation Maximus."},{status:403});
 const admin=createAdminClient(),username=clean(body.username||body.full_name),password=String(body.password||`Nvg-${crypto.randomUUID().slice(0,8)}!`);
 if(username.length<4)return NextResponse.json({message:"Le nom utilisateur doit contenir au moins 4 caractères."},{status:400});
 const loginEmail=`${username}@accounts.nutvitaglobalis.local`;
 const created=await admin.auth.admin.createUser({email:loginEmail,password,email_confirm:true,user_metadata:{full_name:body.full_name,account_type:"client",username,origin:"onsite"}});
 if(created.error||!created.data.user)return NextResponse.json({message:created.error?.message||"Création impossible."},{status:400});
 const {data:client,error}=await admin.from("client_profiles").upsert({id:created.data.user.id,...common,login_email:loginEmail,username,client_number:code(),created_by_partner_id:partner.id,assigned_partner_id:partner.id,origin:"onsite",must_change_password:true,partner_access_starts_at:startsAt.toISOString(),partner_access_expires_at:expiresAt.toISOString(),partner_assignment_status:"active"}).select().single();
 if(error){await admin.auth.admin.deleteUser(created.data.user.id);return NextResponse.json({message:error.message},{status:400})}
 const {data:payment}=await admin.from("partner_client_payments").insert({partner_id:partner.id,client_id:client.id,amount,currency:body.currency||"XOF",payment_status:paymentStatus,payment_method:body.payment_method||null,period_months:periodMonths,starts_at:startsAt.toISOString(),expires_at:expiresAt.toISOString(),created_by:user.id}).select().maybeSingle();
 await admin.from("platform_service_access").upsert({user_id:client.id,service_key:"teleconsultation",roles:["client"],active:true,granted_by:user.id,expires_at:expiresAt.toISOString()},{onConflict:"user_id,service_key"});
 return NextResponse.json({ok:true,client,payment,password});
}
