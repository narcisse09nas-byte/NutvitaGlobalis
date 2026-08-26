import {indicatorRegistry,referenceById} from "./indicator-registry";
import type {AlertLevel,ClinicalMeaning,ConfidenceLevel,DataQuality,Direction,HealthReportModel,IndicatorAnalysis,IndicatorDefinition,ReportAlert,ReportLocale,ReportProfile,ReportRow,ReportType,Trend,ValidatedPoint,ValidationIssue} from "./types";
const ENGINE_VERSION="health-report-engine-v2.0.0";
const n=(value:unknown)=>value===null||value===undefined||value===""?null:Number(value);
const round=(value:number,digits=2)=>Number(value.toFixed(digits));
const validDate=(value:unknown)=>typeof value==="string"&&!Number.isNaN(+new Date(value));
export function resolveReportProfile(profile:ReportRow):ReportProfile{
 if(profile.pregnant===true||profile.pregnancy_status==="pregnant")return "pregnancy";
 const birth=validDate(profile.birth_date)?new Date(String(profile.birth_date)):null;
 if(!birth)return "general";
 const age=(Date.now()-+birth)/31557600000;
 return age<12?"child":age<18?"adolescent":"adult";
}
function rowsFor(def:IndicatorDefinition,data:Record<string,ReportRow[]>){return data[def.source]||[]}
function pointsFor(def:IndicatorDefinition,data:Record<string,ReportRow[]>,issues:ValidationIssue[]):ValidatedPoint[]{
 const seen=new Set<string>(),result:ValidatedPoint[]=[];
 for(const row of rowsFor(def,data)){
  const raw=n(row[def.field]); if(raw===null)continue;
  if(!Number.isFinite(raw)){issues.push({severity:"critical",code:"invalid_number",indicatorId:def.id,message:`${def.id}: valeur non numérique.`});continue}
  if(!validDate(row[def.dateField])){issues.push({severity:"critical",code:"invalid_date",indicatorId:def.id,message:`${def.id}: date invalide.`});continue}
  if(def.plausible&&(raw<def.plausible.min||raw>def.plausible.max)){issues.push({severity:"warning",code:"implausible_value",indicatorId:def.id,message:`${def.id}: valeur ${raw} hors plage de plausibilité.`});continue}
  const value=round(def.transform?def.transform(raw):raw,2),date=new Date(String(row[def.dateField])).toISOString();
  const key=`${date}|${value}`;if(seen.has(key)){issues.push({severity:"warning",code:"duplicate",indicatorId:def.id,message:`${def.id}: doublon ignoré.`});continue}seen.add(key);
  result.push({date,value,sourceId:typeof row.id==="string"?row.id:undefined});
 }
 return result.sort((a,b)=>+new Date(a.date)-+new Date(b.date));
}
function confidence(points:ValidatedPoint[]):ConfidenceLevel{
 if(points.length<2)return "insufficient";const days=(+new Date(points.at(-1)!.date)-+new Date(points[0].date))/86400000;
 if(points.length>=6&&days>=60)return "high";if(points.length>=4&&days>=28)return "moderate";return "low";
}
function direction(delta:number|null,tolerance:number):Direction{return delta===null?"initial":Math.abs(delta)<=tolerance?"stable":delta>0?"up":"down"}
function trend(points:ValidatedPoint[],dir:Direction):Trend{
 if(points.length===0)return "insufficient";if(points.length===1)return "initial";if(points.length===2)return "variation_only";
 const days=(+new Date(points.at(-1)!.date)-+new Date(points[0].date))/86400000;if(days<14)return "insufficient";
 const changes=points.slice(1).map((p,i)=>p.value-points[i].value),same=changes.filter(x=>x===0||Math.sign(x)===Math.sign(changes.reduce((a,b)=>a+b,0))).length/changes.length;
 if(same<.67)return "stable";return dir==="up"?"increasing":dir==="down"?"decreasing":"stable";
}
function meaning(def:IndicatorDefinition,dir:Direction,current:number|null,goals:ReportRow[]):ClinicalMeaning{
 if(current===null)return "insufficient_data";
 if(def.type==="questionnaire")return dir==="up"?"favorable":dir==="down"?"unfavorable":"neutral";
 if(def.id==="anthropometry.weight"){
  const goal=goals.find(g=>String(g.indicator_id||g.unit||"").toLowerCase().includes("weight")||String(g.label||"").toLowerCase().includes("poids"));
  if(!goal)return "contextual";const target=n(goal.target_value);if(target===null)return "contextual";
  return Math.abs(current-target)<Math.abs((n(goal.baseline_value)??current)-target)?"favorable":"contextual";
 }
 return "contextual";
}
function statusFor(def:IndicatorDefinition,current:number|null):AlertLevel|"normal"|"not_measured"{
 if(current===null)return "not_measured";
 if(def.id==="anthropometry.bmi")return current<18.5||current>=30?"watch":"normal";
 if(def.id==="questionnaire.nutrition"||def.id==="questionnaire.activity"||def.id==="questionnaire.lifestyle")return current<1.6?"watch":"normal";
 if(def.id==="cardiovascular.systolic")return current>=180?"critical":current>=140?"warning":"normal";
 if(def.id==="cardiovascular.diastolic")return current>=120?"critical":current>=90?"warning":"normal";
 return "normal";
}
const scoreLabel=(value:number,locale:ReportLocale)=>{const labels=locale==="fr"?["Très faible","Faible","Modéré","Bon","Excellent"]:["Very low","Low","Moderate","Good","Excellent"];return labels[Math.max(0,Math.min(4,Math.round(value)))]};
function wording(def:IndicatorDefinition,current:number|null,dir:Direction,tr:Trend,status:IndicatorAnalysis["status"],locale:ReportLocale){
 if(current===null)return{interpretation:locale==="fr"?"Donnée non disponible. Données insuffisantes pour une interprétation.":"Data not available. Insufficient data for interpretation.",action:locale==="fr"?"Renseigner cette mesure lors de la prochaine évaluation si elle est pertinente.":"Record this measurement at the next assessment when relevant."};
 if(def.type==="questionnaire")return{interpretation:`${scoreLabel(current,locale)} (${current.toFixed(1)}/4). ${tr==="initial"?(locale==="fr"?"Mesure initiale.":"Initial assessment."):tr==="variation_only"?(locale==="fr"?"Variation observée; tendance non établie.":"Observed variation; no established trend."):(locale==="fr"?"Évolution longitudinale évaluée.":"Longitudinal evolution assessed.")}`,action:status==="watch"?(locale==="fr"?"Choisir un axe d’amélioration réaliste pour le prochain cycle.":"Choose one realistic improvement area for the next cycle."):(locale==="fr"?"Maintenir les acquis et réévaluer au prochain cycle.":"Maintain progress and reassess next cycle.")};
 return{interpretation:tr==="initial"?(locale==="fr"?"Première mesure exploitable; aucune tendance ne peut être conclue.":"First usable measurement; no trend can be concluded."):tr==="variation_only"?(locale==="fr"?"Une variation est observée entre deux mesures; elle ne constitue pas encore une tendance.":"A variation is observed between two measurements; it is not yet a trend."):(locale==="fr"?`Évolution ${dir==="up"?"à la hausse":dir==="down"?"à la baisse":"globalement stable"}; à interpréter dans le contexte clinique.`:`Evolution is ${dir==="up"?"upward":dir==="down"?"downward":"globally stable"}; interpret in clinical context.`),action:locale==="fr"?"Poursuivre des mesures comparables et faire vérifier tout signal persistant par un professionnel.":"Continue comparable measurements and have persistent signals reviewed professionally."};
}
function chartDomain(def:IndicatorDefinition,points:ValidatedPoint[]):[number,number]|undefined{
 if(def.recommendedDomain)return def.recommendedDomain;if(!points.length)return undefined;const values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),minimum=def.minimumRange||1,span=Math.max(max-min,minimum),middle=(max+min)/2;return[round(middle-span*.6,2),round(middle+span*.6,2)];
}
export function validateReportData(data:Record<string,ReportRow[]>,profile:ReportProfile){const issues:ValidationIssue[]=[];for(const def of indicatorRegistry.filter(x=>x.profiles.includes(profile)||profile==="general"))pointsFor(def,data,issues);return issues}
export function buildHealthReportModel(input:{profile:ReportRow;anthropometry:ReportRow[];biology:ReportRow[];food:ReportRow[];lifestyle:ReportRow[];goals?:ReportRow[];locale?:ReportLocale;reportType?:ReportType;generatedAt?:string}):HealthReportModel{
 const locale=input.locale||"fr",reportType=input.reportType||"professional",profile=resolveReportProfile(input.profile),goals=input.goals||[],data={anthropometry:input.anthropometry,biology:input.biology,food:input.food,lifestyle:input.lifestyle},issues:ValidationIssue[]=[];
 const indicators=indicatorRegistry.filter(def=>def.profiles.includes(profile)||profile==="general").map(def=>{
  const points=pointsFor(def,data,issues),current=points.at(-1)?.value??null,previous=points.at(-2)?.value??null,baseline=points[0]?.value??null,deltaPrevious=current!==null&&previous!==null?round(current-previous):null,deltaBaseline=current!==null&&baseline!==null&&points.length>1?round(current-baseline):null;
  const tolerance=def.type==="questionnaire"?.05:Math.max((def.minimumRange||1)*.01,.01),dir=direction(deltaPrevious,tolerance),tr=trend(points,dir),clinicalMeaning=meaning(def,dir,current,goals),status=statusFor(def,current),reference=def.referenceId?referenceById.get(def.referenceId):undefined,words=wording(def,current,dir,tr,status,locale),conf=confidence(points);
  const calculation=`current=${current??"N/A"}; previous=${previous??"N/A"}; baseline=${baseline??"N/A"}; deltaPrevious=${deltaPrevious??"N/A"}; deltaBaseline=${deltaBaseline??"N/A"}`;
  return{indicatorId:def.id,label:def.label[locale],type:def.type,unit:def.unit,contentType:def.contentType,points,currentValue:current,previousValue:previous,baselineValue:baseline,deltaPrevious,deltaBaseline,percentChangePrevious:deltaPrevious!==null&&previous?round(deltaPrevious/Math.abs(previous)*100,1):null,percentChangeBaseline:deltaBaseline!==null&&baseline?round(deltaBaseline/Math.abs(baseline)*100,1):null,direction:dir,clinicalMeaning,trend:tr,confidenceLevel:conf,status,referenceId:def.referenceId,referenceText:reference?.summary[locale],interpretation:words.interpretation,recommendedAction:words.action,missingData:current===null?[def.label[locale]]:[],chart:{enabled:def.isLongitudinallyRelevant(profile)&&points.length>=2,type:def.chartType,domain:chartDomain(def,points)},trace:{indicatorId:def.id,conclusion:words.interpretation,sourceValues:points.map(p=>p.value),dates:points.map(p=>p.date),referenceId:def.referenceId,ruleId:def.interpretationRule,calculation,confidenceLevel:conf}} satisfies IndicatorAnalysis;
 });
 const alerts:ReportAlert[]=indicators.filter(i=>["watch","warning","critical"].includes(i.status)).map(i=>({level:i.status as AlertLevel,indicatorId:i.indicatorId,value:i.currentValue,referenceId:i.referenceId,reason:i.interpretation,recommendedAction:i.recommendedAction,requiresProfessionalReview:i.status==="warning"||i.status==="critical"}));
 const usable=indicators.filter(i=>i.currentValue!==null),missing=indicators.filter(i=>i.currentValue===null),quality:DataQuality=issues.some(i=>i.severity==="critical")||usable.length<3?"limited":issues.length||missing.length>usable.length?"moderate":"good";
 const improving=indicators.filter(i=>i.clinicalMeaning==="favorable").map(i=>i.label).slice(0,3),stable=indicators.filter(i=>i.direction==="stable"&&i.currentValue!==null).map(i=>i.label).slice(0,3),attention=alerts.map(a=>indicators.find(i=>i.indicatorId===a.indicatorId)?.label||a.indicatorId).slice(0,3),missingLabels=missing.map(i=>i.label).slice(0,3);
 const dates=Object.values(data).flat().flatMap(row=>[row.measured_at,row.assessment_date,row.entry_date]).filter(validDate).map(String).sort();
 const model:HealthReportModel={engineVersion:ENGINE_VERSION,reportType,locale,profile,generatedAt:input.generatedAt||new Date().toISOString(),period:{start:dates[0]?.slice(0,10)||new Date().toISOString().slice(0,10),end:dates.at(-1)?.slice(0,10)||new Date().toISOString().slice(0,10)},indicators,alerts,validationIssues:issues,dataQuality:quality,essentialSummary:{globalState:alerts.some(a=>a.level==="critical")?(locale==="fr"?"Attention requise":"Attention required"):alerts.length?(locale==="fr"?"À surveiller":"Requires monitoring"):improving.length?(locale==="fr"?"En amélioration":"Improving"):(locale==="fr"?"Globalement stable":"Globally stable"),improving,stable,attention,missing:missingLabels,priorities:[...attention,...missingLabels].slice(0,3)},traces:indicators.map(i=>i.trace),sourceSnapshot:{counts:{anthropometry:input.anthropometry.length,biology:input.biology.length,food:input.food.length,lifestyle:input.lifestyle.length},goals},previousGoals:goals.filter(g=>["achieved","partially_achieved","not_achieved","not_assessed","postponed"].includes(String(g.status))),nextGoals:goals.filter(g=>["active","todo","in_progress"].includes(String(g.status)))};
 return model;
}
export function validateFinalReport(model:HealthReportModel):ValidationIssue[]{const issues=[...model.validationIssues];for(const item of model.indicators){if(!indicatorRegistry.some(def=>def.id===item.indicatorId))issues.push({severity:"critical",code:"unknown_indicator",indicatorId:item.indicatorId,message:"Indicateur absent du registre strict."});if(item.currentValue!==null&&!Number.isFinite(item.currentValue))issues.push({severity:"critical",code:"non_finite",indicatorId:item.indicatorId,message:"Valeur finale non finie."});if(/\[(watch|critical|urgent|incomplete)\]/i.test(item.interpretation))issues.push({severity:"critical",code:"internal_code_visible",indicatorId:item.indicatorId,message:"Code interne visible dans le contenu final."});if(!item.trace.sourceValues.length&&item.currentValue!==null)issues.push({severity:"critical",code:"missing_trace",indicatorId:item.indicatorId,message:"Interprétation sans source traçable."});}return issues}
export function assertFinalReport(model:HealthReportModel){const critical=validateFinalReport(model).filter(i=>i.severity==="critical");if(critical.length)throw new Error(`Rapport bloqué par la validation finale: ${critical.map(i=>i.code).join(", ")}`);return model}