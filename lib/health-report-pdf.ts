import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InsightResult, HealthRow } from "@/lib/health-analysis";
import type { HealthReportModel } from "@/lib/health-report/types";
import { indicatorRegistry } from "@/lib/health-report/indicator-registry";
import { formatIndicatorValue } from "@/lib/health-report/engine";
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

  const drawKpiCards = (items: NonNullable<typeof model>["indicators"]) => {
    const visible=items.filter(item=>item.currentValue!==null&&!(model?.profile==="adult"&&item.indicatorId==="anthropometry.height")).slice(0,8), cardWidth=242, cardHeight=48;
    for(let index=0;index<visible.length;index+=2){if(y-cardHeight<90)addPage();for(let column=0;column<2;column++){const item=visible[index+column];if(!item)continue;const x=50+column*253,value=formatIndicatorValue(item.currentValue,item.indicatorId,locale),unit=item.unit?` ${item.unit}`:(item.type==="biology"?` — ${fr?"Unité non renseignée":"Unit not recorded"}`:"");const movement=item.deltaPrevious===null?(fr?"Mesure initiale":"Initial measurement"):item.direction==="stable"?(fr?"Stable depuis la dernière mesure":"Stable since previous measurement"):`${fr?"Écart":"Change"} ${item.deltaPrevious!>0?"+":""}${formatIndicatorValue(item.deltaPrevious,item.indicatorId,locale)}${item.unit?` ${item.unit}`:""}`;page.drawRectangle({x,y:y-cardHeight+8,width:cardWidth,height:cardHeight,color:rgb(.975,.99,.982),borderColor:rgb(.82,.88,.85),borderWidth:.6});page.drawText(item.label.slice(0,36).toUpperCase(),{x:x+10,y:y-9,size:7,font:bold,color:rgb(.12,.49,.33)});page.drawText(`${value}${unit}`.slice(0,42),{x:x+10,y:y-25,size:11,font:bold,color:rgb(.07,.24,.19)});page.drawText(movement.slice(0,55),{x:x+10,y:y-38,size:6.5,font:regular,color:rgb(.4,.45,.44)});}y-=cardHeight+6;}
  };
  text(reportType==="summary"?(fr?"Résumé santé":"Health summary"):reportType==="patient"?(fr?"Rapport patient":"Patient report"):(fr?"Rapport professionnel":"Professional report"), 20, bold, rgb(.07, .24, .19));
  text(profile.full_name || (fr ? "Client" : "Client"), 12, bold);
  text(`${fr ? "Généré le" : "Generated on"} ${formatDate(generatedAt, locale)} | ${fr ? "Période analysée" : "Analyzed period"}: ${formatDate(period.start, locale)} - ${formatDate(period.end, locale)}`, 9);
  text(`${fr ? "Référence" : "Référence"}: ${metadata?.reportId || "N/A"}`, 8, regular, rgb(.4, .45, .44));
  if(model){heading(fr?"Tableau de bord santé":"Health dashboard");drawKpiCards(model.indicators)}
  y -= 10;
  heading(fr ? "Synthèse essentielle" : "Essential summary");
  if(model){
    text(`${fr?"État global":"Global state"}: ${model.essentialSummary.globalState}`,11,bold,rgb(.07,.24,.19));
    if(model.essentialSummary.improving.length){text(fr?"Ce qui s’améliore":"What is improving",9,bold,rgb(.12,.49,.33));bullets(model.essentialSummary.improving,3)}
    if(model.essentialSummary.stable.length){text(fr?"Ce qui est stable":"What is stable",9,bold);bullets(model.essentialSummary.stable,3)}
    if(model.essentialSummary.attention.length){text(fr?"Points d’attention":"Attention points",9,bold,rgb(.72,.25,.12));bullets(model.essentialSummary.attention,3)}
    if(model.essentialSummary.missing.length){text(fr?"Données importantes manquantes":"Important missing data",9,bold);bullets(model.essentialSummary.missing,3)}
  } else twoColumnText(insight.publicSummary, 10);
  if (!model && insight.risks?.length) { text(fr ? "Points de vigilance" : "Points requiring attention", 10, bold, rgb(.72, .25, .12)); bullets(insight.risks, 4); }
  if (!model && insight.improvements?.length) { text(fr ? "Évolutions favorables" : "Favorable changes", 10, bold, rgb(.12, .49, .33)); bullets(insight.improvements, 3); }
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
      { key: "glucose", label: fr ? "Glycémie" : "Glucose" },
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
      { key: "activity_level", label: fr ? "Niveau d’activité" : "Activity level", dateKey: "assessment_date" },
      { key: "diet_level", label: fr ? "Niveau alimentaire" : "Diet level", dateKey: "assessment_date" },
    ]),
    ...numericSeries(food.map(row => ({
      ...row,
      calories: row.content?.calories,
      protein_g: row.content?.protein_g,
    })), [
      { key: "calories", label: fr ? "Apport énergétique estimé" : "Estimated energy intake", unit: "kcal", dateKey: "entry_date" },
      { key: "protein_g", label: fr ? "Protéines estimées" : "Estimated protein", unit: "g", dateKey: "entry_date" },
    ]),
    ...numericSeries(metadata?.dietary ? [metadata.dietary] : [], [
      { key: "diversity_score", label: fr ? "Diversité alimentaire MDD-W" : "MDD-W dietary diversity", unit: "/10", dateKey: "assessed_at" },
    ]),
    ...(model ? model.indicators.filter(item => item.type === "questionnaire" && item.points.length >= 2).map(item => ({ key: indicatorRegistry.find(def => def.id === item.indicatorId)?.field || item.indicatorId, label: item.label, unit: "/4", points: item.points })) : []),
  ];
  if(reportType!=="summary") {
  heading(fr ? "Analyse par indicateur" : "Analysis by indicator");
  text(fr
    ? "Pour chaque indicateur : évolution récente, comparaison à la référence, à la dernière mesure et depuis le début du suivi."
    : "For each indicator: recent trend, comparison to the reference, to the last measurement and since monitoring began.", 8, regular, rgb(.4, .45, .44));
  const rankedSeries = [...chartSeries]
    .map(series => {
      const definition=indicatorRegistry.find(item=>item.field===series.key);
      const strict=model&&definition?model.indicators.find(item=>item.indicatorId===definition.id):undefined;
      const biologicalNote=strict?.type==="biology"?` ${strict.unit?"":(fr?"Unité non renseignée.":"Unit not recorded.")} ${strict.measurementContext?(fr?`Contexte : ${strict.measurementContext}.`:`Context: ${strict.measurementContext}.`):(fr?"Contexte de mesure non renseigné.":"Measurement context not recorded.")}`:"";
      const mapped=strict?{indicator:strict.label,reference:strict.referenceText,recommendation:strict.recommendedAction,professionalInterpretation:`${strict.interpretation}${biologicalNote}`,status:strict.status==="critical"?"urgent":strict.status==="warning"||strict.status==="watch"?"watch":strict.status==="not_measured"?"incomplete":"stable"}:matchInsightForSeries(series,insight.indicatorInsights);
      return {series:strict?{...series,unit:strict.unit||undefined,domain:strict.chart.domain}:series,insight:mapped,enabled:strict?strict.chart.enabled:!model};
    })
    .filter(item=>item.enabled)
    .sort((a, b) => (statusRank[a.insight?.status || ""] ?? 5) - (statusRank[b.insight?.status || ""] ?? 5));
  const candidateSeries=reportType==="patient"?rankedSeries.slice(0,3):rankedSeries;
  const systolicSeries=rankedSeries.find(item=>item.series.key==="systolic_pressure")?.series,diastolicSeries=rankedSeries.find(item=>item.series.key==="diastolic_pressure")?.series;
  if(systolicSeries&&diastolicSeries){if(y<190)addPage();y=drawBloodPressureReportCard(page,regular,bold,systolicSeries,diastolicSeries,50,y,locale)}
  const visibleSeries=candidateSeries.filter(item=>item.series.key!=="systolic_pressure"&&item.series.key!=="diastolic_pressure");
  for (const { series, insight: matched } of visibleSeries) {
    if (y < 175) addPage();
    y = drawIndicatorReportCard(page, regular, bold, series, matched, 50, y, wrap, locale);
  }
  }
  if(model&&reportType!=="summary"){
    const questionnaireItems=model.indicators.filter(item=>item.type==="questionnaire"&&item.currentValue!==null);
    if(questionnaireItems.length){heading(fr?"Nutrition, activité et mode de vie":"Nutrition, activity and lifestyle");questionnaireItems.forEach(item=>{text(`${item.label} — ${formatIndicatorValue(item.currentValue,item.indicatorId,locale)}/4`,9,bold);text(item.interpretation,8);text(`${fr?"Priorité":"Priority"} : ${item.recommendedAction}`,8,regular,rgb(.12,.49,.33));});}
  }
  heading(fr ? "Plan d’action SMART" : "SMART action plan");
  const maxActions=reportType==="summary"?3:reportType==="patient"?5:8;
  const smartRows=(model?.nextGoals||[]).slice(0,maxActions).map(goal=>({action:String(goal.label||goal.title||goal.action||(fr?"Action de suivi":"Follow-up action")),objective:String(goal.objective||goal.description||goal.target_text||(goal.target_value!==undefined?`${goal.target_value}${goal.unit?` ${goal.unit}`:""}`:(fr?"Objectif à préciser":"Goal to define"))),deadline:String(goal.due_date||goal.target_date||(fr?"Prochain cycle":"Next cycle")),responsible:String(goal.responsible_party||(fr?"Patient":"Patient")),status:String(goal.status||(fr?"À faire":"To do"))}));
  if(!smartRows.length)(insight.recommendations||[]).slice(0,maxActions).forEach((recommendation,index)=>smartRows.push({action:recommendation,objective:fr?"Réaliser l’action convenue":"Complete the agreed action",deadline:index===0?(fr?"7 jours":"7 days"):(fr?"30 jours":"30 days"),responsible:fr?"Patient":"Patient",status:fr?"À faire":"To do"}));
  const headers=fr?["Action / objectif","Échéance","Responsable","Statut"]:["Action / objective","Deadline","Owner","Status"],xs=[50,300,378,460];
  if(y<150)addPage();page.drawRectangle({x:50,y:y-17,width:495,height:22,color:rgb(.9,.96,.93)});headers.forEach((header,index)=>page.drawText(header,{x:xs[index]+4,y:y-10,size:7,font:bold,color:rgb(.07,.24,.19)}));y-=25;
  smartRows.forEach(row=>{const actionLines=wrap(`${row.action} — ${row.objective}`,52).slice(0,3),height=Math.max(30,actionLines.length*10+10);if(y-height<90)addPage();page.drawRectangle({x:50,y:y-height+5,width:495,height,borderColor:rgb(.85,.89,.88),borderWidth:.5,color:rgb(.99,.995,.992)});actionLines.forEach((line,index)=>page.drawText(line,{x:54,y:y-8-index*10,size:7,font:index===0?bold:regular,color:rgb(.16,.23,.22)}));[row.deadline,row.responsible,row.status].forEach((value,index)=>page.drawText(value.slice(0,index===0?16:18),{x:xs[index+1]+4,y:y-8,size:7,font:regular,color:rgb(.16,.23,.22)}));y-=height+3;});
  if(model?.previousGoals.length){text(fr?"Objectifs du cycle précédent":"Previous cycle goals",9,bold);bullets(model.previousGoals.slice(0,5).map(goal=>`${String(goal.label||goal.title||goal.action||"Objectif")} — ${String(goal.status||(fr?"Non évalué":"Not assessed"))}`),5)}
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
  if(model){const qualityLabel=model.dataQuality==="good"?(fr?"Bonne":"Good"):model.dataQuality==="moderate"?(fr?"Moyenne":"Moderate"):(fr?"Limitée":"Limited");text(`${fr?"Qualité des données":"Data quality"} : ${qualityLabel}`,10,bold);const reasons:string[]=[];if(anthropometry.length<2)reasons.push(fr?"suivi anthropométrique court":"short anthropometric follow-up");if(lifestyle.length<2)reasons.push(fr?"évaluation des habitudes limitée":"limited lifestyle assessment");if(food.length<3)reasons.push(fr?"journal alimentaire incomplet":"incomplete food diary");if(model.validationIssues.length)reasons.push(fr?"certaines valeurs ont été exclues après validation":"some values were excluded after validation");if(!reasons.length)reasons.push(fr?"sources principales disponibles et cohérentes":"main sources available and consistent");bullets(reasons,4);}else twoColumnBullets(insight.limitations,6);
  text(`${fr ? "Données exploitées" : "Data used"}: ${anthropometry.length} ${fr ? "mesures anthropométriques" : "anthropometric measurements"}, ${biology.length} ${fr ? "biologiques" : "biological"}, ${food.length} ${fr ? "alimentaires" : "food records"}, ${lifestyle.length} ${fr ? "évaluations du mode de vie" : "lifestyle assessments"}.`, 8);

  if(reportType==="professional"){
    const latestLifestyle=[...lifestyle].sort((a,b)=>+new Date(a.assessment_date)-+new Date(b.assessment_date)).at(-1);
    const snapshot=latestLifestyle?.questionnaire_snapshot as Record<string,Array<Record<string,any>>>|undefined;
    if(snapshot){heading(fr?"Annexe — données sources des questionnaires":"Appendix — questionnaire source data");for(const [domain,responses] of Object.entries(snapshot)){text(domain,9,bold);for(const item of responses||[])text(`${item.reference||item.id||"Q"} — ${item.question||""}: ${item.answer??(fr?"Non renseigné":"Not recorded")} (${item.score??"—"}/4)`,7.5)}}
  }
  if (y < 150) addPage();
  y -= 6;
  page.drawRectangle({ x: 50, y: y - 4, width: 495, height: 4, color: rgb(.12, .49, .33) });
  y -= 20;
  heading(fr ? "Conclusion" : "Conclusion");
  const normalized=(value:string)=>value.toLocaleLowerCase().replace(/[^a-zà-ÿ0-9]+/gi," ").trim();
  const conclusionRepeatsAction=smartRows.some(row=>normalized(row.action)===normalized(insight.publicConclusion));
  const unsafeCardio=/limites physiologiques|physiological limits/i.test(insight.publicConclusion);
  const finalConclusion=conclusionRepeatsAction?(fr?"Les priorités retenues visent à soutenir un suivi régulier, progressif et adapté au contexte.":"The selected priorities support regular, progressive monitoring adapted to context."):unsafeCardio?(fr?"Les dernières valeurs ne déclenchent pas d’alerte selon les références configurées; elles restent à interpréter selon les conditions de mesure et le contexte clinique.":"The latest values trigger no alert under the configured references; they still require interpretation according to measurement conditions and clinical context."):insight.publicConclusion;
  twoColumnText(finalConclusion, 10);
  y -= 8;
  twoColumnText(fr
    ? "Ce rapport automatisé constitue une aide au suivi et ne remplace pas une consultation, un diagnostic ou une décision clinique. Toute alerte doit être confirmée par un professionnel qualifié."
    : "This automated report supports monitoring and does not replace consultation, diagnosis or clinical decision-making. Any alert must be confirmed by a qualified professional.", 8, regular, rgb(.58, .3, .13));
  for (const [index, current] of pdf.getPages().entries()) current.drawText(`NutVitaGlobalis - ${fr ? "page" : "page"} ${index + 1}/${pdf.getPageCount()} - ${formatDate(generatedAt, locale)}`, { x: 50, y: 76, size: 7, font: regular, color: rgb(.45, .45, .45) });
  return pdf.save();
}
