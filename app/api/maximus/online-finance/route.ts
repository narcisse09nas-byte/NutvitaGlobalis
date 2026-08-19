import { NextResponse } from "next/server";
import { requireMaximusApi } from "@/lib/maximus-api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const moduleFor=(resource:string)=>resource==="online-payments"?"finance/online-payments":resource==="partner-payments"?"finance/partner-payments":resource==="partner-registry"?"finance/partner-registry":resource==="partner-accounts"?"finance/partner-accounts":"finance/organization-payment-accounts";

export async function GET(request:Request){
  const resource=new URL(request.url).searchParams.get("resource")||"online-payments";
  const ctx=await requireMaximusApi(moduleFor(resource),"viewer");if("error" in ctx)return ctx.error;
  const admin=createAdminClient();
  if(resource==="online-payments"){
    const {data,error}=await admin.from("payments").select("*,client_profiles(full_name,email),invoices(*)").order("created_at",{ascending:false});
    return error?NextResponse.json({message:error.message},{status:400}):NextResponse.json({items:data||[]});
  }
  if(resource==="partner-registry"){
    const {data,error}=await admin.from("partner_vendor_registry").select("*").order("full_name");
    return error?NextResponse.json({message:error.message},{status:400}):NextResponse.json({items:data||[]});
  }
  if(resource==="partner-payments"){
    const {data,error}=await admin.from("partner_service_payments").select("*,partner_vendor_registry(*),online_service_payment_accounts(*),partner_payment_comments(*)").order("created_at",{ascending:false});
    return error?NextResponse.json({message:error.message},{status:400}):NextResponse.json({items:data||[]});
  }
  const ownerType=resource==="partner-accounts"?"partner":"nutvita";
  const {data,error}=await admin.from("online_service_payment_accounts").select("*,partner_vendor_registry(*)").eq("owner_type",ownerType).order("created_at",{ascending:false});
  return error?NextResponse.json({message:error.message},{status:400}):NextResponse.json({items:data||[]});
}

export async function POST(request:Request){
  const contentType=request.headers.get("content-type")||"";
  if(contentType.includes("multipart/form-data")){
    const form=await request.formData(),resource=String(form.get("resource")||""),id=String(form.get("id")||""),file=form.get("file");
    const ctx=await requireMaximusApi(moduleFor(resource),"creator");if("error" in ctx)return ctx.error;
    if(!(file instanceof File)||!id)return NextResponse.json({message:"Fichier et identifiant requis."},{status:400});
    const admin=createAdminClient(),safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"),path=`maximus/online-finance/${resource}/${id}/${Date.now()}-${safe}`;
    const {error:uploadError}=await admin.storage.from("document-vault").upload(path,await file.arrayBuffer(),{contentType:file.type||"application/octet-stream",upsert:false});
    if(uploadError)return NextResponse.json({message:uploadError.message},{status:400});
    const table=resource==="partner-payments"?"partner_service_payments":"online_service_payment_accounts",column=resource==="partner-payments"?"proofs":"attachments";
    const {data:row,error:readError}=await admin.from(table).select(column).eq("id",id).single();if(readError)return NextResponse.json({message:readError.message},{status:400});
    const storedFiles=column==="proofs"?(row as {proofs?:unknown})?.proofs:(row as {attachments?:unknown})?.attachments;
    const files=[...(Array.isArray(storedFiles)?storedFiles:[]),{path,name:file.name,mime_type:file.type,size:file.size,uploaded_at:new Date().toISOString(),uploaded_by:ctx.user.id}];
    const {data,error}=await admin.from(table).update({[column]:files}).eq("id",id).select("*").single();
    return error?NextResponse.json({message:error.message},{status:400}):NextResponse.json({item:data});
  }
  const body=await request.json(),resource=String(body.resource||"");
  const ctx=await requireMaximusApi(moduleFor(resource),body.action==="comment"?"viewer":"creator");if("error" in ctx)return ctx.error;
  const admin=createAdminClient();
  if(resource==="partner-payments"&&body.action==="comment"){
    const {data,error}=await admin.from("partner_payment_comments").insert({payment_id:body.id,author_id:ctx.user.id,comment:String(body.comment||"").trim()}).select("*").single();
    return error?NextResponse.json({message:error.message},{status:400}):NextResponse.json({item:data});
  }
  if(resource==="partner-payments"){
    const payload={...body.data,initiated_by:ctx.user.id};
    const query=body.id?admin.from("partner_service_payments").update(payload).eq("id",body.id):admin.from("partner_service_payments").insert(payload);
    const {data,error}=await query.select("*").single();return error?NextResponse.json({message:error.message},{status:400}):NextResponse.json({item:data});
  }
  if(resource==="organization-accounts"||resource==="partner-accounts"){
    const payload={...body.data,owner_type:resource==="partner-accounts"?"partner":"nutvita",created_by:ctx.user.id};
    const query=body.id?admin.from("online_service_payment_accounts").update(payload).eq("id",body.id):admin.from("online_service_payment_accounts").insert(payload);
    const {data,error}=await query.select("*").single();return error?NextResponse.json({message:error.message},{status:400}):NextResponse.json({item:data});
  }
  return NextResponse.json({message:"Ressource invalide."},{status:400});
}
