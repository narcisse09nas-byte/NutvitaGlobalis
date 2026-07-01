import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InsightResult, HealthRow } from "@/lib/health-analysis";
import { createNutvitaDocumentBranding } from "@/lib/pdf-branding";
import QRCode from "qrcode";

const wrap = (text: string, max = 88) => { const words = text.split(/\s+/), lines: string[] = []; let line = ""; for (const word of words) { if (`${line} ${word}`.trim().length > max) { lines.push(line); line = word; } else line = `${line} ${word}`.trim(); } if (line) lines.push(line); return lines; };

export async function renderHealthReport(profile: Record<string, any>, anthropometry: HealthRow[], biology: HealthRow[], food: HealthRow[], lifestyle: HealthRow[], insight: InsightResult, period: { start: string; end: string }, locale: "fr" | "en" = "fr", metadata?: { reportId?: string }) {
  const labels = locale === "en" ? {
    title: "NutVitaGlobalis - Health tracking report",
    fromTo: "to",
    publicSummary: "Client summary",
    clinicalSummary: "Clinical summary",
    weightCurve: "Weight curve",
    foodIntake: "Food intake",
    foodLine: (count: number, calories: number) => `${count} food entrie(s). Reported average energy intake: ${calories} kcal.`,
    sections: [["Trends", insight.trends], ["Improvements", insight.improvements], ["Risks to review", insight.risks], ["Recommendations", insight.recommendations]] as const,
    publicIndicators: "Indicator analysis - client version",
    professionalIndicators: "Indicator analysis - professional version",
    publicConclusion: "Client conclusion",
    professionalConclusion: "Professional conclusion",
    aiSource: insight.aiProvider && insight.aiProvider !== "local" ? "Narrative enriched by external AI" : "Local analytical fallback",
    measures: `Available measurements: ${anthropometry.length} anthropometric, ${biology.length} biological, ${food.length} food and ${lifestyle.length} lifestyle assessments.`,
    warning: "This automated report is not a medical diagnosis. Every alert must be interpreted by a qualified professional.",
    page: "page",
  } : {
    title: "NutVitaGlobalis - Rapport de suivi sante",
    fromTo: "au",
    publicSummary: "Resume grand public",
    clinicalSummary: "Resume clinique",
    weightCurve: "Courbe du poids",
    foodIntake: "Apports alimentaires",
    foodLine: (count: number, calories: number) => `${count} entree(s) alimentaires. Apport energetique moyen renseigne : ${calories} kcal.`,
    sections: [["Tendances", insight.trends], ["Ameliorations", insight.improvements], ["Risques a verifier", insight.risks], ["Recommandations", insight.recommendations]] as const,
    publicIndicators: "Analyse par indicateur - version grand public",
    professionalIndicators: "Analyse par indicateur - version professionnelle",
    publicConclusion: "Conclusion grand public",
    professionalConclusion: "Conclusion professionnelle",
    aiSource: insight.aiProvider && insight.aiProvider !== "local" ? "Narration enrichie par IA externe" : "Moteur analytique local de secours",
    measures: `Mesures disponibles: ${anthropometry.length} anthropometriques, ${biology.length} biologiques, ${food.length} entrees alimentaires et ${lifestyle.length} evaluations du mode de vie.`,
    warning: "Ce rapport automatise ne constitue pas un diagnostic medical. Toute alerte doit etre interpretee par un professionnel qualifie.",
    page: "page",
  };
  const pdf = await PDFDocument.create(), regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = await createNutvitaDocumentBranding(pdf);
  let page = pdf.addPage([595, 842]), y = 670; brand(page);
  const addPage = () => { page = pdf.addPage([595, 842]); brand(page); y = 670; };
  const text = (value: string, size = 10, font = regular, color = rgb(.16, .23, .22)) => { for (const line of wrap(value, size > 15 ? 58 : 88)) { if (y < 85) addPage(); page.drawText(line, { x: 50, y, size, font, color }); y -= size + 5; } };
  const bulletList = (values: string[] | undefined, size = 9) => { for (const item of values || []) text(`- ${item}`, size); };
  const heading = (value: string, size = 14) => { if (y < 140) addPage(); text(value, size, bold, rgb(.12, .49, .33)); };
  const numericValue = (input: string) => {
    const match = input.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  };
  const drawHistoryChart = (item: InsightResult["indicatorInsights"][number]) => {
    const points = (item.history || []).map(point => ({ ...point, numeric: numericValue(point.value) })).filter(point => point.numeric !== null) as Array<{ date: string; value: string; numeric: number }>;
    if (points.length < 2) { text(locale === "en" ? "Chart: N/A (at least two numeric values required)." : "Graphique : N/A (au moins deux valeurs numeriques requises).", 8, regular, rgb(.55, .3, .15)); return; }
    if (y < 230) addPage();
    const left = 75, bottom = y - 150, width = 430, height = 105;
    const values = points.map(point => point.numeric), min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
    page.drawLine({ start: { x: left, y: bottom }, end: { x: left + width, y: bottom }, thickness: 1, color: rgb(.65, .7, .68) });
    page.drawLine({ start: { x: left, y: bottom }, end: { x: left, y: bottom + height }, thickness: 1, color: rgb(.65, .7, .68) });
    for (let index = 0; index < points.length; index++) {
      const x = left + index * width / (points.length - 1);
      const pointY = bottom + (points[index].numeric - min) / span * height;
      if (index) {
        const previousX = left + (index - 1) * width / (points.length - 1);
        const previousY = bottom + (points[index - 1].numeric - min) / span * height;
        page.drawLine({ start: { x: previousX, y: previousY }, end: { x, y: pointY }, thickness: 2, color: rgb(.1, .47, .31) });
      }
      page.drawCircle({ x, y: pointY, size: 3, color: rgb(.94, .42, .14) });
      page.drawText(String(points[index].numeric), { x: x - 8, y: pointY + 7, size: 6, font: bold, color: rgb(.07, .24, .19) });
      page.drawText(points[index].date.slice(0, 10), { x: x - 12, y: bottom - 12, size: 5, font: regular, color: rgb(.35, .4, .39) });
    }
    page.drawText(locale === "en" ? "Date" : "Date", { x: left + width - 12, y: bottom - 25, size: 7, font: bold });
    page.drawText(item.indicator, { x: left, y: bottom + height + 10, size: 7, font: bold });
    y = bottom - 35;
  };

  const birthDate = profile.date_of_birth || profile.birth_date;
  const age = birthDate ? Math.max(0, Math.floor((Date.now() - +new Date(birthDate)) / 31557600000)) : null;
  const reportId = metadata?.reportId || "N/A";
  text(labels.title, 20, bold, rgb(.07, .24, .19));
  text(`${profile.full_name || "Client"} - ${period.start} ${labels.fromTo} ${period.end}`, 11, bold, rgb(.4, .45, .44)); y -= 12;
  text(`${locale === "en" ? "Age" : "Age"}: ${age ?? "N/A"} | ${locale === "en" ? "Sex" : "Sexe"}: ${profile.sex || profile.gender || "N/A"} | ${locale === "en" ? "Profession" : "Profession"}: ${profile.profession || profile.occupation || "N/A"}`, 9);
  text(`${locale === "en" ? "Report number" : "Numero du rapport"}: ${reportId}`, 9);
  text(`${locale === "en" ? "AI version" : "Version IA"}: ${insight.aiVersion || "NCIE v1.0"} | ${locale === "en" ? "Scientific version" : "Version scientifique"}: ${insight.scientificVersion || "NCIE scientific framework v1.0"}`, 8);
  const qrTarget = `${process.env.NEXT_PUBLIC_SITE_URL || "https://nutvitaglobalis.com"}/espace-client/analyse?report=${encodeURIComponent(reportId)}`;
  const qr = await pdf.embedPng(await QRCode.toBuffer(qrTarget, { type: "png", width: 180, margin: 1 }));
  page.drawImage(qr, { x: 425, y: 500, width: 105, height: 105 });
  text(labels.aiSource, 8, bold, insight.aiProvider && insight.aiProvider !== "local" ? rgb(.12, .49, .33) : rgb(.55, .35, .1));
  y -= 20;
  text(locale === "en" ? "Confidential health document" : "Document de sante confidentiel", 11, bold, rgb(.55, .3, .15));

  addPage();
  heading(locale === "en" ? "Contents" : "Sommaire", 18);
  bulletList([
    "1. Resume executif", "2. Score global NutVita", "3. Tableau de bord",
    "4. Analyse detaillee par indicateur", "5. Interactions entre les indicateurs",
    "6. Plan d action personnalise", "7. Motivation", "8. Version professionnelle",
    "9. Limites du rapport", "10. Avertissement",
  ], 10);
  y -= 12;
  heading(locale === "en" ? "1. Executive summary" : "1. Resume executif");
  text(labels.publicSummary, 14, bold, rgb(.12, .49, .33)); text(insight.publicSummary, 10); y -= 10;
  heading(locale === "en" ? "2. NutVita global score" : "2. Score global NutVita");
  const scoreColor = insight.scoreColor === "green" ? rgb(.12, .55, .3) : insight.scoreColor === "red" ? rgb(.75, .16, .12) : rgb(.94, .42, .14);
  text(`${insight.globalScore ?? "N/A"}/100 | ***** | ${(insight.scoreColor || "N/A").toUpperCase()}`, 18, bold, scoreColor);
  for (const [domain, score] of Object.entries(insight.domainScores || {})) text(`${domain}: ${score === null ? "N/A" : `${score}/100`}`, 9, score === null ? regular : bold);
  y -= 8;
  heading(locale === "en" ? "3. Dashboard" : "3. Tableau de bord");
  text("Indicateur | Valeur actuelle | Evolution | Statut | Risque", 8, bold);
  for (const item of insight.indicatorInsights) text(`${item.indicator} | ${item.latest || "N/A"} | ${item.changeSummary || "N/A"} | ${item.status} | ${item.status === "urgent" ? "eleve" : item.status === "watch" ? "modere" : item.status === "incomplete" ? "indetermine" : "faible"}`, 7);

  const weights = [...anthropometry].filter(row => Number.isFinite(Number(row.weight_kg))).sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at));
  if (weights.length > 1) {
    text(labels.weightCurve, 14, bold, rgb(.12, .49, .33));
    const left = 65, bottom = y - 150, width = 455, height = 125, values = weights.map(row => Number(row.weight_kg)), min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
    page.drawLine({ start: { x: left, y: bottom }, end: { x: left + width, y: bottom }, thickness: 1, color: rgb(.75, .8, .78) });
    for (let index = 1; index < weights.length; index++) {
      const previous = values[index - 1], current = values[index];
      page.drawLine({ start: { x: left + (index - 1) * width / (weights.length - 1), y: bottom + (previous - min) / span * height }, end: { x: left + index * width / (weights.length - 1), y: bottom + (current - min) / span * height }, thickness: 3, color: rgb(.1, .47, .31) });
    }
    y = bottom - 25;
  }
  const calories = food.map(row => Number(row.content?.calories)).filter(Number.isFinite);
  if (calories.length) {
    text(labels.foodIntake, 14, bold, rgb(.12, .49, .33));
    text(labels.foodLine(food.length, Math.round(calories.reduce((sum, value) => sum + value, 0) / calories.length)), 10);
    y -= 8;
  }
  if (insight.indicatorInsights?.length) {
    heading(locale === "en" ? "4. Detailed indicator analysis" : "4. Analyse detaillee par indicateur", 16);
    for (const [indicatorIndex, item] of insight.indicatorInsights.entries()) {
      heading(`4.${indicatorIndex + 1} ${item.indicator}${item.latest ? ` - ${item.latest}` : ""}`, 12);
      text(locale === "en" ? "Presentation" : "Presentation", 9, bold);
      text(item.presentation || item.publicInterpretation, 8);
      text(locale === "en" ? "Graph" : "Graphique", 9, bold);
      drawHistoryChart(item);
      text(`${locale === "en" ? "Current situation" : "Situation actuelle"}: ${item.latest || "N/A"}`, 8, bold);
      text(`${locale === "en" ? "Reference comparison" : "Comparaison a la reference"}: ${item.comparisonReference || item.reference || "N/A"}`, 8);
      text(`${locale === "en" ? "Previous measure" : "Comparaison avec la derniere mesure"}: ${item.comparisonPrevious || "N/A"}`, 8);
      text(`${locale === "en" ? "First measure" : "Comparaison avec la premiere mesure"}: ${item.comparisonFirst || item.changeSummary || "N/A"}`, 8);
      text(`${locale === "en" ? "Peaks and plateaus" : "Analyse des pics"}: ${item.peakAnalysis || "N/A"}`, 8);
      if (item.statistics) {
        const stats = item.statistics;
        text(locale === "en" ? "Statistical analysis" : "Analyse statistique", 9, bold);
        text(`n=${stats.count}; min=${stats.minimum ?? "N/A"}; max=${stats.maximum ?? "N/A"}; moyenne=${stats.mean ?? "N/A"}; mediane=${stats.median ?? "N/A"}; ecart-type=${stats.standardDeviation ?? "N/A"}; amplitude=${stats.range ?? "N/A"}; CV=${stats.coefficientOfVariation ?? "N/A"}%; variation moyenne=${stats.averageVisitChange ?? "N/A"}.`, 8);
        text(stats.linearTrend || "N/A", 8);
      }
      text(locale === "en" ? "Correlations" : "Correlations", 9, bold);
      bulletList(item.correlationNotes?.length ? item.correlationNotes : ["N/A: aucune relation robuste specifique ne peut etre etablie pour cet indicateur."], 8);
      text(locale === "en" ? "Clinical interpretation" : "Interpretation clinique", 9, bold);
      text(item.clinicalInterpretation || item.professionalInterpretation, 8);
      text(locale === "en" ? "Forecasts (estimates only)" : "Previsions (estimations uniquement)", 9, bold);
      text(`30 jours: ${item.projections?.days30 || "N/A"} | 90 jours: ${item.projections?.days90 || "N/A"} | 180 jours: ${item.projections?.days180 || "N/A"}`, 8);
      text(locale === "en" ? "Prioritized recommendations" : "Recommandations personnalisees prioritaires", 9, bold);
      bulletList(item.prioritizedRecommendations || [item.recommendation], 8);
      text(`${locale === "en" ? "Confidence" : "Niveau de confiance"}: ${item.confidence?.score ?? "N/A"}% - ${item.confidence?.explanation || "N/A"}`, 8, bold, rgb(.55, .35, .1));
      if (item.history?.length) {
        text(locale === "en" ? "Recorded history" : "Historique disponible", 8, bold, rgb(.35, .4, .39));
        for (const point of item.history) text(`${point.date} | ${point.value}${point.secondary ? ` | ${point.secondary}` : ""}`, 8);
      }
      if (item.reference) text(`${locale === "en" ? "Reference" : "Reference"}: ${item.reference}`, 8, regular, rgb(.38, .45, .44));
      if (item.changeSummary) text(`${locale === "en" ? "Change" : "Evolution"}: ${item.changeSummary}`, 8, bold);
      text(item.publicInterpretation, 9);
      if (item.benefits?.length) {
        text(locale === "en" ? "Possible benefits" : "Benefices possibles", 8, bold, rgb(.12, .49, .33));
        for (const benefit of item.benefits) text(`- ${benefit}`, 8);
      }
      text(`${locale === "en" ? "Practical advice" : "Conseil pratique"}: ${item.recommendation}`, 8, bold, rgb(.12, .49, .33));
      y -= 12;
    }
  }
  heading(locale === "en" ? "5. Interactions between indicators" : "5. Interactions entre les indicateurs");
  bulletList(insight.crossIndicatorAnalysis?.length ? insight.crossIndicatorAnalysis : ["N/A: donnees insuffisantes pour une analyse transversale robuste."]);
  heading(locale === "en" ? "6. Personalized action plan" : "6. Plan d action personnalise");
  for (const [title, values] of [
    ["Objectifs a 30 jours", insight.actionPlan?.days30],
    ["Objectifs a 90 jours", insight.actionPlan?.days90],
    ["Objectifs a 180 jours", insight.actionPlan?.days180],
    ["Actions quotidiennes", insight.actionPlan?.daily],
    ["Actions hebdomadaires", insight.actionPlan?.weekly],
    ["Actions mensuelles", insight.actionPlan?.monthly],
    ["Indicateurs prioritaires", insight.actionPlan?.priorityIndicators],
  ] as Array<[string, string[] | undefined]>) {
    text(title, 9, bold); bulletList(values?.length ? values : ["N/A"], 8);
  }
  heading(locale === "en" ? "7. Motivation" : "7. Motivation");
  text(insight.motivation || "La regularite du suivi constitue deja un progres important.", 10);
  if (insight.publicConclusion) { text(labels.publicConclusion, 11, bold, rgb(.12, .49, .33)); text(insight.publicConclusion, 9); }
  heading(locale === "en" ? "8. Professional version" : "8. Version professionnelle", 16);
  text(labels.clinicalSummary, 13, bold, rgb(.12, .49, .33)); text(insight.professionalSummary, 9); y -= 8;
  for (const item of insight.indicatorInsights) {
    text(`${item.indicator} [${item.status}]`, 11, bold, rgb(.07, .24, .19));
    text(item.professionalInterpretation, 9);
    if (item.missingData?.length) {
      text(locale === "en" ? "Missing data limiting interpretation" : "Donnees manquantes limitant l interpretation", 8, bold, rgb(.55, .3, .15));
      bulletList(item.missingData, 8);
    }
    if (item.professionalRecommendations?.length) {
      text(locale === "en" ? "Professional recommendations" : "Recommandations professionnelles", 8, bold, rgb(.12, .49, .33));
      bulletList(item.professionalRecommendations, 8);
    }
    y -= 8;
  }
  if (insight.professionalConclusion) { text(labels.professionalConclusion, 11, bold, rgb(.12, .49, .33)); text(insight.professionalConclusion, 9); }
  heading(locale === "en" ? "9. Report limitations" : "9. Limites du rapport");
  bulletList(insight.limitations?.length ? insight.limitations : ["Aucune limite supplementaire documentee; une confirmation clinique reste necessaire."], 8);
  text(labels.measures, 9, regular, rgb(.4, .45, .44));
  heading(locale === "en" ? "10. Warning" : "10. Avertissement");
  text(locale === "en"
    ? "This report is generated automatically by NutVitaGlobalis Clinical Intelligence Engine (NCIE). It is an interpretation and follow-up support tool. It does not replace a medical consultation, diagnosis or clinical decision. Care must be provided by a qualified health professional considering the patient clinical context."
    : "Ce rapport est genere automatiquement par NutVitaGlobalis Clinical Intelligence Engine (NCIE). Il constitue un outil d aide a l interpretation et au suivi. Il ne remplace pas une consultation medicale, un diagnostic ou une decision clinique. Toute prise en charge doit etre realisee par un professionnel de sante qualifie, en tenant compte du contexte clinique du patient.",
    8, regular, rgb(.55, .3, .15));
  for (const [index, current] of pdf.getPages().entries()) current.drawText(`NutVitaGlobalis - ${labels.page} ${index + 1}/${pdf.getPageCount()}`, { x: 50, y: 72, size: 8, font: regular, color: rgb(.45, .45, .45) });
  return pdf.save();
}
