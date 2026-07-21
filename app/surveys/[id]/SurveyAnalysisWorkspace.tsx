'use client';

import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { Database, Download, FileSpreadsheet, Filter, Plus, Save, X } from 'lucide-react';
import { analyzeDataset } from '@/survey/lib/analysis';
import { analyzeEnaSmartPlausibility, type EnaSmartMapping } from '@/survey/lib/ena-smart-plausibility';
import { calculateSurveyIndicators } from '@/survey/lib/food-security-indicators';
import {
  interpretStatisticalResult,
  runStatisticalAnalysis,
  type StatisticalAnalysisRequest,
  type StatisticalAnalysisType,
} from '@/survey/lib/statistical-engine';

type Row = Record<string, any>;
type Mutate = (resource: string, method: string, body?: Row, itemId?: string) => Promise<any>;
export type SurveyAnalysisMode = 'anthropometry' | 'advanced' | 'other';

const analysisLabels: Record<StatisticalAnalysisType, string> = {
  frequencies: 'Fréquences et pourcentages',
  descriptives: 'Moyennes et statistiques descriptives',
  crosstab: 'Tableau croisé, khi-deux et V de Cramér',
  correlation: 'Corrélations de Pearson et Spearman',
  independent_t: 'Test t pour groupes indépendants',
  anova: 'ANOVA à un facteur',
  linear_regression: 'Régression linéaire multivariée',
  binary_logistic: 'Régression logistique binaire',
  kaplan_meier: 'Courbes de survie de Kaplan-Meier',
  cox_regression: 'Régression de Cox',
  mann_whitney: 'Test de Mann-Whitney',
  kruskal_wallis: 'Test de Kruskal-Wallis',
};

const moduleSchemas = {
  anthropometry: {
    label: 'Anthropométrie OMS/SMART',
    fields: [
      ['id', 'Identifiant', false, ['id', 'identifiant', 'child_id']],
      ['age', 'ge estimé/révolu en mois', false, ['age', 'age_months', 'agemonths', 'anthro_age_months']],
      ['birthDate', 'Date de naissance', false, ['birth_date', 'birthdate', 'date_naissance', 'dob']],
      ['surveyDate', 'Date de l’enquête/mesure', false, ['survey_date', 'surveydate', 'date_enquete', 'measurement_date', 'submitted_at']],
      ['sex', 'Sexe', true, ['sex', 'sexe', 'gender']],
      ['weight', 'Poids en kg', true, ['weight', 'poids', 'weight_kg']],
      ['height', 'Taille/longueur en cm', true, ['height', 'taille', 'length', 'height_cm']],
      ['muac', 'PB/MUAC', false, ['muac', 'pb', 'muac_cm']],
      ['oedema', 'Œdèmes bilatéraux', false, ['oedema', 'edema', 'oedeme']],
      ['cluster', 'Grappe', false, ['cluster', 'grappe', 'cluster_id']],
      ['village', 'Village/ZD', false, ['village', 'zd', 'enumeration_area']],
      ['enumerator', 'Enquêteur/équipe', false, ['enumerator', 'enqueteur', 'team']],
      ['order', 'Ordre de passage dans la grappe', false, ['order', 'ordre', 'sequence', 'visit_order']],
    ],
  },
  iycf_mad: {
    label: 'MDD, MMF et MAD (enfants 6-23 mois)',
    fields: [
      ['PCMADChildAge_months', 'ge de l’enfant en mois', true, ['age_months', 'child_age_months']],
      ['PCMADBreastfeed', 'Allaitement la veille', true, ['breastfed', 'breastfeeding']],
      ...['StapCer','StapRoo','Pulse','Dairy','PrMeatF','PrEgg','PrFish','VegOrg','VegGre','VegOth','FruitOrg','FruitOth'].map(name => [`PCMAD${name}`, `Groupe alimentaire ${name}`, true, [`pcmad${name}`.toLowerCase()]] as [string, string, boolean, string[]]),
      ['PCMADMeals', 'Repas solides/semi-solides/mous', true, ['solid_meals', 'meals']],
      ['PCMADInfFormulaNum', 'Prises de formule infantile', true, ['formula_feeds']],
      ['PCMADMilkNum', 'Prises de lait animal', true, ['animal_milk_feeds']],
      ['PCMADYogurtDrinkNum', 'Prises de yaourt liquide', true, ['yogurt_drink_feeds']],
    ],
  },
  mddw: {
    label: 'Diversité alimentaire minimale MDD-W',
    fields: ['StapCer','StapRoo','Pulse','Nuts','Milk','Dairy','PrMeatO','PrMeatF','PrMeatWhite','PrFish','PrEgg','VegGre','VegOrg','FruitOrg','VegOth','FruitOth']
      .map(name => [`PWMDDW${name}`, `Groupe alimentaire ${name}`, true, [`pwmddw${name}`.toLowerCase()]] as [string, string, boolean, string[]]),
  },
  fcs: {
    label: 'Food Consumption Score (FCS/FCS-N)',
    fields: [
      ['FCSStap', 'Céréales et tubercules (jours/7)', true, ['fcsstap', 'staples', 'cereales']],
      ['FCSPulse', 'Légumineuses (jours/7)', true, ['fcspulse', 'pulses', 'legumineuses']],
      ['FCSDairy', 'Produits laitiers (jours/7)', true, ['fcsdairy', 'dairy', 'lait']],
      ['FCSPr', 'Viandes/poissons/œufs (jours/7)', true, ['fcspr', 'protein', 'proteines']],
      ['FCSVeg', 'Légumes (jours/7)', true, ['fcsveg', 'vegetables', 'legumes']],
      ['FCSFruit', 'Fruits (jours/7)', true, ['fcsfruit', 'fruits']],
      ['FCSFat', 'Huiles et matières grasses (jours/7)', true, ['fcsfat', 'fat', 'huile']],
      ['FCSSugar', 'Sucre (jours/7)', true, ['fcssugar', 'sugar', 'sucre']],
    ],
  },
  fcsn: {
    label: 'Food Consumption Score - Nutrition (FCS-N)',
    fields: [
      ['FCSPulse', 'Légumineuses (jours/7)', true, ['fcspulse', 'pulses']],
      ['FCSDairy', 'Produits laitiers (jours/7)', true, ['fcsdairy', 'dairy']],
      ['FCSNPrMeatO', 'Abats riches en vitamine A', true, ['fcsnprmeato']],
      ['FCSNPrMeatF', 'Viandes', true, ['fcsnprmeatf']],
      ['FCSNPrFish', 'Poissons', true, ['fcsnprfish']],
      ['FCSNPrEggs', 'Œufs', true, ['fcsnpreggs']],
      ['FCSNVegOrg', 'Légumes orange', true, ['fcsnvegorg']],
      ['FCSNVegGre', 'Légumes verts à feuilles', true, ['fcsnveggre']],
      ['FCSNFruiOrg', 'Fruits orange', true, ['fcsnfruiorg']],
    ],
  },
  hdds: {
    label: 'HDDS',
    fields: ['StapCer', 'StapRoot', 'Pulse', 'Dairy', 'PrMeat', 'PrFish', 'PrEggs', 'Veg', 'Fruit', 'Fat', 'Sugar', 'Cond'].map(key => [`HDDS${key}`, key, true, [`hdds${key}`.toLowerCase(), key.toLowerCase()]]),
  },
  hhs: {
    label: 'Household Hunger Scale',
    fields: [
      ['HHSNoFood', 'Absence de nourriture', true, ['hhsnofood', 'no_food']],
      ['HHSNoFood_FR', 'Fréquence absence de nourriture', true, ['hhsnofood_fr', 'no_food_frequency']],
      ['HHSBedHung', 'Coucher avec faim', true, ['hhsbedhung', 'bed_hungry']],
      ['HHSBedHung_FR', 'Fréquence coucher avec faim', true, ['hhsbedhung_fr']],
      ['HHSNotEat', 'Journée sans manger', true, ['hhsnoteat', 'not_eat']],
      ['HHSNotEat_FR', 'Fréquence journée sans manger', true, ['hhsnoteat_fr']],
    ],
  },
  rcsi: {
    label: 'Reduced Coping Strategy Index',
    fields: [
      ['rCSILessQlty', 'Aliments moins préférés', true, ['rcsilessqlty', 'less_quality']],
      ['rCSIBorrow', 'Emprunt de nourriture', true, ['rcsiborrow', 'borrow_food']],
      ['rCSIMealNb', 'Réduction du nombre de repas', true, ['rcsimealnb', 'meal_number']],
      ['rCSIMealSize', 'Réduction des portions', true, ['rcsimealsize', 'meal_size']],
      ['rCSIMealAdult', 'Restriction des adultes', true, ['rcsimealadult', 'adult_restriction']],
    ],
  },
  lcs: {
    label: 'Livelihood Coping Strategies (LCS)',
    fields: [
      ['LcsEN_stress_DomAsset', 'Vente de biens domestiques', true, ['lcsen_stress_domasset']],
      ['LcsEN_stress_Utilities', 'Réduction des dépenses essentielles', true, ['lcsen_stress_utilities']],
      ['LcsEN_stress_Saving', 'Utilisation de l’épargne', true, ['lcsen_stress_saving']],
      ['LcsEN_crisis_ProdAssets', 'Vente d’actifs productifs', true, ['lcsen_crisis_prodassets']],
      ['LcsEN_crisis_Health', 'Réduction des dépenses de santé', true, ['lcsen_crisis_health']],
      ['LcsEN_crisis_OutSchool', 'Retrait scolaire', true, ['lcsen_crisis_outschool']],
      ['LcsEN_em_ResAsset', 'Vente de la résidence/terre', true, ['lcsen_em_resasset']],
      ['LcsEN_em_Begged', 'Mendicité', true, ['lcsen_em_begged']],
      ['LcsEN_em_IllegalAct', 'Activité illégale ou risquée', true, ['lcsen_em_illegalact']],
    ],
  },
  fes: {
    label: 'Food Expenditure Share (FES/CARI)',
    fields: [
      ['HHExpF_1M', 'Dépenses alimentaires mensuelles', true, ['hhexpf_1m', 'food_expenditure']],
      ['HHExpNF_1M', 'Dépenses non alimentaires mensuelles', true, ['hhexpnf_1m', 'non_food_expenditure']],
    ],
  },
} satisfies Record<string, { label: string; fields: Array<[string, string, boolean, string[]]> }>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm font-bold text-slate-700"><span>{label}</span>{children}</label>;
}

function Card({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return <section className="border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-lg font-black text-emerald-950">{title}</h3>
    {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    <div className="mt-5">{children}</div>
  </section>;
}

function MultiVariables({ columns, values, onChange }: { columns: string[]; values: string[]; onChange: (values: string[]) => void }) {
  return <div className="max-h-44 overflow-auto border border-slate-200 p-3">
    {columns.map(column => <label key={column} className="flex items-center gap-2 py-1 text-sm">
      <input type="checkbox" checked={values.includes(column)} onChange={event => onChange(event.target.checked ? [...values, column] : values.filter(value => value !== column))} />
      {column}
    </label>)}
  </div>;
}

type RecodeVariableKind = 'qualitative' | 'quantitative';
type RecodeMode = 'modalities' | 'ranges' | 'quantiles' | 'equal_width';
type RecodeBin = { lower: number; upper: number; label: string; count: number };

function numericValue(value: unknown) {
  const number = Number(String(value ?? '').trim().replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function detectRecodeType(rows: Row[], variable: string) {
  const values = rows.map(row => row[variable]).filter(value => String(value ?? '').trim() !== '');
  if (!values.length) return { kind: 'qualitative' as RecodeVariableKind, detail: 'Variable vide ou entièrement manquante.', numeric: false, unique: 0, valid: 0, missing: rows.length };
  const numeric = values.map(numericValue).filter((value): value is number => value !== null);
  const unique = new Set(values.map(value => String(value).trim())).size;
  const numericRatio = numeric.length / values.length;
  const lowCardinality = unique <= 12 && unique / values.length <= .2;
  if (numericRatio >= .95 && !lowCardinality) {
    const discrete = numeric.every(Number.isInteger);
    return {
      kind: 'quantitative' as RecodeVariableKind,
      detail: discrete ? 'Quantitative discrète détectée : valeurs numériques entières et cardinalité suffisante.' : 'Quantitative continue détectée : valeurs numériques comportant des décimales.',
      numeric: true, unique, valid: values.length, missing: rows.length - values.length,
    };
  }
  return {
    kind: 'qualitative' as RecodeVariableKind,
    detail: numericRatio >= .95
      ? 'Qualitative codée numériquement détectée : peu de modalités distinctes.'
      : 'Qualitative détectée : modalités textuelles ou mélange non numérique.',
    numeric: false, unique, valid: values.length, missing: rows.length - values.length,
  };
}

function quantile(sorted: number[], probability: number) {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const fraction = position - lower;
  return sorted[lower] + (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) * fraction;
}

function buildRecodeBins(rows: Row[], variable: string, mode: 'quantiles' | 'equal_width', requestedBins: number): RecodeBin[] {
  const values = rows.map(row => numericValue(row[variable])).filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (!values.length || requestedBins < 2) return [];
  const minimum = values[0];
  const maximum = values[values.length - 1];
  const cutpoints = mode === 'quantiles'
    ? Array.from({ length: requestedBins - 1 }, (_, index) => quantile(values, (index + 1) / requestedBins)!)
    : Array.from({ length: requestedBins - 1 }, (_, index) => minimum + (maximum - minimum) * (index + 1) / requestedBins);
  const uniqueCutpoints = [...new Set(cutpoints.filter(value => Number.isFinite(value) && value > minimum && value < maximum))];
  const bounds = [minimum, ...uniqueCutpoints, maximum];
  return bounds.slice(0, -1).map((lower, index) => {
    const upper = bounds[index + 1];
    const count = values.filter(value => value >= lower && (index === bounds.length - 2 ? value <= upper : value < upper)).length;
    return { lower, upper, count, label: `${lower.toFixed(2)} à ${upper.toFixed(2)}` };
  });
}

function variableLabel(name: string) {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function analyticVariableProfile(rows: Row[], name: string) {
  const rawValues = rows.map(row => row[name]);
  const completeValues = rawValues.filter(value => String(value ?? '').trim() !== '');
  const numericValues = completeValues.map(numericValue).filter((value): value is number => value !== null);
  const numericRatio = completeValues.length ? numericValues.length / completeValues.length : 0;
  const uniqueValues = new Set(completeValues.map(value => String(value).trim()));
  const numeric = completeValues.length > 0 && numericRatio >= .8;
  const integerNumeric = numeric && numericValues.every(Number.isInteger);
  const lowCardinality = uniqueValues.size <= Math.max(2, Math.min(20, Math.ceil(completeValues.length * .2)));
  const dateLike = completeValues.length > 0 && completeValues.filter(value => !Number.isNaN(Date.parse(String(value)))).length / completeValues.length >= .8 && !numeric;
  const measure = numeric && !lowCardinality ? 'Scale' : integerNumeric && lowCardinality ? 'Ordinal/Nominal' : dateLike ? 'Date/Time' : 'Nominal';
  const type = numeric ? (integerNumeric ? 'Numeric integer' : 'Numeric decimal') : dateLike ? 'Date' : 'String';
  const valueCounts = new Map<string, number>();
  completeValues.forEach(value => {
    const key = String(value).trim();
    valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
  });
  return {
    name,
    label: variableLabel(name),
    type,
    measure,
    role: /id|uuid|code|reference/i.test(name) ? 'Record ID' : 'Input',
    width: Math.max(8, Math.min(40, String(name).length + 2)),
    decimals: numeric && !integerNumeric ? 2 : 0,
    missing: rawValues.length - completeValues.length,
    valid: completeValues.length,
    unique: uniqueValues.size,
    valueLabels: [...valueCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([value, count]) => ({ value, label: value, count })),
  };
}

function cumulativePareto(items: Array<{ label: string; count: number }>) {
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
  let cumulative = 0;
  return items.map(item => {
    cumulative += item.count;
    return { ...item, cumulativePercentage: Number((cumulative * 100 / total).toFixed(2)) };
  });
}

export default function SurveyAnalysisWorkspace({
  survey,
  forms,
  responses,
  mutate,
  setMessage: setExternalMessage,
  mode = 'other',
}: {
  survey: Row;
  forms: Row[];
  responses: Row[];
  mutate?: Mutate;
  setMessage?: (value: string) => void;
  mode?: SurveyAnalysisMode;
}) {
  const [localMessage, setLocalMessage] = useState('');
  const setMessage = (value: string) => {
    setLocalMessage(value);
    setExternalMessage?.(value);
  };
  const resourceMutate: Mutate = mutate || (async (resource, method, body, itemId) => {
    const response = await fetch(`/api/surveys/${survey.id}/resources?resource=${resource}${itemId ? `&item=${itemId}` : ''}`, {
      method,
      headers: method === 'DELETE' ? undefined : { 'Content-Type': 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(body || {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Opération impossible.');
    return result.item;
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [sourceName, setSourceName] = useState('');
  const [sourceMode, setSourceMode] = useState<'questionnaire' | 'file'>('questionnaire');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [mapping, setMapping] = useState<EnaSmartMapping>({ age: '', birthDate: '', surveyDate: '', sex: '', weight: '', height: '', muac: '', oedema: '', cluster: '', order: '', id: '' });
  const [villageColumn, setVillageColumn] = useState('');
  const [enumeratorColumn, setEnumeratorColumn] = useState('');
  const [plausibility, setPlausibility] = useState<Row | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [request, setRequest] = useState<StatisticalAnalysisRequest>({ type: 'frequencies', variables: [], predictors: [], confidenceLevel: 95 });
  const [result, setResult] = useState<Row | null>(null);
  const [interpretation, setInterpretation] = useState('');
  const [aiInterpretation, setAiInterpretation] = useState<Row | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingModule, setMappingModule] = useState<keyof typeof moduleSchemas>(mode === 'advanced' ? 'fcs' : 'anthropometry');
  const [moduleMappings, setModuleMappings] = useState<Record<string, Record<string, string>>>({});
  const [showAnthropometryData, setShowAnthropometryData] = useState(false);
  const [moduleExecuted, setModuleExecuted] = useState(false);
  const [dataDirty, setDataDirty] = useState(false);
  const [recodeOpen, setRecodeOpen] = useState(false);
  const [recodeVariable, setRecodeVariable] = useState('');
  const [recodeName, setRecodeName] = useState('');
  const [recodeRules, setRecodeRules] = useState('');
  const [recodeKind, setRecodeKind] = useState<RecodeVariableKind>('qualitative');
  const [recodeMode, setRecodeMode] = useState<RecodeMode>('modalities');
  const [recodeBinCount, setRecodeBinCount] = useState(4);
  const [recodeBinLabels, setRecodeBinLabels] = useState<string[]>([]);
  const [recodeUnmatched, setRecodeUnmatched] = useState<'copy' | 'missing'>('copy');
  const [qualityVariable, setQualityVariable] = useState('');
  const [analysisFailure, setAnalysisFailure] = useState('');
  const [reportFilterOpen, setReportFilterOpen] = useState(false);
  const [reportKind, setReportKind] = useState<'plausibility' | 'final'>('plausibility');
  const columns = Object.keys(rows[0] || {});
  const recodeDetection = useMemo(() => detectRecodeType(rows, recodeVariable), [rows, recodeVariable]);
  const recodeModalities = useMemo(() => {
    if (!recodeVariable) return [];
    const counts = new Map<string, number>();
    rows.forEach(row => {
      const value = String(row[recodeVariable] ?? '').trim();
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows, recodeVariable]);
  const generatedRecodeBins = useMemo(
    () => recodeVariable && (recodeMode === 'quantiles' || recodeMode === 'equal_width')
      ? buildRecodeBins(rows, recodeVariable, recodeMode, recodeBinCount)
      : [],
    [rows, recodeVariable, recodeMode, recodeBinCount],
  );
  const recodeBins = generatedRecodeBins.map((bin, index) => ({ ...bin, label: recodeBinLabels[index] || bin.label }));
  const recodeNumericSummary = useMemo(() => {
    if (!recodeVariable) return null;
    const values = rows.map(row => numericValue(row[recodeVariable])).filter((value): value is number => value !== null).sort((a, b) => a - b);
    if (!values.length) return null;
    const q1 = quantile(values, .25)!;
    const median = quantile(values, .5)!;
    const q3 = quantile(values, .75)!;
    return { minimum: values[0], q1, median, q3, maximum: values[values.length - 1], iqr: q3 - q1 };
  }, [rows, recodeVariable]);
  const recodeRuleMap = useMemo(() => new Map<string, string>(
    recodeRules.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const separator = line.indexOf('=');
      return separator > 0
        ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim()] as [string, string]
        : ['', ''] as [string, string];
    }).filter(([source]) => Boolean(source)),
  ), [recodeRules]);

  const filterColumns = useMemo(
    () => [...new Set([mapping.cluster, villageColumn, enumeratorColumn].filter((value): value is string => Boolean(value)))],
    [mapping.cluster, villageColumn, enumeratorColumn],
  );
  const filteredRows = useMemo(
    () => rows.filter(row => Object.entries(filters).every(([column, value]) => !value || String(row[column] ?? '') === value)),
    [rows, filters],
  );
  const analysisRows = useMemo<Row[]>(() => filteredRows.map(row => {
    const canonical = Object.values(moduleMappings).reduce((result, moduleMapping) => {
      Object.entries(moduleMapping).forEach(([target, source]) => {
        if (source) result[target] = row[source];
      });
      return result;
    }, {} as Row);
    const indicators = calculateSurveyIndicators({ ...row, ...canonical });
    return {
      ...row,
      FCS_score: indicators.fcs.score,
      FCS_category: indicators.fcs.category,
      FCSN_vitamin_A: indicators.fcsN.vitaminA,
      FCSN_protein: indicators.fcsN.protein,
      FCSN_haem_iron: indicators.fcsN.haemIron,
      HDDS_score: indicators.hdds.score,
      HHS_score: indicators.hhs.score,
      HHS_category: indicators.hhs.category,
      rCSI_score: indicators.rCSI.score,
      rCSI_IPC: indicators.rCSI.ipc,
      FES_share: indicators.fes.share,
      FES_category: indicators.fes.category,
      LCS_maximum: indicators.lcs.maximum,
      IYCF_MDD_score: indicators.iycf.diversityScore,
      IYCF_MDD_met: indicators.iycf.mdd,
      IYCF_MMF_met: indicators.iycf.mmf,
      IYCF_MMFF_met: indicators.iycf.mmff,
      IYCF_MAD_met: indicators.iycf.mad,
      MDDW_score: indicators.mddw.score,
      MDDW_met: indicators.mddw.minimumDietaryDiversity,
    };
  }), [filteredRows, moduleMappings]);
  const analysisColumns = Object.keys(analysisRows[0] || {});
  const finalReportUrl = `/api/surveys/${survey.id}/report?${new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value))).toString()}`;
  const quality = useMemo(() => filteredRows.length ? analyzeDataset(filteredRows) : null, [filteredRows]);
  const variableDictionary = useMemo(
    () => columns.map(column => analyticVariableProfile(filteredRows.length ? filteredRows : rows, column)),
    [columns, filteredRows, rows],
  );
  const globalQualityPareto = useMemo(() => {
    const activeRows = filteredRows.length ? filteredRows : rows;
    if (!activeRows.length) return [];
    const items = columns.map(column => {
      const profile = analyticVariableProfile(activeRows, column);
      const values = activeRows.map(row => numericValue(row[column])).filter((value): value is number => value !== null).sort((a, b) => a - b);
      let outliers = 0;
      if (values.length >= 4) {
        const q1 = quantile(values, .25)!;
        const q3 = quantile(values, .75)!;
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;
        outliers = values.filter(value => value < lower || value > upper).length;
      }
      const score = profile.missing + outliers;
      return { label: column, count: score, missing: profile.missing, outliers };
    }).filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 12);
    return cumulativePareto(items);
  }, [columns, filteredRows, rows]);
  const ageDistribution = useMemo(() => {
    if (!plausibility) return [];
    const counts = new Map<number, number>();
    (plausibility.observations || []).forEach((row: Row) => {
      const age = Number(row.age);
      if (Number.isFinite(age)) counts.set(Math.round(age), (counts.get(Math.round(age)) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([age, count]) => ({ age, count }));
  }, [plausibility]);
  const zDistribution = useMemo(() => {
    const observations = plausibility?.observations || [];
    const bins = Array.from({ length: 17 }, (_, index) => -4 + index * 0.5);
    return bins.map(start => ({
      z: start,
      whz: observations.filter((item: Row) => item.whz >= start && item.whz < start + 0.5).length,
      haz: observations.filter((item: Row) => item.haz >= start && item.haz < start + 0.5).length,
      waz: observations.filter((item: Row) => item.waz >= start && item.waz < start + 0.5).length,
    }));
  }, [plausibility]);
  const qualityDiagnostic = useMemo(() => {
    if (!qualityVariable) return null;
    const activeRows = filteredRows.length ? filteredRows : rows;
    const profile = analyticVariableProfile(activeRows, qualityVariable);
    const categoryCounts = new Map<string, number>();
    activeRows.forEach(row => {
      const value = String(row[qualityVariable] ?? '').trim() || 'Manquant';
      categoryCounts.set(value, (categoryCounts.get(value) || 0) + 1);
    });
    const categoryPareto = cumulativePareto([...categoryCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20));
    const values = activeRows
      .map(row => Number(String(row[qualityVariable] ?? '').replace(',', '.')))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
    if (!values.length) return {
      variable: qualityVariable,
      numeric: false as const,
      profile,
      count: activeRows.filter(row => String(row[qualityVariable] ?? '').trim()).length,
      missing: activeRows.filter(row => !String(row[qualityVariable] ?? '').trim()).length,
      categoryPareto,
    };
    const count = values.length;
    const mean = values.reduce((sum, value) => sum + value, 0) / count;
    const variance = count > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1) : 0;
    const standardDeviation = Math.sqrt(variance);
    const quantile = (probability: number) => {
      const position = (count - 1) * probability;
      const lower = Math.floor(position);
      const fraction = position - lower;
      return values[lower] + (values[Math.min(lower + 1, count - 1)] - values[lower]) * fraction;
    };
    const q1 = quantile(.25);
    const median = quantile(.5);
    const q3 = quantile(.75);
    const iqr = q3 - q1;
    const skewness = standardDeviation ? values.reduce((sum, value) => sum + ((value - mean) / standardDeviation) ** 3, 0) / count : 0;
    const kurtosis = standardDeviation ? values.reduce((sum, value) => sum + ((value - mean) / standardDeviation) ** 4, 0) / count - 3 : 0;
    const jarqueBera = count / 6 * (skewness ** 2 + kurtosis ** 2 / 4);
    const normalityPValue = Math.exp(-jarqueBera / 2);
    const positiveValues = values.filter(value => value > 0);
    const logarithms = positiveValues.map(Math.log);
    const logMean = logarithms.length ? logarithms.reduce((sum, value) => sum + value, 0) / logarithms.length : 0;
    const logVariance = logarithms.length > 1 ? logarithms.reduce((sum, value) => sum + (value - logMean) ** 2, 0) / logarithms.length : 0;
    const logSd = Math.sqrt(logVariance);
    const logSkewness = logSd ? logarithms.reduce((sum, value) => sum + ((value - logMean) / logSd) ** 3, 0) / logarithms.length : 0;
    const logKurtosis = logSd ? logarithms.reduce((sum, value) => sum + ((value - logMean) / logSd) ** 4, 0) / logarithms.length - 3 : 0;
    const logJarqueBera = logarithms.length / 6 * (logSkewness ** 2 + logKurtosis ** 2 / 4);
    const logNormalPValue = positiveValues.length === values.length && values.length >= 8 ? Math.exp(-logJarqueBera / 2) : null;
    const integerValues = values.every(Number.isInteger);
    const dispersionIndex = mean > 0 ? variance / mean : null;
    const uniqueValues = new Set(values);
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    const lcl = mean - 3 * standardDeviation;
    const ucl = mean + 3 * standardDeviation;
    const outliers = activeRows.map((row, index) => ({ row: index + 1, value: Number(String(row[qualityVariable] ?? '').replace(',', '.')) }))
      .filter(item => Number.isFinite(item.value) && (item.value < lowerFence || item.value > upperFence));
    const controlChart = activeRows.map((row, index) => {
      const value = Number(String(row[qualityVariable] ?? '').replace(',', '.'));
      return {
        row: index + 1,
        value: Number.isFinite(value) ? value : null,
        mean,
        ucl,
        lcl,
        outOfControl: Number.isFinite(value) && (value > ucl || value < lcl),
      };
    }).filter(item => item.value !== null);
    const controlAlerts = controlChart.filter(item => item.outOfControl);
    const nonNumericCount = Math.max(0, activeRows.length - profile.missing - count);
    const problemPareto = cumulativePareto([
      { label: 'Valeurs manquantes', count: profile.missing },
      { label: 'Valeurs IQR aberrantes', count: outliers.length },
      { label: 'Hors limites de controle', count: controlAlerts.length },
      { label: 'Valeurs non numeriques', count: nonNumericCount },
    ].map(item => ({ ...item, count: Math.max(0, item.count) })).filter(item => item.count > 0).sort((a, b) => b.count - a.count));
    const binCount = Math.max(5, Math.min(15, Math.ceil(Math.sqrt(count))));
    const minimum = values[0];
    const maximum = values.at(-1)!;
    const width = maximum === minimum ? 1 : (maximum - minimum) / binCount;
    const histogram = Array.from({ length: binCount }, (_, index) => {
      const start = minimum + index * width;
      const end = index === binCount - 1 ? maximum : start + width;
      return {
        interval: `${start.toFixed(1)}–${end.toFixed(1)}`,
        count: values.filter(value => value >= start && (index === binCount - 1 ? value <= end : value < end)).length,
      };
    });
    return {
      variable: qualityVariable,
      numeric: true as const,
      profile,
      count,
      missing: activeRows.length - count,
      mean,
      standardDeviation,
      minimum,
      q1,
      median,
      q3,
      maximum,
      skewness,
      kurtosis,
      normalityPValue,
      normalityConclusion: normalityPValue < .05
        ? 'La distribution s’écarte significativement d’une loi normale selon Jarque-Bera.'
        : 'Aucun écart significatif à la normalité n’est détecté par Jarque-Bera; cela ne prouve pas la normalité.',
      distributionCandidates: [
        { name: 'Normale', compatible: normalityPValue >= .05, detail: `Jarque-Bera p=${normalityPValue.toFixed(4)}` },
        { name: 'Log-normale', compatible: logNormalPValue !== null && logNormalPValue >= .05, detail: logNormalPValue === null ? 'Non évaluable : valeurs non positives ou effectif insuffisant.' : `Jarque-Bera sur log(x) p=${logNormalPValue.toFixed(4)}` },
        { name: 'Poisson', compatible: integerValues && dispersionIndex !== null && Math.abs(dispersionIndex - 1) <= .25, detail: integerValues && dispersionIndex !== null ? `Indice variance/moyenne=${dispersionIndex.toFixed(3)}` : 'Non évaluable : variable non entière ou moyenne nulle.' },
        { name: 'Binaire/Bernoulli', compatible: uniqueValues.size === 2, detail: `${uniqueValues.size} valeur(s) numérique(s) distincte(s).` },
      ],
      lowerFence,
      upperFence,
      outliers,
      histogram,
      categoryPareto,
      controlChart,
      controlAlerts,
      lcl,
      ucl,
      problemPareto,
    };
  }, [qualityVariable, filteredRows, rows]);
  const statisticalChart = useMemo(() => {
    if (!result) return [] as Array<{ label: string; value: number }>;
    if (result.type === 'frequencies') return (result.tables?.[0]?.categories || []).slice(0, 20).map((item: Row) => ({ label: String(item.value), value: Number(item.count) }));
    if (result.type === 'descriptives') return (result.variables || []).map((item: Row) => ({ label: String(item.variable), value: Number(item.mean) }));
    if (['independent_t', 'anova'].includes(result.type)) return (result.groups || []).map((item: Row) => ({ label: String(item.name), value: Number(item.mean) }));
    if (['mann_whitney', 'kruskal_wallis'].includes(result.type)) return (result.groups || []).map((item: Row) => ({ label: String(item.group), value: Number(item.meanRank) }));
    if (result.type === 'linear_regression') return (result.coefficients || []).map((item: Row) => ({ label: String(item.variable), value: Number(item.coefficient) }));
    if (result.type === 'binary_logistic') return (result.parameters || []).map((item: Row) => ({ label: String(item.variable), value: Number(item.oddsRatio) }));
    if (result.type === 'cox_regression') return (result.parameters || []).map((item: Row) => ({ label: String(item.variable), value: Number(item.hazardRatio) }));
    if (result.type === 'correlation' && result.variables?.length > 1) return result.variables.slice(1).map((variable: string, index: number) => ({ label: variable, value: Number(result.pearson?.[0]?.[index + 1]) }));
    return [];
  }, [result]);

  async function load(file?: File) {
    if (!file) return;
    setSourceName(file.name);
    if (file.name.toLowerCase().endsWith('.csv')) {
      const parsed = Papa.parse<Row>(await file.text(), { header: true, skipEmptyLines: true, dynamicTyping: true });
      setRows(parsed.data);
    } else {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      setRows(XLSX.utils.sheet_to_json<Row>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' }));
    }
    setFilters({});
    setPlausibility(null);
    setResult(null);
  }

  function changeSourceMode(mode: 'questionnaire' | 'file') {
    setSourceMode(mode);
    setRows([]);
    setSourceName('');
    setSelectedFormId('');
    setFilters({});
    setPlausibility(null);
    setResult(null);
  }

  function loadQuestionnaire(formId: string) {
    setSelectedFormId(formId);
    const form = forms.find(item => item.id === formId);
    if (!form) {
      setRows([]);
      setSourceName('');
      return;
    }
    const selectedResponses = responses.filter(response =>
      response.form_id === formId
      || response.response_data?.form_id === formId
      || response.response_data?.form_code === form.form_code,
    );
    const questionnaireRows = selectedResponses.map(response => ({
      ...(response.response_data?.answers || {}),
      response_id: response.id,
      response_reference: response.response_reference || response.cluster_reference || response.id,
      source_type: response.source_type || 'local',
      cluster_reference: response.cluster_reference || '',
      village_code: response.village_code || '',
      village_name: response.village_name || '',
      enumerator_id: response.enumerator_id || '',
      submitted_at: response.submitted_at || '',
    }));
    setRows(questionnaireRows);
    setSourceName(`${form.title} (${form.form_code})`);
    setFilters({});
    setPlausibility(null);
    setResult(null);
    setMessage(`${questionnaireRows.length} réponse(s) du questionnaire « ${form.title} » chargée(s) dans le module d'analyse.`);
  }

  function suggestMapping(module: keyof typeof moduleSchemas) {
    const normalizedColumns = columns.map(column => ({ column, normalized: column.toLowerCase().replace(/[^a-z0-9]/g, '') }));
    const suggestions: Record<string, string> = {};
    moduleSchemas[module].fields.forEach(([target, , , aliases]) => {
      const normalizedAliases = [target, ...aliases].map(alias => alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
      suggestions[target] = normalizedColumns.find(item => normalizedAliases.includes(item.normalized))?.column || '';
    });
    setModuleMappings(current => ({ ...current, [module]: { ...suggestions, ...(current[module] || {}) } }));
  }

  function applyModuleMapping() {
    const selected = moduleMappings[mappingModule] || {};
    if (mappingModule === 'anthropometry' && !selected.age && !selected.birthDate) {
      setMessage('Associez soit “ge estimé/révolu en mois”, soit “Date de naissance”.');
      return;
    }
    if (mappingModule === 'anthropometry' && selected.birthDate && !selected.age && !selected.surveyDate && !rows.some(row => row.submitted_at)) {
      setMessage('Pour calculer l’âge depuis la date de naissance, associez aussi la date de l’enquête/mesure.');
      return;
    }
    const missing = moduleSchemas[mappingModule].fields.filter(([target, , required]) => required && !selected[target]);
    if (missing.length) {
      setMessage(`Correspondance incomplète : ${missing.map(([, label]) => label).join(', ')}.`);
      return;
    }
    if (mappingModule === 'anthropometry') {
      setMapping(current => ({
        ...current,
        id: selected.id || '',
        age: selected.age || '',
        birthDate: selected.birthDate || '',
        surveyDate: selected.surveyDate || '',
        sex: selected.sex || '',
        weight: selected.weight || '',
        height: selected.height || '',
        muac: selected.muac || '',
        oedema: selected.oedema || '',
        cluster: selected.cluster || '',
        order: selected.order || '',
      }));
      setVillageColumn(selected.village || '');
      setEnumeratorColumn(selected.enumerator || '');
    }
    setMappingOpen(false);
    setMessage(`Correspondance ${moduleSchemas[mappingModule].label} validée.`);
  }

  function runPlausibility() {
    if ((!mapping.age && !mapping.birthDate) || !mapping.sex || !mapping.weight || !mapping.height) {
      setMessage('Associez l’âge en mois ou la date de naissance, puis le sexe, le poids et la taille.');
      return;
    }
    const report = analyzeEnaSmartPlausibility(filteredRows, {
      ...mapping,
      village: villageColumn,
      enumerator: enumeratorColumn,
    });
    setPlausibility(report);
    setMessage(`Contrôle SMART calculé sur ${filteredRows.length} observation(s).`);
  }

  function executeAnalysis() {
    try {
      const analysis = runStatisticalAnalysis(analysisRows, request);
      if ('converged' in analysis && analysis.converged === false) {
        throw new Error(
          request.type === 'binary_logistic'
            ? 'La régression logistique n’a pas convergé. Causes probables : séparation parfaite ou quasi parfaite, prédicteurs colinéaires, modalités trop rares, trop peu d’événements ou échelles numériques extrêmes.'
            : 'Le modèle de Cox n’a pas convergé. Causes probables : nombre d’événements insuffisant, prédicteurs colinéaires, séparation des risques ou valeurs numériques extrêmes.',
        );
      }
      setResult(analysis);
      setInterpretation(interpretStatisticalResult(analysis));
      setAiInterpretation(null);
      setAnalysisFailure('');
      setDialogOpen(false);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Analyse impossible pour une raison non identifiée.';
      setAnalysisFailure(reason);
      setMessage(reason);
    }
  }

  function runAdvancedModule() {
    if (mappingModule === 'anthropometry') {
      setMessage('Sélectionnez un module avancé avant de lancer le calcul.');
      return;
    }
    const selected = moduleMappings[mappingModule] || {};
    const missing = moduleSchemas[mappingModule].fields.filter(([target, , required]) => required && !selected[target]);
    if (missing.length) {
      setMessage(`Variables requises non associées : ${missing.map(([, label]) => label).join(', ')}.`);
      return;
    }
    setModuleExecuted(true);
    setDataDirty(true);
    setMessage(`${moduleSchemas[mappingModule].label} calculé sur ${analysisRows.length} observation(s). Les nouvelles variables sont prêtes à être enregistrées.`);
  }

  function selectRecodeVariable(variable: string) {
    setRecodeVariable(variable);
    setRecodeName(variable ? `${variable}_rec` : '');
    setRecodeBinLabels([]);
    if (!variable) {
      setRecodeRules('');
      return;
    }
    const detection = detectRecodeType(rows, variable);
    setRecodeKind(detection.kind);
    setRecodeMode(detection.kind === 'quantitative' ? 'ranges' : 'modalities');
    if (detection.kind === 'qualitative') {
      const values = [...new Set(rows.map(row => String(row[variable] ?? '').trim()).filter(Boolean))];
      setRecodeRules(values.map(value => `${value}=${value}`).join('\n'));
    } else setRecodeRules('');
  }

  function updateQualitativeTarget(source: string, target: string) {
    const next = new Map(recodeRuleMap);
    next.set(source, target);
    setRecodeRules([...next.entries()].map(([oldValue, newValue]) => `${oldValue}=${newValue}`).join('\n'));
  }

  function applyRecode() {
    if (!recodeVariable || !recodeName.trim()) {
      setMessage('Sélectionnez une variable source et donnez un nom à la nouvelle variable.');
      return;
    }
    const rules = recodeRules.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const separator = line.indexOf('=');
      if (separator < 1) return null;
      return { source: line.slice(0, separator).trim(), target: line.slice(separator + 1).trim() };
    }).filter((rule): rule is { source: string; target: string } => Boolean(rule));
    const usesGeneratedBins = recodeKind === 'quantitative' && (recodeMode === 'quantiles' || recodeMode === 'equal_width');
    if (!usesGeneratedBins && !rules.length) {
      setMessage(recodeKind === 'qualitative' ? 'Ajoutez au moins une correspondance de modalité.' : 'Ajoutez au moins une plage quantitative.');
      return;
    }
    if (recodeKind === 'quantitative' && recodeMode === 'ranges') {
      const ranges = rules.map(rule => {
        const match = rule.source.match(/^(-?\d+(?:[.,]\d+)?)\s*\.\.\s*(-?\d+(?:[.,]\d+)?)$/);
        return match ? { lower: Number(match[1].replace(',', '.')), upper: Number(match[2].replace(',', '.')), label: rule.target } : null;
      });
      if (ranges.some(range => !range)) {
        setMessage('Chaque règle quantitative doit utiliser la syntaxe min..max=libellé.');
        return;
      }
      const sortedRanges = (ranges as Array<{ lower: number; upper: number; label: string }>).sort((a, b) => a.lower - b.lower);
      if (sortedRanges.some(range => range.lower > range.upper)) {
        setMessage('Une borne inférieure est supérieure à sa borne maximale.');
        return;
      }
      if (sortedRanges.some((range, index) => index > 0 && range.lower <= sortedRanges[index - 1].upper)) {
        setMessage('Des intervalles se chevauchent. Ajustez les bornes afin que chaque observation appartienne à une seule classe.');
        return;
      }
    }
    if (usesGeneratedBins && recodeBins.length < 2) {
      setMessage('Impossible de produire au moins deux classes distinctes. Vérifiez la dispersion de la variable ou réduisez le nombre de classes.');
      return;
    }
    const nextName = recodeName.trim().replace(/\s+/g, '_');
    if (columns.includes(nextName)) {
      setMessage(`La variable « ${nextName} » existe déjà. Choisissez un nouveau nom afin de préserver les données d’origine.`);
      return;
    }
    if (usesGeneratedBins && recodeBins.some(bin => !bin.label.trim())) {
      setMessage('Chaque intervalle doit avoir un libellé non vide.');
      return;
    }
    setRows(current => current.map(row => {
      const raw = row[recodeVariable];
      const numeric = Number(String(raw ?? '').replace(',', '.'));
      const generatedBin = usesGeneratedBins && Number.isFinite(numeric)
        ? recodeBins.find((bin, index) => numeric >= bin.lower && (index === recodeBins.length - 1 ? numeric <= bin.upper : numeric < bin.upper))
        : null;
      const matched = rules.find(rule => {
        const range = rule.source.match(/^(-?\d+(?:[.,]\d+)?)\s*\.\.\s*(-?\d+(?:[.,]\d+)?)$/);
        if (range && Number.isFinite(numeric)) return numeric >= Number(range[1].replace(',', '.')) && numeric <= Number(range[2].replace(',', '.'));
        return String(raw ?? '').trim() === rule.source;
      });
      return { ...row, [nextName]: generatedBin?.label ?? matched?.target ?? (recodeUnmatched === 'copy' ? raw : null) };
    }));
    setDataDirty(true);
    setRecodeOpen(false);
    setQualityVariable(nextName);
    setMessage(`Nouvelle variable « ${nextName} » créée dans la base de travail.`);
  }

  async function saveWorkingDataset() {
    const dataset = mode === 'advanced' ? analysisRows : rows;
    if (!dataset.length) return;
    if (sourceMode === 'questionnaire' && selectedFormId) {
      const selectedResponses = responses.filter(response =>
        response.form_id === selectedFormId
        || response.response_data?.form_id === selectedFormId
        || response.response_data?.form_code === forms.find(form => form.id === selectedFormId)?.form_code,
      );
      for (const row of dataset) {
        const response = selectedResponses.find(item => item.id === (row as Row).response_id);
        if (!response) continue;
        const answers = { ...(response.response_data?.answers || {}) };
        Object.entries(row).forEach(([key, value]) => {
          if (!['response_id', 'response_reference', 'source_type', 'cluster_reference', 'village_code', 'village_name', 'enumerator_id', 'submitted_at'].includes(key)) answers[key] = value;
        });
        await resourceMutate('responses', 'PATCH', {
          response_data: { ...(response.response_data || {}), answers },
        }, response.id);
      }
      setDataDirty(false);
      setMessage('Variables calculées enregistrées dans la base du questionnaire.');
      return;
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(dataset), 'donnees_analysees');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    const suggestedName = `${sourceName.replace(/\.[^.]+$/, '') || 'base'}-analysees.xlsx`;
    const picker = (window as typeof window & { showSaveFilePicker?: (options: Row) => Promise<Row> }).showSaveFilePicker;
    if (picker) {
      const handle = await picker({
        suggestedName,
        types: [{ description: 'Classeur Excel', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      await writable.close();
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      link.download = suggestedName;
      link.click();
      URL.revokeObjectURL(link.href);
    }
    setDataDirty(false);
    setMessage('Base enrichie enregistrée.');
  }

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dataDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dataDirty]);

  async function generateAiInterpretation() {
    if (!result || !quality) return;
    setAiBusy(true);
    const response = await fetch(`/api/surveys/${survey.id}/ai-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: { rows: filteredRows.length, filters, method: analysisLabels[request.type] },
        quality,
        statisticalResult: result,
        deterministicInterpretation: interpretation,
      }),
    });
    const body = await response.json();
    setAiBusy(false);
    if (response.ok) setAiInterpretation(body.analysis);
    else setMessage(body.message || 'Interprétation IA impossible.');
  }

  async function saveResult(kind: 'plausibility' | 'statistical') {
    const payload = kind === 'plausibility' ? plausibility : result;
    if (!payload || !quality) return;
    await resourceMutate('reports', 'POST', {
      title: `${kind === 'plausibility' ? 'Contrôle de plausibilité SMART' : analysisLabels[request.type]} - ${new Date().toLocaleDateString('fr-FR')}`,
      report_type: kind,
      source_file_name: sourceName,
      dataset_summary: {
        rows: filteredRows.length,
        columns: columns.length,
        filters,
        mapping,
        source_type: sourceMode,
        form_id: sourceMode === 'questionnaire' ? selectedFormId : null,
        source_name: sourceName,
      },
      quality_report: quality,
      analysis_results: {
        result: payload,
        calculated_indicators: filteredRows.map((row, index) => ({ row: index + 1, ...calculateSurveyIndicators(row) })),
      },
      ai_interpretation: kind === 'statistical' ? (aiInterpretation || { summary: interpretation }) : {},
    });
    setMessage('Résultat enregistré pour le rapport final et la piste d’audit.');
  }

  async function saveAdvancedResult() {
    if (!moduleExecuted || !quality) return;
    await resourceMutate('reports', 'POST', {
      title: `${moduleSchemas[mappingModule].label} - ${new Date().toLocaleDateString('fr-FR')}`,
      report_type: 'advanced_module',
      source_file_name: sourceName,
      dataset_summary: {
        rows: analysisRows.length,
        columns: analysisColumns.length,
        filters,
        module: mappingModule,
        mapping: moduleMappings[mappingModule] || {},
        source_type: sourceMode,
        form_id: sourceMode === 'questionnaire' ? selectedFormId : null,
      },
      quality_report: quality,
      analysis_results: {
        module: mappingModule,
        calculated_rows: analysisRows,
      },
      ai_interpretation: {},
    });
    setMessage('Résultats du module enregistrés pour le rapport final et la piste d’audit.');
  }

  async function downloadPlausibility() {
    if ((!mapping.age && !mapping.birthDate) || !mapping.sex || !mapping.weight || !mapping.height) {
      setMessage('Validez l’âge en mois ou la date de naissance, ainsi que le sexe, le poids et la taille avant de générer le rapport.');
      return;
    }
    const currentPlausibility = analyzeEnaSmartPlausibility(filteredRows, {
      ...mapping,
      village: villageColumn,
      enumerator: enumeratorColumn,
    });
    setPlausibility(currentPlausibility);
    const response = await fetch(`/api/surveys/${survey.id}/plausibility-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, mapping: { ...mapping, village: villageColumn, enumerator: enumeratorColumn }, plausibility: currentPlausibility }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.message || 'Génération du rapport impossible.');
      return;
    }
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plausibilite-smart-${survey.id}.pdf`;
    link.click();
    URL.revokeObjectURL(link.href);
    setReportFilterOpen(false);
  }

  async function downloadFinalReport() {
    if (!quality || (!mapping.age && !mapping.birthDate) || !mapping.sex || !mapping.weight || !mapping.height) {
      setMessage('Calculez et validez d’abord l’analyse anthropométrique.');
      return;
    }
    const currentPlausibility = analyzeEnaSmartPlausibility(filteredRows, {
      ...mapping,
      village: villageColumn,
      enumerator: enumeratorColumn,
    });
    await resourceMutate('reports', 'POST', {
      title: `Contrôle de plausibilité SMART - ${new Date().toLocaleDateString('fr-FR')}`,
      report_type: 'plausibility',
      source_file_name: sourceName,
      dataset_summary: {
        rows: filteredRows.length,
        columns: columns.length,
        filters,
        mapping,
        source_type: sourceMode,
        form_id: sourceMode === 'questionnaire' ? selectedFormId : null,
        source_name: sourceName,
      },
      quality_report: quality,
      analysis_results: { result: currentPlausibility },
      ai_interpretation: {},
    });
    window.location.href = finalReportUrl;
    setReportFilterOpen(false);
  }

  return <div className="grid gap-6">
    {localMessage && <div className="border-l-4 border-emerald-600 bg-emerald-50 p-4 text-sm font-bold text-emerald-950">{localMessage}</div>}
    <Card title="Jeu de données" text="Sélectionnez une base collectée par un questionnaire de cette enquête ou importez un fichier CSV/Excel. Les analyses utilisent uniquement la source active.">
      <div className="inline-flex border bg-slate-50 p-1">
        <button onClick={() => changeSourceMode('questionnaire')} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold ${sourceMode === 'questionnaire' ? 'bg-forest text-white' : 'text-slate-600'}`}><Database className="h-4 w-4" />Questionnaire de l'enquête</button>
        <button onClick={() => changeSourceMode('file')} className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold ${sourceMode === 'file' ? 'bg-forest text-white' : 'text-slate-600'}`}><FileSpreadsheet className="h-4 w-4" />Fichier externe</button>
      </div>
      {sourceMode === 'questionnaire' ? <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Base de données rattachée à l'enquête">
          <select value={selectedFormId} onChange={event => loadQuestionnaire(event.target.value)} className="admin-input">
            <option value="">Sélectionner un questionnaire</option>
            {forms.map(form => {
              const count = responses.filter(response => response.form_id === form.id || response.response_data?.form_id === form.id || response.response_data?.form_code === form.form_code).length;
              return <option key={form.id} value={form.id}>{form.title} - {form.form_code} ({count} réponse{count > 1 ? 's' : ''})</option>;
            })}
          </select>
        </Field>
        <button disabled={!selectedFormId} onClick={() => loadQuestionnaire(selectedFormId)} className="btn-primary disabled:opacity-40"><Database className="mr-2 h-4 w-4" />Actualiser la base</button>
        {!forms.length && <p className="text-sm text-slate-500 md:col-span-2">Aucun questionnaire n'est encore rattaché à cette enquête.</p>}
      </div> : <label className="btn-primary mt-4 cursor-pointer"><FileSpreadsheet className="mr-2 h-4" />Importer CSV / Excel
        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={event => load(event.target.files?.[0])} />
      </label>}
      {sourceName && <p className="mt-4 border-l-4 border-emerald-600 bg-emerald-50 p-3 text-sm"><b>Source active :</b> {sourceName}</p>}
      {quality && <div className="mt-5 grid gap-3 sm:grid-cols-4">
        {[['Observations', filteredRows.length], ['Variables', quality.columnCount], ['Complétude', `${quality.completeness}%`], ['Doublons', quality.duplicateRows]].map(([label, value]) => <div key={String(label)} className="border bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}
      </div>}
    </Card>

    {rows.length > 0 && <Card title={mode === 'anthropometry' ? 'Étape 1 : correspondance et filtres' : 'Filtres analytiques'} text="Grappe, village/ZD, enquêteur et toute autre segmentation conservée dans le fichier peuvent être combinés.">
      {mode === 'anthropometry' && <button onClick={() => { setMappingModule('anthropometry'); suggestMapping('anthropometry'); setMappingOpen(true); }} className="btn-primary mb-4">Associer et valider les variables anthropométriques</button>}
      {mode === 'anthropometry' && <p className="border-l-4 border-emerald-600 bg-emerald-50 p-3 text-sm text-emerald-950">La grappe, le village/ZD et l’enquêteur se définissent une seule fois dans la fenêtre d’association. Les filtres correspondants apparaissent ensuite ci-dessous.</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {filterColumns.map(column => <Field key={column} label={`Filtrer : ${column}`}><select value={filters[column] || ''} onChange={event => setFilters(current => ({ ...current, [column]: event.target.value }))} className="admin-input"><option value="">Toutes les valeurs</option>{[...new Set(rows.map(row => String(row[column] ?? '')).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></Field>)}
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-800"><Filter className="h-4" />{filteredRows.length} observation(s) retenue(s) sur {rows.length}</p>
    </Card>}

    {mode === 'anthropometry' && rows.length > 0 && <Card title="Étape 2 : données anthropométriques et contrôle ENA/SMART" text="Les z-scores P/T, T/A et P/A sont calculés automatiquement à partir des standards OMS après validation de la correspondance.">
      <div className="grid gap-3 md:grid-cols-4">
        {([
          ['id', 'Identifiant'],
          ['age', 'ge estimé/révolu en mois'],
          ['birthDate', 'Date de naissance'],
          ['surveyDate', 'Date de l’enquête/mesure'],
          ['sex', 'Sexe'],
          ['weight', 'Poids'],
          ['height', 'Taille / longueur'],
          ['muac', 'PB / MUAC'],
          ['oedema', 'Œdèmes bilatéraux'],
          ['order', 'Ordre de passage'],
        ] as const).map(([key, label]) => <Field key={key} label={label}><select value={mapping[key] || ''} onChange={event => setMapping(current => ({ ...current, [key]: event.target.value }))} className="admin-input"><option value="">Non défini</option>{columns.map(column => <option key={column}>{column}</option>)}</select></Field>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => { runPlausibility(); setShowAnthropometryData(true); }} className="btn-secondary">Visualiser les données et z-scores</button>
        <button onClick={runPlausibility} className="btn-primary">Apprécier les données dans leur globalité</button>
      </div>
      {plausibility && <div className="mt-6 grid gap-6">
        {showAnthropometryData && <div className="overflow-x-auto border">
          <table className="min-w-[1100px] text-sm">
            <thead className="bg-slate-100 text-left"><tr>{['Ligne', 'ID', 'Grappe', 'Sexe', 'ge', 'Source âge', 'Poids', 'Taille', 'Œdème', 'MUAC', 'P/A Z', 'T/A Z', 'P/T Z', 'Signalements'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
            <tbody>{(plausibility.observations || []).map((item: Row) => <tr key={item.row} className="border-t">
              <td className="p-3">{item.row}</td><td className="p-3">{item.id ?? '-'}</td><td className="p-3">{item.cluster ?? '-'}</td><td className="p-3">{item.sex ?? '-'}</td>
              <td className="p-3">{item.age ?? '-'}</td><td className="p-3 text-xs">{item.ageSource === 'reported_months' ? 'ge en mois' : item.ageSource === 'birth_date' ? 'Date de naissance' : '-'}</td><td className="p-3">{item.weight ?? '-'}</td><td className="p-3">{item.height ?? '-'}</td><td className="p-3">{item.oedema ?? '-'}</td><td className="p-3">{item.muac ?? '-'}</td>
              <td className="p-3 font-mono">{item.waz?.toFixed?.(2) ?? '-'}</td><td className="p-3 font-mono">{item.haz?.toFixed?.(2) ?? '-'}</td><td className="p-3 font-mono">{item.whz?.toFixed?.(2) ?? '-'}</td>
              <td className={`p-3 text-xs font-bold ${item.flags?.length ? 'text-red-700' : 'text-emerald-700'}`}>{item.flags?.join(', ') || 'Valide'}</td>
            </tr>)}</tbody>
          </table>
        </div>}
        <div className="grid gap-3 sm:grid-cols-4">
          {[['Inclus', plausibility.included], ['Exclus / signalés', plausibility.excluded], ['Flags', `${plausibility.flagPercentage}%`], ['Sex-ratio', plausibility.ratios.sexRatio ?? 'N/A']].map(([label, value]) => <div key={String(label)} className="border p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>)}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="h-72 border p-3"><h4 className="font-black">Distribution de l’âge</h4><ResponsiveContainer width="100%" height="90%"><BarChart data={ageDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="age" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#15803d" /></BarChart></ResponsiveContainer></div>
          <div className="h-72 border p-3"><h4 className="font-black">Allure des distributions des z-scores</h4><ResponsiveContainer width="100%" height="90%"><LineChart data={zDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="z" /><YAxis /><Tooltip /><Legend /><Line dataKey="whz" stroke="#15803d" dot={false} /><Line dataKey="haz" stroke="#ea580c" dot={false} /><Line dataKey="waz" stroke="#2563eb" dot={false} /></LineChart></ResponsiveContainer></div>
        </div>
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-2">Indice</th><th>n</th><th>Moyenne</th><th>ET</th><th>Asymétrie</th><th>Aplatissement</th></tr></thead><tbody>{(['whz', 'haz', 'waz'] as const).map(indicator => { const item = plausibility.distributions[indicator]; return <tr key={indicator} className="border-t"><td className="p-2 font-bold uppercase">{indicator}</td><td>{item.count}</td><td>{item.mean?.toFixed(2) ?? 'N/A'}</td><td>{item.standardDeviation?.toFixed(2) ?? 'N/A'}</td><td>{item.skewness?.toFixed(2) ?? 'N/A'}</td><td>{item.kurtosis?.toFixed(2) ?? 'N/A'}</td></tr>; })}</tbody></table></div>
        <div className="flex flex-wrap gap-3"><button onClick={() => saveResult('plausibility')} className="btn-primary"><Save className="mr-2 h-4" />Conserver pour le rapport final</button><button onClick={() => { setReportKind('plausibility'); setReportFilterOpen(true); }} className="btn-secondary"><Download className="mr-2 h-4" />Rapport de plausibilité PDF filtré</button><button onClick={() => { setReportKind('final'); setReportFilterOpen(true); }} className="btn-secondary"><Download className="mr-2 h-4" />Rapport global selon le canevas</button></div>
      </div>}
    </Card>}

    {mode === 'advanced' && rows.length > 0 && <Card title="Module avancé à analyser" text="Sélectionnez d’abord le module. La fenêtre suivante n’affichera que les variables nécessaires à ce calcul.">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Module">
          <select value={mappingModule} onChange={event => { const next = event.target.value as keyof typeof moduleSchemas; setMappingModule(next); setModuleExecuted(false); suggestMapping(next); }} className="admin-input">
            {Object.entries(moduleSchemas).filter(([key]) => key !== 'anthropometry').map(([value, schema]) => <option key={value} value={value}>{schema.label}</option>)}
          </select>
        </Field>
        <button onClick={() => { suggestMapping(mappingModule); setMappingOpen(true); }} className="btn-primary">Associer les variables requises</button>
      </div>
      <button onClick={runAdvancedModule} className="btn-primary mt-4">Exécuter l’analyse du module</button>
      {moduleExecuted && <div className="mt-6 grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border p-4"><p className="text-xs font-bold uppercase text-slate-500">Module</p><p className="mt-2 font-black">{moduleSchemas[mappingModule].label}</p></div>
          <div className="border p-4"><p className="text-xs font-bold uppercase text-slate-500">Observations</p><p className="mt-2 text-xl font-black">{analysisRows.length}</p></div>
          <div className="border p-4"><p className="text-xs font-bold uppercase text-slate-500">Variables produites</p><p className="mt-2 text-xl font-black">{Math.max(0, analysisColumns.length - columns.length)}</p></div>
        </div>
          <div className="max-h-96 overflow-auto border"><table className="min-w-full text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{analysisColumns.map(column => <th key={column} className="whitespace-nowrap p-2 text-left">{column}</th>)}</tr></thead><tbody>{analysisRows.slice(0, 200).map((row: Row, index) => <tr key={index} className="border-t">{analysisColumns.map(column => <td key={column} className="whitespace-nowrap p-2">{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table></div>
        <div className="flex flex-wrap gap-3"><button onClick={saveWorkingDataset} className="btn-primary"><Save className="mr-2 h-4" />Enregistrer la base enrichie</button><button onClick={saveAdvancedResult} className="btn-secondary">Conserver les résultats pour le rapport final</button></div>
      </div>}
    </Card>}

    {mode === 'other' && rows.length > 0 && <Card title="Recodage, contrôle qualité et nettoyage" text="Créez de nouvelles variables sans écraser les variables sources, puis examinez les valeurs manquantes, distributions et observations aberrantes.">
      <div className="flex flex-wrap gap-3"><button onClick={() => setRecodeOpen(true)} className="btn-primary">Recoder ou regrouper une variable</button><button onClick={saveWorkingDataset} disabled={!dataDirty} className="btn-secondary disabled:opacity-40"><Save className="mr-2 h-4" />Enregistrer la base modifiée</button></div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="overflow-x-auto border">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-100 text-left"><tr>{['Variable', 'Label', 'Type', 'Measure', 'Role', 'Width', 'Decimals', 'Missing', 'Values'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
            <tbody>{variableDictionary.map(variable => <tr key={variable.name} className="border-t">
              <td className="p-3 font-mono font-bold">{variable.name}</td>
              <td className="p-3">{variable.label}</td>
              <td className="p-3">{variable.type}</td>
              <td className="p-3">{variable.measure}</td>
              <td className="p-3">{variable.role}</td>
              <td className="p-3">{variable.width}</td>
              <td className="p-3">{variable.decimals}</td>
              <td className="p-3">{variable.missing}</td>
              <td className="p-3">{variable.valueLabels.slice(0, 3).map(item => `${item.value}=${item.label}`).join('; ') || '-'}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="h-80 border p-3">
          <h4 className="font-black">Pareto global des problèmes qualité</h4>
          <p className="mt-1 text-xs text-slate-500">Manquants + valeurs IQR aberrantes par variable.</p>
          {globalQualityPareto.length ? <ResponsiveContainer width="100%" height="85%"><ComposedChart data={globalQualityPareto}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" interval={0} angle={-35} textAnchor="end" height={90} /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" domain={[0, 100]} /><Tooltip /><Bar yAxisId="left" dataKey="count" fill="#0f766e" /><Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#ea580c" strokeWidth={2} /></ComposedChart></ResponsiveContainer> : <p className="mt-8 text-sm text-slate-500">Aucun problème majeur détecté sur le sous-ensemble actif.</p>}
        </div>
      </div>
      <div className="mt-5 max-w-xl"><Field label="Variable à contrôler"><select value={qualityVariable} onChange={event => setQualityVariable(event.target.value)} className="admin-input"><option value="">Sélectionner</option>{columns.map(column => <option key={column}>{column}</option>)}</select></Field></div>
      {qualityDiagnostic && <div className="mt-6 grid gap-5">
        <div className="grid gap-3 sm:grid-cols-4">
          {[['Valides', qualityDiagnostic.count], ['Manquants', qualityDiagnostic.missing], ['Moyenne', qualityDiagnostic.numeric && 'mean' in qualityDiagnostic ? qualityDiagnostic.mean.toFixed(2) : 'Qualitative'], ['Valeurs aberrantes', qualityDiagnostic.numeric && 'outliers' in qualityDiagnostic ? qualityDiagnostic.outliers.length : 'N/A']].map(([label, value]) => <div key={String(label)} className="border p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>)}
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[['Type détecté', qualityDiagnostic.profile.type], ['Mesure', qualityDiagnostic.profile.measure], ['Rôle', qualityDiagnostic.profile.role], ['Modalités distinctes', qualityDiagnostic.profile.unique]].map(([label, value]) => <div key={String(label)} className="border bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 font-black">{value}</p></div>)}
        </div>
        {qualityDiagnostic.numeric && 'normalityPValue' in qualityDiagnostic && <>
          <div className="border-l-4 border-amber-500 bg-amber-50 p-4 text-sm"><b>Normalité, asymétrie et aplatissement</b><p className="mt-2">{qualityDiagnostic.normalityConclusion}</p><p className="mt-1">Jarque-Bera p={qualityDiagnostic.normalityPValue.toFixed(4)} · asymétrie={qualityDiagnostic.skewness.toFixed(3)} · aplatissement={qualityDiagnostic.kurtosis.toFixed(3)} · bornes IQR [{qualityDiagnostic.lowerFence.toFixed(2)} ; {qualityDiagnostic.upperFence.toFixed(2)}]</p></div>
          <div className="overflow-x-auto border"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Famille examinée</th><th className="p-3 text-left">Compatibilité exploratoire</th><th className="p-3 text-left">Diagnostic</th></tr></thead><tbody>{qualityDiagnostic.distributionCandidates.map(candidate => <tr key={candidate.name} className="border-t"><td className="p-3 font-bold">{candidate.name}</td><td className={`p-3 font-bold ${candidate.compatible ? 'text-emerald-700' : 'text-slate-500'}`}>{candidate.compatible ? 'Possible' : 'Non étayée'}</td><td className="p-3">{candidate.detail}</td></tr>)}</tbody></table></div>
          <div className="grid gap-5 xl:grid-cols-2">
            <div className="h-72 border p-3"><h4 className="font-black">Histogramme de {qualityDiagnostic.variable}</h4><ResponsiveContainer width="100%" height="90%"><BarChart data={qualityDiagnostic.histogram}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="interval" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#0f766e" /></BarChart></ResponsiveContainer></div>
            <div className="h-72 border p-3"><h4 className="font-black">Carte de contrôle Shewhart</h4><ResponsiveContainer width="100%" height="90%"><LineChart data={qualityDiagnostic.controlChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="row" /><YAxis /><Tooltip /><Legend /><Line dataKey="value" stroke="#0f766e" dot={false} /><Line dataKey="mean" stroke="#2563eb" dot={false} /><Line dataKey="ucl" stroke="#dc2626" dot={false} /><Line dataKey="lcl" stroke="#dc2626" dot={false} /></LineChart></ResponsiveContainer></div>
            <div className="h-72 border p-3 xl:col-span-2"><h4 className="font-black">Pareto des problèmes sur la variable</h4>{qualityDiagnostic.problemPareto.length ? <ResponsiveContainer width="100%" height="90%"><ComposedChart data={qualityDiagnostic.problemPareto}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" domain={[0, 100]} /><Tooltip /><Bar yAxisId="left" dataKey="count" fill="#0f766e" /><Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#ea580c" strokeWidth={2} /></ComposedChart></ResponsiveContainer> : <p className="mt-8 text-sm text-slate-500">Aucun manquant, outlier IQR ou point hors limite ±3σ.</p>}</div>
          </div>
          {qualityDiagnostic.controlAlerts.length > 0 && <div className="border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-800"><b>Points hors contrôle</b><p className="mt-1">{qualityDiagnostic.controlAlerts.length} observation(s) dépassent les limites moyenne ± 3 écarts-types. Vérifiez saisie, unité, protocole de mesure et valeurs extrêmes.</p></div>}
        </>}
        {!qualityDiagnostic.numeric && <div className="h-72 border p-3"><h4 className="font-black">Pareto des modalités</h4><ResponsiveContainer width="100%" height="90%"><ComposedChart data={qualityDiagnostic.categoryPareto}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" interval={0} angle={-25} textAnchor="end" height={80} /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" domain={[0, 100]} /><Tooltip /><Bar yAxisId="left" dataKey="count" fill="#0f766e" /><Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" stroke="#ea580c" strokeWidth={2} /></ComposedChart></ResponsiveContainer></div>}
      </div>}
    </Card>}

    {mode === 'other' && rows.length > 0 && <Card title="Laboratoire statistique" text="Configurez une analyse guidée avec contrôles d’hypothèses, sorties graphiques et messages d’erreur explicites. Toute impossibilité d’estimation affiche maintenant sa cause au lieu d’échouer silencieusement.">
      <button onClick={() => setDialogOpen(true)} className="btn-primary"><Plus className="mr-2 h-4" />Nouvelle analyse</button>
      {analysisFailure && <div className="mt-4 border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-800"><b>Analyse non estimable</b><p className="mt-1">{analysisFailure}</p></div>}
      {result && <div className="mt-5 grid gap-4">
        <div className="border-l-4 border-emerald-600 bg-emerald-50 p-4"><h4 className="font-black">{analysisLabels[result.type as StatisticalAnalysisType]}</h4><p className="mt-2 leading-7">{interpretation}</p>{(result.warning || result.assumptionWarning) && <p className="mt-2 font-bold text-amber-800">{result.warning || result.assumptionWarning}</p>}</div>
        <button onClick={generateAiInterpretation} disabled={aiBusy} className="btn-primary w-fit">{aiBusy ? 'Interprétation en cours...' : 'Commenter avec l’IA'}</button>
        {aiInterpretation && <div className="grid gap-3 border bg-slate-50 p-4"><p className="leading-7">{aiInterpretation.summary}</p>{(['findings', 'limitations', 'recommendations'] as const).map(section => <div key={section}><h5 className="font-black capitalize">{section}</h5><ul className="list-disc pl-5 text-sm">{(aiInterpretation[section] || []).map((item: string) => <li key={item}>{item}</li>)}</ul></div>)}</div>}
        {statisticalChart.length > 0 && <div className="h-72 border p-3"><h4 className="font-black">Sortie graphique principale</h4><ResponsiveContainer width="100%" height="90%"><BarChart data={statisticalChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#0f766e" /></BarChart></ResponsiveContainer></div>}
        <pre className="max-h-96 overflow-auto bg-slate-950 p-4 text-xs text-emerald-100">{JSON.stringify(result, null, 2)}</pre>
        {result.type === 'kaplan_meier' && result.curves?.[0] && <div className="h-72 border p-3"><h4 className="font-black">Courbe de survie : {result.curves[0].group}</h4><ResponsiveContainer width="100%" height="90%"><LineChart data={result.curves[0].points}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis domain={[0, 1]} /><Tooltip /><Line type="stepAfter" dataKey="survival" stroke="#15803d" dot={false} /></LineChart></ResponsiveContainer></div>}
        <button onClick={() => saveResult('statistical')} className="btn-secondary w-fit"><Save className="mr-2 h-4" />Enregistrer pour le rapport et l’audit</button>
      </div>}
    </Card>}

    {dialogOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h3 className="text-xl font-black">Paramétrer l’analyse</h3><p className="text-sm text-slate-500">Les filtres actifs s’appliquent automatiquement.</p></div><button onClick={() => setDialogOpen(false)}><X /></button></div>
        <div className="mt-5 grid gap-4">
          <Field label="Méthode"><select value={request.type} onChange={event => setRequest({ type: event.target.value as StatisticalAnalysisType, variables: [], predictors: [], confidenceLevel: 95 })} className="admin-input">{Object.entries(analysisLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          {['crosstab', 'independent_t', 'anova', 'linear_regression'].includes(request.type) && <Field label={request.type === 'crosstab' ? 'Variable en ligne' : 'Variable dépendante'}><select value={request.outcome || ''} onChange={event => setRequest(current => ({ ...current, outcome: event.target.value }))} className="admin-input"><option value="">Sélectionner</option>{analysisColumns.map(column => <option key={column}>{column}</option>)}</select></Field>}
          {['crosstab', 'independent_t', 'anova'].includes(request.type) && <Field label={request.type === 'crosstab' ? 'Variable en colonne' : 'Variable de groupe'}><select value={request.group || ''} onChange={event => setRequest(current => ({ ...current, group: event.target.value }))} className="admin-input"><option value="">Sélectionner</option>{analysisColumns.map(column => <option key={column}>{column}</option>)}</select></Field>}
          {['frequencies', 'descriptives', 'correlation'].includes(request.type) && <Field label="Variables"><MultiVariables columns={analysisColumns} values={request.variables || []} onChange={variables => setRequest(current => ({ ...current, variables }))} /></Field>}
          {request.type === 'linear_regression' && <Field label="Prédicteurs"><MultiVariables columns={analysisColumns.filter(column => column !== request.outcome)} values={request.predictors || []} onChange={predictors => setRequest(current => ({ ...current, predictors }))} /></Field>}
          {request.type === 'binary_logistic' && <>
            <Field label="Issue binaire"><select value={request.outcome || ''} onChange={event => setRequest(current => ({ ...current, outcome: event.target.value }))} className="admin-input"><option value="">Sélectionner</option>{analysisColumns.map(column => <option key={column}>{column}</option>)}</select></Field>
            <Field label="Valeur définissant l’événement"><input value={request.eventValue || ''} onChange={event => setRequest(current => ({ ...current, eventValue: event.target.value }))} placeholder="Ex. 1, Oui, Décès" className="admin-input" /></Field>
            <Field label="Prédicteurs numériques"><MultiVariables columns={analysisColumns.filter(column => column !== request.outcome)} values={request.predictors || []} onChange={predictors => setRequest(current => ({ ...current, predictors }))} /></Field>
          </>}
          {['kaplan_meier', 'cox_regression'].includes(request.type) && <>
            <Field label="Durée jusqu’à l’événement"><select value={request.time || ''} onChange={event => setRequest(current => ({ ...current, time: event.target.value }))} className="admin-input"><option value="">Sélectionner</option>{analysisColumns.map(column => <option key={column}>{column}</option>)}</select></Field>
            <Field label="Indicateur d’événement"><select value={request.event || ''} onChange={event => setRequest(current => ({ ...current, event: event.target.value }))} className="admin-input"><option value="">Sélectionner</option>{analysisColumns.map(column => <option key={column}>{column}</option>)}</select></Field>
            <Field label="Valeur définissant l’événement"><input value={request.eventValue || ''} onChange={event => setRequest(current => ({ ...current, eventValue: event.target.value }))} placeholder="Ex. 1, Oui, Décès" className="admin-input" /></Field>
            {request.type === 'kaplan_meier' && <Field label="Strate comparative (optionnelle)"><select value={request.strata || ''} onChange={event => setRequest(current => ({ ...current, strata: event.target.value }))} className="admin-input"><option value="">Aucune</option>{analysisColumns.map(column => <option key={column}>{column}</option>)}</select></Field>}
            {request.type === 'cox_regression' && <Field label="Prédicteurs numériques"><MultiVariables columns={analysisColumns} values={request.predictors || []} onChange={predictors => setRequest(current => ({ ...current, predictors }))} /></Field>}
          </>}
          {['mann_whitney', 'kruskal_wallis'].includes(request.type) && <>
            <Field label="Variable analysée"><select value={request.outcome || ''} onChange={event => setRequest(current => ({ ...current, outcome: event.target.value }))} className="admin-input"><option value="">Sélectionner</option>{analysisColumns.map(column => <option key={column}>{column}</option>)}</select></Field>
            <Field label="Variable de groupe"><select value={request.group || ''} onChange={event => setRequest(current => ({ ...current, group: event.target.value }))} className="admin-input"><option value="">Sélectionner</option>{analysisColumns.map(column => <option key={column}>{column}</option>)}</select></Field>
          </>}
          <Field label="Niveau de confiance"><select value={request.confidenceLevel} onChange={event => setRequest(current => ({ ...current, confidenceLevel: Number(event.target.value) }))} className="admin-input"><option value="90">90 %</option><option value="95">95 %</option><option value="99">99 %</option></select></Field>
          <div className="flex justify-end gap-3"><button onClick={() => setDialogOpen(false)} className="btn-secondary">Annuler</button><button onClick={executeAnalysis} className="btn-primary">Exécuter</button></div>
        </div>
      </div>
    </div>}
    {reportFilterOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="w-full max-w-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h3 className="text-xl font-black">Filtres du {reportKind === 'plausibility' ? 'rapport de plausibilité' : 'rapport global'}</h3><p className="mt-1 text-sm text-slate-500">Le rapport sera recalculé uniquement sur les observations correspondant à cette sélection.</p></div><button onClick={() => setReportFilterOpen(false)} aria-label="Fermer"><X /></button></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {filterColumns.length ? filterColumns.map(column => <Field key={column} label={column}><select value={filters[column] || ''} onChange={event => setFilters(current => ({ ...current, [column]: event.target.value }))} className="admin-input"><option value="">Toutes les valeurs</option>{[...new Set(rows.map(row => String(row[column] ?? '')).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></Field>) : <p className="text-sm text-amber-800 md:col-span-2">Associez la grappe, le village/ZD ou l’enquêteur pour activer les filtres correspondants.</p>}
        </div>
        <p className="mt-5 border-l-4 border-emerald-600 bg-emerald-50 p-3 text-sm font-bold">{filteredRows.length} observation(s) seront analysées sur {rows.length}.</p>
        <div className="mt-5 flex justify-end gap-3"><button onClick={() => setReportFilterOpen(false)} className="btn-secondary">Annuler</button><button onClick={() => reportKind === 'plausibility' ? downloadPlausibility() : downloadFinalReport()} className="btn-primary">Générer le PDF</button></div>
      </div>
    </div>}
    {recodeOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="w-full max-w-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h3 className="text-xl font-black">Recoder une variable</h3><p className="mt-1 text-sm text-slate-500">La variable d’origine est conservée. Une nouvelle colonne sera ajoutée à la base de travail.</p></div><button onClick={() => setRecodeOpen(false)} aria-label="Fermer"><X /></button></div>
        <div className="mt-5 grid gap-5">
          <Field label="Variable source"><select value={recodeVariable} onChange={event => selectRecodeVariable(event.target.value)} className="admin-input"><option value="">Sélectionner</option>{columns.map(column => <option key={column}>{column}</option>)}</select></Field>
          {recodeVariable && <div className="border-l-4 border-emerald-600 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-emerald-700">Type détecté automatiquement</p><p className="mt-1 font-black text-emerald-950">{recodeDetection.kind === 'quantitative' ? 'Variable quantitative' : 'Variable qualitative'}</p></div><div className="flex gap-4 text-xs font-bold text-slate-600"><span>{recodeDetection.valid} valides</span><span>{recodeDetection.missing} manquants</span><span>{recodeDetection.unique} distinctes</span></div></div>
            <p className="mt-2 text-sm text-slate-700">{recodeDetection.detail}</p>
          </div>}
          {recodeVariable && <Field label="Corriger le type si nécessaire"><select value={recodeKind} onChange={event => { const kind = event.target.value as RecodeVariableKind; setRecodeKind(kind); setRecodeMode(kind === 'quantitative' ? 'ranges' : 'modalities'); setRecodeBinLabels([]); }} className="admin-input"><option value="qualitative">Qualitative : modalités/catégories</option><option value="quantitative">Quantitative : valeurs ordonnées et intervalles</option></select></Field>}
          <Field label="Nom de la nouvelle variable"><input value={recodeName} onChange={event => setRecodeName(event.target.value)} className="admin-input" placeholder="Ex. classe_age" /></Field>

          {recodeVariable && recodeKind === 'qualitative' && <>
            <div><h4 className="font-black">Regroupement des modalités</h4><p className="mt-1 text-sm text-slate-500">Saisissez le même nouveau libellé pour fusionner plusieurs modalités. Les codes numériques à faible cardinalité sont traités ici comme des catégories.</p></div>
            <div className="max-h-80 overflow-auto border"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-3 text-left">Modalité d’origine</th><th className="p-3 text-left">Effectif</th><th className="p-3 text-left">Nouvelle modalité</th></tr></thead><tbody>{recodeModalities.map(([value, count]) => <tr key={value} className="border-t"><td className="p-3 font-mono">{value}</td><td className="p-3">{count}</td><td className="p-3"><input value={recodeRuleMap.get(value) ?? value} onChange={event => updateQualitativeTarget(value, event.target.value)} className="admin-input" /></td></tr>)}</tbody></table></div>
          </>}

          {recodeVariable && recodeKind === 'quantitative' && <>
            {recodeNumericSummary && <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">{[
              ['Minimum', recodeNumericSummary.minimum],
              ['Q1', recodeNumericSummary.q1],
              ['Médiane', recodeNumericSummary.median],
              ['Q3', recodeNumericSummary.q3],
              ['Maximum', recodeNumericSummary.maximum],
              ['IQR', recodeNumericSummary.iqr],
            ].map(([label, value]) => <div key={String(label)} className="border bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 font-mono font-black">{Number(value).toFixed(3)}</p></div>)}</div>}
            <Field label="Méthode de regroupement"><select value={recodeMode} onChange={event => { setRecodeMode(event.target.value as RecodeMode); setRecodeBinLabels([]); }} className="admin-input"><option value="ranges">Intervalles définis manuellement</option><option value="quantiles">Intervalles par quantiles (effectifs comparables)</option><option value="equal_width">Intervalles de même largeur</option></select></Field>
            {recodeMode === 'ranges' && <><Field label="Intervalles, un par ligne"><textarea value={recodeRules} onChange={event => setRecodeRules(event.target.value)} rows={7} className="admin-input font-mono" placeholder={'0..17=Moins de 18 ans\n18..64=18 à 64 ans\n65..120=65 ans et plus'} /></Field><p className="text-xs leading-5 text-slate-500">Les bornes min..max sont inclusives. Les règles sont évaluées dans l’ordre affiché.</p></>}
            {(recodeMode === 'quantiles' || recodeMode === 'equal_width') && <>
              <Field label={recodeMode === 'quantiles' ? 'Découpage quantile souhaité' : 'Nombre d’intervalles'}><select value={recodeBinCount} onChange={event => { setRecodeBinCount(Number(event.target.value)); setRecodeBinLabels([]); }} className="admin-input"><option value="3">3 classes — tertiles</option><option value="4">4 classes — quartiles</option><option value="5">5 classes — quintiles</option><option value="10">10 classes — déciles</option></select></Field>
              {recodeMode === 'quantiles' && <p className="border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-950">Les quantiles visent des effectifs comparables. Lorsque de nombreuses observations ont la même valeur, certains seuils peuvent fusionner et produire moins de classes que demandé.</p>}
              <div className="overflow-x-auto border"><table className="min-w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-3 text-left">Classe</th><th className="p-3 text-left">Borne inférieure</th><th className="p-3 text-left">Borne supérieure</th><th className="p-3 text-left">Effectif</th><th className="p-3 text-left">Libellé modifiable</th></tr></thead><tbody>{recodeBins.map((bin, index) => <tr key={`${bin.lower}-${bin.upper}`} className="border-t"><td className="p-3 font-black">{index + 1}</td><td className="p-3 font-mono">{bin.lower.toFixed(3)}</td><td className="p-3 font-mono">{bin.upper.toFixed(3)}</td><td className="p-3">{bin.count}</td><td className="p-3"><input value={bin.label} onChange={event => setRecodeBinLabels(current => { const next = [...current]; next[index] = event.target.value; return next; })} className="admin-input min-w-48" /></td></tr>)}</tbody></table></div>
            </>}
          </>}
          <Field label="Valeurs non couvertes par une règle"><select value={recodeUnmatched} onChange={event => setRecodeUnmatched(event.target.value as 'copy' | 'missing')} className="admin-input"><option value="copy">Conserver la valeur d’origine</option><option value="missing">Définir comme manquante</option></select></Field>
          <div className="flex justify-end gap-3"><button onClick={() => setRecodeOpen(false)} className="btn-secondary">Annuler</button><button onClick={applyRecode} className="btn-primary">Créer la variable</button></div>
        </div>
      </div>
    </div>}
    {mappingOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h3 className="text-xl font-black">Correspondance des variables</h3><p className="text-sm text-slate-500">Chaque champ attendu du module doit être associé sans ambiguïté à une colonne du fichier.</p></div><button onClick={() => setMappingOpen(false)}><X /></button></div>
        <div className="mt-5 flex gap-3"><select value={mappingModule} onChange={event => { const module = event.target.value as keyof typeof moduleSchemas; setMappingModule(module); suggestMapping(module); }} className="admin-input">{Object.entries(moduleSchemas).filter(([value]) => mode === 'anthropometry' ? value === 'anthropometry' : value !== 'anthropometry').map(([value, schema]) => <option key={value} value={value}>{schema.label}</option>)}</select><button onClick={() => suggestMapping(mappingModule)} className="btn-secondary">Détection automatique</button></div>
        <div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Champ du module</th><th>Obligation</th><th>Colonne de la base</th><th>État</th></tr></thead><tbody>{moduleSchemas[mappingModule].fields.map(([target, label, required]) => { const source = moduleMappings[mappingModule]?.[target] || ''; return <tr key={target} className="border-t"><td className="p-3"><b>{label}</b><p className="font-mono text-xs text-slate-500">{target}</p></td><td>{required ? 'Requis' : 'Optionnel'}</td><td><select value={source} onChange={event => setModuleMappings(current => ({ ...current, [mappingModule]: { ...(current[mappingModule] || {}), [target]: event.target.value } }))} className="admin-input min-w-64"><option value="">Non associé</option>{columns.map(column => <option key={column}>{column}</option>)}</select></td><td className={source ? 'font-bold text-emerald-700' : required ? 'font-bold text-red-700' : 'text-slate-500'}>{source ? 'Associé' : required ? 'Manquant' : 'N/A'}</td></tr>; })}</tbody></table></div>
        <div className="mt-5 flex justify-end gap-3"><button onClick={() => setMappingOpen(false)} className="btn-secondary">Annuler</button><button onClick={applyModuleMapping} className="btn-primary">Valider la correspondance</button></div>
      </div>
    </div>}
    {dataDirty && <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 border border-amber-300 bg-amber-50 p-4 shadow-xl">
      <p className="text-sm font-bold text-amber-950">La base de travail contient des variables nouvelles non enregistrées.</p>
      <div className="flex gap-3"><button onClick={() => setDataDirty(false)} className="btn-secondary">Continuer sans enregistrer</button><button onClick={saveWorkingDataset} className="btn-primary"><Save className="mr-2 h-4" />Choisir où enregistrer</button></div>
    </div>}
  </div>;
}
