export type ReportLocale = "fr" | "en";
export type ReportType = "summary" | "patient" | "professional";
export type ReportProfile = "adult" | "adolescent" | "child" | "pregnancy" | "general";
export type IndicatorType = "anthropometry" | "cardiovascular" | "biology" | "questionnaire" | "custom";
export type Direction = "up" | "down" | "stable" | "initial" | "unknown";
export type ClinicalMeaning = "favorable" | "unfavorable" | "neutral" | "contextual" | "insufficient_data";
export type Trend = "increasing" | "decreasing" | "stable" | "variation_only" | "initial" | "insufficient";
export type ConfidenceLevel = "high" | "moderate" | "low" | "insufficient";
export type DataQuality = "good" | "moderate" | "limited";
export type AlertLevel = "info" | "watch" | "warning" | "critical";
export type ContentType = "measured" | "calculated" | "interpretation" | "recommendation" | "alert";

export type ReportRow = Record<string, unknown>;
export type ReferenceDefinition = { id:string; organization:string; guideline:string; version:string; year:number; population:ReportProfile[]; indicatorId:string; validFrom:string; validTo?:string; summary:{fr:string;en:string}; };
export type IndicatorDefinition = {
  id:string; type:IndicatorType; source:"anthropometry"|"biology"|"lifestyle"|"food"; field:string;
  label:{fr:string;en:string}; unit:string; dateField:string; contentType:"measured"|"calculated";
  profiles:ReportProfile[]; referenceId?:string; interpretationRule:string; chartType:"line"|"categorical"|"none";
  isLongitudinallyRelevant:(profile:ReportProfile)=>boolean; plausible?:{min:number;max:number}; recommendedDomain?:[number,number]; minimumRange?:number;
  transform?:(value:number)=>number;
};
export type ValidatedPoint = {date:string;value:number;sourceId?:string};
export type AnalysisTrace = {indicatorId:string;conclusion:string;sourceValues:number[];dates:string[];currentValue:number|null;previousValue:number|null;baselineValue:number|null;referenceId?:string;ruleId:string;reason:string;calculation:string;confidenceLevel:ConfidenceLevel};
export type IndicatorAnalysis = {
  indicatorId:string; label:string; type:IndicatorType; unit:string; contentType:"measured"|"calculated"; points:ValidatedPoint[];
  currentValue:number|null; previousValue:number|null; baselineValue:number|null; deltaPrevious:number|null; deltaBaseline:number|null;
  percentChangePrevious:number|null; percentChangeBaseline:number|null; direction:Direction; clinicalMeaning:ClinicalMeaning; trend:Trend;
  confidenceLevel:ConfidenceLevel; status:AlertLevel|"normal"|"not_measured"; referenceId?:string; referenceText?:string;
  interpretation:string; recommendedAction:string; missingData:string[]; expectedData:boolean; clinicallyRelevantMissingData:boolean; measurementContext?:string; measuredUnit?:string; chart:{enabled:boolean;type:"line"|"categorical"|"none";domain?:[number,number]}; trace:AnalysisTrace;
};
export type ReportAlert = {level:AlertLevel;indicatorId:string;value:number|null;referenceId?:string;reason:string;recommendedAction:string;requiresProfessionalReview:boolean};
export type ValidationIssue = {severity:"warning"|"critical";code:string;indicatorId?:string;message:string};
export type HealthReportModel = {
  engineVersion:string; reportType:ReportType; locale:ReportLocale; profile:ReportProfile; generatedAt:string; period:{start:string;end:string};
  indicators:IndicatorAnalysis[]; alerts:ReportAlert[]; validationIssues:ValidationIssue[]; dataQuality:DataQuality;
  essentialSummary:{globalState:string;improving:string[];stable:string[];attention:string[];missing:string[];priorities:string[];claims:AnalysisTrace[]};
  traces:AnalysisTrace[]; sourceSnapshot:{counts:Record<string,number>;goals:ReportRow[]}; previousGoals:ReportRow[]; nextGoals:ReportRow[];
};