import { NextResponse } from "next/server";
import { requireMaximusApi } from "@/lib/maximus-api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const modules={menus:"sales/public-menus",locations:"sales/catering-locations",orders:"sales/customer-orders"} as const;
type Resource=keyof typeof modules;
function resource(request:Request){return (new URL(request.url).searchParams.get("resource")||"orders") as Resource}

export async function GET(request:Request){
  const key=resource(request);if(!modules[key])return NextResponse.json({message:"Ressource invalide."},{status:400});
  const ctx=await requireMaximusApi(modules[key],"viewer");if("error" in ctx)return ctx.error;
  const admin=createAdminClient();
  const table=key==="menus"?"catering_menus":key==="locations"?"catering_locations":"catering_orders";
  let query=admin.from(table).select(key==="orders"?"*,catering_order_items(*)":"*").order("created_at",{ascending:false});
  const {data,error}=await query;if(error)return NextResponse.json({message:error.message},{status:400});
  return NextResponse.json({items:data||[]});
}

export async function POST(request:Request){
  const body=await request.json(),key=String(body.resource||"") as Resource;
  if(!modules[key]||key==="orders")return NextResponse.json({message:"Ressource invalide."},{status:400});
  const ctx=await requireMaximusApi(modules[key],"creator");if("error" in ctx)return ctx.error;
  const admin=createAdminClient(),table=key==="menus"?"catering_menus":"catering_locations";
  const payload={...body.data,created_by:key==="menus"?ctx.user.id:undefined};
  const {data,error}=await admin.from(table).insert(payload).select("*").single();
  if(error)return NextResponse.json({message:error.message},{status:400});return NextResponse.json({item:data});
}

export async function PATCH(request:Request){
  const body=await request.json(),key=String(body.resource||"") as Resource;
  if(!modules[key])return NextResponse.json({message:"Ressource invalide."},{status:400});
  const required=key==="orders"&&["quote","dispatch","deliver","finance_receive"].includes(body.action)?"validator":"editor";
  const ctx=await requireMaximusApi(modules[key],required);if("error" in ctx)return ctx.error;
  const admin=createAdminClient();
  if(key!=="orders"){
    const table=key==="menus"?"catering_menus":"catering_locations";
    const {data,error}=await admin.from(table).update(body.data||{}).eq("id",String(body.id)).select("*").single();
    if(error)return NextResponse.json({message:error.message},{status:400});return NextResponse.json({item:data});
  }
  const {data:current}=await admin.from("catering_orders").select("*,catering_order_items(*)").eq("id",String(body.id)).single();
  if(!current)return NextResponse.json({message:"Commande introuvable."},{status:404});
  const now=new Date().toISOString();let patch:Record<string,unknown>={};let next=current.status;
  if(body.action==="quote"&&current.status==="awaiting_review"){
    const itemPrices=body.item_prices||{};let subtotal=0;
    for(const item of current.catering_order_items||[]){const price=Number(itemPrices[item.id]||0);subtotal+=price*Number(item.quantity);await admin.from("catering_order_items").update({quoted_unit_price:price,line_total:price*Number(item.quantity)}).eq("id",item.id)}
    next="quoted";patch={status:next,subtotal,delivery_fee:Number(body.delivery_fee||0),additional_fee:Number(body.additional_fee||0),total_amount:subtotal+Number(body.delivery_fee||0)+Number(body.additional_fee||0),quote_note:String(body.quote_note||""),quoted_by:ctx.user.id,quoted_at:now};
  }else if(body.action==="dispatch"&&["customer_confirmed","awaiting_delivery"].includes(current.status)){next="out_for_delivery";patch={status:next,assigned_driver_id:body.assigned_driver_id||ctx.user.id}}
  else if(body.action==="deliver"&&current.status==="out_for_delivery"){next="delivered";patch={status:next,delivered_at:now,delivery_note:String(body.delivery_note||""),finance_status:"receivable"}}
  else if(body.action==="finance_receive"&&current.status==="delivered"){next="delivered";patch={finance_status:"received",finance_received_by:ctx.user.id,finance_received_at:now,payment_method:String(body.payment_method||""),payment_reference:String(body.payment_reference||"")}}
  else return NextResponse.json({message:"Transition de statut non autorisée."},{status:409});
  const {data,error}=await admin.from("catering_orders").update(patch).eq("id",current.id).select("*,catering_order_items(*)").single();
  if(error)return NextResponse.json({message:error.message},{status:400});
  await admin.from("catering_order_events").insert({order_id:current.id,from_status:current.status,to_status:next,note:String(body.quote_note||body.delivery_note||body.action),actor_id:ctx.user.id});
  if(body.action==="deliver")await admin.from("maximus_settlement_tickets").insert({source_type:"catering_delivery",source_id:current.id,payer_name:current.contact_name,sale_point:current.city,amount:Number(current.total_amount||0),currency:current.currency});
  return NextResponse.json({item:data});
}
