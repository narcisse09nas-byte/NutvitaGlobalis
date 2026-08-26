import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InsightResult, HealthRow } from "@/lib/health-analysis";
import type { HealthReportModel } from "@/lib/health-report/types";
import { indicatorRegistry } from "@/lib/health-report/indicator-registry";
import { createNutvitaDocumentBranding, createReportQrCode } from "@/lib/pdf-branding";
import { customNumericSeries, drawBloodPressureReportCard, drawIndicatorReportCard, matchInsightForSeries, numericSeries } from "@/lib/pdf-indicator-charts";

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
const statusRank: Record<string, number> = { urgent: 0, watch: 1, incomplete: 2, stable: 3, improving: 4 };

export async function renderHealthReport(
  profile: Record<string, any>,
  anthropometry: HealthRow[],
  biology: HealthRow[],
  food: HealthRow[],
  lifestyle: HealthRow[],
  insight: InsightResult,
  period: { start: string; end: string },
  locale: "fr" | "en" = "fr",
  metadata?: { reportId?: string; generatedAt?: string; userEmail?: string; dietary?: Record<string, any> | null; reportModel?: HealthReportModel },
) {
  const fr = locale === "fr", generatedAt = metadata?.generatedAt || new Date().toISOString(), model=metadata?.reportModel, reportType=model?.reportType||"professional";
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
      page.drawText(line,{x:50,y,size,font,color}); y -= size + 4;
    }
  };
  const twoColumnText = (value: string, size = 9, font = regular, color = rgb(.16, .23, .22)) => {
    const lines = wrap(value, 43), perColumn = Math.ceil(lines.length / 2), rows = Math.max(1, perColumn);
    if (y - rows * (size + 4) < 85) addPage();
    const top = y;
    lines.forEach((line, index) => page.drawText(line, { x: index < perColumn ? 50 : 307, y: top - (index % perColumn) * (size + 4), size, font, color }));
    y = top - rows * (size + 4) - 5;
  };
  const twoColumnBullets = (values: string[] | undefined, limit = 6) => {
    const items = (values || []).filter(Boolean).slice(0, limit), perColumn = Math.ceil(items.length / 2), prepared = items.map(item => wrap(`•  ${item}`, 43));
    const rows = Math.max(prepared.slice(0, perColumn).flat().length, prepared.slice(perColumn).flat().length, 1);
    if (y - rows * 12 < 85) addPage();
    const top = y;
    [prepared.slice(0, perColumn), prepared.slice(perColumn)].forEach((column, columnIndex) => { let lineY = top; column.flat().forEach(line => { page.drawText(line, { x: columnIndex ? 307 : 50, y: lineY, size: 8.5, font: regular, color: rgb(.16, .23, .22) }); lineY -= 12; }); });
    y = top - rows * 12 - 5;
  };
  const heading = (value: string) => { if (y < 140) addPage(); y -= 7; page.drawRectangle({ x: 45, y: y - 22, width: 505, height: 30, color: rgb(.94, .98, .96), borderColor: rgb(.82, .88, .85), borderWidth: .6 }); page.drawRectangle({ x: 45, y: y - 22, width: 4, height: 30, color: rgb(.12, .49, .33) }); page.drawText(value, { x: 58, y: y - 13, size: 13, font: bold, color: rgb(.07, .24, .19) }); y -= 35; };
  const bullets = (values: string[] | undefined, limit = 5) => (values || []).filter(Boolean).slice(0, limit).forEach(value => text(`•  ${value}`, 8.5));

  text(reportType==="summary"?(fr?"Résumé santé":"Health summary"):reportType==="patient"?(fr?"Rapport patient":"Patient report"):(fr?"Rapport professionnel":"Professional report"), 20, bold, rgb(.07, .24, .19));
  text(profile.full_name || (fr ? "Client" : "Client"), 12, bold);
  text(`${fr ? "Genere le" : "Generated on"} ${formatDate(generatedAt, locale)} | ${fr ? "Periode analysee" : "Analyzed period"}: ${formatDate(period.start, locale)} - ${formatDate(period.end, locale)}`, 9);
  text(`${fr ? "Reference" : "Reference"}: ${metadata?.reportId || "N/A"}`, 8, regular, rgb(.4, .45, .44));
  if(model){heading(fr?"Tableau de bord santé":"Health dashboard");twoColumnBullets(model.indicators.filter(item=>item.currentValue!==null).slice(0,8).map(item=>`${item.label}: ${item.currentValue} ${item.unit}${item.deltaPrevious!==null?` | ${item.deltaPrevious>0?"+":""}${item.deltaPrevious} depuis la dernière mesure`:""}`),8)}
  y -= 10;
  heading(fr ? "Synthese essentielle" : "Essential summary");
  if(model){
    text(`${fr?"État global":"Global state"}: ${model.essentialSummary.globalState}`,11,bold,rgb(.07,.24,.19));
    if(model.essentialSummary.improving.length){text(fr?"Ce qui s’améliore":"What is improving",9,bold,rgb(.12,.49,.33));bullets(model.essentialSummary.improving,3)}
    if(model.essentialSummary.stable.length){text(fr?"Ce qui est stable":"What is stable",9,bold);bullets(model.essentialSummary.stable,3)}
    if(model.essentialSummary.attention.length){text(fr?"Points d’attention":"Attention points",9,bold,rgb(.72,.25,.12));bullets(model.essentialSummary.attention,3)}
    if(model.essentialSummary.missing.length){text(fr?"Données importantes manquantes":"Important missing data",9,bold);bullets(model.essentialSummary.missing,3)}
  } else twoColumnText(insight.publicSummary, 10);
  if (insight.risks?.length) { text(fr ? "Points de vigilance" : "Points requiring attention", 10, bold, rgb(.72, .25, .12)); bullets(insight.risks, 4); }
  if (insight.improvements?.length) { text(fr ? "Evolutions favorables" : "Favorable changes", 10, bold, rgb(.12, .49, .33)); bullets(insight.improvements, 3); }
  y -= 8;
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
      { key: "pulse_bpm", label: fr ? "Pouls" : "Pulse", unit: "bpm" },
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
  heading(fr ? "Analyse par indicateur" : "Analysis by indicator");
  text(fr
    ? "Pour chaque indicateur : evolution recente, comparaison a la reference, a la derniere mesure et depuis le debut du suivi."
    : "For each indicator: recent trend, comparison to the reference, to the last measurement and since monitoring began.", 8, regular, rgb(.4, .45, .44));
  const rankedSeries = [...chartSeries]
    .map(series => {
      const definition=indicatorRegistry.find(item=>item.field===series.key);
      const strict=model&&definition?model.indicators.find(item=>item.indicatorId===definition.id):undefined;
      const mapped=strict?{indicator:strict.label,reference:strict.referenceText,recommendation:strict.recommendedAction,professionalInterpretation:strict.interpretation,status:strict.status==="critical"?"urgent":strict.status==="warning"||strict.status==="watch"?"watch":strict.status==="not_measured"?"incomplete":"stable"}:matchInsightForSeries(series,insight.indicatorInsights);
      return {series:strict?{...series,domain:strict.chart.domain}:series,insight:mapped,enabled:strict?strict.chart.enabled:true};
    })
    .filter(item=>item.enabled)
    .sort((a, b) => (statusRank[a.insight?.status || ""] ?? 5) - (statusRank[b.insight?.status || ""] ?? 5));
  const candidateSeries=reportType==="summary"?[]:reportType==="patient"?rankedSeries.slice(0,6):rankedSeries;
  const systolicSeries=rankedSeries.find(item=>item.series.key==="systolic_pressure")?.series,diastolicSeries=rankedSeries.find(item=>item.series.key==="diastolic_pressure")?.series;
  if(reportType!=="summary"&&systolicSeries&&diastolicSeries){if(y<190)addPage();y=drawBloodPressureReportCard(page,regular,bold,systolicSeries,diastolicSeries,50,y,locale)}
  const visibleSeries=candidateSeries.filter(item=>item.series.key!=="systolic_pressure"&&item.series.key!=="diastolic_pressure");
  for (const { series, insight: matched } of visibleSeries) {
    if (y < 175) addPage();
    y = drawIndicatorReportCard(page, regular, bold, series, matched, 50, y, wrap, locale);
  }

  heading(fr ? "Plan d action prioritaire" : "Priority action plan");
  twoColumnBullets(insight.recommendations, 5);
  if (insight.actionPlan?.days30?.length) {
    text(fr ? "Dans les 30 prochains jours" : "Within the next 30 days", 9, bold);
    twoColumnBullets(insight.actionPlan.days30, 4);
  }
  if(reportType==="professional"){
  heading(fr ? "Note professionnelle" : "Professional note");
  twoColumnText(insight.professionalSummary, 9);
  const concerning = insight.indicatorInsights.filter(item => item.status === "urgent" || item.status === "watch").slice(0, 6);
  for (const item of concerning) {
    text(item.indicator, 9, bold);
    text(item.professionalInterpretation, 8);
    bullets(item.professionalRecommendations, 2);
  }

  }
  heading(fr ? "Qualité des données et limites" : "Data quality and limitations");
  twoColumnBullets(insight.limitations, 6);
  text(`${fr ? "Donnees exploitees" : "Data used"}: ${anthropometry.length} ${fr ? "mesures anthropometriques" : "anthropometric measurements"}, ${biology.length} ${fr ? "biologiques" : "biological"}, ${food.length} ${fr ? "alimentaires" : "food records"}, ${lifestyle.length} ${fr ? "evaluations du mode de vie" : "lifestyle assessments"}.`, 8);

  if(reportType==="professional"){
    const latestLifestyle=[...lifestyle].sort((a,b)=>+new Date(a.assessment_date)-+new Date(b.assessment_date)).at(-1);
    const snapshot=latestLifestyle?.questionnaire_snapshot as Record<string,Array<Record<string,any>>>|undefined;
    if(snapshot){heading(fr?"Annexe — données sources des questionnaires":"Appendix — questionnaire source data");for(const [domain,responses] of Object.entries(snapshot)){text(domain,9,bold);for(const item of responses||[])text(`${item.reference||item.id||"Q"} — ${item.question||""}: ${item.answer??(fr?"Non renseigné":"Not recorded")} (${item.score??"—"}/4)`,7.5)}}
  }
  if (y < 220) addPage();
  y -= 6;
  page.drawRectangle({ x: 50, y: y - 4, width: 495, height: 4, color: rgb(.12, .49, .33) });
  y -= 20;
  heading(fr ? "Conclusion" : "Conclusion");
  twoColumnText(insight.publicConclusion, 10);
  if (insight.recommendations?.length) {
    text(fr ? "Recommandations retenues" : "Key recommendations", 9, bold, rgb(.12, .49, .33));
    twoColumnBullets(insight.recommendations, 4);
  }

  y -= 8;
  twoColumnText(fr
    ? "Ce rapport automatise constitue une aide au suivi et ne remplace pas une consultation, un diagnostic ou une decision clinique. Toute alerte doit etre confirmee par un professionnel qualifie."
    : "This automated report supports monitoring and does not replace consultation, diagnosis or clinical decision-making. Any alert must be confirmed by a qualified professional.", 8, regular, rgb(.58, .3, .13));
  for (const [index, current] of pdf.getPages().entries()) current.drawText(`NutVitaGlobalis - ${fr ? "page" : "page"} ${index + 1}/${pdf.getPageCount()} - ${formatDate(generatedAt, locale)}`, { x: 50, y: 76, size: 7, font: regular, color: rgb(.45, .45, .45) });
  return pdf.save();
}
