import { NextResponse } from "next/server";
import { analyzeHealthData } from "@/lib/health-analysis";
import { renderHealthReport } from "@/lib/health-report-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enrichHealthNarrative } from "@/lib/ai-narrative";
import { applyNcieFramework } from "@/lib/ncie-health-analysis";
import { assertFinalReport, buildHealthReportModel } from "@/lib/health-report/engine";
import type { ReportType } from "@/lib/health-report/types";
import { getClientEntitlements } from "@/lib/client";

const reportTypes:ReportType[]=["summary","patient","professional"];
export async function POST(request:Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });
  const access=await getClientEntitlements(supabase,user.id);
  if(!access.health)return NextResponse.json({message:"Un accès actif au suivi santé est requis."},{status:403});
  const body=await request.json().catch(()=>({}));
  const reportType=reportTypes.includes(body.reportType)?body.reportType as ReportType:"professional";
  const [{ data: profile }, { data: anthropometry }, { data: biology }, { data: food }, { data: lifestyle }, { data: latestInsight }, {data:dietary},{data:goals}] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("id", user.id).single(),
    supabase.from("anthropometric_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("biological_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("food_history").select("*").eq("client_id", user.id).order("entry_date"),
    supabase.from("health_lifestyle_assessments").select("*").eq("client_id", user.id).order("assessment_date"),
    supabase.from("ai_insights").select("id").eq("client_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("health_dietary_diversity_assessments").select("*").eq("client_id",user.id).order("assessed_at",{ascending:false}).limit(1).maybeSingle(),
    supabase.from("client_care_goals").select("*").eq("client_id",user.id).order("created_at",{ascending:false}),
  ]);
  if (!profile) return NextResponse.json({ message: "Profil introuvable." }, { status: 404 });
  const locale = profile.preferred_language === "en" ? "en" : "fr",generatedAt=new Date().toISOString();
  const reportModel=assertFinalReport(buildHealthReportModel({profile,anthropometry:anthropometry||[],biology:biology||[],food:food||[],lifestyle:lifestyle||[],goals:goals||[],locale,reportType,generatedAt}));
  const deterministicInsight = applyNcieFramework(analyzeHealthData(anthropometry||[],biology||[],food||[],lifestyle||[],locale),anthropometry||[],biology||[],food||[],lifestyle||[],locale);
  const insight = await enrichHealthNarrative(deterministicInsight, locale);
  try {
    const admin=createAdminClient(),reportId=crypto.randomUUID();
    const bytes=await renderHealthReport(profile,anthropometry||[],biology||[],food||[],lifestyle||[],insight,reportModel.period,locale,{reportId,generatedAt,userEmail:user.email||profile.email||"",dietary,reportModel});
    const path=`${user.id}/health-reports/${reportId}.pdf`;
    const uploaded=await admin.storage.from("document-vault").upload(path,bytes,{contentType:"application/pdf",upsert:false});if(uploaded.error)throw uploaded.error;
    const generatedDate=new Intl.DateTimeFormat(locale==="en"?"en-CA":"fr-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(generatedAt));
    const title=locale==="en"?`${reportType} health report generated ${generatedDate}`:`Rapport santé ${reportType} généré le ${generatedDate}`;
    const {data:report,error}=await admin.from("health_reports").insert({id:reportId,client_id:user.id,insight_id:latestInsight?.id||null,period_start:reportModel.period.start,period_end:reportModel.period.end,title,file_path:path,generated_by:user.id,language:locale,report_type:reportType,engine_version:reportModel.engineVersion,data_quality:reportModel.dataQuality,profile_type:reportModel.profile,validation_status:"validated",source_snapshot:reportModel.sourceSnapshot}).select().single();if(error)throw error;
    if(reportModel.traces.length){const {error:traceError}=await admin.from("health_report_traces").insert(reportModel.traces.map(trace=>({report_id:reportId,client_id:user.id,indicator_id:trace.indicatorId,conclusion:trace.conclusion,source_values:trace.sourceValues,source_dates:trace.dates,reference_id:trace.referenceId||null,rule_id:trace.ruleId,calculation:trace.calculation,confidence_level:trace.confidenceLevel})));if(traceError)throw traceError}
    await admin.from("vault_documents").insert({owner_id:user.id,client_id:user.id,document_type:"health_report",title:report.title,file_path:path,mime_type:"application/pdf",confidential:true,created_by:user.id});
    await admin.from("health_audit_logs").insert({client_id:user.id,actor_id:user.id,action:"report_generated_v2",resource_type:"health_report",resource_id:report.id,details:{report_type:reportType,engine_version:reportModel.engineVersion,data_quality:reportModel.dataQuality}});
    return NextResponse.json(report);
  } catch(error){return NextResponse.json({message:error instanceof Error?error.message:"Rapport impossible. Vérifiez que health-report-engine-v2.sql a été exécuté."},{status:500})}
}