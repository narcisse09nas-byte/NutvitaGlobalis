import 'server-only';

import { generateStructured } from '@/lib/ai-narrative';

export type NutritionMeasure = {
  calories: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number;
  sodium_mg: number;
};

export type MaximusNutritionAnalysis = {
  menu_name: string;
  servings: number;
  serving_description: string;
  portion: NutritionMeasure;
  recipe_total: NutritionMeasure;
  micronutrients: Array<{ nutrient: string; amount: number | null; unit: string; significance: string }>;
  ingredient_assessment: Array<{ ingredient: string; contribution: string; attention: string }>;
  allergens: string[];
  nutritional_summary: string;
  health_benefits: string[];
  attention_points: string[];
  operational_recommendations: string[];
  limitations: string[];
  confidence: 'high' | 'medium' | 'low';
  ai_provider: string;
  ai_error?: string;
};

const measureSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    calories: { type: 'number' },
    protein_g: { type: 'number' },
    carbohydrates_g: { type: 'number' },
    fat_g: { type: 'number' },
    fiber_g: { type: 'number' },
    sodium_mg: { type: 'number' },
  },
  required: ['calories', 'protein_g', 'carbohydrates_g', 'fat_g', 'fiber_g', 'sodium_mg'],
} as const;

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    menu_name: { type: 'string' },
    servings: { type: 'number' },
    serving_description: { type: 'string' },
    portion: measureSchema,
    recipe_total: measureSchema,
    micronutrients: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          nutrient: { type: 'string' },
          amount: { type: ['number', 'null'] },
          unit: { type: 'string' },
          significance: { type: 'string' },
        },
        required: ['nutrient', 'amount', 'unit', 'significance'],
      },
    },
    ingredient_assessment: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ingredient: { type: 'string' },
          contribution: { type: 'string' },
          attention: { type: 'string' },
        },
        required: ['ingredient', 'contribution', 'attention'],
      },
    },
    allergens: { type: 'array', items: { type: 'string' } },
    nutritional_summary: { type: 'string' },
    health_benefits: { type: 'array', items: { type: 'string' } },
    attention_points: { type: 'array', items: { type: 'string' } },
    operational_recommendations: { type: 'array', items: { type: 'string' } },
    limitations: { type: 'array', items: { type: 'string' } },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: [
    'menu_name', 'servings', 'serving_description', 'portion', 'recipe_total',
    'micronutrients', 'ingredient_assessment', 'allergens', 'nutritional_summary',
    'health_benefits', 'attention_points', 'operational_recommendations', 'limitations', 'confidence',
  ],
} as const;

const zeroMeasure = (): NutritionMeasure => ({
  calories: 0,
  protein_g: 0,
  carbohydrates_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sodium_mg: 0,
});

function finite(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 ? Math.round(result * 10) / 10 : 0;
}

function normalizeMeasure(value: Partial<NutritionMeasure> | undefined): NutritionMeasure {
  return {
    calories: finite(value?.calories),
    protein_g: finite(value?.protein_g),
    carbohydrates_g: finite(value?.carbohydrates_g),
    fat_g: finite(value?.fat_g),
    fiber_g: finite(value?.fiber_g),
    sodium_mg: finite(value?.sodium_mg),
  };
}

function localFallback(menu: Record<string, unknown>, language: 'en' | 'fr', error?: string): MaximusNutritionAnalysis {
  const french = language === 'fr';
  return {
    menu_name: String(menu.name || menu.title || 'Menu'),
    servings: Math.max(finite(menu.servings), 1),
    serving_description: french ? 'Portion non quantifiable avec les données disponibles' : 'Serving cannot be quantified from available data',
    portion: zeroMeasure(),
    recipe_total: zeroMeasure(),
    micronutrients: [],
    ingredient_assessment: [],
    allergens: [],
    nutritional_summary: french
      ? 'L’analyse externe est indisponible. Aucune valeur nutritionnelle ne peut être estimée de manière responsable sans une table de composition alimentaire et des quantités complètes.'
      : 'External analysis is unavailable. Nutritional values cannot be responsibly estimated without a food composition table and complete ingredient quantities.',
    health_benefits: [],
    attention_points: [french ? 'Vérifier les quantités, unités, portions et méthodes de cuisson.' : 'Verify quantities, units, servings, and cooking methods.'],
    operational_recommendations: [french ? 'Compléter la fiche du menu puis relancer l’analyse.' : 'Complete the menu record and run the analysis again.'],
    limitations: [french ? 'Les valeurs nulles signifient que le calcul n’a pas été réalisé.' : 'Zero values mean that no calculation was performed.'],
    confidence: 'low',
    ai_provider: 'local',
    ai_error: error,
  };
}

export async function analyzeMaximusMenu(
  menu: Record<string, unknown>,
  language: 'en' | 'fr',
): Promise<MaximusNutritionAnalysis> {
  const result = await generateStructured<Omit<MaximusNutritionAnalysis, 'ai_provider' | 'ai_error'>>(
    'maximus_menu_nutrition',
    [
      `Output language: ${language === 'fr' ? 'French' : 'English'}.`,
      'Act as a rigorous food-service nutrition analyst.',
      'Estimate nutrients only from the supplied menu, ingredient quantities, units, number of servings, and cooking process.',
      'Never fabricate a precise value when quantities or units are absent. Use zero for unavailable numerical values, lower confidence, and explain the missing data in limitations.',
      'Return values for the complete recipe and one serving. Check that recipe totals are coherent with portion values multiplied by servings.',
      'Check energy coherence against macronutrients using approximately 4 kcal/g protein, 4 kcal/g carbohydrate, and 9 kcal/g fat. Resolve major inconsistencies before returning.',
      'Discuss every listed ingredient. Identify likely allergens but state uncertainty where brands or cross-contamination are unknown.',
      'Cover energy, protein, carbohydrates, fats, fiber, sodium, important micronutrients, ingredient contributions, food-service risks, and practical recipe improvements.',
      'Do not diagnose, claim disease treatment, or present the estimate as a laboratory result.',
      'Make the narrative substantial and operationally useful to a central kitchen, while clearly separating observed inputs, estimates, and limitations.',
    ].join('\n'),
    {
      name: menu.name || menu.title,
      menu_type: menu.menu_type,
      meal_type: menu.meal_type,
      servings: menu.servings,
      serving_size: menu.serving_size,
      ingredients: menu.ingredients,
      description: menu.description,
      cooking_process: menu.cooking_process,
    },
    analysisSchema,
  );

  if (!result.data) return localFallback(menu, language, result.error);
  const servings = Math.max(finite(result.data.servings || menu.servings), 1);
  const portion = normalizeMeasure(result.data.portion);
  const recipeTotal = normalizeMeasure(result.data.recipe_total);
  const macroEnergy = portion.protein_g * 4 + portion.carbohydrates_g * 4 + portion.fat_g * 9;
  const energyDifference = portion.calories > 0 ? Math.abs(macroEnergy - portion.calories) / portion.calories : 0;
  const limitations = [...(result.data.limitations || [])];
  if (energyDifference > 0.25) {
    limitations.push(language === 'fr'
      ? 'La cohérence entre énergie et macronutriments reste incertaine; les valeurs doivent être vérifiées avec une table de composition.'
      : 'Energy and macronutrient coherence remains uncertain; values should be checked against a food composition table.');
  }

  return {
    ...result.data,
    servings,
    portion,
    recipe_total: recipeTotal,
    micronutrients: Array.isArray(result.data.micronutrients) ? result.data.micronutrients : [],
    ingredient_assessment: Array.isArray(result.data.ingredient_assessment) ? result.data.ingredient_assessment : [],
    allergens: Array.isArray(result.data.allergens) ? result.data.allergens : [],
    health_benefits: Array.isArray(result.data.health_benefits) ? result.data.health_benefits : [],
    attention_points: Array.isArray(result.data.attention_points) ? result.data.attention_points : [],
    operational_recommendations: Array.isArray(result.data.operational_recommendations) ? result.data.operational_recommendations : [],
    limitations,
    confidence: ['high', 'medium', 'low'].includes(result.data.confidence) ? result.data.confidence : 'low',
    ai_provider: result.provider || 'external',
  };
}
