import { NextResponse } from "next/server";
import { analyzeHealthData } from "@/lib/health-analysis";
import { renderHealthReport } from "@/lib/health-report-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const {data: subscription}=await supabase.from("subscriptions").select("id").eq("client_id",user.id).eq("status","active").gt("expires_at",new Date().toISOString()).limit(1).maybeSingle();
  if(!subscription)return NextResponse.json({message:"Un abonnement actif est requis."},{status:402});
  const [{ data: profile }, { data: anthropometry }, { data: biology }, { data: food }, { data: latestInsight }] = await Promise.all([
    supabase.from("client_profiles").select("*").eq("id", user.id).single(),
    supabase.from("anthropometric_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("biological_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("food_history").select("*").eq("client_id", user.id).order("entry_date"),
    supabase.from("ai_insights").select("id").eq("client_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!profile) return NextResponse.json({ message: "Profil introuvable." }, { status: 404 });
  const locale = profile?.preferred_language === "en" ? "en" : "fr";
  const insight = analyzeHealthData(anthropometry || [], biology || [], food || [], locale), dates = [...(anthropometry || []).map(row => row.measured_at), ...(biology || []).map(row => row.measured_at)].filter(Boolean).sort();
  const period = { start: dates[0]?.slice(0, 10) || new Date().toISOString().slice(0, 10), end: dates.at(-1)?.slice(0, 10) || new Date().toISOString().slice(0, 10) };
  try {
    const admin = createAdminClient(), bytes = await renderHealthReport(profile, anthropometry || [], biology || [], food || [], insight, period, locale), reportId = crypto.randomUUID(), path = `${user.id}/health-reports/${reportId}.pdf`;
    const uploaded = await admin.storage.from("document-vault").upload(path, bytes, { contentType: "application/pdf", upsert: false });
    if (uploaded.error) throw uploaded.error;
    const { data: report, error } = await admin.from("health_reports").insert({ id: reportId, client_id: user.id, insight_id: latestInsight?.id || null, period_start: period.start, period_end: period.end, title: locale === "en" ? `Health report ${period.end}` : `Rapport sante ${period.end}`, file_path: path, generated_by: user.id, language: locale }).select().single();
    if (error) throw error;
    await admin.from("vault_documents").insert({ owner_id: user.id, client_id: user.id, document_type: "health_report", title: report.title, file_path: path, mime_type: "application/pdf", confidential: true, created_by: user.id });
    await admin.from("health_audit_logs").insert({ client_id: user.id, actor_id: user.id, action: "report_generated", resource_type: "health_report", resource_id: report.id });
    return NextResponse.json(report);
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Rapport impossible." }, { status: 500 }); }
}
