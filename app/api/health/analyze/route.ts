import { NextResponse } from "next/server";
import { analyzeHealthData } from "@/lib/health-analysis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enrichHealthNarrative } from "@/lib/ai-narrative";
import { applyNcieFramework } from "@/lib/ncie-health-analysis";
import { assertFinalReport, buildHealthReportModel } from "@/lib/health-report/engine";
import { getClientEntitlements } from "@/lib/client";

export async function POST() {
 const supabase=await createClient(),{data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({message:"Non authentifié."},{status:401});
 const access=await getClientEntitlements(supabase,user.id);if(!access.health)return NextResponse.json({message:"Un accès actif au suivi santé est requis."},{status:403});
 const [{data:profile},{data:anthropometry},{data:biology},{data:food},{data:lifestyle},{data:goals}]=await Promise.all([
  supabase.from("client_profiles").select("*").eq("id",user.id).maybeSingle(),supabase.from("anthropometric_measurements").select("*").eq("client_id",user.id).order("measured_at"),supabase.from("biological_measurements").select("*").eq("client_id",user.id).order("measured_at"),supabase.from("food_history").select("*").eq("client_id",user.id).order("entry_date"),supabase.from("health_lifestyle_assessments").select("*").eq("client_id",user.id).order("assessment_date"),supabase.from("client_care_goals").select("*").eq("client_id",user.id).order("created_at",{ascending:false})]);
 if(!profile)return NextResponse.json({message:"Profil client introuvable."},{status:404});
 const locale=profile.preferred_language==="en"?"en":"fr";
 const reportModel=assertFinalReport(buildHealthReportModel({profile,anthropometry:anthropometry||[],biology:biology||[],food:food||[],lifestyle:lifestyle||[],goals:goals||[],locale,reportType:"professional"}));
 const deterministic=applyNcieFramework(analyzeHealthData(anthropometry||[],biology||[],food||[],lifestyle||[],locale),anthropometry||[],biology||[],food||[],lifestyle||[],locale),insight=await enrichHealthNarrative(deterministic,locale);
 try{const admin=createAdminClient(),{data:saved,error}=await admin.from("ai_insights").insert({client_id:user.id,period_start:reportModel.period.start,period_end:reportModel.period.end,professional_summary:insight.professionalSummary,public_summary:insight.publicSummary,trends:insight.trends,improvements:insight.improvements,risks:insight.risks,recommendations:insight.recommendations,indicator_insights:insight.indicatorInsights,public_conclusion:insight.publicConclusion,professional_conclusion:insight.professionalConclusion,generated_by:user.id,engine_version:reportModel.engineVersion,deterministic_model:reportModel}).select("id").single();if(error)throw error;
  if(insight.alerts.length)await admin.from("alerts").insert(insight.alerts.map(alert=>({...alert,client_id:user.id,insight_id:saved.id})));
  await admin.from("health_audit_logs").insert({client_id:user.id,actor_id:user.id,action:"analysis_generated_v2",resource_type:"ai_insight",resource_id:saved.id,details:{engine_version:reportModel.engineVersion,data_quality:reportModel.dataQuality}});
  return NextResponse.json({...insight,id:saved.id,periodStart:reportModel.period.start,periodEnd:reportModel.period.end,reportModel,tier:access.healthTier||"basic"});
 }catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Analyse impossible. Vérifiez que health-report-engine-v2.sql a été exécuté."},{status:500})}
}