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
      parentInterpretation: `Le poids a change de ${change.toFixed(2)} kg depuis la derniere mesure.`,
      professionalInterpretation: `Variation ponderale ${change.toFixed(2)} kg sur ${Math.max(1, elapsed).toFixed(0)} jours. Interpreter selon age, maladie recente, oedemes et qualite de mesure.`,
      recommendation: "Repeter les mesures avec le meme materiel et surveiller l'appetit.",
    });
  } else {
    addInsight(indicatorInsights, {
      indicator: "Poids",
      latest: fmt(weight, " kg"),
      status: weight === null ? "incomplete" : "usual",
      parentInterpretation: weight === null ? "Le poids n'est pas encore renseigne." : "Une premiere valeur de poids est disponible.",
      professionalInterpretation: "La tendance ponderale exige au moins deux mesures datees.",
      recommendation: "Ajouter une nouvelle mesure lors du prochain suivi.",
    });
  }

  const growthIndicators = [
    { key: "Taille / longueur", value: height, unit: " cm", z: hfa, parent: "La taille aide a suivre la croissance lineaire.", pro: "Taille-pour-age utile pour depister retard de croissance ou mesure atypique." },
    { key: "Poids-pour-age", value: wfa, unit: " z", z: wfa, parent: "Cet indicateur compare le poids a l'age de l'enfant.", pro: "WFA reflete une situation composite et doit etre interprete avec taille-pour-age et poids-pour-taille." },
    { key: "Taille-pour-age", value: hfa, unit: " z", z: hfa, parent: "Cet indicateur aide a reperer un retard de croissance dans le temps.", pro: "HFA sous -2 z suggere un risque de retard de croissance; sous -3 z, signal severe." },
    { key: "Poids-pour-taille", value: wfh, unit: " z", z: wfh, parent: "Cet indicateur aide a reperer un amaigrissement ou un exces de poids par rapport a la taille.", pro: "WFH est central pour l'evaluation de malnutrition aigue ou surpoids selon age/taille." },
    { key: "IMC-pour-age", value: bmifa ?? bmi, unit: bmifa === null && bmi !== null ? "" : " z", z: bmifa, parent: "L'IMC complete l'analyse du poids et de la taille.", pro: "BMI-for-age doit etre interprete selon references OMS, sexe et age." },
    { key: "Perimetre cranien", value: hcfa ?? head, unit: hcfa === null && head !== null ? " cm" : " z", z: hcfa, parent: "Le perimetre cranien aide a suivre la croissance de la tete chez le jeune enfant.", pro: "HCFA exige prudence technique; verifier position du ruban et contexte neurologique." },
  ];

  for (const item of growthIndicators) {
    const status = zStatus(item.z);
    if (status === "watch" || status === "urgent") attentionPoints.push(`${item.key} en dehors de la zone usuelle.`);
    addInsight(indicatorInsights, {
      indicator: item.key,
      latest: fmt(item.value, item.unit, item.unit === " z" ? 2 : 1),
      status,
      parentInterpretation: item.value === null ? `${item.key}: donnee non encore renseignee.` : item.parent,
      professionalInterpretation: item.value === null ? `${item.key}: donnee absente ou reference non calculee.` : `${item.pro} Valeur actuelle: ${Number(item.value).toFixed(item.unit === " z" ? 2 : 1)}${item.unit}.`,
      recommendation: status === "urgent" ? "Avis professionnel rapide recommande." : status === "watch" ? "Recontroler et suivre de pres." : "Poursuivre le suivi regulier.",
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
  });

  if (latest.edema) addInsight(indicatorInsights, {
    indicator: "Oedemes",
    latest: "Signales",
    status: "urgent",
    parentInterpretation: "Des oedemes ont ete signales. Cela doit etre verifie rapidement.",
    professionalInterpretation: "Oedeme bilateral suspect: confirmer cliniquement et orienter selon protocole local de malnutrition aigue severe.",
    recommendation: "Consulter rapidement un professionnel de sante.",
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
