import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai-narrative";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type MealItem = { meal: string; food: string; quantity: number; unit: string };
type NutritionResult = {
  totals: { kcal: number; protein_g: number; carbohydrate_g: number; fat_g: number; fiber_g: number };
  minerals: Array<{ name: string; estimated_amount: number; unit: string }>;
  vitamins: Array<{ name: string; estimated_amount: number; unit: string }>;
  item_breakdown: Array<{ meal: string; food: string; kcal: number; protein_g: number; carbohydrate_g: number; fat_g: number }>;
  professional_comment: string;
  recommendations: string[];
  limitations: string[];
};

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    totals: { type: "object", additionalProperties: false, properties: { kcal: { type: "number" }, protein_g: { type: "number" }, carbohydrate_g: { type: "number" }, fat_g: { type: "number" }, fiber_g: { type: "number" } }, required: ["kcal", "protein_g", "carbohydrate_g", "fat_g", "fiber_g"] },
    minerals: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, estimated_amount: { type: "number" }, unit: { type: "string" } }, required: ["name", "estimated_amount", "unit"] } },
    vitamins: { type: "array", items: { type: "object", additionalProperties: false, properties: { name: { type: "string" }, estimated_amount: { type: "number" }, unit: { type: "string" } }, required: ["name", "estimated_amount", "unit"] } },
    item_breakdown: { type: "array", items: { type: "object", additionalProperties: false, properties: { meal: { type: "string" }, food: { type: "string" }, kcal: { type: "number" }, protein_g: { type: "number" }, carbohydrate_g: { type: "number" }, fat_g: { type: "number" } }, required: ["meal", "food", "kcal", "protein_g", "carbohydrate_g", "fat_g"] } },
    professional_comment: { type: "string" }, recommendations: { type: "array", items: { type: "string" } }, limitations: { type: "array", items: { type: "string" } },
  },
  required: ["totals", "minerals", "vitamins", "item_breakdown", "professional_comment", "recommendations", "limitations"],
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifie." }, { status: 401 });
  const body = await request.json();
  const meals = (Array.isArray(body.meals) ? body.meals : []).map((item: MealItem) => ({ meal: String(item.meal || ""), food: String(item.food || "").trim(), quantity: Number(item.quantity), unit: String(item.unit || "").trim() })).filter((item: MealItem) => item.food && item.quantity > 0 && item.unit);
  if (!body.client_id || !meals.length) return NextResponse.json({ message: "Client et aliments quantifies requis." }, { status: 400 });
  const admin = createAdminClient();
  const [{ data: dietitian }, { data: actorAdmin }, { data: client }] = await Promise.all([
    supabase.from("dietitian_profiles").select("id").eq("candidate_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from("admin_users").select("role").eq("id", user.id).eq("active", true).maybeSingle(),
    admin.from("client_profiles").select("id,assigned_partner_id,created_by_partner_id").eq("id", String(body.client_id)).maybeSingle(),
  ]);
  if (!client) return NextResponse.json({ message: "Client introuvable." }, { status: 404 });
  const partnerId = dietitian?.id || String(body.partner_id || "") || null;
  if (!actorAdmin && (!partnerId || (client.assigned_partner_id !== partnerId && client.created_by_partner_id !== partnerId))) return NextResponse.json({ message: "Client non affecte a ce nutritionniste." }, { status: 403 });
  const generated = await generateStructured<NutritionResult>("nutrition_24h_assessment", "Estime prudemment les apports d un rappel alimentaire de 24 heures a partir des aliments, quantites et unites declares. Fournis calories, proteines, glucides, lipides, fibres, principaux mineraux et vitamines. N invente pas une precision analytique: arrondis raisonnablement, explicite les limites liees aux recettes, marques, modes de cuisson et tailles de portions, puis formule un commentaire professionnel et des recommandations nutritionnelles non diagnostiques. Reponds dans la langue demandee.", { locale: body.locale === "en" ? "en" : "fr", meals }, schema);
  if (!generated.data) return NextResponse.json({ message: "Analyse IA indisponible.", detail: generated.error }, { status: 503 });
  const { data, error } = await admin.from("nutrition_24h_assessments").insert({ partner_id: partnerId, client_id: client.id, consultation_id: body.consultation_id || null, meals, nutrition_totals: { ...generated.data.totals, minerals: generated.data.minerals, vitamins: generated.data.vitamins, item_breakdown: generated.data.item_breakdown }, ai_comments: generated.data.professional_comment, ai_recommendations: generated.data.recommendations.join("\n") }).select().single();
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });
  return NextResponse.json({ ...data, analysis: generated.data, provider: generated.provider });
}
