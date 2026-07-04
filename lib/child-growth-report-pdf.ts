import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { ChildGrowthAnalysis, GrowthRow } from "@/lib/child-growth-analysis";
import { createNutvitaDocumentBranding, createReportQrCode } from "@/lib/pdf-branding";
import { customNumericSeries, drawCompactIndicatorChart, numericSeries } from "@/lib/pdf-indicator-charts";
import { buildWhoGrowthCurve, whoCurveDefinitions, type WhoCurveKey, type WhoGrowthReference } from "@/lib/who-growth-curves";

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

export async function renderChildGrowthReport(child: GrowthRow, source: GrowthRow[], analysis: ChildGrowthAnalysis, period: { start: string; end: string }, metadata?: { reportId?: string; generatedAt?: string; userEmail?: string; feeding?: Record<string, any> | null; vaccination?: Record<string, any> | null; growthStandards?: WhoGrowthReference[] }) {
  const generatedAt = metadata?.generatedAt || new Date().toISOString(), rows = [...source].sort((a, b) => +new Date(a.measured_at) - +new Date(b.measured_at));
  const pdf = await PDFDocument.create(), regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold), brand = await createNutvitaDocumentBranding(pdf);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const sourcePath = `/espace-client/croissance-enfant?report=${encodeURIComponent(metadata?.reportId || "")}`;
  const loginParameters = new URLSearchParams({ redirect: sourcePath });
  if (metadata?.userEmail) loginParameters.set("identifiant", metadata.userEmail);
  const reportUrl = `${siteUrl}/connexion?${loginParameters.toString()}`;
  const drawQr = await createReportQrCode(pdf, reportUrl);
  let page = pdf.addPage([595, 842]), y = 670; const firstPage = page; brand(page);
  drawQr(page, "Scanner pour retrouver ce rapport");
  const addPage = () => { page = pdf.addPage([595, 842]); brand(page); y = 670; };
  const text = (value: string, size = 9, font = regular, color = rgb(.16, .23, .22)) => {
    const lineWidth = page === firstPage && y > 585 ? (size >= 15 ? 42 : 68) : (size >= 15 ? 60 : 92);
    for (const line of wrap(value, lineWidth)) { if (y < 85) addPage(); page.drawText(line, { x: 50, y, size, font, color }); y -= size + 4; }
  };
  const heading = (value: string) => { if (y < 140) addPage(); y -= 7; text(value, 14, bold, rgb(.12, .49, .33)); };
  const bullets = (values: string[] | undefined, limit = 5) => (values || []).filter(Boolean).slice(0, limit).forEach(value => text(`- ${value}`, 8.5));
  const unique = (values: string[] | undefined) => [...new Map((values || []).filter(Boolean).map(value => [value.trim().toLowerCase(), value.trim()])).values()];
  const twoColumnCards = (items: Array<{ title: string; body: string; lines?: string[]; tone?: "urgent" | "watch" | "usual" }>) => {
    const columns = [{ x: 50, width: 238 }, { x: 307, width: 238 }];
    for (let index = 0; index < items.length; index += 2) {
      const pair = items.slice(index, index + 2);
      const prepared = pair.map(item => {
        const bodyLines = wrap(item.body, 43);
        const detailLines = unique(item.lines).flatMap(line => wrap(`- ${line}`, 43));
        return { ...item, bodyLines, detailLines, height: 31 + (bodyLines.length + detailLines.length) * 10 };
      });
      const height = Math.max(...prepared.map(item => item.height));
      if (y - height < 85) addPage();
      const top = y;
      prepared.forEach((item, columnIndex) => {
        const { x, width } = columns[columnIndex];
        const accent = item.tone === "urgent" ? rgb(.72, .25, .12) : item.tone === "watch" ? rgb(.86, .48, .1) : rgb(.12, .49, .33);
        page.drawRectangle({ x, y: top - height + 5, width, height, color: rgb(.975, .982, .98), borderColor: rgb(.82, .86, .85), borderWidth: .7 });
        page.drawRectangle({ x, y: top - height + 5, width: 4, height, color: accent });
        page.drawText(item.title.slice(0, 48), { x: x + 12, y: top - 15, size: 8.5, font: bold, color: accent });
        let lineY = top - 29;
        [...item.bodyLines, ...item.detailLines].forEach(line => {
          page.drawText(line, { x: x + 12, y: lineY, size: 7.5, font: regular, color: rgb(.2, .25, .24) });
          lineY -= 10;
        });
      });
      y = top - height - 9;
    }
  };
  const drawWhoChart = (key: WhoCurveKey) => {
    const definition = whoCurveDefinitions[key];
    const measurementMethod = rows.at(-1)?.measurement_method;
    const reference = buildWhoGrowthCurve(metadata?.growthStandards || [], key, String(child.sex), measurementMethod);
    const points = rows
      .filter(row => Number.isFinite(Number(row[definition.xKey])) && Number.isFinite(Number(row[definition.yKey])))
      .map(row => ({ x: Number(row[definition.xKey]), y: Number(row[definition.yKey]), date: row.measured_at }));
    if (!reference.length || !points.length) return false;
    if (y < 225) addPage();
    const chartTop = y - 18, chartBottom = chartTop - 145, left = 72, right = 515;
    const allX = [...reference.map(item => item.x), ...points.map(item => item.x)];
    const allY = [...reference.flatMap(item => [item.sd3neg, item.sd3]), ...points.map(item => item.y)];
    const xMin = Math.min(...allX), xMax = Math.max(...allX), yMin = Math.max(0, Math.min(...allY)), yMax = Math.max(...allY);
    const x = (value: number) => left + (value - xMin) / (xMax - xMin || 1) * (right - left);
    const py = (value: number) => chartBottom + (value - yMin) / (yMax - yMin || 1) * (chartTop - chartBottom);
    page.drawText(`${definition.label} - Standards OMS 2006 (${child.sex === "female" ? "filles" : "garcons"})`, { x: 50, y, size: 10, font: bold, color: rgb(.07, .24, .19) });
    for (let index = 0; index <= 5; index += 1) {
      const gx = left + (right - left) * index / 5, gy = chartBottom + (chartTop - chartBottom) * index / 5;
      page.drawLine({ start: { x: gx, y: chartBottom }, end: { x: gx, y: chartTop }, thickness: .35, color: rgb(.89, .92, .91) });
      page.drawLine({ start: { x: left, y: gy }, end: { x: right, y: gy }, thickness: .35, color: rgb(.89, .92, .91) });
      page.drawText((xMin + (xMax - xMin) * index / 5).toFixed(0), { x: gx - 6, y: chartBottom - 12, size: 5.5, font: regular, color: rgb(.4, .45, .44) });
      page.drawText((yMin + (yMax - yMin) * index / 5).toFixed(1), { x: left - 24, y: gy - 2, size: 5.5, font: regular, color: rgb(.4, .45, .44) });
    }
    const curves = [
      ["sd3neg", "-3 DS"], ["sd2neg", "-2 DS"], ["sd1neg", "-1 DS"],
      ["median", "Mediane"], ["sd1", "+1 DS"], ["sd2", "+2 DS"], ["sd3", "+3 DS"],
    ] as const;
    curves.forEach(([field, label], curveIndex) => {
      const color = field === "median" ? rgb(.08, .5, .27) : Math.abs(curveIndex - 3) >= 2 ? rgb(.78, .35, .42) : rgb(.47, .4, .7);
      reference.slice(1).forEach((item, index) => page.drawLine({
        start: { x: x(reference[index].x), y: py(reference[index][field]) },
        end: { x: x(item.x), y: py(item[field]) },
        thickness: field === "median" ? 1.8 : .75,
        color,
        dashArray: field === "median" ? undefined : [3, 2],
      }));
      const last = reference.at(-1)!;
      page.drawText(label, { x: right + 5, y: py(last[field]) - 2, size: 5.5, font: field === "median" ? bold : regular, color });
    });
    points.slice(1).forEach((point, index) => page.drawLine({ start: { x: x(points[index].x), y: py(points[index].y) }, end: { x: x(point.x), y: py(point.y) }, thickness: 2.2, color: rgb(.92, .25, .55) }));
    points.forEach(point => page.drawCircle({ x: x(point.x), y: py(point.y), size: 3.2, color: rgb(1, 1, 1), borderColor: rgb(.92, .25, .55), borderWidth: 1.8 }));
    page.drawText(definition.xLabel, { x: 270, y: chartBottom - 24, size: 6.5, font: bold, color: rgb(.25, .3, .29) });
    page.drawText(definition.yLabel, { x: 50, y: chartTop + 2, size: 6.5, font: bold, color: rgb(.25, .3, .29) });
    y = chartBottom - 34;
    return true;
  };

  text("Rapport de suivi de croissance", 20, bold, rgb(.07, .24, .19));
  text(child.full_name || "Enfant", 12, bold);
  text(`Genere le ${date(generatedAt)} | Periode analysee: ${date(period.start)} - ${date(period.end)}`, 9);
  text(`Reference: ${metadata?.reportId || "N/A"} | Nombre de visites: ${rows.length}`, 8, regular, rgb(.4, .45, .44));
  heading("Synthese pour le parent");
  text(analysis.summary, 10);
  if (analysis.attentionPoints?.length) { text("Points de vigilance", 10, bold, rgb(.72, .25, .12)); bullets(analysis.attentionPoints, 4); }
  if (analysis.positives?.length) { text("Elements favorables", 10, bold, rgb(.12, .49, .33)); bullets(analysis.positives, 3); }
  y -= 8;
  heading("Courbes de croissance OMS et indicateurs renseignes");
  const whoChartsDrawn = new Set<WhoCurveKey>();
  (["weightAge", "heightAge", "weightHeight"] as WhoCurveKey[]).forEach(key => {
    if (drawWhoChart(key)) whoChartsDrawn.add(key);
  });
  const chartSeries = [
    ...numericSeries(rows, [
      ...(!whoChartsDrawn.has("weightAge") ? [{ key: "weight_kg", label: "Poids", unit: "kg" }] : []),
      ...(!whoChartsDrawn.has("heightAge") ? [{ key: "height_cm", label: "Taille / longueur", unit: "cm" }] : []),
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
  twoColumnCards(prioritized.map(item => ({
    title: `${item.indicator} | ${item.latest || "N/A"}`,
    body: `${item.previousComparison || item.changeSummary || "N/A"}. ${item.parentInterpretation}`,
    tone: item.status === "urgent" ? "urgent" : item.status === "watch" ? "watch" : "usual",
  })));
  heading("Conseils pratiques prioritaires");
  const practicalAdvice = unique(analysis.practicalAdvice).slice(0, 6);
  bullets(practicalAdvice, 6);
  const adviceKeys = new Set(practicalAdvice.map(value => value.toLowerCase()));
  const days30 = unique(analysis.actionPlan?.days30).filter(value => !adviceKeys.has(value.toLowerCase())).slice(0, 4);
  if (days30.length) { text("Dans les 30 prochains jours", 9, bold); bullets(days30, 4); }

  heading("Note professionnelle");
  text(analysis.professionalSummary, 9);
  twoColumnCards(analysis.indicatorInsights.filter(item => item.status === "urgent" || item.status === "watch").slice(0, 6).map(item => ({
    title: `${item.indicator} [${item.status}]`,
    body: item.professionalInterpretation,
    lines: item.professionalRecommendations?.slice(0, 2),
    tone: item.status === "urgent" ? "urgent" : "watch",
  })));
  heading("Facteurs contextuels documentes");
  twoColumnCards((analysis.influencingFactors || []).filter(item => item.status !== "missing").slice(0, 6).map(item => ({
    title: item.factor,
    body: item.analysis,
    tone: "usual",
  })));
  heading("Qualite des donnees et limites");
  bullets(analysis.limitations, 6);
  text("Ce rapport automatise accompagne le suivi de croissance. Il ne remplace pas l examen clinique, le diagnostic pediatrique ni l interpretation des courbes OMS par un professionnel qualifie.", 8, regular, rgb(.58, .3, .13));
  for (const [index, current] of pdf.getPages().entries()) current.drawText(`NutVitaGlobalis - page ${index + 1}/${pdf.getPageCount()} - ${date(generatedAt)}`, { x: 50, y: 60, size: 7, font: regular, color: rgb(.45, .45, .45) });
  return pdf.save();
}
