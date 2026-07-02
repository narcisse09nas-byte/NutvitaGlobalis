export type FoodAnswers = Record<string, boolean>;

export const childFoodItems = [
  ["grains", "Cereales, bouillies, pain, riz, pates"],
  ["roots", "Racines, tubercules blancs ou plantain"],
  ["pulses", "Haricots, pois, lentilles, noix ou graines"],
  ["dairy", "Lait, formule, yaourt ou fromage"],
  ["meat", "Viande, abats, volaille, poisson ou fruits de mer"],
  ["eggs", "Oeufs"],
  ["vitamin_a", "Fruits ou legumes riches en vitamine A et feuilles vert fonce"],
  ["other_produce", "Autres fruits ou legumes"],
  ["specialized_food", "Aliment nutritif specialise"],
] as const;

export const mddwFoodItems = [
  ["grains_roots", "Cereales, racines, tubercules ou plantain"],
  ["pulses", "Legumineuses"],
  ["nuts_seeds", "Noix et graines"],
  ["dairy", "Lait et produits laitiers"],
  ["meat_fish", "Viande, volaille, abats, poisson ou fruits de mer"],
  ["eggs", "Oeufs"],
  ["leafy_greens", "Legumes feuilles vert fonce"],
  ["vitamin_a", "Autres fruits ou legumes riches en vitamine A"],
  ["other_vegetables", "Autres legumes"],
  ["other_fruits", "Autres fruits"],
] as const;

const flag = (answers: FoodAnswers, ...keys: string[]) => keys.some(key => answers[key] === true) ? 1 : 0;

export function calculateIycf(input: {
  ageMonths: number;
  breastfed: boolean;
  solidMeals: number;
  formulaFeeds: number;
  animalMilkFeeds: number;
  yogurtDrinkFeeds: number;
  foods: FoodAnswers;
}) {
  const groups = {
    breast_milk: input.breastfed ? 1 : 0,
    staples: flag(input.foods, "grains", "roots", "specialized_food"),
    pulses_nuts: flag(input.foods, "pulses"),
    dairy: flag(input.foods, "dairy"),
    meat_fish: flag(input.foods, "meat"),
    eggs: flag(input.foods, "eggs"),
    vitamin_a: flag(input.foods, "vitamin_a"),
    other_fruit_vegetables: flag(input.foods, "other_produce"),
  };
  const mddScore = Object.values(groups).reduce((sum, value) => sum + value, 0);
  const mddMet = mddScore >= 5;
  const milkFeeds = input.formulaFeeds + input.animalMilkFeeds + input.yogurtDrinkFeeds;
  const mmfMet = input.breastfed
    ? input.ageMonths <= 8 ? input.solidMeals >= 2 : input.solidMeals >= 3
    : input.solidMeals >= 1 && input.solidMeals + milkFeeds >= 4;
  const mmffMet = input.breastfed ? null : milkFeeds >= 2;
  const madMet = input.breastfed ? mddMet && mmfMet : mddMet && mmfMet && mmffMet === true;
  return { groups, mddScore, mddMet, mmfMet, mmffMet, madMet };
}

export function calculateMddw(foods: FoodAnswers) {
  const groups = Object.fromEntries(mddwFoodItems.map(([key]) => [key, foods[key] ? 1 : 0]));
  const score = Object.values(groups).reduce((sum, value) => sum + Number(value), 0);
  return { groups, score, met: score >= 5 };
}

export function ageInMonths(birthDate: string, at = new Date()) {
  const birth = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(+birth)) return 0;
  let months = (at.getFullYear() - birth.getFullYear()) * 12 + at.getMonth() - birth.getMonth();
  if (at.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}
