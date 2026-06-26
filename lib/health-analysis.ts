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

function historyFor(rows: HealthRow[], dateKey: string, valueKey: string, unit = "", digits = 1, secondary?: (row: HealthRow) => string | undefined, locale: "fr" | "en" = "fr") {
  return dated(rows, dateKey)
    .filter(row => number(row[valueKey]) !== null)
    .map(row => ({
      date: dateLabel(row[dateKey], locale),
      value: `${round(Number(row[valueKey]), digits)}${unit}`,
      secondary: secondary?.(row),
    }));
}

function changeText(metric: ReturnType<typeof variation>, unit: string, locale: "fr" | "en", digits = 2) {
  if (!metric) return locale === "en" ? "No comparable previous value is available." : "Aucune valeur precedente comparable n'est disponible.";
  const direction = metric.delta > 0
    ? locale === "en" ? "increase" : "augmentation"
    : metric.delta < 0
      ? locale === "en" ? "decrease" : "diminution"
      : locale === "en" ? "stability" : "stabilite";
  return locale === "en"
    ? `${direction}: ${metric.delta > 0 ? "+" : ""}${round(metric.delta, digits)}${unit} over ${metric.days} days; estimated weekly pace ${round(metric.weekly, digits)}${unit}/week.`
    : `${direction}: ${metric.delta > 0 ? "+" : ""}${round(metric.delta, digits)}${unit} sur ${metric.days} jours; rythme estime ${round(metric.weekly, digits)}${unit}/semaine.`;
}

function relationText(relation: "below" | "within" | "above" | "unknown", locale: "fr" | "en") {
  if (relation === "below") return locale === "en" ? "below the configured reference range" : "sous la plage de reference configuree";
  if (relation === "above") return locale === "en" ? "above the configured reference range" : "au-dessus de la plage de reference configuree";
  if (relation === "within") return locale === "en" ? "within the configured reference range" : "dans la plage de reference configuree";
  return locale === "en" ? "without a configured reference range" : "sans plage de reference configuree";
}

function trendText(trend: string, locale: "fr" | "en") {
  if (trend === "up") return locale === "en" ? "upward trend" : "tendance a la hausse";
  if (trend === "down") return locale === "en" ? "downward trend" : "tendance a la baisse";
  if (trend === "stable") return locale === "en" ? "stable trend" : "tendance stable";
  return locale === "en" ? "first usable value" : "premiere valeur exploitable";
}

export function analyzeHealthData(anthropometry: HealthRow[], biology: HealthRow[], food: HealthRow[], lifestyle: HealthRow[] = [], locale: "fr" | "en" = "fr"): InsightResult {
  const trends: string[] = [], improvements: string[] = [], risks: string[] = [], recommendations: string[] = [], indicatorInsights: IndicatorInsight[] = [];
  const alerts: InsightResult["alerts"] = [];
  const weight = variation(anthropometry, "weight_kg", "measured_at");
  const glucose = variation(biology, "glucose", "measured_at");
  const hba1c = variation(biology, "hba1c", "measured_at");
  const latestAnthropometry = dated(anthropometry, "measured_at").at(-1);
  const latestBiology = dated(biology, "measured_at").at(-1);
  const biologyHistory = dated(biology, "measured_at");
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
    const low = latestGlucose > 20 ? latestGlucose < 70 : latestGlucose < 0.7;
    const glucoseUnit = latestGlucose > 20 ? " mg/dL" : " g/L";
    if (high) {
      risks.push(locale === "en" ? "Latest blood glucose is above the configured vigilance threshold." : "Derniere glycemie au-dessus du seuil de vigilance configure.");
      alerts.push({ alert_type: "high_glucose", severity: "critical", title: locale === "en" ? "High blood glucose" : "Glycemie elevee", message: locale === "en" ? "This value must be interpreted according to the unit, sampling context and professional advice." : "Cette valeur doit etre interpretee selon l'unite, le contexte du prelevement et l'avis d'un professionnel.", metric_value: latestGlucose });
    } else if (low) {
      risks.push(locale === "en" ? "Latest blood glucose is below the usual vigilance threshold." : "Derniere glycemie sous le seuil usuel de vigilance.");
      alerts.push({ alert_type: "low_glucose", severity: "warning", title: locale === "en" ? "Low blood glucose" : "Glycemie basse", message: locale === "en" ? "Low glucose should be interpreted with symptoms, treatment and sampling conditions." : "Une glycemie basse doit etre interpretee avec les symptomes, le traitement et les conditions de prelevement.", metric_value: latestGlucose });
    }
    addInsight(indicatorInsights, {
      indicator: locale === "en" ? "Blood glucose" : "Glycemie",
      latest: value(latestGlucose, glucoseUnit, 2),
      status: high ? "urgent" : low ? "watch" : glucose?.delta && glucose.delta < 0 ? "improving" : "stable",
      publicInterpretation: locale === "en"
        ? `Your latest glucose is ${round(latestGlucose, 2)}${glucoseUnit}. ${high ? "It is above the usual fasting vigilance value and should be reviewed with a professional." : low ? "It is below the usual lower vigilance value and should be checked, especially if symptoms are present." : "It is not automatically flagged by the current thresholds."} ${changeText(glucose, glucoseUnit, locale)} The meaning depends strongly on whether the measure was fasting, after a meal or taken during treatment.`
        : `Votre derniere glycemie est de ${round(latestGlucose, 2)}${glucoseUnit}. ${high ? "Elle est au-dessus du seuil de vigilance usuel a jeun et doit etre discutee avec un professionnel." : low ? "Elle est sous le seuil bas usuel et doit etre verifiee, surtout en cas de symptomes." : "Elle n'est pas automatiquement signalee par les seuils actuels."} ${changeText(glucose, glucoseUnit, locale)} L'interpretation depend fortement du contexte: a jeun, apres repas ou sous traitement.`,
      professionalInterpretation: locale === "en"
        ? `Latest glucose ${round(latestGlucose, 2)}${glucoseUnit}; ${changeText(glucose, glucoseUnit, locale)} Screening interpretation: values around >=126 mg/dL or >=1.26 g/L in a fasting context require clinical confirmation; low values require symptom and treatment review. Interpret with sampling timing, meter/lab method, medications, acute illness and dietary intake.`
        : `Derniere glycemie ${round(latestGlucose, 2)}${glucoseUnit}; ${changeText(glucose, glucoseUnit, locale)} Repere de depistage: une valeur autour de >=126 mg/dL ou >=1,26 g/L dans un contexte a jeun necessite confirmation clinique; une valeur basse doit etre reliee aux symptomes et traitements. Interpreter avec l'heure du prelevement, la methode, les medicaments, la maladie aigue et les apports alimentaires.`,
      recommendation: locale === "en" ? "Document fasting/post-meal status, repeat if needed, and review abnormal values with the care team." : "Documenter le statut a jeun/apres repas, recontroler si besoin et discuter toute valeur anormale avec l'equipe de soins.",
      history: historyFor(biology, "measured_at", "glucose", glucoseUnit, 2, undefined, locale),
      reference: latestGlucose > 20
        ? locale === "en" ? "Context-dependent screening landmarks: fasting usual roughly 70-99 mg/dL; diabetes threshold requires confirmation around >=126 mg/dL." : "Reperes dependants du contexte: a jeun, valeur usuelle environ 70-99 mg/dL; seuil evocateur a confirmer autour de >=126 mg/dL."
        : locale === "en" ? "Context-dependent screening landmarks: fasting usual roughly 0.70-0.99 g/L; diabetes threshold requires confirmation around >=1.26 g/L." : "Reperes dependants du contexte: a jeun, valeur usuelle environ 0,70-0,99 g/L; seuil evocateur a confirmer autour de >=1,26 g/L.",
      changeSummary: changeText(glucose, glucoseUnit, locale),
      missingData: [locale === "en" ? "Fasting or post-meal context" : "Contexte a jeun ou apres repas", locale === "en" ? "Symptoms and current treatment" : "Symptomes et traitement en cours", latestHba1c ? "" : "HbA1c"].filter(Boolean),
      professionalRecommendations: locale === "en"
        ? ["Record sampling context for every glucose value.", "Confirm abnormal values according to local clinical protocol.", "Interpret trends together with HbA1c, treatment, illness and dietary intake."]
        : ["Renseigner le contexte de prelevement pour chaque glycemie.", "Confirmer les valeurs anormales selon le protocole clinique local.", "Interpreter la tendance avec l'HbA1c, le traitement, les maladies et les apports alimentaires."],
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
      publicInterpretation: locale === "en"
        ? `HbA1c is ${round(latestHba1c, 1)}%. It reflects average glucose balance over the previous weeks. ${high ? "This value is in a vigilance zone and deserves professional review." : "It is not automatically flagged by the current threshold."} ${changeText(hba1c, " point(s)", locale, 2)}`
        : `L'HbA1c est de ${round(latestHba1c, 1)} %. Elle reflete l'equilibre glycemique moyen des dernieres semaines. ${high ? "Cette valeur se situe dans une zone de vigilance et merite un avis professionnel." : "Elle n'est pas automatiquement signalee par le seuil actuel."} ${changeText(hba1c, " point(s)", locale, 2)}`,
      professionalInterpretation: locale === "en"
        ? `HbA1c ${round(latestHba1c, 1)}%; ${changeText(hba1c, " point(s)", locale, 2)}. A value >=6.5% is a diagnostic landmark requiring proper clinical/laboratory confirmation. Consider anaemia, haemoglobin variants, renal disease, pregnancy, recent bleeding/transfusion and laboratory method.`
        : `HbA1c ${round(latestHba1c, 1)} %; ${changeText(hba1c, " point(s)", locale, 2)}. Une valeur >=6,5 % est un repere diagnostique qui requiert une confirmation clinique/laboratoire adaptee. Tenir compte de l'anemie, variants d'hemoglobine, maladie renale, grossesse, saignement/transfusion recente et methode du laboratoire.`,
      recommendation: locale === "en" ? "Review with the care team before any treatment change and follow the trend over repeated tests." : "Faire le point avec l'equipe de soins avant toute modification therapeutique et suivre l'evolution sur des controles repetes.",
      history: historyFor(biology, "measured_at", "hba1c", " %", 1, undefined, locale),
      reference: locale === "en" ? "Common screening landmarks: <5.7%; 5.7-6.4% increased risk; >=6.5% requires diagnostic confirmation." : "Reperes courants: <5,7 %; 5,7-6,4 % risque augmente; >=6,5 % a confirmer diagnostiquement.",
      changeSummary: changeText(hba1c, " point(s)", locale, 2),
      missingData: [latestGlucose ? "" : locale === "en" ? "Recent glucose" : "Glycemie recente", locale === "en" ? "Laboratory method and clinical context" : "Methode du laboratoire et contexte clinique"].filter(Boolean),
      professionalRecommendations: locale === "en"
        ? ["Interpret with capillary/venous glucose and clinical context.", "Repeat according to clinical protocol if the value is abnormal.", "Assess treatment adherence, diet, activity and intercurrent illness."]
        : ["Interpreter avec la glycemie capillaire/veineuse et le contexte clinique.", "Repeter selon le protocole clinique si la valeur est anormale.", "Evaluer observance, alimentation, activite et maladie intercurrente."],
    });
  }

  if (systolic != null || diastolic != null) {
    const high = (systolic || 0) >= 140 || (diastolic || 0) >= 90;
    const veryHigh = (systolic || 0) >= 180 || (diastolic || 0) >= 120;
    const pressureRows = biologyHistory.filter(row => number(row.systolic_pressure) !== null || number(row.diastolic_pressure) !== null);
    const previousPressure = pressureRows.at(-2);
    const pressureChange = previousPressure
      ? `${systolic != null && number(previousPressure.systolic_pressure) !== null ? `${systolic - Number(previousPressure.systolic_pressure) > 0 ? "+" : ""}${round(systolic - Number(previousPressure.systolic_pressure), 0)} mmHg systolique` : ""}${diastolic != null && number(previousPressure.diastolic_pressure) !== null ? `; ${diastolic - Number(previousPressure.diastolic_pressure) > 0 ? "+" : ""}${round(diastolic - Number(previousPressure.diastolic_pressure), 0)} mmHg diastolique` : ""}`
      : locale === "en" ? "No previous comparable blood pressure." : "Aucune pression arterielle precedente comparable.";
    if (high) risks.push(locale === "en" ? "High blood pressure should be checked again." : "Pression arterielle elevee a recontroler.");
    if (veryHigh) alerts.push({ alert_type: "very_high_blood_pressure", severity: "critical", title: locale === "en" ? "Very high blood pressure" : "Pression arterielle tres elevee", message: locale === "en" ? "Very high values require prompt clinical review, especially with symptoms." : "Des valeurs tres elevees exigent un avis clinique rapide, surtout en presence de symptomes.", metric_value: systolic ?? diastolic ?? undefined });
    addInsight(indicatorInsights, {
      indicator: locale === "en" ? "Blood pressure" : "Pression arterielle",
      latest: `${systolic ?? "-"} / ${diastolic ?? "-"} mmHg`,
      status: veryHigh ? "urgent" : high ? "watch" : "stable",
      publicInterpretation: locale === "en"
        ? `The latest reading is ${systolic ?? "-"}/${diastolic ?? "-"} mmHg. ${veryHigh ? "This is very high and should be reviewed promptly, especially if symptoms occur." : high ? "It is above the usual vigilance level and should be checked again." : "It is not automatically flagged by the current threshold."} Change compared with the previous available reading: ${pressureChange}.`
        : `La derniere mesure est de ${systolic ?? "-"}/${diastolic ?? "-"} mmHg. ${veryHigh ? "Elle est tres elevee et doit etre evaluee rapidement, surtout en cas de symptomes." : high ? "Elle depasse le niveau usuel de vigilance et doit etre recontrolee." : "Elle n'est pas automatiquement signalee par le seuil actuel."} Evolution par rapport a la mesure precedente disponible : ${pressureChange}.`,
      professionalInterpretation: locale === "en"
        ? `Blood pressure ${systolic ?? "-"}/${diastolic ?? "-"} mmHg; previous change: ${pressureChange}. Interpret with resting conditions, cuff size, repeated readings, medication, symptoms, cardiovascular risk, kidney disease and diabetes status. Persistent values >=140/90 mmHg require structured follow-up; very high values require triage.`
        : `Pression arterielle ${systolic ?? "-"}/${diastolic ?? "-"} mmHg; variation precedente: ${pressureChange}. Interpreter avec repos, brassard adapte, mesures repetees, traitement, symptomes, risque cardiovasculaire, fonction renale et statut diabetique. Des valeurs persistantes >=140/90 mmHg necessitent un suivi structure; des valeurs tres elevees exigent un tri.`,
      recommendation: locale === "en" ? "Repeat seated measurements after rest, document symptoms, and seek advice if values remain high." : "Repeter les mesures assis apres repos, documenter les symptomes et demander avis si les valeurs restent elevees.",
      history: pressureRows.map(row => ({ date: dateLabel(row.measured_at, locale), value: `${row.systolic_pressure ?? "-"} / ${row.diastolic_pressure ?? "-"} mmHg`, secondary: undefined })),
      reference: locale === "en" ? "Common adult vigilance landmark: repeated readings around >=140/90 mmHg; urgent triage for very high values or symptoms." : "Repere adulte courant: mesures repetees autour de >=140/90 mmHg; tri urgent si valeurs tres elevees ou symptomes.",
      changeSummary: pressureChange,
      missingData: [locale === "en" ? "Resting conditions and cuff size" : "Conditions de repos et taille du brassard", locale === "en" ? "Symptoms and treatment" : "Symptomes et traitement"].filter(Boolean),
      professionalRecommendations: locale === "en"
        ? ["Repeat standardized measurements and consider home/ambulatory monitoring if available.", "Assess cardiovascular risk factors and current medication.", "Escalate promptly if very high values or warning symptoms are present."]
        : ["Repeter des mesures standardisees et envisager automesure/MAPA si disponible.", "Evaluer les facteurs de risque cardiovasculaire et le traitement actuel.", "Orienter rapidement si valeurs tres elevees ou symptomes d alerte."],
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
    publicInterpretation: locale === "en"
      ? food.length >= 3
        ? `Your food diary contains ${food.length} entrie(s). The reported average for the recent usable days is about ${averageCalories ? Math.round(averageCalories) : "-"} kcal/day. This is useful to understand the direction of intake, but it does not by itself prove that intake is sufficient or excessive because portions, snacks, drinks and activity level may be incomplete.`
        : `Only ${food.length} food entrie(s) are available. The analysis is therefore limited: a few more complete days are needed to judge regularity, diversity, hydration, ultra-processed foods and alignment with your objective.`
      : food.length >= 3
        ? `Votre journal alimentaire contient ${food.length} entree(s). La moyenne renseignee sur les jours exploitables recents est d'environ ${averageCalories ? Math.round(averageCalories) : "-"} kcal/jour. C'est utile pour comprendre la direction des apports, mais cela ne prouve pas a lui seul que les apports sont suffisants ou excessifs car portions, collations, boissons et niveau d'activite peuvent etre incomplets.`
        : `Seulement ${food.length} entree(s) alimentaire(s) sont disponibles. L'analyse reste donc limitee: quelques jours complets supplementaires sont necessaires pour juger la regularite, la diversite, l'hydratation, les aliments ultra-transformes et l'adequation a votre objectif.`,
    professionalInterpretation: locale === "en"
      ? `Reported intake must be interpreted as self-reported data. Recent usable energy average: ${averageCalories ? Math.round(averageCalories) : "unavailable"} kcal/day; number of entries: ${food.length}; calorie-bearing days: ${calorieValues.length}. Assess recall quality, portion estimation, macro/micronutrient density, protein intake, hydration, disease state, medication, activity and weight objective before concluding.`
      : `Les apports declares doivent etre interpretes comme des donnees auto-rapportees. Moyenne energetique recente exploitable: ${averageCalories ? Math.round(averageCalories) : "indisponible"} kcal/jour; nombre d'entrees: ${food.length}; jours avec calories exploitables: ${calorieValues.length}. Evaluer qualite du rappel, estimation des portions, densite macro/micronutritionnelle, apports proteiques, hydratation, etat pathologique, traitement, activite et objectif ponderal avant conclusion.`,
    recommendation: locale === "en" ? "Record several representative days with meals, snacks, drinks, portion sizes and context." : "Renseigner plusieurs jours representatifs avec repas, collations, boissons, portions et contexte.",
    history: food.slice(-7).map(row => ({
      date: dateLabel(row.logged_at || row.created_at || row.measured_at, locale),
      value: row.content?.calories ? `${Math.round(Number(row.content.calories))} kcal` : locale === "en" ? "calories not entered" : "calories non renseignees",
      secondary: row.content?.meal_type || row.content?.notes || undefined,
    })),
    reference: locale === "en" ? "Energy needs are individual; interpretation requires age, sex, body size, objective, health status and activity level." : "Les besoins energetiques sont individuels; l'interpretation exige age, sexe, corpulence, objectif, etat de sante et niveau d'activite.",
    changeSummary: averageCalories ? `${Math.round(averageCalories)} kcal/jour sur ${calorieValues.length} jour(s) exploitables recents.` : undefined,
    missingData: [
      food.length >= 3 ? "" : locale === "en" ? "At least three representative days" : "Au moins trois jours representatifs",
      locale === "en" ? "Portion size precision" : "Precision des portions",
      locale === "en" ? "Protein, fibre, hydration and food diversity" : "Proteines, fibres, hydratation et diversite alimentaire",
    ].filter(Boolean),
    professionalRecommendations: locale === "en"
      ? ["Complete a multi-day dietary record including one weekend day.", "Compare reported intake with weight trend, activity level and clinical objectives.", "Assess protein adequacy, fibre intake, hydration and ultra-processed food frequency."]
      : ["Completer un releve alimentaire sur plusieurs jours incluant un jour de week-end.", "Comparer les apports declares a la tendance ponderale, l'activite et les objectifs cliniques.", "Evaluer adequation proteique, fibres, hydratation et frequence des aliments ultra-transformes."],
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
          ? `The current value for ${item.name} is ${item.current} ${item.unit}, ${relationText(item.relation, locale)}. ${previous} This indicator has been added to the follow-up, so its interpretation depends on the reference range entered, the measurement method and the reason it is being monitored.`
          : `La valeur actuelle de ${item.name} est de ${item.current} ${item.unit}, ${relationText(item.relation, locale)}. ${previous} Cet indicateur a ete ajoute au suivi; son interpretation depend donc de la plage renseignee, de la methode de mesure et de la raison de surveillance.`,
        professionalInterpretation: locale === "en"
          ? `Current ${item.current} ${item.unit}; configured reference ${normal}; ${trendText(item.trend, locale)}. ${previous} Clinical interpretation requires validation of the reference interval according to age, sex, physiological state, analytical method, laboratory/measurement context and the user's objective.`
          : `Valeur actuelle ${item.current} ${item.unit}; reference configuree ${normal}; ${trendText(item.trend, locale)}. ${previous} L'interpretation clinique exige de valider l'intervalle de reference selon l'age, le sexe, l'etat physiologique, la methode analytique, le contexte laboratoire/mesure et l'objectif de l'utilisateur.`,
        recommendation: item.relation === "below" || item.relation === "above"
          ? locale === "en" ? "Confirm the value and discuss it with a qualified professional." : "Confirmer la valeur et la discuter avec un professionnel qualifie."
          : locale === "en" ? "Continue comparable measurements to strengthen the trend." : "Poursuivre des mesures comparables pour consolider la tendance.",
        reference: normal,
        changeSummary: item.delta === null
          ? locale === "en" ? "First usable value for this custom indicator." : "Premiere valeur exploitable pour cet indicateur personnalise."
          : `${item.previous} -> ${item.current} ${item.unit} (${item.delta > 0 ? "+" : ""}${item.delta} ${item.unit}; ${trendText(item.trend, locale)}).`,
        missingData: [
          item.normalMin !== null || item.normalMax !== null ? "" : locale === "en" ? "Validated reference range" : "Plage de reference validee",
          locale === "en" ? "Measurement method and clinical reason for monitoring" : "Methode de mesure et motif clinique du suivi",
        ].filter(Boolean),
        professionalRecommendations: item.relation === "below" || item.relation === "above"
          ? (locale === "en"
            ? ["Verify unit and measurement method.", "Confirm the result when clinically relevant.", "Interpret with symptoms, treatment and related indicators."]
            : ["Verifier l'unite et la methode de mesure.", "Confirmer le resultat si pertinent cliniquement.", "Interpreter avec les symptomes, traitements et indicateurs associes."])
          : (locale === "en"
            ? ["Keep the same measurement method for trend reliability.", "Review the configured reference periodically."]
            : ["Conserver la meme methode de mesure pour fiabiliser la tendance.", "Revoir periodiquement la reference configuree."]),
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
        ? `Your current level is ${levelLabels[current]} (${current}/5). ${previous === null ? "This is the first assessment." : `The previous level was ${levelLabels[previous]} (${previous}/5), so the change is ${delta! > 0 ? "+" : ""}${delta} point(s).`} ${metric.key === "activity_level" ? "For physical activity, one session means a planned activity of at least 30 minutes at moderate to high intensity." : "For diet, this scale summarizes diversity, fruit/vegetable intake, hydration, meal regularity and ultra-processed food frequency."}`
        : `Votre niveau actuel est ${levelLabels[current]} (${current}/5). ${previous === null ? "Il s'agit de la premiere evaluation." : `Le niveau precedent etait ${levelLabels[previous]} (${previous}/5), soit une variation de ${delta! > 0 ? "+" : ""}${delta} point(s).`} ${metric.key === "activity_level" ? "Pour l'activite physique, une seance correspond a une activite planifiee d'au moins 30 minutes d'intensite moderee a elevee." : "Pour l'alimentation, cette echelle resume diversite, fruits et legumes, hydratation, regularite des repas et frequence des aliments ultra-transformes."}`,
      professionalInterpretation: locale === "en"
        ? `Self-reported 7-day score: ${current}/5 (${levelLabels[current]}); previous ${previous ?? "unavailable"}; delta ${delta ?? "unavailable"}. Interpret with functional capacity, symptoms, disease status, weight trajectory, dietary intake, psychosocial constraints and negotiated objectives.`
        : `Score auto-declare sur 7 jours : ${current}/5 (${levelLabels[current]}); precedent ${previous ?? "indisponible"}; variation ${delta ?? "indisponible"}. Interpreter avec capacites fonctionnelles, symptomes, etat de sante, trajectoire ponderale, apports alimentaires, contraintes psychosociales et objectifs negocies.`,
      recommendation: current <= 2
        ? locale === "en" ? "Set one realistic weekly improvement goal and seek professional advice when needed." : "Fixer un objectif hebdomadaire realiste d'amelioration et demander conseil si necessaire."
        : locale === "en" ? "Maintain the habits and reassess every week." : "Maintenir les habitudes et reevaluer chaque semaine.",
      history: lifestyleRows.filter(row => number(row[metric.key]) !== null).map(row => {
        const score = Number(row[metric.key]);
        return { date: dateLabel(row.assessment_date, locale), value: `${levelLabels[score]} (${score}/5)`, secondary: undefined };
      }),
      reference: locale === "en" ? "Five-level self-assessment: very low, low, moderate, good, excellent." : "Auto-evaluation a cinq niveaux : tres faible, faible, moderee, bonne, excellente.",
      changeSummary: delta === null ? locale === "en" ? "First available weekly assessment." : "Premiere evaluation hebdomadaire disponible." : `${delta > 0 ? "+" : ""}${delta} point(s).`,
      missingData: [locale === "en" ? "Objective details behind the score" : "Details objectifs derriere le score", metric.key === "activity_level" ? locale === "en" ? "Number, duration and intensity of sessions" : "Nombre, duree et intensite des seances" : locale === "en" ? "Food groups, portions and hydration details" : "Groupes alimentaires, portions et hydratation"].filter(Boolean),
      professionalRecommendations: metric.key === "activity_level"
        ? (locale === "en"
          ? ["Translate the score into weekly sessions, duration, intensity and contraindications.", "Set a progressive goal compatible with symptoms and cardiometabolic risk."]
          : ["Traduire le score en seances hebdomadaires, duree, intensite et contre-indications.", "Definir un objectif progressif compatible avec symptomes et risque cardiometabolique."])
        : (locale === "en"
          ? ["Detail fruit/vegetable portions, food-group diversity, hydration and ultra-processed food frequency.", "Compare diet level with weight, glucose and blood pressure trends."]
          : ["Detailer portions de fruits/legumes, diversite des groupes, hydratation et frequence des aliments ultra-transformes.", "Comparer le niveau alimentaire aux tendances poids, glycemie et tension."]),
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
  const completedIndicators = indicatorInsights.filter(item => item.status !== "incomplete").length;
  const incompleteIndicators = indicatorInsights.filter(item => item.status === "incomplete").map(item => item.indicator);
  const globalContext = locale === "en"
    ? `The interpretation covers ${completedIndicators} usable indicator(s) and ${incompleteIndicators.length} incomplete indicator(s). The main automatic signals are: ${risks.length ? risks.join(" ") : "none detected by the configured thresholds."}`
    : `L'interpretation couvre ${completedIndicators} indicateur(s) exploitable(s) et ${incompleteIndicators.length} indicateur(s) incomplet(s). Les principaux signaux automatiques sont : ${risks.length ? risks.join(" ") : "aucun signal detecte par les seuils configures."}`;
  const professionalSummary = weight
    ? locale === "en"
      ? `A weight change of ${weight.delta} kg is observed over ${weight.days} days (${round(weight.delta / weight.first * 100, 1)}% of initial weight), with an estimated weekly pace of ${weight.weekly} kg/week${glucose ? ` and a blood glucose change of ${glucose.delta}` : ""}. ${globalContext} The interpretation must integrate anthropometry, cardiometabolic markers, reported diet, physical activity and measurement quality before any clinical decision.`
      : `Une variation ponderale de ${weight.delta} kg est observee sur ${weight.days} jours (${round(weight.delta / weight.first * 100, 1)} % du poids initial), avec un rythme estime a ${weight.weekly} kg/semaine${glucose ? ` et une variation glycemique de ${glucose.delta}` : ""}. ${globalContext} L'interpretation doit integrer anthropometrie, marqueurs cardiometaboliques, alimentation declaree, activite physique et qualite des mesures avant toute decision clinique.`
    : locale === "en"
      ? `Available data is insufficient to establish a robust weight trend. ${globalContext} Prioritize recent anthropometry and key clinical context before interpreting isolated values.`
      : `Les donnees disponibles sont insuffisantes pour etablir une tendance ponderale robuste. ${globalContext} Prioriser des mesures anthropometriques recentes et le contexte clinique avant d'interpreter des valeurs isolees.`;
  const publicSummary = weight
    ? locale === "en"
      ? `Your weight changed by ${weight.delta} kg over the period. ${improvements.length ? improvements.join(" ") : "Keep recording your measurements regularly."} The rest of the analysis looks at glucose/HbA1c, blood pressure, diet and lifestyle so the conclusion is not based on weight alone.`
      : `Votre poids a varie de ${weight.delta} kg sur la periode. ${improvements.length ? improvements.join(" ") : "Continuez a enregistrer vos mesures regulierement."} Le reste de l'analyse regarde aussi glycemie/HbA1c, tension, alimentation et mode de vie afin que la conclusion ne repose pas uniquement sur le poids.`
    : locale === "en"
      ? "Add at least two weight measurements to visualize progress. Other available indicators are still interpreted, but the global conclusion remains limited without a weight trend."
      : "Ajoutez au moins deux mesures de poids pour visualiser votre evolution. Les autres indicateurs disponibles sont interpretes, mais la conclusion globale reste limitee sans tendance ponderale.";
  const publicConclusion = urgentCount
    ? locale === "en" ? "One or more important alerts require prompt professional review. Do not change treatment on your own. Keep the measurements, note symptoms and context, and share the full report with a qualified professional." : "Une ou plusieurs alertes importantes justifient un avis professionnel rapide. Ne modifiez pas un traitement seul. Conservez les mesures, notez les symptomes et le contexte, puis partagez le rapport complet avec un professionnel qualifie."
    : watchCount
      ? locale === "en" ? "Your follow-up is useful and shows points to monitor. The priority is to keep recording comparable data, strengthen diet and activity information, and ask for advice if the abnormal points persist or symptoms appear." : "Votre suivi est utile et montre des points a surveiller. La priorite est de continuer des mesures comparables, renforcer les informations alimentation/activite et demander avis si les points anormaux persistent ou si des symptomes apparaissent."
      : locale === "en" ? "No major automatic alert is detected. Continue regular follow-up, because the value of this analysis improves when each indicator is tracked over time and interpreted together." : "Aucune alerte automatique majeure n'est detectee. Continuez un suivi regulier, car la valeur de cette analyse augmente lorsque chaque indicateur est suivi dans le temps et interprete avec les autres.";
  const professionalConclusion = urgentCount
    ? locale === "en" ? "Clinical triage is recommended because at least one critical automatic signal was generated. Validate units, measurement timing, symptoms, treatment history and pre-analytical conditions. Prioritize confirmation of abnormal indicators, assessment of cardiometabolic risk and individualized nutrition/physical activity planning." : "Un tri clinique est recommande car au moins un signal automatique critique est genere. Valider les unites, le moment de mesure, les symptomes, l'historique therapeutique et les conditions pre-analytiques. Prioriser la confirmation des indicateurs anormaux, l'evaluation du risque cardiometabolique et la planification nutritionnelle/activite physique individualisee."
    : locale === "en" ? "Interpret these findings as decision support only. Correlate all indicators with clinical assessment, objectives, medication, comorbidities, measurement quality and follow-up feasibility. The report should guide prioritization rather than replace professional judgement." : "Interpreter ces resultats comme une aide a la decision uniquement. Correlater tous les indicateurs avec l'evaluation clinique, les objectifs, traitements, comorbidites, qualite des mesures et faisabilite du suivi. Le rapport doit aider a prioriser sans remplacer le jugement professionnel.";
  return { professionalSummary, publicSummary, trends, improvements, risks, recommendations, indicatorInsights, publicConclusion, professionalConclusion, aiProvider: "local", alerts };
}
