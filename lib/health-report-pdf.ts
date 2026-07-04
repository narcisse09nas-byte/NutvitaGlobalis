import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { InsightResult, HealthRow } from "@/lib/health-analysis";
import { createNutvitaDocumentBranding, createReportQrCode } from "@/lib/pdf-branding";
import { customNumericSeries, drawCompactIndicatorChart, numericSeries } from "@/lib/pdf-indicator-charts";

const wrap = (value: string, max = 92) => {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" "), lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max) { if (line) lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
};
const formatDate = (value: string | Date, locale: "fr" | "en") => new Date(value).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR");

function drawWeightChart(page: PDFPage, regular: PDFFont, bold: PDFFont, rows: HealthRow[], y: number, locale: "fr" | "en") {
  const points = [...rows].filter(row => Number.isFinite(Number(row.weight_kg))).sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at)).slice(-8);
  if (points.length < 2) return y;
  const left = 70, bottom = y - 145, width = 455, height = 105;
  const values = points.map(row => Number(row.weight_kg)), min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  page.drawText(locale === "en" ? "Recent weight trajectory" : "Trajectoire recente du poids", { x: 50, y, size: 13, font: bold, color: rgb(.12, .49, .33) });
  page.drawLine({ start: { x: left, y: bottom }, end: { x: left + width, y: bottom }, thickness: 1, color: rgb(.7, .75, .73) });
  points.forEach((row, index) => {
    const x = left + index * width / (points.length - 1), pointY = bottom + (values[index] - min) / span * height;
    if (index) {
      const previousX = left + (index - 1) * width / (points.length - 1), previousY = bottom + (values[index - 1] - min) / span * height;
      page.drawLine({ start: { x: previousX, y: previousY }, end: { x, y: pointY }, thickness: 2.5, color: rgb(.1, .47, .31) });
    }
    page.drawCircle({ x, y: pointY, size: 3.5, color: rgb(.94, .42, .14) });
    page.drawText(`${values[index]}`, { x: x - 8, y: pointY + 7, size: 6, font: bold });
    page.drawText(formatDate(row.measured_at, locale).slice(0, 10), { x: x - 15, y: bottom - 13, size: 5.5, font: regular });
  });
  return bottom - 32;
}

export async function renderHealthReport(
  profile: Record<string, any>,
  anthropometry: HealthRow[],
  biology: HealthRow[],
  food: HealthRow[],
  lifestyle: HealthRow[],
  insight: InsightResult,
  period: { start: string; end: string },
  locale: "fr" | "en" = "fr",
  metadata?: { reportId?: string; generatedAt?: string; userEmail?: string; dietary?: Record<string, any> | null },
) {
  const fr = locale === "fr", generatedAt = metadata?.generatedAt || new Date().toISOString();
  const pdf = await PDFDocument.create(), regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = await createNutvitaDocumentBranding(pdf);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const sourcePath = `/espace-client/analyse?report=${encodeURIComponent(metadata?.reportId || "")}`;
  const loginParameters = new URLSearchParams({ redirect: sourcePath });
  if (metadata?.userEmail) loginParameters.set("identifiant", metadata.userEmail);
  const reportUrl = `${siteUrl}/connexion?${loginParameters.toString()}`;
  const drawQr = await createReportQrCode(pdf, reportUrl);
  let page = pdf.addPage([595, 842]), y = 670;
  const firstPage = page;
  const addPage = () => { page = pdf.addPage([595, 842]); brand(page); y = 670; };
  brand(page);
  drawQr(page, fr ? "Scanner pour retrouver ce rapport" : "Scan to access this report");
  const text = (value: string, size = 9, font = regular, color = rgb(.16, .23, .22)) => {
    const lineWidth = page === firstPage && y > 585 ? (size >= 15 ? 42 : 68) : (size >= 15 ? 60 : 92);
    for (const line of wrap(value, lineWidth)) {
      if (y < 85) addPage();
      page.drawText(line, { x: 50, y, size, font, color }); y -= size + 4;
    }
  };
  const heading = (value: string) => { if (y < 140) addPage(); y -= 7; text(value, 14, bold, rgb(.12, .49, .33)); };
  const bullets = (values: string[] | undefined, limit = 5) => (values || []).filter(Boolean).slice(0, limit).forEach(value => text(`- ${value}`, 8.5));

  text(fr ? "Rapport de suivi sante" : "Health monitoring report", 20, bold, rgb(.07, .24, .19));
  text(profile.full_name || (fr ? "Client" : "Client"), 12, bold);
  text(`${fr ? "Genere le" : "Generated on"} ${formatDate(generatedAt, locale)} | ${fr ? "Periode analysee" : "Analyzed period"}: ${formatDate(period.start, locale)} - ${formatDate(period.end, locale)}`, 9);
  text(`${fr ? "Reference" : "Reference"}: ${metadata?.reportId || "N/A"}`, 8, regular, rgb(.4, .45, .44));
  y -= 10;
  heading(fr ? "Synthese essentielle" : "Essential summary");
  text(insight.publicSummary, 10);
  if (insight.risks?.length) { text(fr ? "Points de vigilance" : "Points requiring attention", 10, bold, rgb(.72, .25, .12)); bullets(insight.risks, 4); }
  if (insight.improvements?.length) { text(fr ? "Evolutions favorables" : "Favorable changes", 10, bold, rgb(.12, .49, .33)); bullets(insight.improvements, 3); }
  y -= 8;
  heading(fr ? "Graphiques de tous les indicateurs renseignes" : "Charts for all recorded indicators");
  const chartSeries = [
    ...numericSeries(anthropometry, [
      { key: "weight_kg", label: fr ? "Poids" : "Weight", unit: "kg" },
      { key: "height_cm", label: fr ? "Taille" : "Height", unit: "cm" },
      { key: "bmi", label: "IMC / BMI" },
      { key: "waist_cm", label: fr ? "Tour de taille" : "Waist circumference", unit: "cm" },
      { key: "hip_cm", label: fr ? "Tour de hanche" : "Hip circumference", unit: "cm" },
      { key: "muac_cm", label: "PB / MUAC", unit: "cm" },
      { key: "body_fat_percent", label: fr ? "Masse grasse" : "Body fat", unit: "%" },
      { key: "muscle_mass_kg", label: fr ? "Masse musculaire" : "Muscle mass", unit: "kg" },
    ]),
    ...customNumericSeries(anthropometry),
    ...numericSeries(biology, [
      { key: "glucose", label: fr ? "Glycemie" : "Glucose" },
      { key: "hba1c", label: "HbA1c", unit: "%" },
      { key: "total_cholesterol", label: fr ? "Cholesterol total" : "Total cholesterol" },
      { key: "hdl", label: "HDL" }, { key: "ldl", label: "LDL" },
      { key: "triglycerides", label: fr ? "Triglycerides" : "Triglycerides" },
      { key: "hemoglobin", label: fr ? "Hemoglobine" : "Hemoglobin" },
      { key: "ferritin", label: fr ? "Ferritine" : "Ferritin" },
      { key: "albumin", label: fr ? "Albumine" : "Albumin" },
      { key: "crp", label: "CRP" },
      { key: "systolic_pressure", label: fr ? "Pression systolique" : "Systolic pressure", unit: "mmHg" },
      { key: "diastolic_pressure", label: fr ? "Pression diastolique" : "Diastolic pressure", unit: "mmHg" },
    ]),
    ...customNumericSeries(biology),
    ...numericSeries(lifestyle, [
      { key: "activity_level", label: fr ? "Niveau d activite" : "Activity level", dateKey: "assessment_date" },
      { key: "diet_level", label: fr ? "Niveau alimentaire" : "Diet level", dateKey: "assessment_date" },
    ]),
    ...numericSeries(food.map(row => ({
      ...row,
      calories: row.content?.calories,
      protein_g: row.content?.protein_g,
    })), [
      { key: "calories", label: fr ? "Apport energetique estime" : "Estimated energy intake", unit: "kcal", dateKey: "entry_date" },
      { key: "protein_g", label: fr ? "Proteines estimees" : "Estimated protein", unit: "g", dateKey: "entry_date" },
    ]),
    ...numericSeries(metadata?.dietary ? [metadata.dietary] : [], [
      { key: "diversity_score", label: fr ? "Diversite alimentaire MDD-W" : "MDD-W dietary diversity", unit: "/10", dateKey: "assessed_at" },
    ]),
  ];
  for (let index = 0; index < chartSeries.length; index += 2) {
    if (y < 175) addPage();
    drawCompactIndicatorChart(page, regular, bold, chartSeries[index], 50, y, locale);
    if (chartSeries[index + 1]) drawCompactIndicatorChart(page, regular, bold, chartSeries[index + 1], 315, y, locale);
    y -= 112;
  }

  heading(fr ? "Indicateurs prioritaires" : "Priority indicators");
  text(fr ? "Indicateur | Valeur actuelle | Dernier changement | Interpretation" : "Indicator | Current value | Latest change | Interpretation", 8, bold);
  const prioritized = [...insight.indicatorInsights].sort((a, b) => ({ urgent: 0, watch: 1, incomplete: 2, stable: 3, improving: 4 }[a.status] - ({ urgent: 0, watch: 1, incomplete: 2, stable: 3, improving: 4 }[b.status]))).slice(0, 10);
  for (const item of prioritized) {
    text(`${item.indicator} | ${item.latest || "N/A"} | ${item.comparisonPrevious || item.changeSummary || "N/A"}`, 8, bold);
    text(item.publicInterpretation || item.professionalInterpretation, 8);
  }

  heading(fr ? "Plan d action prioritaire" : "Priority action plan");
  bullets(insight.recommendations, 5);
  if (insight.actionPlan?.days30?.length) {
    text(fr ? "Dans les 30 prochains jours" : "Within the next 30 days", 9, bold);
    bullets(insight.actionPlan.days30, 4);
  }
  heading(fr ? "Note professionnelle" : "Professional note");
  text(insight.professionalSummary, 9);
  const concerning = insight.indicatorInsights.filter(item => item.status === "urgent" || item.status === "watch").slice(0, 6);
  for (const item of concerning) {
    text(`${item.indicator} [${item.status}]`, 9, bold);
    text(item.professionalInterpretation, 8);
    bullets(item.professionalRecommendations, 2);
  }

  heading(fr ? "Qualite des donnees et limites" : "Data quality and limitations");
  bullets(insight.limitations, 6);
  text(`${fr ? "Donnees exploitees" : "Data used"}: ${anthropometry.length} ${fr ? "mesures anthropometriques" : "anthropometric measurements"}, ${biology.length} ${fr ? "biologiques" : "biological"}, ${food.length} ${fr ? "alimentaires" : "food records"}, ${lifestyle.length} ${fr ? "evaluations du mode de vie" : "lifestyle assessments"}.`, 8);
  y -= 8;
  text(fr
    ? "Ce rapport automatise constitue une aide au suivi et ne remplace pas une consultation, un diagnostic ou une decision clinique. Toute alerte doit etre confirmee par un professionnel qualifie."
    : "This automated report supports monitoring and does not replace consultation, diagnosis or clinical decision-making. Any alert must be confirmed by a qualified professional.", 8, regular, rgb(.58, .3, .13));
  for (const [index, current] of pdf.getPages().entries()) current.drawText(`NutVitaGlobalis - ${fr ? "page" : "page"} ${index + 1}/${pdf.getPageCount()} - ${formatDate(generatedAt, locale)}`, { x: 50, y: 60, size: 7, font: regular, color: rgb(.45, .45, .45) });
  return pdf.save();
}
