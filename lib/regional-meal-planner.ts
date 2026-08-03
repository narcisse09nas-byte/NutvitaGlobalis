export type ExchangeGroup = "starch" | "fruit" | "dairy" | "protein" | "fat" | "vegetable";

export type RegionalFood = {
  name: string;
  group: ExchangeGroup;
  rawGrams: number;
  servedGrams: number;
  serving: string;
};

export const WORLD_REGIONS = {
  west_central_africa: {
    fr: "Afrique de l'Ouest et centrale",
    en: "West and Central Africa",
    foods: [
      ["Mil cuit", "starch", 35, 100, "1 petit bol"], ["Riz local cuit", "starch", 35, 100, "1/2 bol"],
      ["Manioc bouilli", "starch", 45, 80, "1 morceau moyen"], ["Banane plantain bouillie", "starch", 55, 80, "1/2 moyenne"],
      ["Haricot niébé cuit", "protein", 35, 90, "1/2 bol"], ["Poisson maigre grillé", "protein", 45, 35, "1 petit morceau"],
      ["Poulet sans peau cuit", "protein", 45, 35, "1 petit morceau"], ["Mangue", "fruit", 120, 120, "1/2 grosse"],
      ["Papaye", "fruit", 150, 150, "1 tranche"], ["Lait caillé non sucré", "dairy", 200, 200, "1 verre"],
      ["Huile d'arachide", "fat", 5, 5, "1 c. à café"], ["Feuilles vertes cuites", "vegetable", 120, 100, "1 bol"],
    ],
  },
  east_africa: {
    fr: "Afrique de l'Est", en: "East Africa",
    foods: [
      ["Ugali", "starch", 35, 100, "1 petite part"], ["Injera", "starch", 45, 60, "1/2 galette"],
      ["Patate douce bouillie", "starch", 55, 90, "1 petite"], ["Haricots rouges cuits", "protein", 35, 90, "1/2 bol"],
      ["Tilapia grillé", "protein", 45, 35, "1 petit morceau"], ["Å’uf", "protein", 50, 50, "1 unité"],
      ["Banane", "fruit", 100, 100, "1 petite"], ["Fruit de la passion", "fruit", 120, 90, "3 unités"],
      ["Lait fermenté non sucré", "dairy", 200, 200, "1 verre"], ["Huile de sésame", "fat", 5, 5, "1 c. à café"],
      ["Sukuma wiki cuit", "vegetable", 120, 100, "1 bol"],
    ],
  },
  north_africa_middle_east: {
    fr: "Afrique du Nord et Moyen-Orient", en: "North Africa and Middle East",
    foods: [
      ["Couscous cuit", "starch", 35, 90, "1/2 bol"], ["Pain complet", "starch", 30, 30, "1 petite tranche"],
      ["Boulgour cuit", "starch", 35, 100, "1/2 bol"], ["Lentilles cuites", "protein", 35, 90, "1/2 bol"],
      ["Pois chiches cuits", "protein", 35, 75, "1/2 bol"], ["Poisson grillé", "protein", 45, 35, "1 petit morceau"],
      ["Orange", "fruit", 130, 130, "1 petite"], ["Dattes", "fruit", 24, 24, "2 petites"],
      ["Yaourt nature", "dairy", 125, 125, "1 pot"], ["Huile d'olive", "fat", 5, 5, "1 c. à café"],
      ["Ratatouille de légumes", "vegetable", 150, 120, "1 bol"],
    ],
  },
  southern_africa: {
    fr: "Afrique australe", en: "Southern Africa",
    foods: [
      ["Pap de maïs", "starch", 35, 100, "1 petite part"], ["Sorgho cuit", "starch", 35, 100, "1/2 bol"],
      ["Pomme de terre bouillie", "starch", 90, 75, "1 petite"], ["Haricots cuits", "protein", 35, 90, "1/2 bol"],
      ["Poulet sans peau", "protein", 45, 35, "1 petit morceau"], ["Poisson cuit", "protein", 45, 35, "1 petit morceau"],
      ["Orange", "fruit", 130, 130, "1 petite"], ["Goyave", "fruit", 110, 110, "2 petites"],
      ["Amasi non sucré", "dairy", 200, 200, "1 verre"], ["Huile végétale", "fat", 5, 5, "1 c. à café"],
      ["Chakalaka peu salé", "vegetable", 140, 120, "1 bol"],
    ],
  },
  south_asia: {
    fr: "Asie du Sud", en: "South Asia",
    foods: [
      ["Riz basmati cuit", "starch", 35, 100, "1/2 bol"], ["Chapati complet", "starch", 35, 45, "1 petit"],
      ["Dalia cuit", "starch", 35, 100, "1/2 bol"], ["Dal cuit", "protein", 35, 90, "1/2 bol"],
      ["Pois chiches cuits", "protein", 35, 75, "1/2 bol"], ["Poisson grillé", "protein", 45, 35, "1 petit morceau"],
      ["Goyave", "fruit", 110, 110, "1 moyenne"], ["Papaye", "fruit", 150, 150, "1 tranche"],
      ["Lait écrémé", "dairy", 200, 200, "1 verre"], ["Huile de moutarde", "fat", 5, 5, "1 c. à café"],
      ["Légumes sabzi", "vegetable", 140, 120, "1 bol"],
    ],
  },
  east_southeast_asia: {
    fr: "Asie de l'Est et du Sud-Est", en: "East and Southeast Asia",
    foods: [
      ["Riz cuit", "starch", 35, 100, "1/2 bol"], ["Nouilles de riz cuites", "starch", 35, 100, "1/2 bol"],
      ["Patate douce", "starch", 55, 90, "1 petite"], ["Tofu ferme", "protein", 80, 70, "1 petite tranche"],
      ["Poisson vapeur", "protein", 45, 35, "1 petit morceau"], ["Poulet sans peau", "protein", 45, 35, "1 petit morceau"],
      ["Mandarine", "fruit", 120, 120, "2 petites"], ["Fruit du dragon", "fruit", 150, 150, "1/2 fruit"],
      ["Lait de soja enrichi non sucré", "dairy", 200, 200, "1 verre"], ["Huile de sésame", "fat", 5, 5, "1 c. à café"],
      ["Pak-choï sauté léger", "vegetable", 130, 110, "1 bol"],
    ],
  },
  europe_mediterranean: {
    fr: "Europe et Méditerranée", en: "Europe and Mediterranean",
    foods: [
      ["Pain complet", "starch", 30, 30, "1 tranche"], ["Pâtes complètes cuites", "starch", 35, 100, "1/2 bol"],
      ["Pomme de terre", "starch", 90, 75, "1 petite"], ["Lentilles cuites", "protein", 35, 90, "1/2 bol"],
      ["Poisson blanc", "protein", 45, 35, "1 petit morceau"], ["Å’uf", "protein", 50, 50, "1 unité"],
      ["Pomme", "fruit", 130, 130, "1 petite"], ["Poire", "fruit", 130, 130, "1 petite"],
      ["Yaourt nature", "dairy", 125, 125, "1 pot"], ["Huile d'olive", "fat", 5, 5, "1 c. à café"],
      ["Légumes méditerranéens", "vegetable", 150, 120, "1 bol"],
    ],
  },
  north_america: {
    fr: "Amérique du Nord", en: "North America",
    foods: [
      ["Flocons d'avoine cuits", "starch", 25, 100, "1/2 bol"], ["Pain complet", "starch", 30, 30, "1 tranche"],
      ["Maïs doux", "starch", 70, 80, "1/2 bol"], ["Haricots noirs cuits", "protein", 35, 90, "1/2 bol"],
      ["Dinde sans peau", "protein", 45, 35, "1 petit morceau"], ["Saumon cuit", "protein", 40, 35, "1 petit morceau"],
      ["Pomme", "fruit", 130, 130, "1 petite"], ["Baies", "fruit", 150, 150, "1 bol"],
      ["Lait écrémé", "dairy", 200, 200, "1 verre"], ["Huile de colza", "fat", 5, 5, "1 c. à café"],
      ["Légumes mélangés", "vegetable", 150, 120, "1 bol"],
    ],
  },
  latin_america_caribbean: {
    fr: "Amérique latine et Caraïbes", en: "Latin America and Caribbean",
    foods: [
      ["Arepa de maïs", "starch", 35, 50, "1 petite"], ["Riz cuit", "starch", 35, 100, "1/2 bol"],
      ["Yuca bouillie", "starch", 45, 80, "1 morceau"], ["Haricots noirs cuits", "protein", 35, 90, "1/2 bol"],
      ["Poisson grillé", "protein", 45, 35, "1 petit morceau"], ["Poulet sans peau", "protein", 45, 35, "1 petit morceau"],
      ["Ananas", "fruit", 150, 150, "1 tranche"], ["Goyave", "fruit", 110, 110, "2 petites"],
      ["Lait demi-écrémé", "dairy", 200, 200, "1 verre"], ["Huile végétale", "fat", 5, 5, "1 c. à café"],
      ["Légumes créoles", "vegetable", 150, 120, "1 bol"],
    ],
  },
  oceania_pacific: {
    fr: "Océanie et Pacifique", en: "Oceania and Pacific",
    foods: [
      ["Taro bouilli", "starch", 45, 80, "1 morceau"], ["Kumara bouillie", "starch", 55, 90, "1 petite"],
      ["Riz cuit", "starch", 35, 100, "1/2 bol"], ["Poisson grillé", "protein", 45, 35, "1 petit morceau"],
      ["Poulet sans peau", "protein", 45, 35, "1 petit morceau"], ["Haricots cuits", "protein", 35, 90, "1/2 bol"],
      ["Papaye", "fruit", 150, 150, "1 tranche"], ["Ananas", "fruit", 150, 150, "1 tranche"],
      ["Lait allégé", "dairy", 200, 200, "1 verre"], ["Huile végétale", "fat", 5, 5, "1 c. à café"],
      ["Légumes-feuilles locaux", "vegetable", 130, 110, "1 bol"],
    ],
  },
} as const;

export type WorldRegionKey = keyof typeof WORLD_REGIONS;

export const EXCHANGE_REFERENCE = {
  starch: { carbohydrate: 15, protein: 3, fat: 0, kcal: 80 },
  fruit: { carbohydrate: 15, protein: 0, fat: 0, kcal: 60 },
  dairy: { carbohydrate: 12, protein: 8, fat: 0, kcal: 90 },
  protein: { carbohydrate: 0, protein: 7, fat: 2, kcal: 45 },
  fat: { carbohydrate: 0, protein: 0, fat: 5, kcal: 45 },
  vegetable: { carbohydrate: 5, protein: 2, fat: 0, kcal: 25 },
} as const;

export type PlannerInput = {
  kcal: number;
  carbohydratePercent: number;
  proteinPercent: number;
  fatPercent: number;
  vegetableServings?: number;
};

export function calculateExchangePlan(input: PlannerInput) {
  const kcal = Math.round(input.kcal);
  const exactCarbohydrateGrams = (kcal * input.carbohydratePercent) / 400;
  const exactProteinGrams = (kcal * input.proteinPercent) / 400;
  const exactFatGrams = (kcal * input.fatPercent) / 900;
  const carbohydrateGrams = Math.round(exactCarbohydrateGrams);
  const proteinGrams = Math.round(exactProteinGrams);
  const fatGrams = Math.round(exactFatGrams);
  const scale = kcal / 1300;
  const fruit = Math.max(1, Math.round(3 * scale * 2) / 2);
  const dairy = Math.max(1, Math.round(2 * scale * 2) / 2);
  const vegetable = Math.max(2, Math.round((input.vegetableServings ?? 3) * scale * 2) / 2);
  const starchCarbs = Math.max(0, exactCarbohydrateGrams - fruit * 15 - dairy * 12);
  const starch = Math.max(1, Math.round(starchCarbs / 15));
  const accountedProtein = starch * 3 + dairy * 8;
  const protein = Math.max(1, Math.ceil(Math.max(0, exactProteinGrams - accountedProtein) / 7));
  const fat = Math.max(1, Math.round(exactFatGrams / 5));
  return {
    kcal,
    macros: {
      carbohydrate: { percent: input.carbohydratePercent, grams: carbohydrateGrams },
      protein: { percent: input.proteinPercent, grams: proteinGrams },
      fat: { percent: input.fatPercent, grams: fatGrams },
    },
    exchanges: { starch, fruit, dairy, protein, fat, vegetable },
  };
}

export function isRegionKey(value: string): value is WorldRegionKey {
  return value in WORLD_REGIONS;
}

export function formatMealPlanForRecord(plan: any) {
  const lines = [
    `${plan.regionLabel} — ${plan.exchangePlan.kcal} kcal/j`,
    `Répartition: glucides ${plan.exchangePlan.macros.carbohydrate.percent} %, protéines ${plan.exchangePlan.macros.protein.percent} %, lipides ${plan.exchangePlan.macros.fat.percent} %.`,
    `Équivalents/j: féculents ${plan.exchangePlan.exchanges.starch}; fruits ${plan.exchangePlan.exchanges.fruit}; laitages ${plan.exchangePlan.exchanges.dairy}; protéines ${plan.exchangePlan.exchanges.protein}; matières grasses ${plan.exchangePlan.exchanges.fat}; légumes ${plan.exchangePlan.exchanges.vegetable}.`,
    "",
  ];
  for (const day of plan.menus || []) {
    lines.push(day.title);
    for (const meal of day.meals || []) {
      lines.push(`- ${meal.name}: ${(meal.items || []).map((item: any) => `${item.food} (${item.rawGrams} g cru; ${item.servedGrams} g servi)`).join(", ")}`);
    }
    if (day.professionalNote) lines.push(`Note: ${day.professionalNote}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
