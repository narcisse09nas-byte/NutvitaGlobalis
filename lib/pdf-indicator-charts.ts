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
  page.drawText(series.label.slice(0, 38), { x, y: y + 13, size: 8.5, font: bold, color: rgb(.07, .24, .19) });
  page.drawText(`${values.at(-1)?.toFixed(2)}${series.unit ? ` ${series.unit}` : ""}`, { x: x + 155, y: y + 13, size: 7, font: bold, color: rgb(.94, .42, .14) });
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
