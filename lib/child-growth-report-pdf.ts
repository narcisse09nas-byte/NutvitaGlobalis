import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import type { ChildGrowthAnalysis, GrowthIndicatorInsight, GrowthRow } from "@/lib/child-growth-analysis";
import { createNutvitaDocumentBranding } from "@/lib/pdf-branding";

const wrap = (value: string, max = 88) => {
  const words = String(value || "").split(/\s+/), lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max) { if (line) lines.push(line); line = word; }
    else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
};

const numeric = (value: string) => {
  const match = String(value).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};

function ageExact(birthDate: string, at: string) {
  const birth = new Date(birthDate), date = new Date(at);
  if (Number.isNaN(+birth) || Number.isNaN(+date)) return "N/A";
  const totalMonths = Math.max(0, Math.floor((date.getTime() - birth.getTime()) / 2629800000));
  return `${Math.floor(totalMonths / 12)} an(s), ${totalMonths % 12} mois`;
}

function historyChart(page: PDFPage, regular: PDFFont, bold: PDFFont, item: GrowthIndicatorInsight, x: number, y: number, width = 470, height = 130) {
  const points = (item.history || []).map(point => ({ ...point, numeric: numeric(point.value) })).filter(point => point.numeric !== null) as Array<{ date: string; value: string; numeric: number }>;
  page.drawText(`${item.indicator} - visites et tendance`, { x, y: y + height + 12, size: 9, font: bold, color: rgb(.07, .24, .19) });
  page.drawRectangle({ x, y, width, height, borderWidth: 1, borderColor: rgb(.78, .83, .81) });
  if (points.length < 2) {
    page.drawText("N/A: au moins deux valeurs numeriques sont requises.", { x: x + 18, y: y + height / 2, size: 8, font: regular, color: rgb(.55, .3, .15) });
    return;
  }
  const values = points.map(point => point.numeric);
  const isZ = item.latest?.toLowerCase().includes(" z") || item.indicator.toLowerCase().includes("pour-age") || item.indicator.toLowerCase().includes("pour-taille");
  const minimum = isZ ? Math.min(-4, ...values) : Math.min(...values);
  const maximum = isZ ? Math.max(4, ...values) : Math.max(...values);
  const span = maximum - minimum || 1;
  const px = (index: number) => x + 18 + index * (width - 36) / (points.length - 1);
  const py = (value: number) => y + 18 + (value - minimum) / span * (height - 36);
  if (isZ) {
    const normalBottom = py(-2), normalTop = py(2);
    page.drawRectangle({ x: x + 1, y: normalBottom, width: width - 2, height: normalTop - normalBottom, color: rgb(.9, .97, .92), opacity: .6 });
    for (const threshold of [-3, -2, 0, 2, 3]) {
      page.drawLine({ start: { x, y: py(threshold) }, end: { x: x + width, y: py(threshold) }, thickness: threshold === 0 ? 1 : .5, color: threshold === -2 || threshold === 2 ? rgb(.94, .42, .14) : rgb(.7, .75, .73), dashArray: [3, 3] });
      page.drawText(`${threshold}z`, { x: x + 2, y: py(threshold) + 2, size: 5, font: regular });
    }
  }
  for (let index = 0; index < points.length; index++) {
    const pointX = px(index), pointY = py(points[index].numeric);
    if (index) page.drawLine({ start: { x: px(index - 1), y: py(points[index - 1].numeric) }, end: { x: pointX, y: pointY }, thickness: 2, color: rgb(.1, .47, .31) });
    page.drawCircle({ x: pointX, y: pointY, size: 3, color: rgb(.94, .42, .14) });
    page.drawText(String(points[index].numeric), { x: pointX - 8, y: pointY + 7, size: 6, font: bold });
    page.drawText(points[index].date.slice(0, 10), { x: pointX - 12, y: y + 5, size: 5, font: regular });
  }
}

export async function renderChildGrowthReport(
  child: GrowthRow,
  rows: GrowthRow[],
  analysis: ChildGrowthAnalysis,
  period: { start: string; end: string },
  metadata?: { reportId?: string },
) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const brand = await createNutvitaDocumentBranding(pdf);
  let page = pdf.addPage([595, 842]), y = 670;
  brand(page);
  const newPage = () => { page = pdf.addPage([595, 842]); brand(page); y = 670; };
  const text = (value: string, size = 10, font = regular, color = rgb(.16, .23, .22)) => {
    for (const line of wrap(value, size > 15 ? 58 : 88)) {
      if (y < 85) newPage();
      page.drawText(line, { x: 50, y, size, font, color });
      y -= size + 5;
    }
  };
  const heading = (value: string, size = 14) => { if (y < 145) newPage(); text(value, size, bold, rgb(.12, .49, .33)); };
  const bullets = (values: string[] | undefined, size = 9) => { for (const value of values?.length ? values : ["N/A"]) text(`- ${value}`, size); };
  const reportId = metadata?.reportId || "N/A";
  const latest = rows.at(-1);

  text("NutVitaGlobalis Child Growth Intelligence Engine", 19, bold, rgb(.07, .24, .19));
  text("Rapport automatise de suivi de croissance de l enfant", 14, bold, rgb(.12, .49, .33));
  y -= 12;
  text(`Nom: ${child.full_name || "N/A"}`, 11, bold);
  text(`Sexe: ${child.sex || "N/A"} | Date de naissance: ${child.birth_date ? new Date(child.birth_date).toLocaleDateString("fr-FR") : "N/A"}`, 9);
  text(`Age exact: ${ageExact(child.birth_date, period.end)} | Lieu: ${[child.city, child.region, child.country].filter(Boolean).join(", ") || "N/A"}`, 9);
  text(`Date de consultation: ${period.end} | Numero du rapport: ${reportId}`, 9);
  text(`Version IA: ${analysis.aiVersion || "NCGIE v1.0"}`, 9);
  const qrTarget = `${process.env.NEXT_PUBLIC_SITE_URL || "https://nutvitaglobalis.com"}/espace-client/croissance-enfant?report=${encodeURIComponent(reportId)}`;
  const qr = await pdf.embedPng(await QRCode.toBuffer(qrTarget, { type: "png", width: 180, margin: 1 }));
  page.drawImage(qr, { x: 425, y: 480, width: 105, height: 105 });
  y -= 25;
  text("Document pediatrique confidentiel - interpretation professionnelle requise", 10, bold, rgb(.65, .3, .08));

  newPage();
  heading("Sommaire", 18);
  bullets([
    "1. Resume executif", "2. NutVita Child Growth Score", "3. Tableau de bord",
    "4. Analyse detaillee", "5. Analyse des courbes OMS", "6. Histoire de la croissance",
    "7. Facteurs influencant la croissance", "8. Developpement de l enfant",
    "9. Plan personnalise", "10. Alertes", "11. Version professionnelle",
    "12. Limites", "13. Avertissement",
  ], 10);

  heading("1. Resume executif");
  text(analysis.summary, 10);
  if (analysis.positives.length) { text("Principaux progres", 9, bold); bullets(analysis.positives, 8); }
  if (analysis.attentionPoints.length) { text("Principaux risques et defis", 9, bold, rgb(.65, .3, .08)); bullets(analysis.attentionPoints, 8); }
  text("Principaux objectifs", 9, bold); bullets(analysis.practicalAdvice.slice(0, 4), 8);

  heading("2. NutVita Child Growth Score");
  const scoreColor = analysis.scoreColor === "green" ? rgb(.12, .55, .3) : analysis.scoreColor === "red" ? rgb(.75, .16, .12) : rgb(.94, .42, .14);
  text(`${analysis.globalScore ?? "N/A"}/100 | ***** | ${(analysis.scoreColor || "N/A").toUpperCase()}`, 18, bold, scoreColor);
  for (const [domain, score] of Object.entries(analysis.domainScores || {})) text(`${domain}: ${score === null ? "N/A" : `${score}/100`}`, 9, score === null ? regular : bold);

  heading("3. Tableau de bord");
  text("Indicateur | Valeur | Reference OMS | Evolution | Statut | Risque", 7, bold);
  const dashboard = ["Poids", "Taille / longueur", "PB / MUAC", "Poids-pour-taille", "Taille-pour-age", "Poids-pour-age", "IMC-pour-age"];
  for (const item of analysis.indicatorInsights.filter(item => dashboard.some(name => item.indicator.toLowerCase().includes(name.toLowerCase())))) {
    text(`${item.indicator} | ${item.latest || "N/A"} | ${item.reference || "N/A"} | ${item.changeSummary || "N/A"} | ${item.status} | ${item.status === "urgent" ? "eleve" : item.status === "watch" ? "modere" : item.status === "usual" ? "faible" : "indetermine"}`, 7);
  }
  for (const [label, value] of [
    ["Oedemes", latest?.edema], ["Appetit", latest?.appetite], ["Fievre/Diarrhee/Toux", latest?.recent_illnesses],
    ["Vaccination", latest?.vaccinations_up_to_date], ["Developpement", latest?.development],
  ]) text(`${label}: ${value === undefined || value === null || value === "" ? "N/A" : String(value)}`, 8);

  heading("4. Analyse detaillee", 16);
  for (const [index, item] of analysis.indicatorInsights.entries()) {
    heading(`4.${index + 1} ${item.indicator}`, 12);
    text("Presentation", 9, bold); text(item.presentation || item.parentInterpretation, 8);
    if (y < 240) newPage();
    historyChart(page, regular, bold, item, 62, y - 165);
    y -= 190;
    text(`Situation actuelle: ${item.currentSituation || item.latest || "N/A"}`, 8, bold);
    text(`Comparaison OMS: ${item.whoComparison || item.reference || "N/A"}`, 8);
    text(`Derniere visite: ${item.previousComparison || "N/A"}`, 8);
    text(`Premiere visite: ${item.firstComparison || item.changeSummary || "N/A"}`, 8);
    text(`Pics, plateaux et cassures: ${item.peakAnalysis || "N/A"}`, 8);
    if (item.statistics) {
      const s = item.statistics;
      text(`Statistiques: n=${s.count}; min=${s.minimum ?? "N/A"}; max=${s.maximum ?? "N/A"}; moyenne=${s.mean ?? "N/A"}; ecart-type=${s.standardDeviation ?? "N/A"}; variation moyenne=${s.averageChange ?? "N/A"}; tendance=${s.trend || "N/A"}.`, 8);
    }
    text("Correlations", 9, bold); bullets(item.correlationNotes, 8);
    text("Interpretation clinique", 9, bold); text(item.clinicalInterpretation || item.professionalInterpretation, 8);
    text(`Projections: 1 mois: ${item.projections?.month1 || "N/A"} | 3 mois: ${item.projections?.month3 || "N/A"} | 6 mois: ${item.projections?.month6 || "N/A"} | 12 mois: ${item.projections?.month12 || "N/A"}`, 8);
    text("Recommandations prioritaires", 9, bold); bullets(item.prioritizedRecommendations || [item.recommendation], 8);
    text(`Niveau de confiance: ${item.confidence?.score ?? "N/A"}% - ${item.confidence?.explanation || "N/A"}`, 8, bold, rgb(.55, .35, .1));
    y -= 10;
  }

  heading("5. Analyse des courbes OMS", 16);
  bullets(analysis.whoCurveAnalysis, 9);
  for (const item of analysis.indicatorInsights.filter(item => item.latest?.toLowerCase().includes(" z")).slice(0, 5)) {
    if (y < 230) newPage();
    historyChart(page, regular, bold, item, 62, y - 165);
    y -= 190;
  }

  heading("6. Histoire de la croissance", 16);
  text(analysis.growthStory || "N/A: historique longitudinal insuffisant.", 10);

  heading("7. Facteurs influencant la croissance", 16);
  for (const factor of analysis.influencingFactors || []) text(`${factor.factor} [${factor.status}]: ${factor.analysis}`, 9);

  heading("8. Developpement de l enfant", 16);
  for (const domain of analysis.developmentAnalysis || []) text(`${domain.domain} [${domain.status}]: ${domain.analysis}`, 9);
  text("Le developpement doit toujours etre interprete par un professionnel qualifie avec des outils adaptes a l age et au contexte.", 8, bold, rgb(.55, .3, .15));

  heading("9. Plan personnalise", 16);
  for (const [title, values] of [
    ["Objectifs a 7 jours", analysis.actionPlan?.days7], ["Objectifs a 30 jours", analysis.actionPlan?.days30],
    ["Objectifs a 90 jours", analysis.actionPlan?.days90], ["Objectifs a 180 jours", analysis.actionPlan?.days180],
    ["Actions quotidiennes", analysis.actionPlan?.daily], ["Actions hebdomadaires", analysis.actionPlan?.weekly],
    ["Actions mensuelles", analysis.actionPlan?.monthly],
  ] as Array<[string, string[] | undefined]>) { text(title, 9, bold); bullets(values, 8); }

  heading("10. Alertes", 16);
  if (analysis.alerts.length) for (const alert of analysis.alerts) text(`${alert.title} [${alert.severity}]: ${alert.message}`, 9, alert.severity === "critical" ? bold : regular, alert.severity === "critical" ? rgb(.7, .2, .15) : rgb(.65, .3, .08));
  else text("Aucune alerte automatique justifiee par les donnees disponibles. Cela n exclut pas un risque clinique non mesure.", 9);

  heading("11. Version professionnelle", 16);
  text("Resume anthropometrique et hypotheses nutritionnelles", 10, bold);
  text(analysis.professionalSummary || analysis.summary, 9);
  for (const item of analysis.indicatorInsights) {
    text(`${item.indicator} [${item.status}]: ${item.professionalInterpretation}`, 8);
    if (item.professionalRecommendations?.length) bullets(item.professionalRecommendations, 7);
  }
  text("Conclusion professionnelle", 10, bold); text(analysis.professionalConclusion, 9);

  heading("12. Limites", 16);
  bullets(analysis.limitations, 8);

  heading("13. Avertissement", 16);
  text("Ce rapport est genere automatiquement par le NutVitaGlobalis Child Growth Intelligence Engine (NCGIE). Il constitue un outil d aide au suivi de la croissance et a la prise de decision. Il ne remplace pas l evaluation clinique, le diagnostic medical ni les recommandations d un professionnel de sante qualifie. Toute decision concernant la prise en charge de l enfant doit etre prise apres une evaluation complete de son contexte medical, nutritionnel et familial.", 8, regular, rgb(.55, .3, .15));

  for (const [index, current] of pdf.getPages().entries()) current.drawText(`NutVitaGlobalis NCGIE - page ${index + 1}/${pdf.getPageCount()}`, { x: 50, y: 72, size: 8, font: regular, color: rgb(.45, .45, .45) });
  return pdf.save();
}
