import {NextResponse} from "next/server";
import {analyzeChildGrowth} from "@/lib/child-growth-analysis";
import {renderChildGrowthReport} from "@/lib/child-growth-report-pdf";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({message:"Non authentifie."},{status:401});
  const {child_id}=await request.json();
  const now=new Date().toISOString();
  const [{data:child},{data:subscriptions},{data:rows},{data:latest}]=await Promise.all([
    supabase.from("children").select("*").eq("id",String(child_id)).eq("parent_id",user.id).maybeSingle(),
    supabase.from("subscriptions").select("id,child_id,plan_id,subscription_plans(service_type)").eq("client_id",user.id).eq("status","active").gt("expires_at",now),
    supabase.from("child_growth_measurements").select("*").eq("child_id",String(child_id)).order("measured_at"),
    supabase.from("child_growth_analyses").select("*").eq("child_id",String(child_id)).order("created_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  if(!child)return NextResponse.json({message:"Enfant introuvable."},{status:404});
  const validSubscription=(subscriptions||[]).find((item:any)=>(item.child_id===String(child_id)||!item.child_id)&&(item.subscription_plans?.service_type==="child_growth"||String(item.plan_id).includes("child-growth")));
  if(!validSubscription)return NextResponse.json({message:"Un abonnement actif est requis pour cet enfant."},{status:402});
  if(!rows?.length)return NextResponse.json({message:"Ajoutez au moins une mesure."},{status:400});

  const computed=analyzeChildGrowth(child,rows);
  const analysis=latest?{
    ...computed,
    summary:latest.summary,
    positives:latest.positives||computed.positives,
    attentionPoints:latest.attention_points||computed.attentionPoints,
    practicalAdvice:latest.practical_advice||computed.practicalAdvice,
    parentAdvice:latest.parent_advice||computed.parentAdvice,
    consultationRecommended:latest.consultation_recommended,
  }:computed;
  const period={start:String(rows[0].measured_at).slice(0,10),end:String(rows.at(-1).measured_at).slice(0,10)};
  const admin=createAdminClient();
  const reportId=crypto.randomUUID();
  const path=`${user.id}/child-growth-reports/${reportId}.pdf`;
  try{
    if(!validSubscription.child_id)await admin.from("subscriptions").update({child_id:child.id}).eq("id",validSubscription.id);
    const bytes=await renderChildGrowthReport(child,rows,analysis,period);
    const upload=await admin.storage.from("document-vault").upload(path,bytes,{contentType:"application/pdf",upsert:false});
    if(upload.error)throw upload.error;
    const {data:report,error}=await admin.from("child_growth_reports").insert({
      id:reportId,
      child_id:child.id,
      analysis_id:latest?.id||null,
      period_start:period.start,
      period_end:period.end,
      title:`Rapport croissance ${child.full_name} - ${period.end}`,
      file_path:path,
      generated_by:user.id,
    }).select().single();
    if(error)throw error;
    await admin.from("vault_documents").insert({owner_id:user.id,client_id:user.id,document_type:"child_growth_report",title:report.title,file_path:path,mime_type:"application/pdf",confidential:true,created_by:user.id});
    return NextResponse.json(report);
  }catch(error){
    return NextResponse.json({message:error instanceof Error?error.message:"Rapport impossible."},{status:500});
  }
}
