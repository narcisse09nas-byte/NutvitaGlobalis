import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InsightResult, HealthRow } from "@/lib/health-analysis";
import { createNutvitaDocumentBranding } from "@/lib/pdf-branding";

const wrap = (text: string, max = 88) => { const words = text.split(/\s+/), lines: string[] = []; let line = ""; for (const word of words) { if (`${line} ${word}`.trim().length > max) { lines.push(line); line = word; } else line = `${line} ${word}`.trim(); } if (line) lines.push(line); return lines; };

export async function renderHealthReport(profile: Record<string, any>, anthropometry: HealthRow[], biology: HealthRow[], food: HealthRow[], lifestyle: HealthRow[], insight: InsightResult, period: { start: string; end: string }, locale: "fr" | "en" = "fr") {
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
    aiSource: insight.aiProvider === "openai" ? "Narrative enriched by external AI" : "Local analytical fallback",
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
    aiSource: insight.aiProvider === "openai" ? "Narration enrichie par IA externe" : "Moteur analytique local de secours",
    measures: `Mesures disponibles: ${anthropometry.length} anthropometriques, ${biology.length} biologiques, ${food.length} entrees alimentaires et ${lifestyle.length} evaluations du mode de vie.`,
    warning: "Ce rapport automatise ne constitue pas un diagnostic medical. Toute alerte doit etre interpretee par un professionnel qualifie.",
    page: "page",
  };
  const pdf = await PDFDocument.create(), regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = await createNutvitaDocumentBranding(pdf);
  let page = pdf.addPage([595, 842]), y = 670; brand(page);
  const addPage = () => { page = pdf.addPage([595, 842]); brand(page); y = 670; };
  const text = (value: string, size = 10, font = regular, color = rgb(.16, .23, .22)) => { for (const line of wrap(value, size > 15 ? 58 : 88)) { if (y < 85) addPage(); page.drawText(line, { x: 50, y, size, font, color }); y -= size + 5; } };
  text(labels.title, 20, bold, rgb(.07, .24, .19));
  text(`${profile.full_name || "Client"} - ${period.start} ${labels.fromTo} ${period.end}`, 10, regular, rgb(.4, .45, .44)); y -= 15;
  text(labels.aiSource, 8, bold, insight.aiProvider === "openai" ? rgb(.12, .49, .33) : rgb(.55, .35, .1)); y -= 8;
  text(labels.publicSummary, 14, bold, rgb(.12, .49, .33)); text(insight.publicSummary, 10); y -= 10;
  text(labels.clinicalSummary, 14, bold, rgb(.12, .49, .33)); text(insight.professionalSummary, 10); y -= 10;

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
    text(labels.publicIndicators, 14, bold, rgb(.12, .49, .33));
    for (const item of insight.indicatorInsights) {
      text(`${item.indicator}${item.latest ? ` - ${item.latest}` : ""}`, 11, bold, rgb(.07, .24, .19));
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
      y -= 8;
    }
    y -= 8;
    text(labels.professionalIndicators, 14, bold, rgb(.12, .49, .33));
    for (const item of insight.indicatorInsights) {
      text(`${item.indicator} [${item.status}]`, 11, bold, rgb(.07, .24, .19));
      text(item.professionalInterpretation, 9);
      if (item.missingData?.length) {
        text(locale === "en" ? "Missing data limiting interpretation" : "Donnees manquantes limitant l interpretation", 8, bold, rgb(.55, .3, .15));
        for (const missing of item.missingData) text(`- ${missing}`, 8);
      }
      if (item.professionalRecommendations?.length) {
        text(locale === "en" ? "Professional recommendations" : "Recommandations professionnelles", 8, bold, rgb(.12, .49, .33));
        for (const recommendation of item.professionalRecommendations) text(`- ${recommendation}`, 8);
      }
      y -= 8;
    }
    y -= 8;
  }
  for (const [title, values] of labels.sections) {
    if (!values.length) continue; text(title, 13, bold, rgb(.12, .49, .33)); for (const value of values) text(`- ${value}`, 10); y -= 8;
  }
  if (insight.publicConclusion) { text(labels.publicConclusion, 13, bold, rgb(.12, .49, .33)); text(insight.publicConclusion, 10); y -= 5; }
  if (insight.professionalConclusion) { text(labels.professionalConclusion, 13, bold, rgb(.12, .49, .33)); text(insight.professionalConclusion, 10); y -= 5; }
  text(labels.measures, 9, regular, rgb(.4, .45, .44));
  text(labels.warning, 8, regular, rgb(.55, .3, .15));
  for (const [index, current] of pdf.getPages().entries()) current.drawText(`NutVitaGlobalis - ${labels.page} ${index + 1}/${pdf.getPageCount()}`, { x: 50, y: 72, size: 8, font: regular, color: rgb(.45, .45, .45) });
  return pdf.save();
}
