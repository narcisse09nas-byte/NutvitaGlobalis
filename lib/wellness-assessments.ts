export type AssessmentKind = "nutrition" | "activity" | "lifestyle";
export type AssessmentAnswer = Record<string, number>;

export type AssessmentQuestion = {
  id: string;
  title: string;
  help?: string;
  options: Array<{ label: string; score: number }>;
};

const frequencyPositive = ["0 jour", "1 à 2 jours", "3 à 4 jours", "5 à 6 jours", "7 jours"];
const frequencyNegative = ["7 jours", "5 à 6 jours", "3 à 4 jours", "1 à 2 jours", "Aucun jour"];
const options = (labels: string[], scores = [0, 1, 2, 3, 4]) => labels.map((label, index) => ({ label, score: scores[index] }));

export const assessmentQuestions: Record<AssessmentKind, AssessmentQuestion[]> = {
  nutrition: [
    { id: "regular_meals", title: "Jours avec trois repas principaux", options: options(["0 à 1 jour", "2 à 3 jours", "4 à 5 jours", "6 jours", "7 jours"]) },
    { id: "fruit", title: "Jours avec au moins 2 portions de fruits", help: "Une portion : un fruit moyen ou environ 80 g.", options: options(frequencyPositive) },
    { id: "vegetables", title: "Jours avec au moins 3 portions de légumes", help: "Une portion : 1/2 tasse cuite ou 1 tasse crue.", options: options(frequencyPositive) },
    { id: "diversity", title: "Jours réunissant les cinq groupes alimentaires", help: "Féculents; fruits/légumes; protéines; laitages; bonnes matières grasses.", options: options(frequencyPositive) },
    { id: "hydration", title: "Jours avec au moins 1,5 à 2 litres d’eau", options: options(["0 à 1 jour", "2 à 3 jours", "4 à 5 jours", "6 jours", "7 jours"]) },
    { id: "sugary_drinks", title: "Jours avec boissons sucrées", options: options(frequencyNegative) },
    { id: "ultra_processed", title: "Jours avec aliments ultra-transformés", options: options(frequencyNegative) },
    { id: "fried_food", title: "Jours avec aliments frits", options: options(frequencyNegative) },
    { id: "portion_size", title: "Taille habituelle des portions", options: options(["Très excessives", "Plutôt excessives", "Adaptées à ma faim", "Plutôt insuffisantes", "Très insuffisantes"], [0, 2, 4, 2, 0]) },
    { id: "balanced_breakfast", title: "Jours avec petit-déjeuner équilibré", help: "Au moins trois éléments : féculent complet/tubercule, laitage, fruit, protéine.", options: options(frequencyPositive) },
    { id: "protein_sources", title: "Jours avec une source protéique de qualité au moins deux fois", options: options(frequencyPositive) },
    { id: "snacking", title: "Jours avec grignotage hors collation planifiée", options: options(frequencyNegative) },
  ],
  activity: [
    { id: "planned_sessions", title: "Séances planifiées d’au moins 30 minutes", options: options(["0", "1", "2", "3 à 4", "5 ou plus"]) },
    { id: "weekly_minutes", title: "Minutes modérées ou intenses cette semaine", options: options(["Moins de 30", "30–74", "75–149", "150–299", "300 ou plus"]) },
    { id: "intensity", title: "Intensité habituelle", options: options(["Aucune", "Faible", "Modérée", "Vigoureuse", "Alternance modérée/vigoureuse"], [0, 1, 3, 4, 4]) },
    { id: "strength_days", title: "Jours de renforcement musculaire", options: options(["Aucun", "1 jour", "2 jours", "3 jours", "4 jours ou plus"]) },
    { id: "sitting_time", title: "Temps assis moyen par jour", options: options(["Plus de 8 h", "6–8 h", "4–6 h", "2–4 h", "Moins de 4 h"]) },
    { id: "daily_walking", title: "Marche quotidienne hors sport", options: options(["Moins de 10 min", "10–29 min", "30–59 min", "60–89 min", "90 min ou plus"]) },
    { id: "stairs", title: "Utilisation des escaliers", options: options(["Jamais", "Rarement", "Parfois", "Souvent", "Toujours"]) },
    { id: "regularity", title: "Ancienneté de l’habitude sportive", options: options(["Aucune habitude", "Moins de 1 mois", "1–3 mois", "3–6 mois", "Plus de 6 mois"]) },
    { id: "interruptions", title: "Semaines sans activité durant les 30 derniers jours", options: options(["4 semaines", "3 semaines", "2 semaines", "1 semaine", "Aucune"]) },
    { id: "functional_capacity", title: "Après avoir monté deux étages", options: options(["Obligé de m’arrêter", "Très essoufflé", "Modérément essoufflé", "Légèrement essoufflé", "Pas essoufflé"]) },
  ],
  lifestyle: [
    { id: "sleep_duration", title: "Nuits avec 7 à 9 heures de sommeil", options: options(frequencyPositive) },
    { id: "rested", title: "Jours avec réveil reposé", options: options(frequencyPositive) },
    { id: "stress", title: "Jours de stress, anxiété ou dépassement", options: options(["Tous les jours", "5 à 6 jours", "3 à 4 jours", "1 à 2 jours", "Aucun jour"]) },
    { id: "recreational_screen", title: "Temps d’écran récréatif quotidien", options: options(["Plus de 6 h", "4 à 6 h", "2 à 4 h", "1 à 2 h", "Moins d’une heure"]) },
    { id: "alcohol", title: "Jours avec consommation d’alcool", options: options(frequencyNegative) },
    { id: "nicotine", title: "Jours avec tabac ou nicotine", options: options(frequencyNegative) },
    { id: "emotional_wellbeing", title: "Jours de bonne humeur et satisfaction", options: options(frequencyPositive) },
    { id: "social_connections", title: "Jours avec échanges sociaux agréables", options: options(frequencyPositive) },
    { id: "relaxation", title: "Jours avec au moins 30 minutes de détente", options: options(frequencyPositive) },
    { id: "life_balance", title: "Équilibre travail/études, vie personnelle et repos", options: options(["Jamais", "Rarement", "Parfois", "Souvent", "Toujours"]) },
  ],
};

export type AssessmentResult = {
  score: number;
  rawScore: number;
  maxScore: number;
  level: "very_low" | "low" | "moderate" | "good" | "excellent";
  completed: boolean;
  keySignals: Array<{ question: string; score: number }>;
};

export function scoreAssessment(kind: AssessmentKind, answers: AssessmentAnswer): AssessmentResult {
  const questions = assessmentQuestions[kind];
  const values = questions.map(question => answers[question.id]).filter(value => Number.isFinite(value));
  const rawScore = values.reduce((sum, value) => sum + value, 0);
  const maxScore = questions.length * 4;
  const score = Math.round((rawScore / maxScore) * 100);
  const level = score <= 20 ? "very_low" : score <= 40 ? "low" : score <= 60 ? "moderate" : score <= 80 ? "good" : "excellent";
  return {
    score,
    rawScore,
    maxScore,
    level,
    completed: values.length === questions.length,
    keySignals: questions
      .map(question => ({ question: question.title, score: answers[question.id] }))
      .filter(item => Number.isFinite(item.score) && item.score <= 1),
  };
}

export type WellnessAssessmentBundle = {
  nutrition: AssessmentResult;
  activity: AssessmentResult;
  lifestyle: AssessmentResult;
  answers: Record<AssessmentKind, AssessmentAnswer>;
};

export function buildAssessmentBundle(answers: Record<AssessmentKind, AssessmentAnswer>): WellnessAssessmentBundle {
  return {
    nutrition: scoreAssessment("nutrition", answers.nutrition),
    activity: scoreAssessment("activity", answers.activity),
    lifestyle: scoreAssessment("lifestyle", answers.lifestyle),
    answers,
  };
}

export function scoreToLegacyLevel(score: number) {
  return score <= 20 ? 1 : score <= 40 ? 2 : score <= 60 ? 3 : score <= 80 ? 4 : 5;
}
