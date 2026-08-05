import { rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type IndicatorPoint = { date: string | Date; value: number };
export type IndicatorSeries = { key: string; label: string; unit?: string; points: IndicatorPoint[] };

export function numericSeries(
  rows: Record<string, any>[],
  definitions: Array<{ key: string; label: string; unit?: string; dateKey?: string }>,
) {
  return definitions.flatMap(definition => {
    const points = rows
      .map(row => ({ date: row[definition.dateKey || "measured_at"], value: Number(row[definition.key]) }))
      .filter(point => point.date && Number.isFinite(point.value))
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    return points.length ? [{ ...definition, points }] : [];
  });
}

export function customNumericSeries(rows: Record<string, any>[], dateKey = "measured_at") {
  const definitions = new Map<string, { label: string; unit?: string; points: IndicatorPoint[] }>();
  for (const row of rows) {
    for (const [key, raw] of Object.entries(row.custom_values || {})) {
      const item = raw && typeof raw === "object" ? raw as Record<string, any> : { value: raw };
      const value = Number(item.value);
      if (!row[dateKey] || !Number.isFinite(value)) continue;
      const current = definitions.get(key) || { label: key, unit: String(item.unit || ""), points: [] };
      current.points.push({ date: row[dateKey], value });
      definitions.set(key, current);
    }
  }
  return [...definitions.entries()].map(([key, value]) => ({
    key: `custom_${key}`,
    label: value.label,
    unit: value.unit,
    points: value.points.sort((a, b) => +new Date(a.date) - +new Date(b.date)),
  }));
}

export function drawCompactIndicatorChart(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  series: IndicatorSeries,
  x: number,
  y: number,
  locale: "fr" | "en" = "fr",
) {
  const width = 225, height = 72, left = x + 13, bottom = y - height;
  const values = series.points.map(point => point.value);
  const min = Math.min(...values), max = Math.max(...values), span = max - min || Math.max(Math.abs(max) * .1, 1);
  page.drawText(series.label.slice(0, 25), { x, y: y + 13, size: 8.5, font: bold, color: rgb(.07, .24, .19) });
  const latestLabel = `${values.at(-1)?.toFixed(2)}${series.unit ? ` ${series.unit}` : ""}`;
  page.drawText(latestLabel, { x: x + width - 10 - bold.widthOfTextAtSize(latestLabel, 7), y: y + 13, size: 7, font: bold, color: rgb(.94, .42, .14) });
  page.drawRectangle({ x, y: bottom - 15, width, height: height + 18, borderWidth: .6, borderColor: rgb(.82, .86, .85) });
  page.drawLine({ start: { x: left, y: bottom }, end: { x: x + width - 10, y: bottom }, thickness: .5, color: rgb(.7, .75, .73) });
  const pointX = (index: number) => series.points.length === 1 ? x + width / 2 : left + index * (width - 28) / (series.points.length - 1);
  const pointY = (value: number) => bottom + 10 + (value - min) / span * (height - 22);
  series.points.forEach((point, index) => {
    const px = pointX(index), py = pointY(point.value);
    if (index) page.drawLine({ start: { x: pointX(index - 1), y: pointY(series.points[index - 1].value) }, end: { x: px, y: py }, thickness: 1.8, color: rgb(.1, .47, .31) });
    page.drawCircle({ x: px, y: py, size: 2.6, color: rgb(.94, .42, .14) });
  });
  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  const first = new Date(series.points[0].date).toLocaleDateString(dateLocale);
  const last = new Date(series.points.at(-1)!.date).toLocaleDateString(dateLocale);
  page.drawText(first, { x: left, y: bottom - 10, size: 5.5, font: regular, color: rgb(.4, .45, .44) });
  page.drawText(last, { x: x + width - 62, y: bottom - 10, size: 5.5, font: regular, color: rgb(.4, .45, .44) });
}

// === Styled report cards: chart (left) + narrative analysis (right), matching the "Tendances" dashboard look ===

export type ReportCardInsight = {
  indicator?: string;
  reference?: string;
  recommendation?: string;
  professionalRecommendations?: string[];
  publicInterpretation?: string;
  professionalInterpretation?: string;
  status?: "stable" | "improving" | "watch" | "urgent" | "incomplete" | string;
};

function normalizeLabel(value: string) {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchInsightForSeries<T extends { indicator?: string }>(series: IndicatorSeries, insights: T[]): T | undefined {
  const target = normalizeLabel(series.label);
  if (!target) return undefined;
  return insights.find(item => {
    const label = normalizeLabel(String(item.indicator || ""));
    return label.length > 2 && (label.includes(target) || target.includes(label));
  });
}

function toneColor(status?: string) {
  if (status === "urgent") return rgb(.72, .25, .12);
  if (status === "watch") return rgb(.86, .48, .1);
  return rgb(.12, .49, .33);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(value < 10 ? 2 : 1);
}

function drawTrendChart(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  series: IndicatorSeries,
  x: number,
  top: number,
  width: number,
  height: number,
  locale: "fr" | "en",
) {
  const points = series.points;
  const values = points.map(point => point.value);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || Math.max(Math.abs(max) * .1, 1);
  const lo = min - span * .12, hi = max + span * .12, plotSpan = hi - lo || 1;
  const left = x + 34, right = x + width - 6, plotTop = top - 16, plotBottom = top - height + 16;
  const plotHeight = plotTop - plotBottom;

  page.drawRectangle({ x, y: plotBottom - 18, width, height: height + 2, color: rgb(1, 1, 1), borderColor: rgb(.85, .89, .88), borderWidth: .6 });
  const dot = series.points.length ? "#0f5132" : "";
  page.drawCircle({ x: right - 46, y: top - 4, size: 3, color: rgb(.1, .47, .31) });
  const legend = `${series.label}${series.unit ? ` (${series.unit})` : ""}`.slice(0, 26);
  page.drawText(legend, { x: right - 40, y: top - 7, size: 6, font: bold, color: rgb(.28, .32, .31) });

  for (let index = 0; index <= 3; index += 1) {
    const value = lo + plotSpan * index / 3;
    const gy = plotBottom + plotHeight * index / 3;
    page.drawLine({ start: { x: left, y: gy }, end: { x: right, y: gy }, thickness: .35, color: rgb(.88, .91, .9) });
    page.drawText(formatNumber(value), { x: x + 2, y: gy - 2, size: 5.2, font: regular, color: rgb(.45, .5, .49) });
  }
  page.drawLine({ start: { x: left, y: plotBottom }, end: { x: left, y: plotTop }, thickness: .6, color: rgb(.35, .4, .39) });
  page.drawLine({ start: { x: left, y: plotBottom }, end: { x: right, y: plotBottom }, thickness: .6, color: rgb(.35, .4, .39) });

  const px = (index: number) => points.length === 1 ? (left + right) / 2 : left + index * (right - left) / (points.length - 1);
  const py = (value: number) => plotBottom + (value - lo) / plotSpan * plotHeight;
  points.forEach((point, index) => {
    if (index) page.drawLine({ start: { x: px(index - 1), y: py(points[index - 1].value) }, end: { x: px(index), y: py(point.value) }, thickness: 2, color: rgb(.1, .47, .31) });
  });
  points.forEach((point, index) => page.drawCircle({ x: px(index), y: py(point.value), size: 3, color: rgb(1, 1, 1), borderColor: rgb(.1, .47, .31), borderWidth: 1.6 }));

  const dateLocale = locale === "en" ? "en-GB" : "fr-FR";
  page.drawText(new Date(points[0].date).toLocaleDateString(dateLocale), { x: left, y: plotBottom - 11, size: 5, font: regular, color: rgb(.45, .5, .49) });
  const lastLabel = new Date(points.at(-1)!.date).toLocaleDateString(dateLocale);
  page.drawText(lastLabel, { x: right - regular.widthOfTextAtSize(lastLabel, 5), y: plotBottom - 11, size: 5, font: regular, color: rgb(.45, .5, .49) });
  void dot;
}

/**
 * Draws one report card: trend chart on the left, narrative analysis (current value, vs reference,
 * vs last measurement, vs first measurement, recommendation) on the right. Returns the y position
 * to continue drawing below the card.
 */
export function drawIndicatorReportCard(
  page: PDFPage,
  regular: PDFFont,
  bold: PDFFont,
  series: IndicatorSeries,
  insight: ReportCardInsight | undefined,
  x: number,
  y: number,
  wrapFn: (value: string, max: number) => string[],
  locale: "fr" | "en" = "fr",
) {
  const fr = locale !== "en";
  const width = 495, chartWidth = 205, gap = 14, padding = 12;
  const textX = x + chartWidth + gap + padding, textWidth = width - chartWidth - gap - padding * 2;
  const wrapChars = Math.round(textWidth / 3.6);

  const points = series.points;
  const latest = points.at(-1)!.value, previous = points.length > 1 ? points.at(-2)!.value : null, first = points[0].value;
  const unit = series.unit ? ` ${series.unit}` : "";
  const deltaText = (from: number, to: number) => { const delta = to - from; return `${delta > 0 ? "+" : ""}${formatNumber(delta)}${unit}`; };

  type Line = { text: string; bold?: boolean; color?: ReturnType<typeof rgb> };
  const lines: Line[] = [];
  lines.push({ text: series.label, bold: true, color: rgb(.07, .24, .19) });
  lines.push({ text: `${fr ? "Valeur actuelle" : "Current value"} : ${formatNumber(latest)}${unit}` });
  if (insight?.reference) wrapFn(`${fr ? "Reference" : "Reference"} : ${insight.reference}`, wrapChars).forEach(text => lines.push({ text }));
  if (previous !== null) lines.push({ text: `${fr ? "Vs derniere mesure" : "Vs last measurement"} : ${deltaText(previous, latest)}` });
  if (points.length > 2) lines.push({ text: `${fr ? "Depuis le debut du suivi" : "Since monitoring began"} : ${deltaText(first, latest)}` });
  const recommendation = insight?.recommendation || insight?.professionalRecommendations?.[0] || insight?.publicInterpretation;
  if (recommendation) {
    lines.push({ text: fr ? "Recommandation" : "Recommendation", bold: true, color: toneColor(insight?.status) });
    wrapFn(recommendation, wrapChars).slice(0, 3).forEach(text => lines.push({ text }));
  }

  const lineHeight = 11.5;
  const chartHeight = 105;
  const textHeight = lines.length * lineHeight + 14;
  const cardHeight = Math.max(chartHeight + padding, textHeight) + padding;
  const top = y;

  page.drawRectangle({ x, y: top - cardHeight, width, height: cardHeight, color: rgb(.985, .99, .988), borderColor: rgb(.83, .87, .86), borderWidth: .7 });
  page.drawRectangle({ x, y: top - cardHeight, width: 4, height: cardHeight, color: toneColor(insight?.status) });

  drawTrendChart(page, regular, bold, series, x + padding + 4, top - padding, chartWidth, chartHeight, locale);

  let lineY = top - padding - 8;
  for (const line of lines) {
    page.drawText(line.text.slice(0, 70), { x: textX, y: lineY, size: line.bold ? 8.5 : 7.8, font: line.bold ? bold : regular, color: line.color || rgb(.2, .25, .24) });
    lineY -= lineHeight;
  }

  return top - cardHeight - 10;
}
