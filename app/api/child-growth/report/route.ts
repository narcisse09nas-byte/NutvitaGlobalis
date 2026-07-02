import {NextResponse} from "next/server";
import {analyzeChildGrowth} from "@/lib/child-growth-analysis";
import {renderChildGrowthReport} from "@/lib/child-growth-report-pdf";
import {createAdminClient} from "@/lib/supabase/admin";
import {createClient} from "@/lib/supabase/server";
import {applyNcgieFramework} from "@/lib/ncgie-child-growth-analysis";
import {enrichChildGrowthNarrative} from "@/lib/ai-narrative";

export async function POST(request:Request){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({message:"Non authentifie."},{status:401});
  const {child_id}=await request.json();
  const now=new Date().toISOString();
  const [{data:child},{data:subscriptions},{data:rows},{data:latest},{data:feeding},{data:vaccination}]=await Promise.all([
    supabase.from("children").select("*").eq("id",String(child_id)).eq("parent_id",user.id).maybeSingle(),
    supabase.from("subscriptions").select("id,child_id,plan_id,subscription_plans(service_type)").eq("client_id",user.id).eq("status","active").gt("expires_at",now),
    supabase.from("child_growth_measurements").select("*").eq("child_id",String(child_id)).order("measured_at"),
    supabase.from("child_growth_analyses").select("*").eq("child_id",String(child_id)).order("created_at",{ascending:false}).limit(1).maybeSingle(),
    supabase.from("child_feeding_assessments").select("*").eq("child_id",String(child_id)).order("assessed_at",{ascending:false}).limit(1).maybeSingle(),
    supabase.from("child_vaccination_assessments").select("*").eq("child_id",String(child_id)).order("assessed_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  if(!child)return NextResponse.json({message:"Enfant introuvable."},{status:404});
  const validSubscription=(subscriptions||[]).find((item:any)=>item.child_id===String(child_id)&&(item.subscription_plans?.service_type==="child_growth"||String(item.plan_id).includes("child-growth")));
  if(!validSubscription)return NextResponse.json({message:"Un abonnement actif est requis pour cet enfant."},{status:402});
  if(!rows?.length)return NextResponse.json({message:"Ajoutez au moins une mesure."},{status:400});

  const computed=analyzeChildGrowth(child,rows);
  const merged=latest?{
    ...computed,
    summary:latest.summary,
    positives:latest.positives||computed.positives,
    attentionPoints:latest.attention_points||computed.attentionPoints,
    practicalAdvice:latest.practical_advice||computed.practicalAdvice,
    parentAdvice:latest.parent_advice||computed.parentAdvice,
    professionalSummary:latest.professional_summary||computed.professionalSummary,
    indicatorInsights:latest.indicator_insights||computed.indicatorInsights,
    parentConclusion:latest.parent_conclusion||computed.parentConclusion,
    professionalConclusion:latest.professional_conclusion||computed.professionalConclusion,
    consultationRecommended:latest.consultation_recommended,
  }:computed;
  const enriched=await enrichChildGrowthNarrative(applyNcgieFramework(merged,child,rows));
  const weightRows=rows.filter(row=>Number.isFinite(Number(row.weight_kg)));
  const currentWeight=weightRows.at(-1),previousWeight=weightRows.at(-2),firstWeight=weightRows[0];
  let analysis=enriched;
  if(currentWeight&&previousWeight){
    const recent=Number(currentWeight.weight_kg)-Number(previousWeight.weight_kg);
    const overall=Number(currentWeight.weight_kg)-Number(firstWeight.weight_kg);
    const days=Math.max(1,Math.round((+new Date(currentWeight.measured_at)-+new Date(previousWeight.measured_at))/86400000));
    const signal=`Depuis la visite precedente, le poids a ${recent>0?"augmente":recent<0?"diminue":"ete stable"} de ${Math.abs(recent).toFixed(2)} kg en ${days} jour(s). L evolution depuis la premiere visite est de ${overall>=0?"+":""}${overall.toFixed(2)} kg.${recent<0?" Une perte ponderale recente chez un enfant doit etre verifiee rapidement avec le contexte alimentaire, infectieux et clinique.":""}`;
    analysis={...enriched,summary:`${signal} ${enriched.summary}`,professionalSummary:`${signal} ${enriched.professionalSummary}`};
  }
  const nutritionSignal=feeding
    ? feeding.module==="iycf_6_23"
      ? `Alimentation complementaire (${feeding.age_months} mois) : diversite minimale ${feeding.mdd_met?"atteinte":"non atteinte"} (${feeding.diversity_score}/8), frequence minimale ${feeding.mmf_met?"atteinte":"non atteinte"} et alimentation minimale acceptable ${feeding.mad_met?"atteinte":"non atteinte"}.`
      : `Diversite alimentaire adaptee : ${feeding.mdd_met?"seuil atteint":"seuil non atteint"} (${feeding.diversity_score}/10 groupes).`
    : "";
  const vaccinationSignal=vaccination
    ? `Vaccination selon l age : ${vaccination.up_to_date?"a jour":"incomplete"} (${vaccination.received_count}/${vaccination.due_count} doses attendues renseignees).`
    : "";
  if(nutritionSignal||vaccinationSignal)analysis={...analysis,summary:`${analysis.summary} ${nutritionSignal} ${vaccinationSignal}`.trim(),professionalSummary:`${analysis.professionalSummary} ${nutritionSignal} ${vaccinationSignal}`.trim()};
  const period={start:String(rows[0].measured_at).slice(0,10),end:String(rows.at(-1).measured_at).slice(0,10)};
  const admin=createAdminClient();
  const reportId=crypto.randomUUID();
  const path=`${user.id}/child-growth-reports/${reportId}.pdf`;
  try{
    const generatedAt=new Date().toISOString();
    const bytes=await renderChildGrowthReport(child,rows,analysis,period,{reportId,generatedAt});
    const upload=await admin.storage.from("document-vault").upload(path,bytes,{contentType:"application/pdf",upsert:false});
    if(upload.error)throw upload.error;
    const {data:report,error}=await admin.from("child_growth_reports").insert({
      id:reportId,
      child_id:child.id,
      analysis_id:latest?.id||null,
      period_start:period.start,
      period_end:period.end,
      title:`Rapport croissance ${child.full_name} genere le ${new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(generatedAt))}`,
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
