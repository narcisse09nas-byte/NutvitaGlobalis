import type { ChildGrowthAnalysis, GrowthIndicatorInsight, GrowthRow } from "@/lib/child-growth-analysis";

const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const numeric = (value: string | undefined) => {
  const match = String(value || "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};
const has = (item: GrowthIndicatorInsight, terms: string[]) => terms.some(term => item.indicator.toLowerCase().includes(term));

function statistics(item: GrowthIndicatorInsight) {
  const values = (item.history || []).map(point => numeric(point.value)).filter((value): value is number => value !== null && Number.isFinite(value));
  if (!values.length) return { count: 0, trend: "N/A: aucune serie numerique exploitable." };
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const changes = values.slice(1).map((value, index) => value - values[index]);
  return {
    count: values.length,
    minimum: round(Math.min(...values), 2),
    maximum: round(Math.max(...values), 2),
    mean: round(mean, 2),
    standardDeviation: round(Math.sqrt(variance), 2),
    averageChange: changes.length ? round(changes.reduce((sum, value) => sum + value, 0) / changes.length, 2) : undefined,
    trend: values.length >= 3
      ? `${values.at(-1)! > values[0] ? "Hausse" : values.at(-1)! < values[0] ? "Baisse" : "Stabilite"} sur la serie disponible.`
      : "N/A: au moins trois mesures sont requises pour caracteriser la tendance.",
  };
}

export function applyNcgieFramework(analysis: ChildGrowthAnalysis, child: GrowthRow, source: GrowthRow[]): ChildGrowthAnalysis {
  const rows = [...source].sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at));
  const latestRow = rows.at(-1);
  const indicators = analysis.indicatorInsights.map(item => {
    const stats = statistics(item);
    const values = (item.history || []).map(point => numeric(point.value)).filter((value): value is number => value !== null);
    const first = values[0], latest = values.at(-1), previous = values.at(-2);
    const isZScore = item.latest?.toLowerCase().includes(" z") || item.indicator.toLowerCase().includes("pour-age") || item.indicator.toLowerCase().includes("pour-taille");
    return {
      ...item,
      presentation: `${item.indicator} contribue au suivi de la croissance, de l etat nutritionnel ou du developpement. Il doit etre interprete selon l age exact, le sexe, la qualite de mesure et la trajectoire de l enfant.`,
      currentSituation: `Valeur actuelle: ${item.latest || "N/A"}. Statut automatise: ${item.status}.`,
      whoComparison: isZScore
        ? `${item.reference || "Reference OMS non disponible."} Classification actuelle: ${item.status === "usual" ? "zone usuelle" : item.status === "watch" ? "vigilance" : item.status === "urgent" ? "alerte/urgence a confirmer" : "non classable"}.`
        : item.reference || "N/A: comparaison OMS directe non disponible pour cet indicateur.",
      previousComparison: previous != null && latest != null
        ? `Variation depuis la derniere visite: ${round(latest - previous, 2)} (${previous ? round((latest - previous) / Math.abs(previous) * 100, 1) : "N/A"} %).`
        : "N/A: aucune visite precedente comparable.",
      firstComparison: first != null && latest != null
        ? `Progression depuis la premiere visite: ${round(latest - first, 2)} (${first ? round((latest - first) / Math.abs(first) * 100, 1) : "N/A"} %).`
        : "N/A: historique initial insuffisant.",
      peakAnalysis: values.length >= 3
        ? `Minimum ${Math.min(...values)}, maximum ${Math.max(...values)}. Toute cassure, stagnation ou rattrapage doit etre confirmee sur la courbe OMS et rapprochee des maladies et apports.`
        : "N/A: au moins trois visites sont requises pour identifier plateau, rebond ou cassure.",
      statistics: stats,
      correlationNotes: [] as string[],
      clinicalInterpretation: item.professionalInterpretation,
      projections: values.length >= 3
        ? {
            month1: "Projection conditionnelle fondee sur la tendance recente; a confirmer par une nouvelle mesure.",
            month3: "Estimation prudente seulement si alimentation, sante et conditions de mesure restent comparables.",
            month6: "N/A: horizon trop eloigne sans modele OMS individuel complet.",
            month12: "N/A: projection annuelle non fiable avec les donnees disponibles.",
          }
        : { month1: "N/A", month3: "N/A", month6: "N/A", month12: "N/A" },
      prioritizedRecommendations: [item.recommendation, ...(item.professionalRecommendations || [])].filter(Boolean).slice(0, 6),
      confidence: {
        score: Math.max(5, Math.min(90, stats.count >= 5 ? 85 : stats.count >= 3 ? 70 : stats.count === 2 ? 55 : stats.count === 1 ? 35 : 15) - Math.min((item.missingData || []).length * 5, 25)),
        explanation: `Confiance fondee sur ${stats.count} mesure(s), la disponibilite des z-scores et les informations cliniques renseignees.`,
      },
    };
  });

  const weight = indicators.find(item => has(item, ["poids"]));
  const height = indicators.find(item => has(item, ["taille / longueur"]));
  const muac = indicators.find(item => has(item, ["muac"]));
  const bmi = indicators.find(item => has(item, ["imc"]));
  for (const item of indicators) {
    if ((item === weight || item === height) && weight && height) item.correlationNotes.push("Poids et taille doivent etre lus ensemble pour distinguer croissance harmonieuse, amaigrissement et retard lineaire.");
    if ((item === weight || item === muac) && weight && muac) item.correlationNotes.push("Poids et MUAC apportent des informations complementaires sur le risque nutritionnel aigu.");
    if ((item === weight || item === bmi) && weight && bmi) item.correlationNotes.push("Poids et IMC sont lies; l age, la taille et le sexe restent indispensables a l interpretation.");
    if (latestRow?.recent_illnesses) item.correlationNotes.push("Les maladies recentes peuvent temporairement influencer appetit, poids et vitesse de croissance.");
    if (latestRow?.complementary_feeding || child.feeding_mode) item.correlationNotes.push("Les pratiques alimentaires documentees doivent etre rapprochees de la trajectoire sans conclure a une causalite.");
  }

  const first = rows[0];
  const influencingFactors = [
    ["Allaitement", latestRow?.breastfeeding_status || child.feeding_mode],
    ["Diversification et alimentation", latestRow?.complementary_feeding],
    ["Appetit", latestRow?.appetite],
    ["Maladies recentes", latestRow?.recent_illnesses],
    ["Vaccination", latestRow?.vaccinations_up_to_date],
    ["Sommeil", latestRow?.sleep],
    ["Environnement et hygiene", latestRow?.environment || latestRow?.hygiene],
    ["Activite et stimulation", latestRow?.activity || latestRow?.stimulation],
    ["Securite alimentaire", latestRow?.food_security],
    ["Situation socio-economique", latestRow?.socioeconomic_context],
  ].map(([factor, value]) => ({
    factor: String(factor),
    analysis: value === undefined || value === null || value === "" ? "N/A: information non renseignee." : `Information documentee: ${String(value)}. A interpreter avec le contexte familial et clinique.`,
    status: value === undefined || value === null || value === "" ? "missing" as const : "documented" as const,
  }));
  const developmentAnalysis = ["Motricite", "Langage", "Socialisation", "Apprentissage", "Jeu", "Comportement"].map(domain => {
    const key = domain.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const value = latestRow?.development?.[key] || latestRow?.[key];
    return {
      domain,
      analysis: value ? String(value) : "N/A: aucune observation structuree disponible.",
      status: value ? "documented" as const : "missing" as const,
    };
  });
  const limitations = [
    ...new Set(indicators.flatMap(item => item.missingData || [])),
    ...(rows.length < 3 ? ["Moins de trois visites: analyse des cassures et projections limitee."] : []),
    ...(!rows.some(row => Number.isFinite(Number(row.weight_for_age_z))) ? ["Z-scores OMS poids-pour-age absents."] : []),
    ...(!rows.some(row => Number.isFinite(Number(row.height_for_age_z))) ? ["Z-scores OMS taille-pour-age absents."] : []),
  ];
  return {
    ...analysis,
    indicatorInsights: indicators,
    whoCurveAnalysis: [
      rows.length < 2 ? "N/A: une seule visite ne permet pas d analyser la trajectoire OMS." : "La trajectoire doit etre examinee pour tout franchissement durable de couloir, cassure ou rattrapage.",
      ...indicators.filter(item => item.latest?.includes(" z")).map(item => `${item.indicator}: ${item.latest}; statut ${item.status}.`),
    ],
    growthStory: first && latestRow
      ? `Depuis la premiere visite du ${new Date(first.measured_at).toLocaleDateString("fr-FR")} jusqu au ${new Date(latestRow.measured_at).toLocaleDateString("fr-FR")}, ${child.full_name || "l enfant"} a fait l objet de ${rows.length} mesure(s). ${analysis.positives.join(" ")} ${analysis.attentionPoints.join(" ")} Cette histoire reste a confirmer avec les courbes OMS et le contexte familial.`
      : "N/A: histoire longitudinale insuffisante.",
    influencingFactors,
    developmentAnalysis,
    actionPlan: {
      days7: analysis.consultationRecommended ? ["Obtenir une evaluation professionnelle et confirmer les mesures prioritaires."] : ["Verifier les donnees manquantes et maintenir les pratiques protectrices."],
      days30: analysis.practicalAdvice.slice(0, 4),
      days90: ["Repeter les mesures dans des conditions comparables et reevaluer la trajectoire OMS."],
      days180: ["Realiser une synthese de croissance, alimentation, morbidite, vaccination et developpement."],
      daily: ["Observer appetit, alimentation, hydratation, activite et signes de maladie."],
      weekly: ["Documenter les changements importants sans multiplier inutilement les pesees."],
      monthly: ["Revoir la croissance et les objectifs avec un professionnel selon le niveau de risque."],
    },
    limitations,
    aiVersion: "NCGIE v1.0",
  };
}
