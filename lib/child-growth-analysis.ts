import { analyzeCustomIndicators } from "@/lib/tracking-indicators";

export type GrowthRow = Record<string, any>;
export type GrowthAlert = { alert_type: string; severity: "info" | "warning" | "critical"; title: string; message: string };
export type ParentAdvice = { category: string; title: string; text: string };
export type GrowthIndicatorInsight = {
  indicator: string;
  latest?: string;
  status: "usual" | "watch" | "urgent" | "incomplete";
  parentInterpretation: string;
  professionalInterpretation: string;
  recommendation: string;
  history?: Array<{ date: string; value: string; secondary?: string }>;
  reference?: string;
  changeSummary?: string;
  benefits?: string[];
  missingData?: string[];
  professionalRecommendations?: string[];
  presentation?: string;
  currentSituation?: string;
  whoComparison?: string;
  previousComparison?: string;
  firstComparison?: string;
  peakAnalysis?: string;
  statistics?: {
    count: number;
    minimum?: number;
    maximum?: number;
    mean?: number;
    standardDeviation?: number;
    averageChange?: number;
    trend?: string;
  };
  correlationNotes?: string[];
  clinicalInterpretation?: string;
  projections?: { month1: string; month3: string; month6: string; month12: string };
  prioritizedRecommendations?: string[];
  confidence?: { score: number; explanation: string };
};
export type ChildGrowthAnalysis = {
  summary: string;
  professionalSummary: string;
  positives: string[];
  attentionPoints: string[];
  practicalAdvice: string[];
  parentAdvice: ParentAdvice[];
  indicatorInsights: GrowthIndicatorInsight[];
  parentConclusion: string;
  professionalConclusion: string;
  consultationRecommended: boolean;
  alerts: GrowthAlert[];
  globalScore?: number;
  scoreColor?: "green" | "orange" | "red";
  domainScores?: Record<string, number | null>;
  whoCurveAnalysis?: string[];
  growthStory?: string;
  influencingFactors?: Array<{ factor: string; analysis: string; status: "documented" | "missing" | "attention" }>;
  developmentAnalysis?: Array<{ domain: string; analysis: string; status: "documented" | "missing" | "attention" }>;
  actionPlan?: {
    days7: string[];
    days30: string[];
    days90: string[];
    days180: string[];
    daily: string[];
    weekly: string[];
    monthly: string[];
  };
  limitations?: string[];
  aiVersion?: string;
};

const number = (value: any) => value === null || value === undefined || value === "" ? null : Number(value);
const days = (a: any, b: any) => (+new Date(b) - +new Date(a)) / 86400000;
const fmt = (value: any, unit = "", digits = 1) => number(value) === null ? undefined : `${Number(value).toFixed(digits)}${unit}`;

function zStatus(value: number | null) {
  if (value === null) return "incomplete" as const;
  if (value < -3 || value > 3) return "urgent" as const;
  if (value < -2 || value > 2) return "watch" as const;
  return "usual" as const;
}

function addInsight(items: GrowthIndicatorInsight[], item: GrowthIndicatorInsight) {
  items.push(item);
}

function dateLabel(value: any) {
  const date = new Date(value);
  return Number.isNaN(+date) ? "" : date.toLocaleDateString("fr-FR");
}

function indicatorHistory(rows: GrowthRow[], key: string, unit = "", digits = 1, secondaryKey?: string, secondaryUnit = "") {
  return rows
    .filter(row => number(row[key]) !== null)
    .slice(-8)
    .map(row => ({
      date: dateLabel(row.measured_at),
      value: `${Number(row[key]).toFixed(digits)}${unit}`,
      ...(secondaryKey && number(row[secondaryKey]) !== null ? { secondary: `${Number(row[secondaryKey]).toFixed(secondaryUnit === " z" ? 2 : 1)}${secondaryUnit}` } : {}),
    }));
}

function changeSummary(rows: GrowthRow[], key: string, label: string, unit = "", digits = 1) {
  const valid = rows.filter(row => number(row[key]) !== null);
  if (valid.length < 2) return `La tendance de ${label} necessite au moins deux mesures comparables.`;
  const first = valid[0], previous = valid.at(-2)!, latest = valid.at(-1)!;
  const current = Number(latest[key]);
  const before = Number(previous[key]);
  const initial = Number(first[key]);
  const deltaPrevious = current - before;
  const deltaInitial = current - initial;
  const elapsedPrevious = Math.max(1, days(previous.measured_at, latest.measured_at));
  const elapsedInitial = Math.max(1, days(first.measured_at, latest.measured_at));
  return `${label}: variation de ${deltaPrevious >= 0 ? "+" : ""}${deltaPrevious.toFixed(digits)}${unit} depuis la mesure precedente (${elapsedPrevious.toFixed(0)} jours) et de ${deltaInitial >= 0 ? "+" : ""}${deltaInitial.toFixed(digits)}${unit} depuis le debut du suivi (${elapsedInitial.toFixed(0)} jours).`;
}

function zReference(name: string) {
  return `${name}: reference OMS attendue entre -2 z et +2 z; vigilance sous -2 z ou au-dessus de +2 z; situation severe sous -3 z ou au-dessus de +3 z.`;
}

function zParentText(name: string, value: number | null, base: string) {
  if (value === null) return `${name}: donnee non encore renseignee ou reference non calculee.`;
  const zone = value < -3 || value > 3 ? "tres en dehors de la zone attendue" : value < -2 || value > 2 ? "en dehors de la zone habituelle" : "dans la zone habituelle";
  return `${base} La valeur actuelle est ${value.toFixed(2)} z-score, ce qui la place ${zone} par rapport aux references OMS. Cette information doit etre lue avec la qualite de la mesure, l'age, le sexe, l'appetit, les maladies recentes et les autres indicateurs.`;
}

function zProfessionalText(name: string, value: number | null, pro: string) {
  if (value === null) return `${name}: donnee absente ou z-score non calcule; interpretation limitee sans reference OMS complete.`;
  const classification = value < -3 || value > 3 ? "zone severe" : value < -2 || value > 2 ? "zone de vigilance" : "zone usuelle";
  return `${pro} Valeur actuelle ${value.toFixed(2)} z, classification automatique: ${classification}. Confirmer avec references OMS, sexe, age exact, qualite de mesure, oedemes, contexte infectieux et trajectoire longitudinale.`;
}

export function analyzeChildGrowth(child: GrowthRow, source: GrowthRow[]): ChildGrowthAnalysis {
  const rows = [...source].sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at));
  const latest = rows.at(-1), previous = rows.at(-2);
  const alerts: GrowthAlert[] = [], positives: string[] = [], attentionPoints: string[] = [], practicalAdvice: string[] = [], parentAdvice: ParentAdvice[] = [], indicatorInsights: GrowthIndicatorInsight[] = [];
  if (!latest) return {
    summary: "Aucune mesure n est encore disponible.",
    professionalSummary: "Aucune donnee anthropometrique exploitable pour cette session.",
    positives,
    attentionPoints: ["Ajoutez une premiere mesure pour commencer le suivi."],
    practicalAdvice: ["Mesurez le poids et la taille dans des conditions comparables."],
    parentAdvice: baseAdvice(child, 0, []),
    indicatorInsights: [{
      indicator: "Donnees de croissance",
      status: "incomplete",
      parentInterpretation: "Aucune mesure n'est encore disponible pour decrire la croissance.",
      professionalInterpretation: "Aucune mesure exploitable. Interpretation impossible sans donnees datees.",
      recommendation: "Ajouter poids, taille/longueur et date de mesure.",
    }],
    parentConclusion: "Ajoutez une premiere mesure pour obtenir une analyse.",
    professionalConclusion: "Aucune conclusion clinique automatisee ne peut etre proposee sans mesure.",
    consultationRecommended: false,
    alerts: [{ alert_type: "missing_data", severity: "info", title: "Donnees a completer", message: "Aucune mesure de croissance n est disponible." }],
  };

  const age = number(latest.age_months) ?? Math.max(0, days(child.birth_date, latest.measured_at) / 30.4375);
  const weight = number(latest.weight_kg), height = number(latest.height_cm), bmi = number(latest.bmi), muac = number(latest.muac_cm), head = number(latest.head_circumference_cm);
  const wfa = number(latest.weight_for_age_z), hfa = number(latest.height_for_age_z), wfh = number(latest.weight_for_height_z), bmifa = number(latest.bmi_for_age_z), hcfa = number(latest.head_circumference_for_age_z);

  if (previous && weight !== null && number(previous.weight_kg) !== null) {
    const change = weight - Number(previous.weight_kg), elapsed = days(previous.measured_at, latest.measured_at);
    if (change < -.05) {
      alerts.push({ alert_type: "weight_loss", severity: "critical", title: "Perte de poids", message: `Le poids a diminue de ${Math.abs(change).toFixed(2)} kg depuis la mesure precedente.` });
      attentionPoints.push("Une perte de poids a ete observee.");
    } else if (elapsed >= 30 && Math.abs(change) < .1) {
      alerts.push({ alert_type: "weight_stagnation", severity: "warning", title: "Stagnation ponderale", message: "Le poids a peu evolue depuis au moins un mois." });
      attentionPoints.push("Le poids semble stagner.");
    } else if (change > 0) positives.push("Le poids progresse depuis la mesure precedente.");
    addInsight(indicatorInsights, {
      indicator: "Poids",
      latest: fmt(weight, " kg"),
      status: change < -.05 ? "urgent" : elapsed >= 30 && Math.abs(change) < .1 ? "watch" : "usual",
      parentInterpretation: `Le poids actuel est compare a la mesure precedente: il a change de ${change.toFixed(2)} kg en ${Math.max(1, elapsed).toFixed(0)} jours. Cette tendance est encourageante si elle accompagne une bonne alimentation, un bon appetit et l'absence de maladie; elle devient preoccupante en cas de perte, d'appetit faible, de diarrhee, de fievre ou d'oedemes.`,
      professionalInterpretation: `Variation ponderale ${change.toFixed(2)} kg sur ${Math.max(1, elapsed).toFixed(0)} jours. Interpreter selon age exact, reference poids-pour-age/poids-pour-taille, maladie recente, oedemes, apports alimentaires, hydratation et qualite de mesure.`,
      recommendation: "Repeter les mesures avec le meme materiel et surveiller l'appetit.",
      history: indicatorHistory(rows, "weight_kg", " kg", 1, "bmi", ""),
      reference: "Le poids brut doit toujours etre interprete avec l'age, la taille/longueur, le sexe et les references OMS; il ne suffit pas seul pour classer l'etat nutritionnel.",
      changeSummary: changeSummary(rows, "weight_kg", "Poids", " kg", 2),
      benefits: change >= 0 ? ["Une progression ponderale reguliere peut traduire de meilleurs apports et une recuperation apres maladie.", "La tendance est plus fiable lorsqu'elle est confirmee par plusieurs mesures comparables."] : [],
      missingData: [wfa === null ? "Poids-pour-age z-score" : "", wfh === null ? "Poids-pour-taille z-score" : "", latest.edema === undefined ? "Verification des oedemes" : ""].filter(Boolean),
      professionalRecommendations: ["Verifier la technique de pesee et la calibration de la balance.", "Interpreter la variation ponderale avec WFA, WFH/BMIFA, MUAC, oedemes et contexte clinique.", "Rechercher infection, anorexie, diarrhee ou changement d'alimentation en cas de perte ou stagnation."],
    });
  } else {
    addInsight(indicatorInsights, {
      indicator: "Poids",
      latest: fmt(weight, " kg"),
      status: weight === null ? "incomplete" : "usual",
      parentInterpretation: weight === null ? "Le poids n'est pas encore renseigne." : "Une premiere valeur de poids est disponible. Elle sert de point de depart; une nouvelle mesure permettra de savoir si l'enfant prend, perd ou stabilise son poids.",
      professionalInterpretation: "La tendance ponderale exige au moins deux mesures datees. Interpreter la valeur ponctuelle avec age, sexe, taille, MUAC, oedemes et z-scores disponibles.",
      recommendation: "Ajouter une nouvelle mesure lors du prochain suivi.",
      history: indicatorHistory(rows, "weight_kg", " kg", 1, "bmi", ""),
      reference: "Poids a interpreter avec age, sexe, taille/longueur et references OMS.",
      changeSummary: changeSummary(rows, "weight_kg", "Poids", " kg", 2),
      missingData: weight === null ? ["Poids actuel", "Mesure precedente"] : ["Mesure precedente comparable"],
      professionalRecommendations: ["Programmer une mesure de controle avec le meme equipement.", "Completer WFA, WFH/BMIFA, MUAC et oedemes pour classer le risque."],
    });
  }

  const growthIndicators = [
    { key: "Taille / longueur", value: height, rawKey: "height_cm", unit: " cm", z: hfa, parent: "La taille aide a suivre la croissance lineaire.", pro: "Taille-pour-age utile pour depister retard de croissance ou mesure atypique.", reference: zReference("Taille-pour-age"), missing: ["Age exact", "Sexe", "Technique de mesure couche/debout"] },
    { key: "Poids-pour-age", value: wfa, rawKey: "weight_for_age_z", unit: " z", z: wfa, parent: "Cet indicateur compare le poids a l'age de l'enfant.", pro: "WFA reflete une situation composite et doit etre interprete avec taille-pour-age et poids-pour-taille.", reference: zReference("Poids-pour-age"), missing: ["Taille/longueur", "Oedemes", "Contexte infectieux"] },
    { key: "Taille-pour-age", value: hfa, rawKey: "height_for_age_z", unit: " z", z: hfa, parent: "Cet indicateur aide a reperer un retard de croissance dans le temps.", pro: "HFA sous -2 z suggere un risque de retard de croissance; sous -3 z, signal severe.", reference: zReference("Taille-pour-age"), missing: ["Historique alimentaire", "Morbidite chronique", "Qualite de la mesure"] },
    { key: "Poids-pour-taille", value: wfh, rawKey: "weight_for_height_z", unit: " z", z: wfh, parent: "Cet indicateur aide a reperer un amaigrissement ou un exces de poids par rapport a la taille.", pro: "WFH est central pour l'evaluation de malnutrition aigue ou surpoids selon age/taille.", reference: zReference("Poids-pour-taille"), missing: ["Oedemes", "Appetit", "Maladie recente"] },
    { key: "IMC-pour-age", value: bmifa ?? bmi, rawKey: bmifa === null && bmi !== null ? "bmi" : "bmi_for_age_z", unit: bmifa === null && bmi !== null ? "" : " z", z: bmifa, parent: "L'IMC complete l'analyse du poids et de la taille.", pro: "BMI-for-age doit etre interprete selon references OMS, sexe et age.", reference: zReference("IMC-pour-age"), missing: ["Reference BMI-for-age", "Taille actuelle", "Poids actuel"] },
    { key: "Perimetre cranien", value: hcfa ?? head, rawKey: hcfa === null && head !== null ? "head_circumference_cm" : "head_circumference_for_age_z", unit: hcfa === null && head !== null ? " cm" : " z", z: hcfa, parent: "Le perimetre cranien aide a suivre la croissance de la tete chez le jeune enfant.", pro: "HCFA exige prudence technique; verifier position du ruban et contexte neurologique.", reference: zReference("Perimetre cranien-pour-age"), missing: ["Age exact", "Technique du ruban", "Examen neurologique si anomalie"] },
  ];

  for (const item of growthIndicators) {
    const status = zStatus(item.z);
    if (status === "watch" || status === "urgent") attentionPoints.push(`${item.key} en dehors de la zone usuelle.`);
    addInsight(indicatorInsights, {
      indicator: item.key,
      latest: fmt(item.value, item.unit, item.unit === " z" ? 2 : 1),
      status,
      parentInterpretation: item.unit === " z" ? zParentText(item.key, item.z, item.parent) : item.value === null ? `${item.key}: donnee non encore renseignee.` : `${item.parent} Valeur actuelle: ${Number(item.value).toFixed(1)}${item.unit}. La tendance doit etre comparee aux mesures precedentes et aux references OMS adaptees a l'age et au sexe.`,
      professionalInterpretation: item.unit === " z" ? zProfessionalText(item.key, item.z, item.pro) : item.value === null ? `${item.key}: donnee absente ou reference non calculee.` : `${item.pro} Valeur actuelle: ${Number(item.value).toFixed(1)}${item.unit}. Completer par le z-score correspondant et verifier la technique de mesure.`,
      recommendation: status === "urgent" ? "Avis professionnel rapide recommande." : status === "watch" ? "Recontroler et suivre de pres." : "Poursuivre le suivi regulier.",
      history: indicatorHistory(rows, item.rawKey, item.unit, item.unit === " z" ? 2 : 1),
      reference: item.reference,
      changeSummary: changeSummary(rows, item.rawKey, item.key, item.unit, item.unit === " z" ? 2 : 1),
      benefits: status === "usual" ? ["Une valeur dans la zone usuelle est rassurante lorsqu'elle reste coherente avec les autres indicateurs et l'etat clinique.", "La surveillance reguliere permet de detecter plus tot une cassure de courbe."] : [],
      missingData: item.value === null ? item.missing : item.missing.filter(key => {
        if (key.includes("Oedemes")) return latest.edema === undefined;
        if (key.includes("Appetit")) return !latest.appetite;
        if (key.includes("Maladie")) return !latest.recent_illnesses;
        return false;
      }),
      professionalRecommendations: ["Verifier la qualite de mesure et l'identite des references utilisees.", "Interpreter l'indicateur avec les autres z-scores, MUAC, oedemes, appetit et morbidite recente.", "Planifier un controle rapproche si la valeur quitte la zone -2 z a +2 z ou si la trajectoire se casse."],
    });
  }

  if (hfa !== null && hfa < -2) alerts.push({ alert_type: "stunting_risk", severity: hfa < -3 ? "critical" : "warning", title: "Risque de retard de croissance", message: "La taille-pour-age est sous le seuil de vigilance OMS." });
  if (latest.edema || (wfh !== null && wfh < -2)) {
    alerts.push({ alert_type: "acute_malnutrition_risk", severity: "critical", title: "Risque de malnutrition aigue", message: latest.edema ? "Des oedemes nutritionnels ont ete signales." : "Le poids-pour-taille est sous le seuil de vigilance OMS." });
    attentionPoints.push("Un risque de malnutrition aigue doit etre evalue rapidement.");
  }
  if (age >= 6 && age <= 59 && muac !== null && muac < 12.5) {
    alerts.push({ alert_type: "low_muac", severity: muac < 11.5 ? "critical" : "warning", title: "PB / MUAC bas", message: `Le PB/MUAC mesure ${muac.toFixed(1)} cm.` });
    attentionPoints.push("Le perimetre brachial est bas pour la tranche d age.");
  }
  addInsight(indicatorInsights, {
    indicator: "PB / MUAC",
    latest: fmt(muac, " cm"),
    status: age >= 6 && age <= 59 && muac !== null && muac < 11.5 ? "urgent" : age >= 6 && age <= 59 && muac !== null && muac < 12.5 ? "watch" : muac === null ? "incomplete" : "usual",
    parentInterpretation: muac === null ? "Le perimetre brachial n'est pas encore renseigne." : "Le perimetre brachial aide a reperer rapidement un risque nutritionnel chez les jeunes enfants.",
    professionalInterpretation: "MUAC a interpreter surtout entre 6 et 59 mois, avec verification de l'oedeme et de l'etat clinique.",
    recommendation: muac !== null && muac < 12.5 ? "Confirmer la mesure et demander un avis professionnel." : "Continuer les mesures de routine si l'enfant est dans la tranche d'age concernee.",
    history: indicatorHistory(rows, "muac_cm", " cm", 1),
    reference: "Chez les enfants de 6 a 59 mois: MUAC < 11,5 cm suggere une malnutrition aigue severe; 11,5 a <12,5 cm suggere une malnutrition aigue moderee; >=12,5 cm est habituellement rassurant si aucun oedeme n'est present.",
    changeSummary: changeSummary(rows, "muac_cm", "PB / MUAC", " cm", 1),
    missingData: [age < 6 || age > 59 ? "MUAC surtout interpretable entre 6 et 59 mois" : "", latest.edema === undefined ? "Verification des oedemes" : ""].filter(Boolean),
    professionalRecommendations: ["Confirmer la mesure au milieu du bras gauche avec ruban adapte.", "En cas de MUAC bas, rechercher oedemes bilateraux, anorexie, complications medicales et criteres de reference.", "Suivre la tendance MUAC a chaque visite chez les enfants eligibles."],
  });

  for (const item of analyzeCustomIndicators(rows, "measured_at")) {
    const previousText = item.previous === null
      ? "Aucune valeur precedente n'est disponible."
      : `La valeur precedente etait ${item.previous} ${item.unit}, soit une variation de ${item.delta! > 0 ? "+" : ""}${item.delta} ${item.unit}.`;
    const normalText = item.normalMin !== null || item.normalMax !== null
      ? `plage configuree ${item.normalMin ?? "-"} a ${item.normalMax ?? "-"} ${item.unit}`
      : "aucune plage normale configuree";
    const outside = item.relation === "below" || item.relation === "above";
    if (outside) {
      attentionPoints.push(`${item.name} est ${item.relation === "below" ? "sous" : "au-dessus de"} la plage configuree.`);
      alerts.push({
        alert_type: `custom_${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)}`,
        severity: "warning",
        title: `${item.name} hors plage`,
        message: `Valeur actuelle ${item.current} ${item.unit}; ${normalText}.`,
      });
    }
    addInsight(indicatorInsights, {
      indicator: item.name,
      latest: `${item.current} ${item.unit}`.trim(),
      status: outside ? "watch" : "usual",
      parentInterpretation: `La valeur actuelle est ${item.current} ${item.unit}. ${outside ? `Elle est ${item.relation === "below" ? "sous" : "au-dessus de"} la plage renseignee.` : item.relation === "within" ? "Elle se situe dans la plage renseignee." : "Aucune norme n'a encore ete renseignee."} ${previousText}`,
      professionalInterpretation: `Valeur actuelle ${item.current} ${item.unit}; ${normalText}; tendance ${item.trend}. ${previousText} Valider la norme selon l'age, le sexe, la methode de mesure et le contexte clinique.`,
      recommendation: outside ? "Confirmer la mesure et demander un avis professionnel." : "Poursuivre les mesures comparables pour consolider la tendance.",
      history: rows.slice(-8).map(row => {
        const raw = row.custom_values?.[item.name];
        const value = typeof raw === "object" && raw ? raw.value : raw;
        return value === undefined || value === null || value === "" ? null : { date: dateLabel(row.measured_at), value: `${value} ${item.unit}`.trim() };
      }).filter(Boolean) as Array<{ date: string; value: string }>,
      reference: item.normalMin !== null || item.normalMax !== null ? `Plage configuree: ${item.normalMin ?? "-infini"} a ${item.normalMax ?? "+infini"} ${item.unit}.` : "Aucune norme n'a encore ete configuree pour cet indicateur personnalise.",
      changeSummary: previousText,
      missingData: item.normalMin === null && item.normalMax === null ? ["Norme minimale/maximale de l'indicateur personnalise"] : [],
      professionalRecommendations: ["Documenter la source de la norme personnalisee.", "Comparer la tendance aux mesures precedentes et au contexte clinique.", "Adapter les seuils selon age, sexe, methode et protocole local lorsque pertinent."],
    });
  }

  if (latest.edema) addInsight(indicatorInsights, {
    indicator: "Oedemes",
    latest: "Signales",
    status: "urgent",
    parentInterpretation: "Des oedemes ont ete signales. Cela doit etre verifie rapidement.",
    professionalInterpretation: "Oedeme bilateral suspect: confirmer cliniquement et orienter selon protocole local de malnutrition aigue severe.",
    recommendation: "Consulter rapidement un professionnel de sante.",
    reference: "La presence d'oedemes bilateraux peut suffire a classer une malnutrition aigue severe selon les protocoles nutritionnels; confirmation clinique indispensable.",
    missingData: ["Lateralite et grade des oedemes", "Appetit/test d'appetit", "Complications medicales"],
    professionalRecommendations: ["Confirmer les oedemes bilateraux declives.", "Evaluer criteres de complications et orientation selon protocole PCIMA/IMAM local.", "Ne pas interpreter le poids seul en presence d'oedemes."],
  });

  const recentIllness = rows.slice(-3).filter(row => String(row.recent_illnesses || "").trim().length > 2);
  if (recentIllness.length >= 2) {
    alerts.push({ alert_type: "recurrent_illness", severity: "warning", title: "Maladies recentes repetees", message: "Des maladies ont ete renseignees dans plusieurs mesures recentes." });
    attentionPoints.push("Les maladies recentes peuvent affecter l appetit et la croissance.");
  }
  addInsight(indicatorInsights, {
    indicator: "Appetit et maladies recentes",
    latest: latest.appetite ? `Appetit: ${latest.appetite}` : undefined,
    status: recentIllness.length >= 2 || latest.appetite === "poor" ? "watch" : "usual",
    parentInterpretation: "L'appetit et les maladies recentes peuvent expliquer une baisse ou une stagnation de croissance.",
    professionalInterpretation: "Correlate anthropometric trajectory with infection history, appetite, feeding practices and hydration.",
    recommendation: "Surveiller les apports pendant et apres maladie; consulter si l'enfant mange nettement moins.",
    history: rows.slice(-5).map(row => ({
      date: dateLabel(row.measured_at),
      value: row.appetite ? `Appetit: ${row.appetite}` : "Appetit non renseigne",
      secondary: row.recent_illnesses ? String(row.recent_illnesses) : undefined,
    })),
    reference: "Une baisse d'appetit, des infections recentes, diarrhees ou fievres peuvent preceder une perte de poids ou une cassure de croissance.",
    missingData: [!latest.appetite ? "Appetit actuel" : "", !latest.recent_illnesses ? "Maladies recentes" : "", "Details sur les apports alimentaires"].filter(Boolean),
    professionalRecommendations: ["Rechercher infections recentes, diarrhee, vomissements, fievre et diminution des apports.", "Relier ces informations aux variations de poids, MUAC et WFH/BMIFA.", "Planifier conseils d'alimentation pendant et apres maladie."],
  });

  const stale = days(latest.measured_at, new Date());
  if (stale > 60) {
    alerts.push({ alert_type: "missing_recent_data", severity: "info", title: "Mesure ancienne", message: `Aucune nouvelle mesure depuis ${Math.floor(stale)} jours.` });
    attentionPoints.push("Les donnees ne sont plus recentes.");
  }
  if (!alerts.some(item => item.severity !== "info")) positives.push("Aucune tendance preoccupante n est detectee dans les donnees disponibles.");
  if (wfa === null || hfa === null || wfh === null) practicalAdvice.push("Importez les references OMS officielles pour activer l interpretation complete des z-scores.");
  practicalAdvice.push("Poursuivez des mesures regulieres avec le meme materiel lorsque possible.");
  if (recentIllness.length) practicalAdvice.push("Pendant et apres une maladie, proposez souvent des aliments et liquides adaptes a l age.");
  parentAdvice.push(...baseAdvice(child, age, alerts));

  const critical = alerts.some(item => item.severity === "critical");
  const warningCount = alerts.filter(item => item.severity === "warning").length;
  const summary = critical ? `Les nouvelles donnees de ${child.full_name} comportent un signe qui doit etre verifie rapidement par un professionnel.` : warningCount ? `La croissance de ${child.full_name} presente des points d attention. Une surveillance rapprochee est recommandee.` : `La croissance de ${child.full_name} evolue sans alerte majeure dans les donnees disponibles.`;
  const professionalSummary = critical ? `Signal critique detecte pour ${child.full_name}. Verifier immediatement les mesures, oedemes, z-scores, contexte infectieux et orientation clinique.` : warningCount ? `Plusieurs points de vigilance sont presents pour ${child.full_name}; interpretation clinique et suivi rapproche recommandes.` : `Aucun signal automatique majeur pour ${child.full_name}; poursuivre la surveillance anthropometrique standard.`;
  const parentConclusion = critical ? "Une verification rapide par un professionnel est recommandee. Cette analyse ne remplace pas une consultation." : warningCount ? "Continuez les mesures et demandez conseil si la situation persiste ou si l'enfant mange moins." : "Le suivi actuel ne montre pas d'alerte majeure. Continuez les mesures regulieres.";
  const professionalConclusion = critical ? "Prioriser la confirmation clinique et l'orientation selon protocoles locaux. Evaluer oedemes, MUAC, WFH/BMIFA, maladie recente et alimentation." : "Utiliser ces resultats comme aide au tri; confirmer avec examen clinique, qualite des mesures et references OMS completes.";
  return { summary, professionalSummary, positives, attentionPoints, practicalAdvice, parentAdvice, indicatorInsights, parentConclusion, professionalConclusion, consultationRecommended: critical || warningCount >= 2, alerts };
}

function baseAdvice(child: GrowthRow, age: number, alerts: GrowthAlert[]): ParentAdvice[] {
  const items: ParentAdvice[] = [];
  if (child.currently_breastfed || age < 6) items.push({ category: "Allaitement", title: "Soutenir l allaitement", text: "Allaitez selon les besoins et demandez de l aide en cas de douleur, difficulte ou baisse des tetees." });
  if (age >= 6 && age < 24) items.push({ category: "Alimentation complementaire", title: "Completer progressivement", text: "Proposez des aliments varies, riches en energie et nutriments, avec une texture adaptee a l age." });
  if (age >= 6) items.push({ category: "Diversification alimentaire", title: "Varier les groupes d aliments", text: "Associez chaque jour aliments de base, legumes ou fruits et sources de proteines disponibles." });
  items.push({ category: "Hygiene alimentaire", title: "Prevenir les infections", text: "Lavez les mains, utilisez une eau sure et conservez les aliments a bonne temperature." });
  items.push({ category: "Prevention de la malnutrition", title: "Suivre regulierement", text: "Surveillez l appetit, le poids et l activite de l enfant, surtout apres une maladie." });
  if (alerts.length) items.push({ category: "Signes d alerte", title: "Observer l etat general", text: "Consultez si l enfant mange nettement moins, perd du poids, presente des oedemes, devient tres fatigue ou si son etat se degrade." });
  if (alerts.some(item => item.severity === "critical")) items.push({ category: "Quand consulter", title: "Avis professionnel rapide", text: "Une alerte importante a ete detectee. Faites evaluer l enfant rapidement par un professionnel de sante." });
  items.push({ category: "Nutrition pendant la maladie", title: "Maintenir les apports", text: "Continuez l allaitement et proposez de petites quantites frequentes ainsi que des liquides adaptes." });
  items.push({ category: "Nutrition apres maladie", title: "Favoriser le rattrapage", text: "Apres la maladie, ajoutez un repas ou une collation adaptee pendant une courte periode selon les conseils locaux." });
  return items;
}
