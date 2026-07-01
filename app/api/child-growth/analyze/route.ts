import { NextResponse } from "next/server";
import { analyzeChildGrowth } from "@/lib/child-growth-analysis";
import { sendSystemEmail } from "@/lib/system-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { enrichChildGrowthNarrative } from "@/lib/ai-narrative";
import { applyNcgieFramework } from "@/lib/ncgie-child-growth-analysis";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const { child_id } = await request.json(), now = new Date().toISOString();
  const [{ data: child }, { data: subscription }, { data: rows }, { data: profile }] = await Promise.all([
    supabase.from("children").select("*").eq("id", String(child_id)).eq("parent_id", user.id).maybeSingle(),
    supabase.from("subscriptions").select("id,child_id,plan_id,subscription_plans(service_type)").eq("client_id", user.id).eq("status", "active").gt("expires_at", now),
    supabase.from("child_growth_measurements").select("*").eq("child_id", String(child_id)).order("measured_at"),
    supabase.from("client_profiles").select("full_name,email").eq("id", user.id).single(),
  ]);
  if (!child) return NextResponse.json({ message: "Enfant introuvable." }, { status: 404 });
  const validSubscription=(subscription||[]).find((item:any)=>(item.child_id===String(child_id)||!item.child_id)&&(item.subscription_plans?.service_type==="child_growth"||String(item.plan_id).includes("child-growth")));
  if (!validSubscription) return NextResponse.json({ message: "Un abonnement actif est requis pour cet enfant." }, { status: 402 });
  const deterministicAnalysis = applyNcgieFramework(analyzeChildGrowth(child, rows || []), child, rows || []);
  const analysis = await enrichChildGrowthNarrative(deterministicAnalysis);
  const admin = createAdminClient();
  try {
    const { data: existingCritical } = await admin.from("child_growth_alerts").select("alert_type").eq("child_id", child.id).eq("severity", "critical").is("acknowledged_at", null);
    if (!validSubscription.child_id) await admin.from("subscriptions").update({ child_id: child.id }).eq("id", validSubscription.id);
    const { data: saved, error } = await admin.from("child_growth_analyses").insert({ child_id: child.id, summary: analysis.summary, professional_summary: analysis.professionalSummary, positives: analysis.positives, attention_points: analysis.attentionPoints, practical_advice: analysis.practicalAdvice, parent_advice: analysis.parentAdvice, indicator_insights: analysis.indicatorInsights, parent_conclusion: analysis.parentConclusion, professional_conclusion: analysis.professionalConclusion, consultation_recommended: analysis.consultationRecommended, generated_by: user.id }).select("id,created_at").single();
    if (error) throw error;
    let stored: Record<string, any>[] = [];
    if (analysis.alerts.length) {
      const { data, error: alertError } = await admin.from("child_growth_alerts").insert(analysis.alerts.map(alert => ({ ...alert, child_id: child.id, analysis_id: saved.id }))).select();
      if (alertError) throw alertError;
      stored = data || [];
      const critical = analysis.alerts.find(alert => alert.severity === "critical" && !existingCritical?.some(item => item.alert_type === alert.alert_type));
      if (critical && profile?.email) {
        await sendSystemEmail(admin, "child_growth_critical_alert", profile.email, { name: profile.full_name || "Parent", child_name: child.full_name, alert: critical.message, action_url: `${process.env.NEXT_PUBLIC_SITE_URL || ""}/espace-client/croissance-enfant` }, { child_id: child.id, analysis_id: saved.id });
        await admin.from("child_growth_alerts").update({ email_sent_at: new Date().toISOString() }).eq("analysis_id", saved.id).eq("severity", "critical");
      }
    }
    return NextResponse.json({ ...analysis, id: saved.id, created_at: saved.created_at, child_id: child.id, alerts: stored.length ? stored : analysis.alerts });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Analyse impossible." }, { status: 500 });
  }
}
