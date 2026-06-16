import { NextResponse } from "next/server";
import { analyzeHealthData } from "@/lib/health-analysis";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const {data: subscription}=await supabase.from("subscriptions").select("id, subscription_plans(tier)").eq("client_id",user.id).eq("status","active").gt("expires_at",new Date().toISOString()).limit(1).maybeSingle();
  if(!subscription)return NextResponse.json({message:"Un abonnement actif est requis."},{status:402});
  const [{ data: profile }, { data: anthropometry }, { data: biology }, { data: food }] = await Promise.all([
    supabase.from("client_profiles").select("id,preferred_language").eq("id", user.id).maybeSingle(),
    supabase.from("anthropometric_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("biological_measurements").select("*").eq("client_id", user.id).order("measured_at"),
    supabase.from("food_history").select("*").eq("client_id", user.id).order("entry_date"),
  ]);
  if (!profile) return NextResponse.json({ message: "Profil client introuvable." }, { status: 404 });
  const locale = profile?.preferred_language === "en" ? "en" : "fr";
  const insight = analyzeHealthData(anthropometry || [], biology || [], food || [], locale);
  const allDates = [...(anthropometry || []).map(row => row.measured_at), ...(biology || []).map(row => row.measured_at), ...(food || []).map(row => row.entry_date)].filter(Boolean).sort();
  const periodStart = allDates[0]?.slice(0, 10) || new Date().toISOString().slice(0, 10), periodEnd = allDates.at(-1)?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  try {
    const admin = createAdminClient();
    const { data: saved, error } = await admin.from("ai_insights").insert({ client_id: user.id, period_start: periodStart, period_end: periodEnd, professional_summary: insight.professionalSummary, public_summary: insight.publicSummary, trends: insight.trends, improvements: insight.improvements, risks: insight.risks, recommendations: insight.recommendations, generated_by: user.id }).select("id").single();
    if (error) throw error;
    if (insight.alerts.length) await admin.from("alerts").insert(insight.alerts.map(alert => ({ ...alert, client_id: user.id, insight_id: saved.id })));
    await admin.from("health_audit_logs").insert({ client_id: user.id, actor_id: user.id, action: "analysis_generated", resource_type: "ai_insight", resource_id: saved.id });
    const planRelation = subscription.subscription_plans as unknown as { tier?: string } | Array<{ tier?: string }> | null;
    const tier = Array.isArray(planRelation) ? planRelation[0]?.tier : planRelation?.tier;
    return NextResponse.json(tier === "premium" ? { ...insight, id: saved.id, periodStart, periodEnd, tier } : { publicSummary: insight.publicSummary, professionalSummary: "Disponible avec l'offre Premium.", trends: insight.trends.slice(0, 2), improvements: insight.improvements.slice(0, 2), risks: [], recommendations: insight.recommendations.slice(0, 2), alerts: insight.alerts.filter(alert => alert.severity !== "info"), id: saved.id, periodStart, periodEnd, tier: "basic" });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "Analyse impossible." }, { status: 500 }); }
}
