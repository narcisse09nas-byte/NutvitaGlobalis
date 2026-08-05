import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askNutvitaAssistant, type ChatMessage } from "@/lib/nutvita-assistant";
import { getCurrentLocale } from "@/lib/i18n-server";

async function buildContext(supabase: any, userId: string) {
  const [{ data: insight }, { data: latestAnthropometry }, { data: profile }] = await Promise.all([
    supabase.from("ai_insights").select("public_summary,public_conclusion,created_at").eq("client_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("anthropometric_measurements").select("weight_kg,height_cm,bmi,measured_at").eq("client_id", userId).order("measured_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("client_profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);
  const lines: string[] = [];
  if (profile?.full_name) lines.push(`Client: ${profile.full_name}`);
  if (latestAnthropometry) lines.push(`Derniere mesure (${new Date(latestAnthropometry.measured_at).toLocaleDateString("fr-FR")}) : poids ${latestAnthropometry.weight_kg ?? "N/A"} kg, taille ${latestAnthropometry.height_cm ?? "N/A"} cm, IMC ${latestAnthropometry.bmi ?? "N/A"}.`);
  if (insight?.public_summary) lines.push(`Derniere synthese d'analyse : ${insight.public_summary}`);
  if (insight?.public_conclusion) lines.push(`Derniere conclusion : ${insight.public_conclusion}`);
  return lines.join("\n");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const { data } = await supabase.from("nutvita_ai_messages").select("*").eq("user_id", user.id).order("created_at", { ascending: true }).limit(40);
  return NextResponse.json({ messages: data || [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const message = String(body.message || "").trim().slice(0, 1000);
  if (!message) return NextResponse.json({ message: "Message vide." }, { status: 400 });

  const locale = await getCurrentLocale();
  const [{ data: recent }, context] = await Promise.all([
    supabase.from("nutvita_ai_messages").select("role,content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    buildContext(supabase, user.id),
  ]);
  const history: ChatMessage[] = [...(recent || []).reverse().map((row: any) => ({ role: row.role, content: row.content })), { role: "user", content: message }];

  const { text, error } = await askNutvitaAssistant(history, context, locale);
  await supabase.from("nutvita_ai_messages").insert({ user_id: user.id, role: "user", content: message });
  if (!text) {
    return NextResponse.json({ message: locale === "en" ? "NutVita AI is temporarily unavailable. Please try again shortly." : "NutVita AI est momentanement indisponible. Reessayez dans quelques instants.", error }, { status: 503 });
  }
  await supabase.from("nutvita_ai_messages").insert({ user_id: user.id, role: "assistant", content: text });
  return NextResponse.json({ reply: text });
}
