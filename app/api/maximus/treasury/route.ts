import { NextResponse } from "next/server";
import { requireMaximusApi } from "@/lib/maximus-api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request:Request){
  const resource=new URL(request.url).searchParams.get("resource")||"transactions";
  const module=resource==="accounts"?"finance/treasury-accounts":resource==="tickets"?"finance/settlements":"finance/reports";
  const ctx=await requireMaximusApi(module,"viewer");if("error" in ctx)return ctx.error;
  const admin=createAdminClient(),table=resource==="accounts"?"maximus_financial_accounts":resource==="tickets"?"maximus_settlement_tickets":"maximus_treasury_transactions";
  const selection=resource==="tickets"?"*,maximus_financial_accounts(*)":resource==="transactions"?"*,maximus_financial_accounts(*)":"*";
  const {data,error}=await admin.from(table).select(selection).order(resource==="transactions"?"transaction_date":"created_at",{ascending:false});
  if(error)return NextResponse.json({message:error.message},{status:400});return NextResponse.json({items:data||[]});
}

export async function POST(request:Request){
  const body=await request.json(),resource=String(body.resource||"");
  const module=resource==="accounts"?"finance/treasury-accounts":"finance/settlements";
  const ctx=await requireMaximusApi(module,resource==="accounts"?"creator":"validator");if("error" in ctx)return ctx.error;
  const admin=createAdminClient();
  if(resource==="accounts"){
    const {data,error}=await admin.from("maximus_financial_accounts").insert({...body.data,created_by:ctx.user.id}).select("*").single();
    if(error)return NextResponse.json({message:error.message},{status:400});return NextResponse.json({item:data});
  }
  if(resource!=="settle")return NextResponse.json({message:"Ressource invalide."},{status:400});
  const {data:updated,error}=await admin.rpc("confirm_maximus_settlement",{p_ticket_id:String(body.id),p_account_id:String(body.financial_account_id),p_reference:String(body.payment_reference||""),p_note:String(body.note||""),p_actor:ctx.user.id});
  if(error)return NextResponse.json({message:error.message},{status:400});
  return NextResponse.json({item:updated});
}
