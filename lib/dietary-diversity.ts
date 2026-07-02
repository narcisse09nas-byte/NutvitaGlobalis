export type FoodAnswers = Record<string, boolean>;

export type DietaryFoodGroup = {
  key: string;
  labelFr: string;
  labelEn: string;
  examplesFr: string;
  examplesEn: string;
};

export const childFoodItems = [
  { key: "grains", labelFr: "Cereales et produits cerealiers", labelEn: "Grains and grain products", examplesFr: "mais, mil, sorgho, riz, pain, bouillie, pates", examplesEn: "maize, millet, sorghum, rice, bread, porridge, pasta" },
  { key: "roots", labelFr: "Racines, tubercules et plantain", labelEn: "Roots, tubers and plantain", examplesFr: "manioc, igname, macabo, pomme de terre, patate blanche, plantain", examplesEn: "cassava, yam, cocoyam, potato, white sweet potato, plantain" },
  { key: "pulses", labelFr: "Legumineuses, noix et graines", labelEn: "Pulses, nuts and seeds", examplesFr: "haricot, niebe, pois, lentille, arachide, sesame", examplesEn: "beans, cowpeas, peas, lentils, groundnuts, sesame" },
  { key: "dairy", labelFr: "Lait et produits laitiers", labelEn: "Milk and dairy products", examplesFr: "lait, formule infantile, yaourt, fromage", examplesEn: "milk, infant formula, yogurt, cheese" },
  { key: "meat", labelFr: "Aliments carnes", labelEn: "Flesh foods", examplesFr: "viande, foie ou autres abats, volaille, poisson, escargot, fruits de mer", examplesEn: "meat, liver or other organs, poultry, fish, snails, seafood" },
  { key: "eggs", labelFr: "Oeufs", labelEn: "Eggs", examplesFr: "oeuf de poule, de caille, de canard ou autre oiseau", examplesEn: "chicken, quail, duck or other bird eggs" },
  { key: "vitamin_a", labelFr: "Fruits et legumes riches en vitamine A", labelEn: "Vitamin A-rich fruits and vegetables", examplesFr: "feuilles vert fonce, carotte, potiron, patate douce orange, mangue, papaye", examplesEn: "dark green leaves, carrot, pumpkin, orange sweet potato, mango, papaya" },
  { key: "other_produce", labelFr: "Autres fruits et legumes", labelEn: "Other fruits and vegetables", examplesFr: "tomate, gombo, aubergine, chou, banane, orange, ananas, pasteque", examplesEn: "tomato, okra, eggplant, cabbage, banana, orange, pineapple, watermelon" },
  { key: "specialized_food", labelFr: "Aliment nutritif specialise", labelEn: "Specialized nutritious food", examplesFr: "farine infantile enrichie ou aliment therapeutique, si prescrit", examplesEn: "fortified infant cereal or therapeutic food, when prescribed" },
] satisfies DietaryFoodGroup[];

export const mddwFoodItems = [
  { key: "grains_roots", labelFr: "Cereales, racines, tubercules et plantain", labelEn: "Grains, roots, tubers and plantain", examplesFr: "mais, mil, sorgho, riz, pain, manioc, igname, macabo, plantain", examplesEn: "maize, millet, sorghum, rice, bread, cassava, yam, cocoyam, plantain" },
  { key: "pulses", labelFr: "Legumineuses", labelEn: "Pulses", examplesFr: "haricot, niebe, pois, lentille", examplesEn: "beans, cowpeas, peas, lentils" },
  { key: "nuts_seeds", labelFr: "Noix et graines", labelEn: "Nuts and seeds", examplesFr: "arachide, sesame, noix de cajou, graines de courge", examplesEn: "groundnuts, sesame, cashews, pumpkin seeds" },
  { key: "dairy", labelFr: "Lait et produits laitiers", labelEn: "Milk and dairy products", examplesFr: "lait, yaourt, fromage", examplesEn: "milk, yogurt, cheese" },
  { key: "meat_fish", labelFr: "Viande, volaille, poisson et abats", labelEn: "Meat, poultry, fish and organ meats", examplesFr: "boeuf, chevre, poulet, foie, poisson, escargot, fruits de mer", examplesEn: "beef, goat, chicken, liver, fish, snails, seafood" },
  { key: "eggs", labelFr: "Oeufs", labelEn: "Eggs", examplesFr: "oeuf de poule, de caille, de canard", examplesEn: "chicken, quail or duck eggs" },
  { key: "leafy_greens", labelFr: "Legumes feuilles vert fonce", labelEn: "Dark green leafy vegetables", examplesFr: "epinard, amarante, feuilles de manioc, morelle, moringa", examplesEn: "spinach, amaranth, cassava leaves, nightshade, moringa" },
  { key: "vitamin_a", labelFr: "Autres fruits et legumes riches en vitamine A", labelEn: "Other vitamin A-rich fruits and vegetables", examplesFr: "carotte, potiron, patate douce orange, mangue, papaye", examplesEn: "carrot, pumpkin, orange sweet potato, mango, papaya" },
  { key: "other_vegetables", labelFr: "Autres legumes", labelEn: "Other vegetables", examplesFr: "tomate, oignon, aubergine, gombo, chou, concombre", examplesEn: "tomato, onion, eggplant, okra, cabbage, cucumber" },
  { key: "other_fruits", labelFr: "Autres fruits", labelEn: "Other fruits", examplesFr: "banane, goyave, orange, ananas, avocat, pasteque", examplesEn: "banana, guava, orange, pineapple, avocado, watermelon" },
] satisfies DietaryFoodGroup[];

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
  const groups = Object.fromEntries(mddwFoodItems.map(({ key }) => [key, foods[key] ? 1 : 0]));
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
