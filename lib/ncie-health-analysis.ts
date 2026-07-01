import type { HealthRow, IndicatorInsight, InsightResult } from "@/lib/health-analysis";

const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const numeric = (value: string | undefined) => {
  const match = String(value || "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

function statistics(item: IndicatorInsight) {
  const values = (item.history || []).map(point => numeric(point.value)).filter((value): value is number => value !== null && Number.isFinite(value));
  if (!values.length) return { count: 0, linearTrend: "N/A: aucune serie numerique exploitable." };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const changes = values.slice(1).map((value, index) => value - values[index]);
  const slope = values.length >= 3 ? (values.at(-1)! - values[0]) / (values.length - 1) : null;
  return {
    count: values.length,
    minimum: round(Math.min(...values), 2),
    maximum: round(Math.max(...values), 2),
    mean: round(mean, 2),
    median: round(median, 2),
    standardDeviation: round(Math.sqrt(variance), 2),
    range: round(Math.max(...values) - Math.min(...values), 2),
    coefficientOfVariation: mean ? round(Math.sqrt(variance) / Math.abs(mean) * 100, 1) : undefined,
    averageVisitChange: changes.length ? round(changes.reduce((sum, value) => sum + value, 0) / changes.length, 2) : undefined,
    linearTrend: slope === null
      ? "N/A: au moins trois mesures sont requises pour estimer une tendance lineaire."
      : `${slope > 0 ? "Hausse" : slope < 0 ? "Baisse" : "Stabilite"} moyenne de ${round(Math.abs(slope), 2)} unite par intervalle de mesure.`,
  };
}

function confidence(item: IndicatorInsight, count: number) {
  let score = count >= 5 ? 85 : count >= 3 ? 70 : count === 2 ? 55 : count === 1 ? 35 : 15;
  score -= Math.min((item.missingData || []).length * 5, 25);
  if (item.status === "incomplete") score = Math.min(score, 30);
  return {
    score: Math.max(5, score),
    explanation: count < 2
      ? "Confiance limitee par l absence de serie longitudinale comparable."
      : `Base sur ${count} mesure(s); la confiance diminue en presence de donnees manquantes ou de conditions de mesure non documentees.`,
  };
}

function scoreForStatus(status: IndicatorInsight["status"]) {
  return status === "improving" ? 88 : status === "stable" ? 78 : status === "watch" ? 52 : status === "urgent" ? 25 : 45;
}

function has(item: IndicatorInsight, terms: string[]) {
  const name = item.indicator.toLowerCase();
  return terms.some(term => name.includes(term));
}

export function applyNcieFramework(
  analysis: InsightResult,
  anthropometry: HealthRow[],
  biology: HealthRow[],
  food: HealthRow[],
  lifestyle: HealthRow[],
  locale: "fr" | "en" = "fr",
): InsightResult {
  const indicators = analysis.indicatorInsights.map(item => {
    const stats = statistics(item);
    const values = (item.history || []).map(point => numeric(point.value)).filter((value): value is number => value !== null);
    const first = values[0];
    const latest = values.at(-1);
    const previous = values.length > 1 ? values.at(-2) : null;
    const maximum = values.length ? Math.max(...values) : null;
    const minimum = values.length ? Math.min(...values) : null;
    const projections = values.length >= 3
      ? {
          days30: "Estimation conditionnelle: poursuivre la tendance recente seulement si les conditions restent comparables.",
          days90: "Projection prudente non chiffree: la tendance doit etre revalidee par de nouvelles mesures.",
          days180: "N/A: horizon trop eloigne pour une projection fiable avec les donnees disponibles.",
        }
      : { days30: "N/A", days90: "N/A", days180: "N/A" };
    return {
      ...item,
      presentation: `${item.indicator} est un indicateur de suivi dont l interpretation doit tenir compte du contexte clinique, des conditions de mesure et de son evolution dans le temps.`,
      comparisonReference: item.reference
        ? `Valeur actuelle: ${item.latest || "N/A"}. Reference disponible: ${item.reference}`
        : "N/A: aucune reference individualisee ou plage fiable n est configuree.",
      comparisonPrevious: previous != null && latest != null
        ? `Variation depuis la mesure precedente: ${round(latest - previous, 2)} (${previous ? round((latest - previous) / Math.abs(previous) * 100, 1) : "N/A"} %).`
        : "N/A: mesure precedente insuffisante.",
      comparisonFirst: first !== null && first !== undefined && latest !== null && latest !== undefined
        ? `Evolution depuis la premiere mesure: ${round(latest - first, 2)} (${first ? round((latest - first) / Math.abs(first) * 100, 1) : "N/A"} %).`
        : "N/A: comparaison initiale impossible.",
      peakAnalysis: maximum !== null
        ? `Maximum observe: ${maximum}; minimum observe: ${minimum}. ${values.length < 3 ? "Plateaux, reprises et accelerations non evaluables avec moins de trois mesures." : "Les changements de direction doivent etre rapproches des dates, symptomes et evenements de vie."}`
        : "N/A: aucune valeur numerique exploitable.",
      statistics: stats,
      correlationNotes: [] as string[],
      clinicalInterpretation: item.professionalInterpretation,
      projections,
      prioritizedRecommendations: [item.recommendation, ...(item.professionalRecommendations || [])].filter(Boolean).slice(0, 5),
      confidence: confidence(item, stats.count),
    };
  });

  const domainDefinitions: Record<string, string[]> = {
    Nutrition: ["aliment", "nutrition", "calorie", "protein"],
    "Activite physique": ["activite", "exercise"],
    Hydratation: ["hydrat", "eau corporelle"],
    "Composition corporelle": ["poids", "imc", "masse", "taille", "hanche", "muac", "graisse"],
    Metabolisme: ["glyc", "hba1c", "metabol", "cholesterol", "triglycer"],
    Cardiovasculaire: ["pression", "tension", "pouls", "cardio"],
    "Mode de vie": ["mode de vie", "habitude"],
    Stress: ["stress"],
    Sommeil: ["sommeil"],
    Adherence: ["adherence", "observance"],
  };
  const weightIndicator = indicators.find(item => has(item, ["poids", "weight"]));
  const bmiIndicator = indicators.find(item => has(item, ["imc", "bmi"]));
  const waistIndicator = indicators.find(item => has(item, ["tour de taille", "waist"]));
  const fatIndicator = indicators.find(item => has(item, ["graisse", "body fat"]));
  const activityIndicator = indicators.find(item => has(item, ["activite", "activity"]));
  const pressureIndicator = indicators.find(item => has(item, ["pression", "tension", "blood pressure"]));
  const glucoseIndicator = indicators.find(item => has(item, ["glyc", "glucose"]));
  for (const item of indicators) {
    const notes: string[] = [];
    if ((item === weightIndicator || item === bmiIndicator) && weightIndicator && bmiIndicator) notes.push("Poids et IMC evoluent mathematiquement de facon liee; leur lecture doit etre completee par la composition corporelle.");
    if ((item === waistIndicator || item === fatIndicator) && waistIndicator && fatIndicator) notes.push("Tour de taille et masse grasse peuvent decrire des dimensions complementaires de l adiposite, sans equivalence individuelle parfaite.");
    if ((item === activityIndicator || item === pressureIndicator) && activityIndicator && pressureIndicator) notes.push("Activite et pression arterielle peuvent etre associees, mais traitements, stress, sommeil et conditions de mesure doivent etre controles.");
    if (item === glucoseIndicator && food.length) notes.push("La glycemie doit etre rapprochee du contexte alimentaire et du moment de prelevement; les donnees disponibles ne prouvent pas une causalite.");
    item.correlationNotes = notes;
  }
  const domainScores: Record<string, number | null> = {};
  for (const [domain, terms] of Object.entries(domainDefinitions)) {
    const matching = indicators.filter(item => has(item, terms));
    domainScores[domain] = matching.length ? Math.round(matching.reduce((sum, item) => sum + scoreForStatus(item.status), 0) / matching.length) : null;
  }
  const availableScores = Object.values(domainScores).filter((value): value is number => value !== null);
  const globalScore = availableScores.length ? Math.round(availableScores.reduce((sum, value) => sum + value, 0) / availableScores.length) : 45;
  const limitations = [
    ...new Set(indicators.flatMap(item => item.missingData || [])),
    ...(anthropometry.length < 2 ? ["Serie anthropometrique longitudinale insuffisante."] : []),
    ...(biology.length < 2 ? ["Peu de mesures biologiques comparables."] : []),
    ...(food.length < 3 ? ["Journal alimentaire trop court pour caracteriser les apports habituels."] : []),
    ...(lifestyle.length < 2 ? ["Evaluation longitudinale du mode de vie insuffisante."] : []),
  ];
  const priorities = indicators.filter(item => ["urgent", "watch"].includes(item.status)).map(item => item.indicator);
  return {
    ...analysis,
    indicatorInsights: indicators,
    globalScore,
    scoreColor: globalScore >= 75 ? "green" : globalScore >= 50 ? "orange" : "red",
    domainScores,
    crossIndicatorAnalysis: [
      "Les relations observees sont descriptives et ne prouvent pas un lien de causalite.",
      ...(indicators.some(item => has(item, ["poids"])) && indicators.some(item => has(item, ["imc"])) ? ["Poids et IMC doivent etre interpretes ensemble, avec le tour de taille et la composition corporelle si disponibles."] : []),
      ...(indicators.some(item => has(item, ["glyc"])) && food.length ? ["La trajectoire glycemique doit etre rapprochee du contexte des repas, du jeûne, de l activite et des traitements."] : []),
    ],
    actionPlan: {
      days30: analysis.recommendations.slice(0, 3),
      days90: ["Reevaluer les tendances avec des mesures comparables et ajuster les objectifs avec un professionnel."],
      days180: ["Faire une synthese longitudinale et reevaluer les priorites cardiometaboliques et nutritionnelles."],
      daily: ["Suivre les actions convenues sans modifier seul un traitement.", "Documenter alimentation, hydratation, activite et symptomes pertinents."],
      weekly: ["Realiser les mesures prioritaires dans des conditions comparables."],
      monthly: ["Revoir les tendances, difficultes, facteurs protecteurs et objectifs avec un professionnel."],
      priorityIndicators: priorities.length ? priorities : indicators.slice(0, 4).map(item => item.indicator),
    },
    motivation: analysis.improvements.length
      ? `Les progres observes meritent d etre consolides: ${analysis.improvements.join(" ")} La regularite compte davantage que la perfection.`
      : "Chaque mesure complete le suivi. Avancer progressivement, sans culpabilisation, permet de construire des habitudes durables.",
    limitations,
    scientificVersion: "NCIE scientific framework v1.0 - moteur deterministe NutVitaGlobalis",
    aiVersion: analysis.aiProvider && analysis.aiProvider !== "local" ? `NCIE v1.0 / ${analysis.aiProvider}` : "NCIE v1.0 / analyse locale",
  };
}
