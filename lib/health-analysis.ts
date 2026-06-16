export type HealthRow = Record<string, any>;
export type InsightResult = {
  professionalSummary: string;
  publicSummary: string;
  trends: string[];
  improvements: string[];
  risks: string[];
  recommendations: string[];
  alerts: Array<{ alert_type: string; severity: "info" | "warning" | "critical"; title: string; message: string; metric_value?: number }>;
};

const number = (value: unknown) => value == null || value === "" ? null : Number(value);
const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const dated = (rows: HealthRow[], key: string) => [...rows].filter(row => row[key]).sort((a, b) => +new Date(a[key]) - +new Date(b[key]));

function variation(rows: HealthRow[], valueKey: string, dateKey: string) {
  const values = dated(rows, dateKey).filter(row => number(row[valueKey]) != null);
  if (values.length < 2) return null;
  const first = Number(values[0][valueKey]);
  const last = Number(values.at(-1)?.[valueKey]);
  const days = Math.max(1, (+new Date(values.at(-1)?.[dateKey]) - +new Date(values[0][dateKey])) / 86400000);
  return { first, last, delta: round(last - first), days: round(days, 0), weekly: round((last - first) / days * 7, 2) };
}

export function analyzeHealthData(anthropometry: HealthRow[], biology: HealthRow[], food: HealthRow[], locale: "fr" | "en" = "fr"): InsightResult {
  const trends: string[] = [], improvements: string[] = [], risks: string[] = [], recommendations: string[] = [];
  const alerts: InsightResult["alerts"] = [];
  const weight = variation(anthropometry, "weight_kg", "measured_at");
  const glucose = variation(biology, "glucose", "measured_at");
  const hba1c = variation(biology, "hba1c", "measured_at");

  if (weight) {
    trends.push(locale === "en" ? `Weight changed by ${weight.delta > 0 ? "+" : ""}${weight.delta} kg over ${weight.days} days.` : `Variation ponderale de ${weight.delta > 0 ? "+" : ""}${weight.delta} kg sur ${weight.days} jours.`);
    if (weight.delta < 0) improvements.push(locale === "en" ? `Weight decreased by ${Math.abs(weight.delta)} kg.` : `Diminution du poids de ${Math.abs(weight.delta)} kg.`);
    if (weight.weekly > 1) {
      risks.push(locale === "en" ? "Rapid weight gain should be reviewed." : "Prise de poids rapide a verifier.");
      alerts.push({ alert_type: "rapid_weight_gain", severity: "warning", title: locale === "en" ? "Rapid weight gain" : "Prise de poids rapide", message: locale === "en" ? `Estimated change is ${weight.weekly} kg per week.` : `La variation estimee est de ${weight.weekly} kg par semaine.`, metric_value: weight.weekly });
    }
    if (weight.weekly < -1.5) {
      risks.push(locale === "en" ? "Rapid weight loss requires evaluation." : "Perte de poids rapide necessitant une evaluation.");
      alerts.push({ alert_type: "excessive_weight_loss", severity: "critical", title: locale === "en" ? "Significant weight loss" : "Perte de poids importante", message: locale === "en" ? `Estimated change is ${Math.abs(weight.weekly)} kg per week.` : `La variation estimee est de ${Math.abs(weight.weekly)} kg par semaine.`, metric_value: weight.weekly });
    }
  }

  const latestBiology = dated(biology, "measured_at").at(-1);
  const latestGlucose = number(latestBiology?.glucose);
  if (glucose) {
    trends.push(locale === "en" ? `Blood glucose changed by ${glucose.delta > 0 ? "+" : ""}${glucose.delta}.` : `Evolution de la glycemie: ${glucose.delta > 0 ? "+" : ""}${glucose.delta}.`);
    if (glucose.delta < 0) improvements.push(locale === "en" ? "Blood glucose improved over the period." : "Amelioration de la glycemie sur la periode.");
  }
  if (hba1c?.delta && hba1c.delta < 0) improvements.push(locale === "en" ? `HbA1c decreased by ${Math.abs(hba1c.delta)} point.` : `HbA1c en baisse de ${Math.abs(hba1c.delta)} point.`);
  if (latestGlucose != null) {
    const high = latestGlucose > 20 ? latestGlucose >= 126 : latestGlucose >= 1.26;
    if (high) {
      risks.push(locale === "en" ? "Latest blood glucose is above the configured vigilance threshold." : "Derniere glycemie au-dessus du seuil de vigilance configure.");
      alerts.push({ alert_type: "high_glucose", severity: "critical", title: locale === "en" ? "High blood glucose" : "Glycemie elevee", message: locale === "en" ? "This value must be interpreted according to the unit, sampling context and professional advice." : "Cette valeur doit etre interpretee selon l'unite, le contexte du prelevement et l'avis d'un professionnel.", metric_value: latestGlucose });
    }
  }
  if (number(latestBiology?.hba1c) != null && Number(latestBiology?.hba1c) >= 6.5) risks.push(locale === "en" ? "HbA1c is above the configured vigilance threshold." : "HbA1c au-dessus du seuil de vigilance configure.");
  if ((number(latestBiology?.systolic_pressure) || 0) >= 140 || (number(latestBiology?.diastolic_pressure) || 0) >= 90) risks.push(locale === "en" ? "High blood pressure should be checked again." : "Pression arterielle elevee a recontroler.");

  const latestAnthropometry = dated(anthropometry, "measured_at").at(-1);
  const latestBmi = number(latestAnthropometry?.bmi);
  const calorieValues = food.map(row => number(row.content?.calories)).filter((value): value is number => value != null && value > 0).slice(-7);
  const averageCalories = calorieValues.length ? calorieValues.reduce((sum, value) => sum + value, 0) / calorieValues.length : null;
  if ((latestBmi != null && latestBmi < 18.5) || (averageCalories != null && calorieValues.length >= 3 && averageCalories < 1200)) {
    risks.push(locale === "en" ? "Potential nutritional risk to evaluate with a professional." : "Risque nutritionnel potentiel a evaluer avec un professionnel.");
    alerts.push({ alert_type: "nutrition_risk", severity: "warning", title: locale === "en" ? "Potential nutritional risk" : "Risque nutritionnel potentiel", message: locale === "en" ? "The recent profile requires human review. This alert is not a diagnosis." : "Le profil recent justifie une verification humaine. Cette alerte ne constitue pas un diagnostic.", metric_value: latestBmi ?? averageCalories ?? undefined });
  }

  const recentLimit = Date.now() - 30 * 86400000;
  const hasRecentAnthro = anthropometry.some(row => +new Date(row.measured_at) >= recentLimit);
  const hasRecentBiology = biology.some(row => +new Date(row.measured_at) >= recentLimit);
  if (!hasRecentAnthro || !hasRecentBiology) alerts.push({ alert_type: "missing_data", severity: "info", title: locale === "en" ? "Data to complete" : "Donnees a completer", message: locale === "en" ? "Add recent measurements to get a more reliable analysis." : "Ajoutez des mesures recentes pour obtenir une analyse plus fiable." });
  if (food.length < 3) recommendations.push(locale === "en" ? "Complete several days of food diary to better assess intake." : "Completer plusieurs jours de journal alimentaire pour mieux evaluer les apports.");
  recommendations.push(locale === "en" ? "Have every alert reviewed by a health professional before changing any treatment or diet." : "Faire valider toute alerte par un professionnel de sante avant de modifier un traitement ou un regime.");

  const professionalSummary = weight
    ? locale === "en" ? `A weight change of ${weight.delta} kg is observed over ${weight.days} days${glucose ? `, with a blood glucose change of ${glucose.delta}` : ""}. ${risks.length ? risks.join(" ") : "No major automatic signal was identified."}` : `Une variation ponderale de ${weight.delta} kg est observee sur ${weight.days} jours${glucose ? `, avec une variation glycemique de ${glucose.delta}` : ""}. ${risks.length ? risks.join(" ") : "Aucun signal automatique majeur n'a ete identifie."}`
    : locale === "en" ? `Available data is insufficient to establish a robust weight trend. ${risks.join(" ")}` : `Les donnees disponibles sont insuffisantes pour etablir une tendance ponderale robuste. ${risks.join(" ")}`;
  const publicSummary = weight
    ? locale === "en" ? `Your weight has changed by ${weight.delta} kg over the period. ${improvements.length ? improvements.join(" ") : "Keep recording your measurements regularly."}` : `Votre poids a varie de ${weight.delta} kg sur la periode. ${improvements.length ? improvements.join(" ") : "Continuez a enregistrer vos mesures regulierement."}`
    : locale === "en" ? "Add at least two weight measurements to visualize your progress." : "Ajoutez au moins deux mesures de poids pour visualiser votre evolution.";
  return { professionalSummary, publicSummary, trends, improvements, risks, recommendations, alerts };
}
