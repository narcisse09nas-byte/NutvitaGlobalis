import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { generateStructured } from "@/lib/ai-narrative";
import {
  calculateExchangePlan,
  isRegionKey,
  WORLD_REGIONS,
} from "@/lib/regional-meal-planner";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const menuSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    menus: {
      type: "array",
      minItems: 1,
      maxItems: 15,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          meals: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      food: { type: "string" },
                      exchangeGroup: { type: "string", enum: ["starch", "fruit", "dairy", "protein", "fat", "vegetable"] },
                      exchanges: { type: "number" },
                      rawGrams: { type: "number" },
                      servedGrams: { type: "number" },
                      householdMeasure: { type: "string" },
                    },
                    required: ["food", "exchangeGroup", "exchanges", "rawGrams", "servedGrams", "householdMeasure"],
                  },
                },
              },
              required: ["name", "items"],
            },
          },
          professionalNote: { type: "string" },
        },
        required: ["title", "meals", "professionalNote"],
      },
    },
  },
  required: ["menus"],
};

function numberInRange(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Non authentifié." }, { status: 401 });

  const body = await request.json();
  const region = String(body.region || "");
  if (!isRegionKey(region)) return NextResponse.json({ message: "Région non reconnue." }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: ownDietitian }, { data: actorAdmin }] = await Promise.all([
    supabase.from("dietitian_profiles").select("id,status").eq("candidate_id", user.id).eq("status", "active").maybeSingle(),
    supabase.from("admin_users").select("role").eq("id", user.id).eq("active", true).maybeSingle(),
  ]);
  if (!ownDietitian && actorAdmin?.role !== "super_admin") {
    return NextResponse.json({ message: "Nutritionniste non autorisé." }, { status: 403 });
  }

  const kcal = numberInRange(body.kcal, 800, 5000, 2000);
  const carbohydratePercent = numberInRange(body.carbohydratePercent, 20, 75, 50);
  const proteinPercent = numberInRange(body.proteinPercent, 10, 40, 20);
  const fatPercent = numberInRange(body.fatPercent, 15, 45, 30);
  if (Math.round(carbohydratePercent + proteinPercent + fatPercent) !== 100) {
    return NextResponse.json({ message: "La somme des macronutriments doit être égale à 100 %." }, { status: 400 });
  }
  const menuCount = Math.round(numberInRange(body.menuCount, 1, 15, 15));
  const mealsPerDay = Math.round(numberInRange(body.mealsPerDay, 3, 6, 5));
  const locale = body.locale === "en" ? "en" : "fr";
  const restrictions = String(body.restrictions || "").slice(0, 1500);
  const clinicalContext = String(body.clinicalContext || "").slice(0, 1500);
  const exchangePlan = calculateExchangePlan({ kcal, carbohydratePercent, proteinPercent, fatPercent });
  const regional = WORLD_REGIONS[region];
  const cacheInput = { region, locale, exchangePlan, menuCount, mealsPerDay, restrictions, clinicalContext };
  const cacheKey = createHash("sha256").update(JSON.stringify(cacheInput)).digest("hex");

  try {
    const { data: cached } = await admin
      .from("regional_menu_plan_cache")
      .select("payload")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cached?.payload) return NextResponse.json({ ...cached.payload, cached: true });
  } catch {
    // The planner remains usable before the optional cache migration is applied.
  }

  const generated = await generateStructured<{ menus: any[] }>(
    "regional_serving_menu_plan",
    [
      "Tu aides un diététicien-nutritionniste à construire un plan alimentaire professionnel.",
      "Le calcul énergétique et les nombres d'équivalents fournis sont verrouillés: ne les modifie jamais.",
      `Produis exactement ${menuCount} journées distinctes et ${mealsPerDay} prises alimentaires par journée, en ${locale === "fr" ? "français" : "anglais"}.`,
      "Utilise uniquement les aliments du catalogue régional fourni. Tu peux combiner les aliments mais tu ne peux pas en inventer.",
      "Sur chaque journée, respecte les totaux d'équivalents de chaque groupe à 0,5 équivalent près.",
      "Pour chaque aliment, indique la quantité crue, la quantité servie, la mesure ménagère et le nombre d'équivalents.",
      "Les légumes non féculents sont comptés séparément. Ne transforme pas une quantité crue en quantité servie sans reprendre le ratio du catalogue.",
      "Respecte strictement allergies, exclusions, préférences et contexte clinique fournis. En cas d'incompatibilité, l'indiquer dans professionalNote au lieu d'improviser.",
      "Évite les allégations thérapeutiques. Le résultat est un brouillon à valider par le professionnel.",
    ].join("\n"),
    {
      region: { key: region, label: locale === "fr" ? regional.fr : regional.en },
      exchangePlan,
      catalog: regional.foods.map(([name, group, rawGrams, servedGrams, serving]) => ({ name, group, rawGrams, servedGrams, serving })),
      restrictions,
      clinicalContext,
    },
    menuSchema,
  );
  if (!generated.data) {
    return NextResponse.json({ message: "Le fournisseur IA n'a pas pu générer les menus.", detail: generated.error }, { status: 503 });
  }
  const payload = {
    region,
    regionLabel: locale === "fr" ? regional.fr : regional.en,
    exchangePlan,
    menus: generated.data.menus.slice(0, menuCount),
    provider: generated.provider || "external",
    warning: locale === "fr"
      ? "Brouillon professionnel : vérifier les portions, allergies, contre-indications et données de composition locales avant remise au patient."
      : "Professional draft: verify portions, allergies, contraindications and local composition data before sharing with the patient.",
  };
  try {
    await admin.from("regional_menu_plan_cache").upsert({
      cache_key: cacheKey,
      region_key: region,
      kcal,
      payload,
      created_by: user.id,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "cache_key" });
  } catch {
    // Cache failure must not discard a clinically reviewed result.
  }
  return NextResponse.json({ ...payload, cached: false });
}
