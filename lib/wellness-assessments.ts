export type AssessmentKind = "nutrition" | "activity" | "lifestyle";
export type AssessmentAnswer = Record<string, number>;

export type AssessmentQuestion = {
  id: string;
  title: string;
  help?: string;
  options: Array<{ label: string; score: number }>;
};

const frequencyPositive = ["0 jour", "1 � 2 jours", "3 � 4 jours", "5 � 6 jours", "7 jours"];
const frequencyNegative = ["7 jours", "5 � 6 jours", "3 � 4 jours", "1 � 2 jours", "Aucun jour"];
const options = (labels: string[], scores = [0, 1, 2, 3, 4]) => labels.map((label, index) => ({ label, score: scores[index] }));

export const assessmentQuestions: Record<AssessmentKind, AssessmentQuestion[]> = {
  nutrition: [
    { id: "regular_meals", title: "Jours avec trois repas principaux", options: options(["0 � 1 jour", "2 � 3 jours", "4 � 5 jours", "6 jours", "7 jours"]) },
    { id: "fruit", title: "Jours avec au moins 2 portions de fruits", help: "Une portion : un fruit moyen ou environ 80 g.", options: options(frequencyPositive) },
    { id: "vegetables", title: "Jours avec au moins 3 portions de l�gumes", help: "Une portion : 1/2 tasse cuite ou 1 tasse crue.", options: options(frequencyPositive) },
    { id: "diversity", title: "Jours r�unissant les cinq groupes alimentaires", help: "F�culents; fruits/l�gumes; prot�ines; laitages; bonnes mati�res grasses.", options: options(frequencyPositive) },
    { id: "hydration", title: "Jours avec au moins 1,5 � 2 litres d�eau", options: options(["0 � 1 jour", "2 � 3 jours", "4 � 5 jours", "6 jours", "7 jours"]) },
    { id: "sugary_drinks", title: "Jours avec boissons sucr�es", options: options(frequencyNegative) },
    { id: "ultra_processed", title: "Jours avec aliments ultra-transform�s", options: options(frequencyNegative) },
    { id: "fried_food", title: "Jours avec aliments frits", options: options(frequencyNegative) },
    { id: "portion_size", title: "Taille habituelle des portions", options: options(["Tr�s excessives", "Plut�t excessives", "Adapt�es � ma faim", "Plut�t insuffisantes", "Tr�s insuffisantes"], [0, 2, 4, 2, 0]) },
    { id: "balanced_breakfast", title: "Jours avec petit-d�jeuner �quilibr�", help: "Au moins trois �l�ments : f�culent complet/tubercule, laitage, fruit, prot�ine.", options: options(frequencyPositive) },
    { id: "protein_sources", title: "Jours avec une source prot�ique de qualit� au moins deux fois", options: options(frequencyPositive) },
    { id: "snacking", title: "Jours avec grignotage hors collation planifi�e", options: options(frequencyNegative) },
  ],
  activity: [
    { id: "planned_sessions", title: "S�ances planifi�es d�au moins 30 minutes", options: options(["0", "1", "2", "3 � 4", "5 ou plus"]) },
    { id: "weekly_minutes", title: "Minutes mod�r�es ou intenses cette semaine", options: options(["Moins de 30", "30�74", "75�149", "150�299", "300 ou plus"]) },
    { id: "intensity", title: "Intensit� habituelle", options: options(["Aucune", "Faible", "Mod�r�e", "Vigoureuse", "Alternance mod�r�e/vigoureuse"], [0, 1, 3, 4, 4]) },
    { id: "strength_days", title: "Jours de renforcement musculaire", options: options(["Aucun", "1 jour", "2 jours", "3 jours", "4 jours ou plus"]) },
    { id: "sitting_time", title: "Temps assis moyen par jour", options: options(["Plus de 8 h", "6�8 h", "4�6 h", "2�4 h", "Moins de 4 h"]) },
    { id: "daily_walking", title: "Marche quotidienne hors sport", options: options(["Moins de 10 min", "10�29 min", "30�59 min", "60�89 min", "90 min ou plus"]) },
    { id: "stairs", title: "Utilisation des escaliers", options: options(["Jamais", "Rarement", "Parfois", "Souvent", "Toujours"]) },
    { id: "regularity", title: "Anciennet� de l�habitude sportive", options: options(["Aucune habitude", "Moins de 1 mois", "1�3 mois", "3�6 mois", "Plus de 6 mois"]) },
    { id: "interruptions", title: "Semaines sans activit� durant les 30 derniers jours", options: options(["4 semaines", "3 semaines", "2 semaines", "1 semaine", "Aucune"]) },
    { id: "functional_capacity", title: "Apr�s avoir mont� deux �tages", options: options(["Oblig� de m�arr�ter", "Tr�s essouffl�", "Mod�r�ment essouffl�", "L�g�rement essouffl�", "Pas essouffl�"]) },
  ],
  lifestyle: [
    { id: "sleep_duration", title: "Nuits avec 7 � 9 heures de sommeil", options: options(frequencyPositive) },
    { id: "rested", title: "Jours avec r�veil repos�", options: options(frequencyPositive) },
    { id: "stress", title: "Jours de stress, anxi�t� ou d�passement", options: options(["Tous les jours", "5 � 6 jours", "3 � 4 jours", "1 � 2 jours", "Aucun jour"]) },
    { id: "recreational_screen", title: "Temps d��cran r�cr�atif quotidien", options: options(["Plus de 6 h", "4 � 6 h", "2 � 4 h", "1 � 2 h", "Moins d�une heure"]) },
    { id: "alcohol", title: "Jours avec consommation d�alcool", options: options(frequencyNegative) },
    { id: "nicotine", title: "Jours avec tabac ou nicotine", options: options(frequencyNegative) },
    { id: "emotional_wellbeing", title: "Jours de bonne humeur et satisfaction", options: options(frequencyPositive) },
    { id: "social_connections", title: "Jours avec �changes sociaux agr�ables", options: options(frequencyPositive) },
    { id: "relaxation", title: "Jours avec au moins 30 minutes de d�tente", options: options(frequencyPositive) },
    { id: "life_balance", title: "�quilibre travail/�tudes, vie personnelle et repos", options: options(["Jamais", "Rarement", "Parfois", "Souvent", "Toujours"]) },
  ],
};

export type AssessmentResult = {
  score: number;
  rawScore: number;
  maxScore: number;
  level: "very_low" | "low" | "moderate" | "good" | "excellent";
  levelLabel: string;
  interpretation: string;
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
  const descriptor = assessmentInterpretation(kind, level);
  return {
    score,
    rawScore,
    maxScore,
    level,
    levelLabel: descriptor.label,
    interpretation: descriptor.interpretation,
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

const interpretationByKind: Record<AssessmentKind, Record<AssessmentResult["level"], { label: string; interpretation: string }>> = {

  nutrition: {

    very_low: { label: "Très faible", interpretation: "Habitudes alimentaires très défavorables à la santé. Une amélioration rapide est recommandée." },

    low: { label: "Faible", interpretation: "Plusieurs habitudes alimentaires doivent être corrigées pour réduire les risques nutritionnels." },

    moderate: { label: "Modérée", interpretation: "Alimentation acceptable, mais plusieurs aspects peuvent être améliorés pour atteindre les recommandations." },

    good: { label: "Bonne", interpretation: "Habitudes alimentaires globalement équilibrées avec quelques points d’amélioration." },

    excellent: { label: "Excellente", interpretation: "Alimentation variée, équilibrée et conforme aux principales recommandations nutritionnelles." },

  },

  activity: {

    very_low: { label: "Très faible", interpretation: "Mode de vie très sédentaire. Aucun programme sportif régulier." },

    low: { label: "Faible", interpretation: "Activité insuffisante pour maintenir une bonne santé." },

    moderate: { label: "Modérée", interpretation: "Niveau acceptable mais en dessous des recommandations optimales." },

    good: { label: "Bonne", interpretation: "Habitudes sportives satisfaisantes, conformes aux recommandations de l’OMS." },

    excellent: { label: "Excellente", interpretation: "Mode de vie très actif avec une excellente régularité et un faible niveau de sédentarité." },

  },

  lifestyle: {

    very_low: { label: "Très faible", interpretation: "Plusieurs habitudes de vie sont défavorables à la santé. Une amélioration est fortement recommandée." },

    low: { label: "Faible", interpretation: "Des changements dans plusieurs domaines, notamment le sommeil, le stress et l’équilibre de vie, sont nécessaires." },

    moderate: { label: "Modéré", interpretation: "Les habitudes de vie sont acceptables, mais plusieurs aspects peuvent être optimisés." },

    good: { label: "Bon", interpretation: "Le mode de vie est globalement favorable à la santé avec quelques points d’amélioration." },

    excellent: { label: "Excellent", interpretation: "Les habitudes de vie sont très favorables au bien-être physique, mental et social." },

  },

};



export function assessmentInterpretation(kind: AssessmentKind, level: AssessmentResult["level"]) {

  return interpretationByKind[kind][level];

}



export const assessmentGuides: Record<AssessmentKind, Record<string, string>> = {

  nutrition: {

    regular_meals: "Comptez uniquement les journées avec petit-déjeuner, déjeuner et dîner.",

    fruit: "Exemples : 1 fruit moyen ou environ 80 g de fruits découpés par portion.",

    vegetables: "Une portion correspond à environ 1/2 tasse cuite ou 1 tasse crue.",

    diversity: "Les cinq groupes sont : féculents, fruits/légumes, protéines, laitages et bonnes matières grasses.",

    hydration: "Comptez principalement l’eau; adaptez la cible si un professionnel a prescrit une restriction hydrique.",

    sugary_drinks: "Incluez sodas, jus industriels, boissons énergétiques et cafés/thés très sucrés.",

    ultra_processed: "Exemples : chips, biscuits industriels, fast-food, charcuteries, nouilles instantanées et confiseries.",

    fried_food: "Incluez les aliments frits à domicile, au restaurant ou achetés prêts à consommer.",

    portion_size: "Choisissez l’option qui décrit le mieux la majorité de vos repas, en tenant compte de faim et satiété.",

    balanced_breakfast: "Au moins trois éléments parmi : féculent complet/tubercule, laitage, fruit et source de protéines.",

    protein_sources: "Exemples : poisson, viande, œufs, haricots, soja, lait ou yaourt.",

    snacking: "Ne comptez pas les collations planifiées; comptez les prises répétées entre les repas.",

  },

  activity: {

    planned_sessions: "Une séance dure au moins 30 minutes et est réalisée volontairement comme activité physique ou sportive.",

    weekly_minutes: "Additionnez toutes les minutes d’activité modérée et vigoureuse des 7 derniers jours.",

    intensity: "Faible : marche lente; modérée : marche rapide ou vélo tranquille; vigoureuse : course, football, HIIT ou natation rapide.",

    strength_days: "Exemples : pompes, haltères, gainage, musculation ou exercices avec bandes élastiques.",

    sitting_time: "Incluez travail assis, transports, télévision et loisirs numériques; excluez le sommeil.",

    daily_walking: "Comptez la marche utilitaire hors séances sportives : déplacements, courses et travail.",

    stairs: "Répondez selon votre comportement habituel lorsque des escaliers sont disponibles et adaptés.",

    regularity: "Indiquez depuis combien de temps vous maintenez globalement cette routine sportive.",

    interruptions: "Comptez les semaines entièrement sans activité durant les 30 derniers jours.",

    functional_capacity: "Répondez selon votre état habituel après deux étages, sans vous mettre volontairement en difficulté.",

  },

  lifestyle: {

    sleep_duration: "Comptez les nuits avec une durée totale de sommeil comprise entre 7 et 9 heures.",

    rested: "Comptez les réveils où vous vous sentiez reposé et capable de commencer normalement la journée.",

    stress: "Pensez aux jours où stress, anxiété ou surcharge ont réellement affecté votre bien-être.",

    recreational_screen: "Excluez les écrans nécessaires au travail ou aux études; incluez réseaux sociaux, jeux et télévision.",

    alcohol: "Comptez tout jour avec au moins une boisson alcoolisée, quelle que soit la quantité.",

    nicotine: "Incluez cigarette, cigare, chicha, cigarette électronique et tabac à chiquer.",

    emotional_wellbeing: "Comptez les jours où votre humeur et votre satisfaction globale étaient positives.",

    social_connections: "Incluez les échanges agréables en personne, par téléphone ou en visioconférence.",

    relaxation: "Exemples : lecture, musique, prière, méditation, promenade, jardinage ou loisirs créatifs pendant au moins 30 minutes.",

    life_balance: "Évaluez l’équilibre global entre obligations, vie personnelle et récupération durant la semaine.",

  },

};
