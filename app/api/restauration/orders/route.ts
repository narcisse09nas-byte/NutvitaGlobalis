import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request:Request){
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({message:"Authentification requise."},{status:401});
  const body=await request.json(),items=Array.isArray(body.items)?body.items.filter((item:any)=>Number(item.quantity)>0):[];
  if(!body.city||!body.delivery_address||!body.contact_name||!body.contact_phone||!items.length)return NextResponse.json({message:"Ville, contact, adresse et au moins un menu sont requis."},{status:400});
  const ids=items.map((item:any)=>String(item.menu_id));
  const {data:menus,error:menuError}=await supabase.from("catering_menus").select("id,name_fr,name_en,city,published").in("id",ids).eq("published",true);
  if(menuError||!menus||menus.length!==ids.length||menus.some((menu:any)=>menu.city!==body.city))return NextResponse.json({message:"Un menu sélectionné n’est plus disponible dans cette ville."},{status:400});
  const admin=createAdminClient();
  const {data:order,error}=await admin.from("catering_orders").insert({client_id:user.id,city:String(body.city),delivery_address:String(body.delivery_address),delivery_details:String(body.delivery_details||"")||null,contact_name:String(body.contact_name),contact_phone:String(body.contact_phone),preferred_delivery_at:body.preferred_delivery_at||null}).select("*").single();
  if(error||!order)return NextResponse.json({message:error?.message||"Commande non créée."},{status:400});
  const names=new Map(menus.map((menu:any)=>[menu.id,menu.name_fr]));
  const {error:itemError}=await admin.from("catering_order_items").insert(items.map((item:any)=>({order_id:order.id,menu_id:String(item.menu_id),menu_name:names.get(String(item.menu_id))||"Menu",quantity:Number(item.quantity),customer_note:String(item.customer_note||"")||null})));
  if(itemError){await admin.from("catering_orders").delete().eq("id",order.id);return NextResponse.json({message:itemError.message},{status:400})}
  await admin.from("catering_order_events").insert({order_id:order.id,to_status:"awaiting_review",note:"Commande soumise par le client",actor_id:user.id});
  const {data:complete}=await admin.from("catering_orders").select("*,catering_order_items(*)").eq("id",order.id).single();
  return NextResponse.json({order:complete},{status:201});
}

export async function PATCH(request:Request){
  const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({message:"Authentification requise."},{status:401});
  const body=await request.json();
  if(body.action!=="confirm")return NextResponse.json({message:"Action invalide."},{status:400});
  const admin=createAdminClient();
  const {data:current}=await admin.from("catering_orders").select("id,status").eq("id",String(body.id)).eq("client_id",user.id).maybeSingle();
  if(!current||current.status!=="quoted")return NextResponse.json({message:"Cette commande ne peut pas être confirmée."},{status:409});
  const {data:order,error}=await admin.from("catering_orders").update({status:"awaiting_delivery",confirmed_at:new Date().toISOString()}).eq("id",current.id).select("*,catering_order_items(*)").single();
  if(error)return NextResponse.json({message:error.message},{status:400});
  return NextResponse.json({order});
}
