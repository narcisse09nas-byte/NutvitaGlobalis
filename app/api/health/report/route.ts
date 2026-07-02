import { NextResponse } from "next/server";
import { analyzeHealthData } from "@/lib/health-analysis";
import { renderHealthReport } from "@/lib/health-report-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enrichHealthNarrative } from "@/lib/ai-narrative";
import { applyNcieFramework } from "@/lib/ncie-health-analysis";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const {data: subscription}=await supabase.from("subscriptions").select("id").eq("client_id",user.id).eq("status","active").gt("expires_at",new Date().toISOString()).limit(1).maybeSingle();
  if(!subscription)return NextResponse.json({message:"Un abonnement actif est requis."},{status:402});
  const [{ data: profile }, { data: anthropometry }, { data: biology }, { data: food }, { data: lifestyle }, { data: latestInsight }, {data:dietary}] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("id", user.id).single(),
    supabase.from("anthropometric_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("biological_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("food_history").select("*").eq("client_id", user.id).order("entry_date"),
    supabase.from("health_lifestyle_assessments").select("*").eq("client_id", user.id).order("assessment_date"),
    supabase.from("ai_insights").select("id").eq("client_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("health_dietary_diversity_assessments").select("*").eq("client_id",user.id).order("assessed_at",{ascending:false}).limit(1).maybeSingle(),
  ]);
  if (!profile) return NextResponse.json({ message: "Profil introuvable." }, { status: 404 });
  const locale = profile?.preferred_language === "en" ? "en" : "fr";
  const deterministicInsight = applyNcieFramework(
    analyzeHealthData(anthropometry || [], biology || [], food || [], lifestyle || [], locale),
    anthropometry || [], biology || [], food || [], lifestyle || [], locale,
  );
  const enrichedInsight = await enrichHealthNarrative(deterministicInsight, locale);
  const weights = [...(anthropometry || [])].filter(row => Number.isFinite(Number(row.weight_kg))).sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at));
  const latestWeight = weights.at(-1), previousWeight = weights.at(-2), firstWeight = weights[0];
  let insight = enrichedInsight;
  if (latestWeight && previousWeight) {
    const recentDelta = Number(latestWeight.weight_kg) - Number(previousWeight.weight_kg);
    const overallDelta = Number(latestWeight.weight_kg) - Number(firstWeight.weight_kg);
    const days = Math.max(1, Math.round((+new Date(latestWeight.measured_at) - +new Date(previousWeight.measured_at)) / 86400000));
    const recentSignal = locale === "en"
      ? `Since the previous measurement, weight ${recentDelta > 0 ? "increased" : recentDelta < 0 ? "decreased" : "remained stable"} by ${Math.abs(recentDelta).toFixed(1)} kg over ${days} day(s). The overall change since monitoring began is ${overallDelta >= 0 ? "+" : ""}${overallDelta.toFixed(1)} kg.${recentDelta > 0 && overallDelta < 0 ? " This recent regain interrupts the previous downward trajectory and warrants checking measurement conditions, adherence and recent changes." : ""}`
      : `Depuis la mesure precedente, le poids a ${recentDelta > 0 ? "augmente" : recentDelta < 0 ? "diminue" : "ete stable"} de ${Math.abs(recentDelta).toFixed(1)} kg en ${days} jour(s). L evolution globale depuis le debut du suivi est de ${overallDelta >= 0 ? "+" : ""}${overallDelta.toFixed(1)} kg.${recentDelta > 0 && overallDelta < 0 ? " Cette reprise recente interrompt la trajectoire de baisse anterieure et justifie de verifier les conditions de mesure, l adherence et les changements recents." : ""}`;
    insight = { ...enrichedInsight, publicSummary: `${recentSignal} ${enrichedInsight.publicSummary}`, professionalSummary: `${recentSignal} ${enrichedInsight.professionalSummary}` };
  }
  if(dietary){
    const dietarySignal=locale==="en"
      ? `Dietary diversity over the assessed 24 hours ${dietary.mddw_met?"met":"did not meet"} the adapted minimum threshold (${dietary.diversity_score}/10 food groups).`
      : `La diversite alimentaire sur les 24 heures evaluees ${dietary.mddw_met?"atteint":"n atteint pas"} le seuil minimal adapte (${dietary.diversity_score}/10 groupes alimentaires).`;
    insight={...insight,publicSummary:`${insight.publicSummary} ${dietarySignal}`,professionalSummary:`${insight.professionalSummary} ${dietarySignal}`};
  }
  const dates = [...(anthropometry || []).map(row => row.measured_at), ...(biology || []).map(row => row.measured_at), ...(lifestyle || []).map(row => row.assessment_date)].filter(Boolean).sort();
  const period = { start: dates[0]?.slice(0, 10) || new Date().toISOString().slice(0, 10), end: dates.at(-1)?.slice(0, 10) || new Date().toISOString().slice(0, 10) };
  try {
    const admin = createAdminClient(), reportId = crypto.randomUUID();
    const generatedAt = new Date().toISOString();
    const bytes = await renderHealthReport(profile, anthropometry || [], biology || [], food || [], lifestyle || [], insight, period, locale, { reportId, generatedAt, dietary });
    const path = `${user.id}/health-reports/${reportId}.pdf`;
    const uploaded = await admin.storage.from("document-vault").upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (uploaded.error) throw uploaded.error;
    const generatedDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(generatedAt));
    const { data: report, error } = await admin.from("health_reports").insert({ id: reportId, client_id: user.id, insight_id: latestInsight?.id || null, period_start: period.start, period_end: period.end, title: locale === "en" ? `Health report generated ${generatedDate}` : `Rapport sante genere le ${generatedDate}`, file_path: path, generated_by: user.id, language: locale }).select().single();
    if (error) throw error;
    await admin.from("vault_documents").insert({ owner_id: user.id, client_id: user.id, document_type: "health_report", title: report.title, file_path: path, mime_type: "application/pdf", confidential: true, created_by: user.id });
    await admin.from("health_audit_logs").insert({ client_id: user.id, actor_id: user.id, action: "report_generated", resource_type: "health_report", resource_id: report.id });
    return NextResponse.json(report);
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Rapport impossible." }, { status: 500 }); }
}
