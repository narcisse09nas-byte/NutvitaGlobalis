import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ChildGrowthAnalysis, GrowthRow } from "@/lib/child-growth-analysis";
import { createNutvitaDocumentBranding } from "@/lib/pdf-branding";

const wrap = (text: string, max = 88) => {
  const words = text.split(/\s+/), lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
};

function chart(page: PDFPage, font: PDFFont, title: string, rows: GrowthRow[], xKey: string, yKey: string, x: number, y: number, width = 230, height = 105) {
  const valid = rows.filter(row => Number.isFinite(Number(row[xKey])) && Number.isFinite(Number(row[yKey])));
  page.drawText(title, { x, y: y + height + 10, size: 9, font, color: rgb(.07, .24, .19) });
  page.drawRectangle({ x, y, width, height, borderWidth: 1, borderColor: rgb(.82, .86, .85) });
  if (valid.length < 1) {
    page.drawText("Donnees insuffisantes", { x: x + 15, y: y + 45, size: 8, font, color: rgb(.45, .48, .47) });
    return;
  }
  const xs = valid.map(row => Number(row[xKey])), ys = valid.map(row => Number(row[yKey]));
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const xspan = xmax - xmin || 1, yspan = ymax - ymin || 1;
  const px = (value: number) => x + 10 + (value - xmin) / xspan * (width - 20);
  const py = (value: number) => y + 10 + (value - ymin) / yspan * (height - 20);
  for (let index = 1; index < valid.length; index++) {
    page.drawLine({ start: { x: px(xs[index - 1]), y: py(ys[index - 1]) }, end: { x: px(xs[index]), y: py(ys[index]) }, thickness: 2, color: rgb(.1, .47, .31) });
  }
  for (let index = 0; index < valid.length; index++) page.drawCircle({ x: px(xs[index]), y: py(ys[index]), size: 2.5, color: rgb(.95, .48, .12) });
}

export async function renderChildGrowthReport(child: GrowthRow, rows: GrowthRow[], analysis: ChildGrowthAnalysis, period: { start: string; end: string }) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = await createNutvitaDocumentBranding(pdf);
  let page = pdf.addPage([595, 842]), y = 670;
  brand(page);

  const newPage = () => {
    page = pdf.addPage([595, 842]);
    brand(page);
    y = 670;
  };
  const text = (value: string, size = 10, font = regular, color = rgb(.16, .23, .22)) => {
    for (const line of wrap(value, size > 15 ? 58 : 88)) {
      if (y < 85) newPage();
      page.drawText(line, { x: 50, y, size, font, color });
      y -= size + 5;
    }
  };

  text("NutVitaGlobalis - Rapport de croissance enfant", 19, bold, rgb(.07, .24, .19));
  text(`${child.full_name} - ${period.start} au ${period.end}`, 10, regular, rgb(.4, .45, .44));
  text(`Date de naissance : ${new Date(child.birth_date).toLocaleDateString("fr-FR")} | Sexe : ${child.sex}`, 9);
  y -= 12;
  text("Resume pour les parents", 14, bold, rgb(.12, .49, .33));
  text(analysis.summary);
  for (const positive of analysis.positives) text(`+ ${positive}`, 9);
  for (const point of analysis.attentionPoints) text(`! ${point}`, 9, regular, rgb(.65, .3, .08));
  y -= 8;

  if (y < 360) newPage();
  text("Graphiques de croissance", 14, bold, rgb(.12, .49, .33));
  y -= 5;
  chart(page, bold, "Poids-age", rows, "age_months", "weight_kg", 50, y - 130);
  chart(page, bold, "Taille-age", rows, "age_months", "height_cm", 315, y - 130);
  y -= 160;
  chart(page, bold, "Poids-taille", rows, "height_cm", "weight_kg", 50, y - 130);
  chart(page, bold, "IMC-age", rows, "age_months", "bmi", 315, y - 130);
  y -= 160;
  chart(page, bold, "Perimetre cranien-age", rows, "age_months", "head_circumference_cm", 50, y - 130);
  chart(page, bold, "MUAC-age", rows, "age_months", "muac_cm", 315, y - 130);
  y -= 165;

  text("Mesures enregistrees", 14, bold, rgb(.12, .49, .33));
  for (const row of rows.slice(-12)) {
    text(`${new Date(row.measured_at).toLocaleDateString("fr-FR")} | age ${format(row.age_months)} mois | poids ${format(row.weight_kg)} kg | taille ${format(row.height_cm)} cm | IMC ${format(row.bmi)} | MUAC ${format(row.muac_cm)} cm | risque ${row.risk_category || "non classe"}`, 8);
  }
  y -= 8;
  text("Conseils aux parents", 14, bold, rgb(.12, .49, .33));
  for (const advice of analysis.parentAdvice) text(`${advice.category} - ${advice.text}`, 9);
  if (analysis.alerts.length) {
    y -= 8;
    text("Alertes a verifier", 14, bold, rgb(.7, .2, .15));
    for (const alert of analysis.alerts) text(`${alert.title}: ${alert.message}`, 9);
  }
  text("Ce rapport automatise ne constitue pas un diagnostic. Toute alerte doit etre interpretee par un professionnel qualifie.", 8, regular, rgb(.55, .3, .15));
  for (const [index, current] of pdf.getPages().entries()) current.drawText(`NutVitaGlobalis - page ${index + 1}/${pdf.getPageCount()}`, { x: 50, y: 72, size: 8, font: regular, color: rgb(.45, .45, .45) });
  return pdf.save();
}

function format(value: any) {
  return value === null || value === undefined ? "-" : Number(value).toFixed(1);
}
