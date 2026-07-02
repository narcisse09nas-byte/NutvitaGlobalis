import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { ChildGrowthAnalysis, GrowthRow } from "@/lib/child-growth-analysis";
import { createNutvitaDocumentBranding, createReportQrCode } from "@/lib/pdf-branding";
import { customNumericSeries, drawCompactIndicatorChart, numericSeries } from "@/lib/pdf-indicator-charts";

const wrap = (value: string, max = 92) => {
  const words = String(value || "").replace(/\s+/g, " ").trim().split(" "), lines: string[] = []; let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max) { if (line) lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line); return lines;
};
const date = (value: string | Date) => new Date(value).toLocaleDateString("fr-FR");

function chart(page: PDFPage, regular: PDFFont, bold: PDFFont, rows: GrowthRow[], key: "weight_kg" | "height_cm", y: number, label: string) {
  const points = rows.filter(row => Number.isFinite(Number(row[key]))).slice(-8);
  if (points.length < 2) return y;
  const left = 70, bottom = y - 140, width = 455, height = 100, values = points.map(row => Number(row[key])), min = Math.min(...values), span = Math.max(...values) - min || 1;
  page.drawText(label, { x: 50, y, size: 12, font: bold, color: rgb(.12, .49, .33) });
  page.drawLine({ start: { x: left, y: bottom }, end: { x: left + width, y: bottom }, thickness: 1, color: rgb(.7, .75, .73) });
  points.forEach((row, index) => {
    const x = left + index * width / (points.length - 1), py = bottom + (values[index] - min) / span * height;
    if (index) {
      const px = left + (index - 1) * width / (points.length - 1), previousY = bottom + (values[index - 1] - min) / span * height;
      page.drawLine({ start: { x: px, y: previousY }, end: { x, y: py }, thickness: 2.5, color: rgb(.1, .47, .31) });
    }
    page.drawCircle({ x, y: py, size: 3.5, color: rgb(.94, .42, .14) });
    page.drawText(`${values[index]}`, { x: x - 8, y: py + 7, size: 6, font: bold });
    page.drawText(date(row.measured_at).slice(0, 10), { x: x - 15, y: bottom - 13, size: 5.5, font: regular });
  });
  return bottom - 30;
}

export async function renderChildGrowthReport(child: GrowthRow, source: GrowthRow[], analysis: ChildGrowthAnalysis, period: { start: string; end: string }, metadata?: { reportId?: string; generatedAt?: string; feeding?: Record<string, any> | null; vaccination?: Record<string, any> | null }) {
  const generatedAt = metadata?.generatedAt || new Date().toISOString(), rows = [...source].sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at));
  const pdf = await PDFDocument.create(), regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), brand = await createNutvitaDocumentBranding(pdf);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const reportUrl = `${siteUrl}/espace-client/croissance-enfant?report=${encodeURIComponent(metadata?.reportId || "")}`;
  const drawQr = await createReportQrCode(pdf, reportUrl);
  let page = pdf.addPage([595, 842]), y = 670; brand(page);
  drawQr(page, "Scanner pour retrouver ce rapport");
  const addPage = () => { page = pdf.addPage([595, 842]); brand(page); y = 670; };
  const text = (value: string, size = 9, font = regular, color = rgb(.16, .23, .22)) => {
    for (const line of wrap(value, size >= 15 ? 60 : 92)) { if (y < 85) addPage(); page.drawText(line, { x: 50, y, size, font, color }); y -= size + 4; }
  };
  const heading = (value: string) => { if (y < 140) addPage(); y -= 7; text(value, 14, bold, rgb(.12, .49, .33)); };
  const bullets = (values: string[] | undefined, limit = 5) => (values || []).filter(Boolean).slice(0, limit).forEach(value => text(`- ${value}`, 8.5));

  text("Rapport de suivi de croissance", 20, bold, rgb(.07, .24, .19));
  text(child.full_name || "Enfant", 12, bold);
  text(`Genere le ${date(generatedAt)} | Periode analysee: ${date(period.start)} - ${date(period.end)}`, 9);
  text(`Reference: ${metadata?.reportId || "N/A"} | Nombre de visites: ${rows.length}`, 8, regular, rgb(.4, .45, .44));
  heading("Synthese pour le parent");
  text(analysis.summary, 10);
  if (analysis.attentionPoints?.length) { text("Points de vigilance", 10, bold, rgb(.72, .25, .12)); bullets(analysis.attentionPoints, 4); }
  if (analysis.positives?.length) { text("Elements favorables", 10, bold, rgb(.12, .49, .33)); bullets(analysis.positives, 3); }
  y -= 8;
  heading("Graphiques de tous les indicateurs renseignes");
  const chartSeries = [
    ...numericSeries(rows, [
      { key: "weight_kg", label: "Poids", unit: "kg" },
      { key: "height_cm", label: "Taille / longueur", unit: "cm" },
      { key: "bmi", label: "IMC" },
      { key: "head_circumference_cm", label: "Perimetre cranien", unit: "cm" },
      { key: "muac_cm", label: "PB / MUAC", unit: "cm" },
      { key: "weight_for_age_z", label: "Z-score poids-age" },
      { key: "height_for_age_z", label: "Z-score taille-age" },
      { key: "weight_for_height_z", label: "Z-score poids-taille" },
      { key: "bmi_for_age_z", label: "Z-score IMC-age" },
      { key: "head_circumference_for_age_z", label: "Z-score PC-age" },
    ]),
    ...customNumericSeries(rows),
    ...numericSeries(metadata?.feeding ? [metadata.feeding] : [], [
      { key: "diversity_score", label: "Diversite alimentaire", dateKey: "assessed_at" },
      { key: "solid_meals", label: "Frequence des repas solides", dateKey: "assessed_at" },
    ]),
    ...numericSeries(metadata?.vaccination ? [metadata.vaccination] : [], [
      { key: "received_count", label: "Vaccins recus", dateKey: "assessed_at" },
      { key: "due_count", label: "Vaccins attendus", dateKey: "assessed_at" },
    ]),
  ];
  for (let index = 0; index < chartSeries.length; index += 2) {
    if (y < 175) addPage();
    drawCompactIndicatorChart(page, regular, bold, chartSeries[index], 50, y);
    if (chartSeries[index + 1]) drawCompactIndicatorChart(page, regular, bold, chartSeries[index + 1], 315, y);
    y -= 112;
  }

  heading("Indicateurs prioritaires");
  const prioritized = [...analysis.indicatorInsights].sort((a, b) => ({ urgent: 0, watch: 1, incomplete: 2, usual: 3 }[a.status] - ({ urgent: 0, watch: 1, incomplete: 2, usual: 3 }[b.status]))).slice(0, 10);
  for (const item of prioritized) {
    text(`${item.indicator} | ${item.latest || "N/A"} | ${item.previousComparison || item.changeSummary || "N/A"}`, 8, bold);
    text(item.parentInterpretation, 8);
  }
  heading("Conseils pratiques prioritaires");
  bullets(analysis.practicalAdvice, 6);
  if (analysis.actionPlan?.days30?.length) { text("Dans les 30 prochains jours", 9, bold); bullets(analysis.actionPlan.days30, 4); }

  heading("Note professionnelle");
  text(analysis.professionalSummary, 9);
  for (const item of analysis.indicatorInsights.filter(item => item.status === "urgent" || item.status === "watch").slice(0, 6)) {
    text(`${item.indicator} [${item.status}]`, 9, bold);
    text(item.professionalInterpretation, 8);
    bullets(item.professionalRecommendations, 2);
  }
  heading("Facteurs contextuels documentes");
  for (const item of (analysis.influencingFactors || []).filter(item => item.status !== "missing").slice(0, 6)) text(`${item.factor}: ${item.analysis}`, 8);
  heading("Qualite des donnees et limites");
  bullets(analysis.limitations, 6);
  text("Ce rapport automatise accompagne le suivi de croissance. Il ne remplace pas l examen clinique, le diagnostic pediatrique ni l interpretation des courbes OMS par un professionnel qualifie.", 8, regular, rgb(.58, .3, .13));
  for (const [index, current] of pdf.getPages().entries()) current.drawText(`NutVitaGlobalis - page ${index + 1}/${pdf.getPageCount()} - ${date(generatedAt)}`, { x: 50, y: 60, size: 7, font: regular, color: rgb(.45, .45, .45) });
  return pdf.save();
}
