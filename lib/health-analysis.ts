import { analyzeCustomIndicators } from "@/lib/tracking-indicators";

export type HealthRow = Record<string, any>;
export type IndicatorInsight = {
  indicator: string;
  latest?: string;
  status: "stable" | "improving" | "watch" | "urgent" | "incomplete";
  publicInterpretation: string;
  professionalInterpretation: string;
  recommendation: string;
  history?: Array<{ date: string; value: string; secondary?: string }>;
  reference?: string;
  changeSummary?: string;
  benefits?: string[];
  missingData?: string[];
  professionalRecommendations?: string[];
};
export type InsightResult = {
  professionalSummary: string;
  publicSummary: string;
  trends: string[];
  improvements: string[];
  risks: string[];
  recommendations: string[];
  indicatorInsights: IndicatorInsight[];
  publicConclusion: string;
  professionalConclusion: string;
  aiProvider?: "openai" | "gemini" | "openrouter" | "external" | "local";
  aiError?: string;
  alerts: Array<{ alert_type: string; severity: "info" | "warning" | "critical"; title: string; message: string; metric_value?: number }>;
};

const number = (value: unknown) => value == null || value === "" ? null : Number(value);
const round = (value: number, digits = 1) => Number(value.toFixed(digits));
const dated = (rows: HealthRow[], key: string) => [...rows].filter(row => row[key]).sort((a, b) => +new Date(a[key]) - +new Date(b[key]));
const value = (input: unknown, unit = "", digits = 1) => number(input) == null ? undefined : `${round(Number(input), digits)}${unit}`;
const dateLabel = (input: unknown, locale: "fr" | "en") => input ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "fr-FR").format(new Date(String(input))) : "-";

function bmiCategory(bmi: number, locale: "fr" | "en") {
  if (bmi < 18.5) return locale === "en" ? "underweight range" : "insuffisance ponderale";
  if (bmi < 25) return locale === "en" ? "usual adult range" : "corpulence usuelle";
  if (bmi < 30) return locale === "en" ? "overweight range" : "surpoids";
  if (bmi < 35) return locale === "en" ? "class I obesity range" : "obesite de classe I";
  if (bmi < 40) return locale === "en" ? "class II obesity range" : "obesite de classe II";
  return locale === "en" ? "class III obesity range" : "obesite de classe III";
}

function variation(rows: HealthRow[], valueKey: string, dateKey: string) {
  const values = dated(rows, dateKey).filter(row => number(row[valueKey]) != null);
  if (values.length < 2) return null;
  const first = Number(values[0][valueKey]);
  const last = Number(values.at(-1)?.[valueKey]);
  const days = Math.max(1, (+new Date(values.at(-1)?.[dateKey]) - +new Date(values[0][dateKey])) / 86400000);
  return { first, last, delta: round(last - first), days: round(days, 0), weekly: round((last - first) / days * 7, 2) };
}

function addInsight(insights: IndicatorInsight[], insight: IndicatorInsight) {
  insights.push(insight);
}

export function analyzeHealthData(anthropometry: HealthRow[], biology: HealthRow[], food: HealthRow[], lifestyle: HealthRow[] = [], locale: "fr" | "en" = "fr"): InsightResult {
  const trends: string[] = [], improvements: string[] = [], risks: string[] = [], recommendations: string[] = [], indicatorInsights: IndicatorInsight[] = [];
  const alerts: InsightResult["alerts"] = [];
  const weight = variation(anthropometry, "weight_kg", "measured_at");
  const glucose = variation(biology, "glucose", "measured_at");
  const hba1c = variation(biology, "hba1c", "measured_at");
  const latestAnthropometry = dated(anthropometry, "measured_at").at(-1);
  const latestBiology = dated(biology, "measured_at").at(-1);
  const latestBmi = number(latestAnthropometry?.bmi);
  const anthropometryHistory = dated(anthropometry, "measured_at");
  const firstAnthropometry = anthropometryHistory.find(row => number(row.weight_kg) !== null);
  const firstBmi = number(firstAnthropometry?.bmi);
  const latestGlucose = number(latestBiology?.glucose);
  const latestHba1c = number(latestBiology?.hba1c);
  const systolic = number(latestBiology?.systolic_pressure);
  const diastolic = number(latestBiology?.diastolic_pressure);

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
    addInsight(indicatorInsights, {
      indicator: locale === "en" ? "Weight" : "Poids",
      latest: `${weight.last} kg`,
      status: weight.weekly > 1 || weight.weekly < -1.5 ? "watch" : weight.delta < 0 ? "improving" : "stable",
      publicInterpretation: locale === "en"
        ? `Your weight changed from ${weight.first} kg to ${weight.last} kg, a ${weight.delta > 0 ? "gain" : "loss"} of ${Math.abs(weight.delta)} kg over ${weight.days} days. ${latestBmi !== null ? `Your current BMI is ${latestBmi.toFixed(2)}, in the ${bmiCategory(latestBmi, locale)}.` : ""} This is a meaningful trend, but the pace and the way the change was achieved also matter.`
        : `Votre poids est passe de ${weight.first} kg a ${weight.last} kg, soit ${weight.delta > 0 ? "une prise" : "une perte"} de ${Math.abs(weight.delta)} kg en ${weight.days} jours. ${latestBmi !== null ? `Votre IMC actuel est de ${latestBmi.toFixed(2)}, compatible avec la categorie ${bmiCategory(latestBmi, locale)}.` : ""} Cette tendance est utile, mais la vitesse et les conditions dans lesquelles elle a ete obtenue comptent egalement.`,
      professionalInterpretation: locale === "en"
        ? `Weight change ${weight.delta} kg (${round(weight.delta / weight.first * 100, 1)}% of initial body weight) over ${weight.days} days, estimated at ${weight.weekly} kg/week. ${firstBmi !== null && latestBmi !== null ? `BMI changed from ${firstBmi.toFixed(2)} to ${latestBmi.toFixed(2)} kg/m2 (${round(latestBmi - firstBmi, 2)} kg/m2).` : ""} Review energy and protein intake, physical activity, lean mass preservation, hydration, oedema and the clinical context when the rate is outside usual targets.`
        : `Variation ponderale de ${weight.delta} kg (${round(weight.delta / weight.first * 100, 1)} % du poids initial) sur ${weight.days} jours, soit une vitesse estimee a ${weight.weekly} kg/semaine. ${firstBmi !== null && latestBmi !== null ? `L IMC est passe de ${firstBmi.toFixed(2)} a ${latestBmi.toFixed(2)} kg/m2, soit ${round(latestBmi - firstBmi, 2)} kg/m2.` : ""} Evaluer les apports energetiques et proteiques, l activite physique, le maintien de la masse maigre, l hydratation, les oedemes et le contexte clinique lorsque la vitesse sort des objectifs usuels.`,
      recommendation: locale === "en" ? "Continue measurements under comparable conditions and discuss rapid changes with a professional." : "Poursuivre les mesures dans des conditions comparables et discuter toute variation rapide avec un professionnel.",
      history: anthropometryHistory.filter(row => number(row.weight_kg) !== null).map(row => ({
        date: dateLabel(row.measured_at, locale),
        value: `${round(Number(row.weight_kg), 1)} kg`,
        secondary: number(row.bmi) !== null ? `IMC ${round(Number(row.bmi), 2)}` : undefined,
      })),
      reference: locale === "en" ? "A commonly used sustainable target is about 0.5 to 1 kg per week, adjusted to the individual situation." : "Un objectif souvent utilise pour une perte progressive est d environ 0,5 a 1 kg par semaine, a adapter a la situation individuelle.",
      changeSummary: locale === "en" ? `${weight.delta} kg in ${weight.days} days; ${round(weight.delta / weight.first * 100, 1)}% of initial weight.` : `${weight.delta} kg en ${weight.days} jours, soit ${round(weight.delta / weight.first * 100, 1)} % du poids initial.`,
      benefits: weight.delta < 0 ? (locale === "en"
        ? ["May support improved blood pressure and glucose balance.", "May reduce mechanical stress on joints.", "May improve sleep, mobility, energy and quality of life when achieved safely."]
        : ["Peut contribuer a ameliorer la pression arterielle et l equilibre glycemique.", "Peut reduire les contraintes sur les articulations.", "Peut ameliorer le sommeil, la mobilite, l energie et la qualite de vie lorsque la perte est obtenue de facon adaptee."]) : [],
      missingData: [
        latestAnthropometry?.waist_cm ? "" : locale === "en" ? "Waist circumference" : "Tour de taille",
        latestAnthropometry?.body_fat_percent ? "" : locale === "en" ? "Body fat percentage" : "Pourcentage de masse grasse",
        latestAnthropometry?.muscle_mass_kg ? "" : locale === "en" ? "Muscle mass" : "Masse musculaire",
        latestAnthropometry?.muac_cm ? "" : "MUAC",
        lifestyle.length ? "" : locale === "en" ? "Physical activity assessment" : "Evaluation de l activite physique",
        food.length ? "" : locale === "en" ? "Dietary data" : "Donnees alimentaires",
      ].filter(Boolean),
      professionalRecommendations: locale === "en"
        ? ["Continue weekly weight monitoring under comparable conditions.", "Measure waist circumference and body composition where possible.", "Set a 5 to 10% weight-loss objective over 3 to 6 months when clinically appropriate.", "Assess dietary intake, physical activity and preservation of lean mass."]
        : ["Poursuivre un suivi ponderal hebdomadaire dans des conditions comparables.", "Mesurer le tour de taille et la composition corporelle lorsque cela est possible.", "Definir, lorsque cela est pertinent, un objectif de perte de 5 a 10 % du poids initial sur 3 a 6 mois.", "Evaluer les apports alimentaires, l activite physique et le maintien de la masse maigre."],
    });
  } else {
    addInsight(indicatorInsights, {
      indicator: locale === "en" ? "Weight" : "Poids",
      status: "incomplete",
      publicInterpretation: locale === "en" ? "At least two weight measurements are needed to describe a trend." : "Au moins deux mesures de poids sont necessaires pour decrire une tendance.",
      professionalInterpretation: locale === "en" ? "Insufficient longitudinal anthropometric data for trend interpretation." : "Donnees anthropometriques longitudinales insuffisantes pour interpreter une tendance.",
      recommendation: locale === "en" ? "Add a recent weight measurement." : "Ajouter une mesure de poids recente.",
    });
  }

  if (latestBmi != null) {
    const status = latestBmi < 18.5 || latestBmi >= 30 ? "watch" : "stable";
    if (latestBmi < 18.5) risks.push(locale === "en" ? "BMI is below the usual adult reference range." : "IMC sous la plage usuelle de reference adulte.");
    if (latestBmi >= 30) risks.push(locale === "en" ? "BMI is above the configured vigilance range." : "IMC au-dessus de la plage de vigilance configuree.");
    addInsight(indicatorInsights, {
      indicator: "IMC / BMI",
      latest: value(latestBmi, "", 1),
      status,
      publicInterpretation: locale === "en" ? `Your latest BMI is ${latestBmi.toFixed(1)}. It is a screening indicator, not a diagnosis.` : `Votre dernier IMC est de ${latestBmi.toFixed(1)}. C'est un indicateur de depistage, pas un diagnostic.`,
      professionalInterpretation: locale === "en" ? "BMI should be interpreted with age, sex, body composition, oedema, pregnancy status and clinical background." : "L'IMC doit etre interprete avec l'age, le sexe, la composition corporelle, les oedemes, la grossesse et le contexte clinique.",
      recommendation: locale === "en" ? "Use BMI together with waist, symptoms and dietary history." : "Associer l'IMC au tour de taille, aux symptomes et a l'histoire alimentaire.",
      history: anthropometryHistory.filter(row => number(row.bmi) !== null).map(row => ({ date: dateLabel(row.measured_at, locale), value: `${round(Number(row.bmi), 2)} kg/m2`, secondary: `${round(Number(row.weight_kg), 1)} kg` })),
      reference: locale === "en" ? "Adult screening categories: <18.5; 18.5-24.9; 25-29.9; >=30 kg/m2." : "Categories de depistage adulte : <18,5 ; 18,5-24,9 ; 25-29,9 ; >=30 kg/m2.",
      changeSummary: firstBmi !== null ? `${firstBmi.toFixed(2)} -> ${latestBmi.toFixed(2)} kg/m2 (${round(latestBmi - firstBmi, 2)})` : undefined,
      missingData: [latestAnthropometry?.waist_cm ? "" : locale === "en" ? "Waist circumference" : "Tour de taille", latestAnthropometry?.body_fat_percent ? "" : locale === "en" ? "Body composition" : "Composition corporelle"].filter(Boolean),
      professionalRecommendations: locale === "en" ? ["Interpret with waist circumference and cardiometabolic risk factors.", "Avoid using BMI alone as an individual diagnosis."] : ["Interpreter avec le tour de taille et les facteurs de risque cardiometabolique.", "Ne pas utiliser l IMC seul comme diagnostic individuel."],
    });
  }

  if (glucose) {
    trends.push(locale === "en" ? `Blood glucose changed by ${glucose.delta > 0 ? "+" : ""}${glucose.delta}.` : `Evolution de la glycemie: ${glucose.delta > 0 ? "+" : ""}${glucose.delta}.`);
    if (glucose.delta < 0) improvements.push(locale === "en" ? "Blood glucose improved over the period." : "Amelioration de la glycemie sur la periode.");
  }
  if (latestGlucose != null) {
    const high = latestGlucose > 20 ? latestGlucose >= 126 : latestGlucose >= 1.26;
    if (high) {
      risks.push(locale === "en" ? "Latest blood glucose is above the configured vigilance threshold." : "Derniere glycemie au-dessus du seuil de vigilance configure.");
      alerts.push({ alert_type: "high_glucose", severity: "critical", title: locale === "en" ? "High blood glucose" : "Glycemie elevee", message: locale === "en" ? "This value must be interpreted according to the unit, sampling context and professional advice." : "Cette valeur doit etre interpretee selon l'unite, le contexte du prelevement et l'avis d'un professionnel.", metric_value: latestGlucose });
    }
    addInsight(indicatorInsights, {
      indicator: locale === "en" ? "Blood glucose" : "Glycemie",
      latest: value(latestGlucose, latestGlucose > 20 ? " mg/dL" : " g/L", 2),
      status: high ? "urgent" : glucose?.delta && glucose.delta < 0 ? "improving" : "stable",
      publicInterpretation: locale === "en" ? "The latest glucose value helps monitor sugar balance, but timing and unit are essential." : "La derniere glycemie aide a suivre l'equilibre sucre, mais l'heure, le contexte et l'unite sont essentiels.",
      professionalInterpretation: locale === "en" ? `Latest glucose ${latestGlucose}; trend ${glucose ? `${glucose.delta} over ${glucose.days} days` : "not available"}. Interpret with fasting/post-prandial status and treatment.` : `Derniere glycemie ${latestGlucose}; tendance ${glucose ? `${glucose.delta} sur ${glucose.days} jours` : "non disponible"}. Interpreter selon le statut a jeun/post-prandial et le traitement.`,
      recommendation: locale === "en" ? "Repeat/confirm according to clinical context and professional advice." : "Recontroler ou confirmer selon le contexte clinique et l'avis professionnel.",
    });
  }

  if (hba1c?.delta && hba1c.delta < 0) improvements.push(locale === "en" ? `HbA1c decreased by ${Math.abs(hba1c.delta)} point.` : `HbA1c en baisse de ${Math.abs(hba1c.delta)} point.`);
  if (latestHba1c != null) {
    const high = latestHba1c >= 6.5;
    if (high) risks.push(locale === "en" ? "HbA1c is above the configured vigilance threshold." : "HbA1c au-dessus du seuil de vigilance configure.");
    addInsight(indicatorInsights, {
      indicator: "HbA1c",
      latest: value(latestHba1c, " %", 1),
      status: high ? "watch" : hba1c?.delta && hba1c.delta < 0 ? "improving" : "stable",
      publicInterpretation: locale === "en" ? "HbA1c gives an overview of blood sugar balance over several weeks." : "L'HbA1c donne une vision de l'equilibre glycemique sur plusieurs semaines.",
      professionalInterpretation: locale === "en" ? `HbA1c ${latestHba1c}%. Consider diagnostic context, anaemia, renal disease, pregnancy and lab method.` : `HbA1c ${latestHba1c}%. Tenir compte du contexte diagnostique, anemie, maladie renale, grossesse et methode du laboratoire.`,
      recommendation: locale === "en" ? "Review with the care team before any treatment change." : "Faire le point avec l'equipe de soins avant toute modification therapeutique.",
    });
  }

  if (systolic != null || diastolic != null) {
    const high = (systolic || 0) >= 140 || (diastolic || 0) >= 90;
    if (high) risks.push(locale === "en" ? "High blood pressure should be checked again." : "Pression arterielle elevee a recontroler.");
    addInsight(indicatorInsights, {
      indicator: locale === "en" ? "Blood pressure" : "Pression arterielle",
      latest: `${systolic ?? "-"} / ${diastolic ?? "-"} mmHg`,
      status: high ? "watch" : "stable",
      publicInterpretation: locale === "en" ? "This value describes your blood pressure at one moment. Repeated measures are more informative." : "Cette valeur decrit votre tension a un moment donne. Des mesures repetees sont plus informatives.",
      professionalInterpretation: locale === "en" ? "Interpret with measurement conditions, repeated readings, medication, symptoms and cardiovascular risk." : "Interpreter selon les conditions de mesure, mesures repetees, traitement, symptomes et risque cardiovasculaire.",
      recommendation: locale === "en" ? "Repeat seated measurements and seek advice if values remain high or symptoms occur." : "Repeter les mesures au repos et demander avis si les valeurs restent elevees ou s'il existe des symptomes.",
    });
  }

  const calorieValues = food.map(row => number(row.content?.calories)).filter((item): item is number => item != null && item > 0).slice(-7);
  const averageCalories = calorieValues.length ? calorieValues.reduce((sum, item) => sum + item, 0) / calorieValues.length : null;
  if ((latestBmi != null && latestBmi < 18.5) || (averageCalories != null && calorieValues.length >= 3 && averageCalories < 1200)) {
    risks.push(locale === "en" ? "Potential nutritional risk to evaluate with a professional." : "Risque nutritionnel potentiel a evaluer avec un professionnel.");
    alerts.push({ alert_type: "nutrition_risk", severity: "warning", title: locale === "en" ? "Potential nutritional risk" : "Risque nutritionnel potentiel", message: locale === "en" ? "The recent profile requires human review. This alert is not a diagnosis." : "Le profil recent justifie une verification humaine. Cette alerte ne constitue pas un diagnostic.", metric_value: latestBmi ?? averageCalories ?? undefined });
  }
  addInsight(indicatorInsights, {
    indicator: locale === "en" ? "Food diary" : "Journal alimentaire",
    latest: averageCalories ? `${Math.round(averageCalories)} kcal/jour renseignees` : undefined,
    status: food.length >= 3 ? "stable" : "incomplete",
    publicInterpretation: locale === "en" ? food.length >= 3 ? "Your food diary gives an initial view of recent intake." : "A few more diary days will make the analysis more useful." : food.length >= 3 ? "Votre journal alimentaire donne une premiere vision des apports recents." : "Quelques jours de journal en plus rendront l'analyse plus utile.",
    professionalInterpretation: locale === "en" ? "Interpret reported intake with recall quality, portion estimation, disease status, activity and objectives." : "Interpreter les apports declares selon la qualite du rappel, l'estimation des portions, l'etat de sante, l'activite et les objectifs.",
    recommendation: locale === "en" ? "Record several representative days, including one weekend day if possible." : "Renseigner plusieurs jours representatifs, dont un jour de week-end si possible.",
  });

  for (const [category, rows] of [[locale === "en" ? "Anthropometry" : "Anthropometrie", anthropometry], [locale === "en" ? "Biology" : "Biologie", biology]] as const) {
    for (const item of analyzeCustomIndicators(rows, "measured_at")) {
      const normal = item.normalMin !== null || item.normalMax !== null
        ? `${item.normalMin ?? "-"} a ${item.normalMax ?? "-"} ${item.unit}`.trim()
        : locale === "en" ? "not configured" : "non configuree";
      const previous = item.previous === null
        ? locale === "en" ? "No previous value." : "Aucune valeur precedente."
        : locale === "en"
          ? `Previous value: ${item.previous} ${item.unit}; change: ${item.delta! > 0 ? "+" : ""}${item.delta} ${item.unit}.`
          : `Valeur precedente : ${item.previous} ${item.unit}; variation : ${item.delta! > 0 ? "+" : ""}${item.delta} ${item.unit}.`;
      const relation = item.relation === "below"
        ? locale === "en" ? "below the configured range" : "sous la plage configuree"
        : item.relation === "above"
          ? locale === "en" ? "above the configured range" : "au-dessus de la plage configuree"
          : item.relation === "within"
            ? locale === "en" ? "within the configured range" : "dans la plage configuree"
            : locale === "en" ? "without a configured reference range" : "sans plage de reference configuree";
      if (item.delta !== null) trends.push(`${item.name}: ${item.delta > 0 ? "+" : ""}${item.delta} ${item.unit} (${item.trend}).`);
      if (item.relation === "below" || item.relation === "above") risks.push(`${item.name}: ${relation}.`);
      addInsight(indicatorInsights, {
        indicator: `${category} - ${item.name}`,
        latest: `${item.current} ${item.unit}`.trim(),
        status: item.relation === "below" || item.relation === "above" ? "watch" : "stable",
        publicInterpretation: locale === "en"
          ? `The current value is ${item.current} ${item.unit}, ${relation}. ${previous}`
          : `La valeur actuelle est de ${item.current} ${item.unit}, ${relation}. ${previous}`,
        professionalInterpretation: locale === "en"
          ? `Current ${item.current} ${item.unit}; configured range ${normal}; trend ${item.trend}. ${previous} Validate the reference according to age, sex, method and laboratory context.`
          : `Valeur actuelle ${item.current} ${item.unit}; norme configuree ${normal}; tendance ${item.trend}. ${previous} Valider la reference selon l'age, le sexe, la methode et le contexte du laboratoire.`,
        recommendation: item.relation === "below" || item.relation === "above"
          ? locale === "en" ? "Confirm the value and discuss it with a qualified professional." : "Confirmer la valeur et la discuter avec un professionnel qualifie."
          : locale === "en" ? "Continue comparable measurements to strengthen the trend." : "Poursuivre des mesures comparables pour consolider la tendance.",
      });
    }
  }

  const lifestyleRows = dated(lifestyle, "assessment_date");
  const latestLifestyle = lifestyleRows.at(-1);
  const previousLifestyle = lifestyleRows.at(-2);
  const levelLabels = locale === "en"
    ? ["", "Very low", "Low", "Moderate", "Good", "Excellent"]
    : ["", "Tres faible", "Faible", "Moderee", "Bonne", "Excellente"];
  for (const metric of [
    { key: "activity_level", label: locale === "en" ? "Physical activity over 7 days" : "Activite physique sur 7 jours" },
    { key: "diet_level", label: locale === "en" ? "Overall diet over 7 days" : "Alimentation globale sur 7 jours" },
  ]) {
    const current = number(latestLifestyle?.[metric.key]);
    const previous = number(previousLifestyle?.[metric.key]);
    if (current === null) {
      addInsight(indicatorInsights, {
        indicator: metric.label,
        status: "incomplete",
        publicInterpretation: locale === "en" ? "No weekly assessment is available yet." : "Aucune evaluation hebdomadaire n'est encore disponible.",
        professionalInterpretation: locale === "en" ? "No recent self-reported 5-point assessment." : "Aucune auto-evaluation recente sur l'echelle a 5 niveaux.",
        recommendation: locale === "en" ? "Complete the weekly assessment." : "Completer l'evaluation hebdomadaire.",
      });
      continue;
    }
    const delta = previous === null ? null : current - previous;
    if (delta !== null) trends.push(`${metric.label}: ${delta > 0 ? "+" : ""}${delta} point(s) depuis l'evaluation precedente.`);
    if (current <= 2) risks.push(`${metric.label}: niveau ${levelLabels[current].toLowerCase()} a ameliorer.`);
    if (delta !== null && delta > 0) improvements.push(`${metric.label}: progression de ${delta} point(s).`);
    addInsight(indicatorInsights, {
      indicator: metric.label,
      latest: `${levelLabels[current]} (${current}/5)`,
      status: current <= 2 ? "watch" : delta !== null && delta > 0 ? "improving" : "stable",
      publicInterpretation: locale === "en"
        ? `Your current level is ${levelLabels[current]} (${current}/5). ${previous === null ? "This is the first assessment." : `The previous level was ${levelLabels[previous]} (${previous}/5).`}`
        : `Votre niveau actuel est ${levelLabels[current]} (${current}/5). ${previous === null ? "Il s'agit de la premiere evaluation." : `Le niveau precedent etait ${levelLabels[previous]} (${previous}/5).`}`,
      professionalInterpretation: locale === "en"
        ? `Self-reported 7-day score: ${current}/5; previous ${previous ?? "unavailable"}; delta ${delta ?? "unavailable"}. Interpret with functional capacity, symptoms and objectives.`
        : `Score auto-declare sur 7 jours : ${current}/5; precedent ${previous ?? "indisponible"}; variation ${delta ?? "indisponible"}. Interpreter avec les capacites fonctionnelles, les symptomes et les objectifs.`,
      recommendation: current <= 2
        ? locale === "en" ? "Set one realistic weekly improvement goal and seek professional advice when needed." : "Fixer un objectif hebdomadaire realiste d'amelioration et demander conseil si necessaire."
        : locale === "en" ? "Maintain the habits and reassess every week." : "Maintenir les habitudes et reevaluer chaque semaine.",
    });
  }

  const recentLimit = Date.now() - 30 * 86400000;
  const hasRecentAnthro = anthropometry.some(row => +new Date(row.measured_at) >= recentLimit);
  const hasRecentBiology = biology.some(row => +new Date(row.measured_at) >= recentLimit);
  if (!hasRecentAnthro || !hasRecentBiology) alerts.push({ alert_type: "missing_data", severity: "info", title: locale === "en" ? "Data to complete" : "Donnees a completer", message: locale === "en" ? "Add recent measurements to get a more reliable analysis." : "Ajoutez des mesures recentes pour obtenir une analyse plus fiable." });
  if (food.length < 3) recommendations.push(locale === "en" ? "Complete several days of food diary to better assess intake." : "Completer plusieurs jours de journal alimentaire pour mieux evaluer les apports.");
  recommendations.push(locale === "en" ? "Have every alert reviewed by a health professional before changing any treatment or diet." : "Faire valider toute alerte par un professionnel de sante avant de modifier un traitement ou un regime.");

  const urgentCount = alerts.filter(alert => alert.severity === "critical").length;
  const watchCount = risks.length;
  const professionalSummary = weight
    ? locale === "en" ? `A weight change of ${weight.delta} kg is observed over ${weight.days} days${glucose ? `, with a blood glucose change of ${glucose.delta}` : ""}. ${risks.length ? risks.join(" ") : "No major automatic signal was identified."}` : `Une variation ponderale de ${weight.delta} kg est observee sur ${weight.days} jours${glucose ? `, avec une variation glycemique de ${glucose.delta}` : ""}. ${risks.length ? risks.join(" ") : "Aucun signal automatique majeur n'a ete identifie."}`
    : locale === "en" ? `Available data is insufficient to establish a robust weight trend. ${risks.join(" ")}` : `Les donnees disponibles sont insuffisantes pour etablir une tendance ponderale robuste. ${risks.join(" ")}`;
  const publicSummary = weight
    ? locale === "en" ? `Your weight has changed by ${weight.delta} kg over the period. ${improvements.length ? improvements.join(" ") : "Keep recording your measurements regularly."}` : `Votre poids a varie de ${weight.delta} kg sur la periode. ${improvements.length ? improvements.join(" ") : "Continuez a enregistrer vos mesures regulierement."}`
    : locale === "en" ? "Add at least two weight measurements to visualize your progress." : "Ajoutez au moins deux mesures de poids pour visualiser votre evolution.";
  const publicConclusion = urgentCount
    ? locale === "en" ? "One or more important alerts require prompt professional review. Do not change treatment on your own." : "Une ou plusieurs alertes importantes justifient un avis professionnel rapide. Ne modifiez pas un traitement seul."
    : watchCount
      ? locale === "en" ? "Your follow-up is useful and shows points to monitor. Keep documenting your data and ask for advice if the situation persists." : "Votre suivi est utile et montre des points a surveiller. Continuez a documenter vos donnees et demandez avis si la situation persiste."
      : locale === "en" ? "No major automatic alert is detected. Continue regular follow-up to keep the analysis reliable." : "Aucune alerte automatique majeure n'est detectee. Continuez un suivi regulier pour garder une analyse fiable.";
  const professionalConclusion = urgentCount
    ? locale === "en" ? "Clinical triage is recommended because at least one critical automatic signal was generated. Validate units, timing, symptoms and treatment history." : "Un tri clinique est recommande car au moins un signal automatique critique est genere. Valider les unites, le moment de mesure, les symptomes et l'historique therapeutique."
    : locale === "en" ? "Interpret these findings as decision support only. Correlate all indicators with clinical assessment and care objectives." : "Interpreter ces resultats comme une aide a la decision uniquement. Correlater les indicateurs avec l'evaluation clinique et les objectifs de prise en charge.";
  return { professionalSummary, publicSummary, trends, improvements, risks, recommendations, indicatorInsights, publicConclusion, professionalConclusion, aiProvider: "local", alerts };
}
