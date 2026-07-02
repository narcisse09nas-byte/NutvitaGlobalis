'use client';

import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer,
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
      ['age', 'Âge en mois', true, ['age', 'age_months', 'agemonths']],
      ['sex', 'Sexe', true, ['sex', 'sexe', 'gender']],
      ['weight', 'Poids en kg', true, ['weight', 'poids', 'weight_kg']],
      ['height', 'Taille/longueur en cm', true, ['height', 'taille', 'length', 'height_cm']],
      ['muac', 'PB/MUAC', false, ['muac', 'pb', 'muac_cm']],
      ['cluster', 'Grappe', false, ['cluster', 'grappe', 'cluster_id']],
      ['village', 'Village/ZD', false, ['village', 'zd', 'enumeration_area']],
      ['enumerator', 'Enquêteur/équipe', false, ['enumerator', 'enqueteur', 'team']],
    ],
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

export default function SurveyAnalysisWorkspace({ survey, forms, responses, mutate, setMessage }: { survey: Row; forms: Row[]; responses: Row[]; mutate: Mutate; setMessage: (value: string) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [sourceName, setSourceName] = useState('');
  const [sourceMode, setSourceMode] = useState<'questionnaire' | 'file'>('questionnaire');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [mapping, setMapping] = useState<EnaSmartMapping>({ age: '', sex: '', weight: '', height: '', muac: '', cluster: '', id: '' });
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
  const [mappingModule, setMappingModule] = useState<keyof typeof moduleSchemas>('anthropometry');
  const [moduleMappings, setModuleMappings] = useState<Record<string, Record<string, string>>>({});
  const columns = Object.keys(rows[0] || {});

  const filterColumns = useMemo(
    () => [...new Set([mapping.cluster, villageColumn, enumeratorColumn].filter((value): value is string => Boolean(value)))],
    [mapping.cluster, villageColumn, enumeratorColumn],
  );
  const filteredRows = useMemo(
    () => rows.filter(row => Object.entries(filters).every(([column, value]) => !value || String(row[column] ?? '') === value)),
    [rows, filters],
  );
  const analysisRows = useMemo(() => filteredRows.map(row => {
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
    };
  }), [filteredRows, moduleMappings]);
  const analysisColumns = Object.keys(analysisRows[0] || {});
  const quality = useMemo(() => filteredRows.length ? analyzeDataset(filteredRows) : null, [filteredRows]);
  const ageDistribution = useMemo(() => {
    if (!mapping.age) return [];
    const counts = new Map<number, number>();
    filteredRows.forEach(row => {
      const age = Number(row[mapping.age]);
      if (Number.isFinite(age)) counts.set(Math.round(age), (counts.get(Math.round(age)) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([age, count]) => ({ age, count }));
  }, [filteredRows, mapping.age]);
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
        sex: selected.sex || '',
        weight: selected.weight || '',
        height: selected.height || '',
        muac: selected.muac || '',
        cluster: selected.cluster || '',
      }));
      setVillageColumn(selected.village || '');
      setEnumeratorColumn(selected.enumerator || '');
    }
    setMappingOpen(false);
    setMessage(`Correspondance ${moduleSchemas[mappingModule].label} validée.`);
  }

  function runPlausibility() {
    if (!mapping.age || !mapping.sex || !mapping.weight || !mapping.height) {
      setMessage('Associez au minimum les colonnes âge, sexe, poids et taille.');
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
      setResult(analysis);
      setInterpretation(interpretStatisticalResult(analysis));
      setAiInterpretation(null);
      setDialogOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Analyse impossible.');
    }
  }

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
    await mutate('reports', 'POST', {
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

  async function downloadPlausibility() {
    if (!plausibility) return;
    const response = await fetch(`/api/surveys/${survey.id}/plausibility-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filters, mapping, plausibility }),
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
  }

  return <div className="grid gap-6">
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

    {rows.length > 0 && <Card title="Filtres analytiques" text="Grappe, village/ZD, enquêteur et toute autre segmentation conservée dans le fichier peuvent être combinés.">
      <button onClick={() => { suggestMapping(mappingModule); setMappingOpen(true); }} className="btn-primary mb-4">Associer les colonnes aux modules</button>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Colonne grappe"><select value={mapping.cluster} onChange={event => setMapping(current => ({ ...current, cluster: event.target.value }))} className="admin-input"><option value="">Non définie</option>{columns.map(column => <option key={column}>{column}</option>)}</select></Field>
        <Field label="Colonne village / ZD"><select value={villageColumn} onChange={event => setVillageColumn(event.target.value)} className="admin-input"><option value="">Non définie</option>{columns.map(column => <option key={column}>{column}</option>)}</select></Field>
        <Field label="Colonne enquêteur"><select value={enumeratorColumn} onChange={event => setEnumeratorColumn(event.target.value)} className="admin-input"><option value="">Non définie</option>{columns.map(column => <option key={column}>{column}</option>)}</select></Field>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {filterColumns.map(column => <Field key={column} label={`Filtrer : ${column}`}><select value={filters[column] || ''} onChange={event => setFilters(current => ({ ...current, [column]: event.target.value }))} className="admin-input"><option value="">Toutes les valeurs</option>{[...new Set(rows.map(row => String(row[column] ?? '')).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}</select></Field>)}
      </div>
      <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-800"><Filter className="h-4" />{filteredRows.length} observation(s) retenue(s) sur {rows.length}</p>
    </Card>}

    {rows.length > 0 && <Card title="Contrôle de plausibilité ENA/SMART" text="Associez les variables, puis calculez le contrôle sur le sous-ensemble filtré.">
      <div className="grid gap-3 md:grid-cols-4">
        {([
          ['id', 'Identifiant'],
          ['age', 'Âge en mois'],
          ['sex', 'Sexe'],
          ['weight', 'Poids'],
          ['height', 'Taille / longueur'],
          ['muac', 'PB / MUAC'],
        ] as const).map(([key, label]) => <Field key={key} label={label}><select value={mapping[key] || ''} onChange={event => setMapping(current => ({ ...current, [key]: event.target.value }))} className="admin-input"><option value="">Non défini</option>{columns.map(column => <option key={column}>{column}</option>)}</select></Field>)}
      </div>
      <button onClick={runPlausibility} className="btn-primary mt-4">Calculer le contrôle SMART</button>
      {plausibility && <div className="mt-6 grid gap-6">
        <div className="grid gap-3 sm:grid-cols-4">
          {[['Inclus', plausibility.included], ['Exclus / signalés', plausibility.excluded], ['Flags', `${plausibility.flagPercentage}%`], ['Sex-ratio', plausibility.ratios.sexRatio ?? 'N/A']].map(([label, value]) => <div key={String(label)} className="border p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-xl font-black">{value}</p></div>)}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="h-72 border p-3"><h4 className="font-black">Distribution de l’âge</h4><ResponsiveContainer width="100%" height="90%"><BarChart data={ageDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="age" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#15803d" /></BarChart></ResponsiveContainer></div>
          <div className="h-72 border p-3"><h4 className="font-black">Allure des distributions des z-scores</h4><ResponsiveContainer width="100%" height="90%"><LineChart data={zDistribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="z" /><YAxis /><Tooltip /><Legend /><Line dataKey="whz" stroke="#15803d" dot={false} /><Line dataKey="haz" stroke="#ea580c" dot={false} /><Line dataKey="waz" stroke="#2563eb" dot={false} /></LineChart></ResponsiveContainer></div>
        </div>
        <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-2">Indice</th><th>n</th><th>Moyenne</th><th>ET</th><th>Asymétrie</th><th>Aplatissement</th></tr></thead><tbody>{(['whz', 'haz', 'waz'] as const).map(indicator => { const item = plausibility.distributions[indicator]; return <tr key={indicator} className="border-t"><td className="p-2 font-bold uppercase">{indicator}</td><td>{item.count}</td><td>{item.mean?.toFixed(2) ?? 'N/A'}</td><td>{item.standardDeviation?.toFixed(2) ?? 'N/A'}</td><td>{item.skewness?.toFixed(2) ?? 'N/A'}</td><td>{item.kurtosis?.toFixed(2) ?? 'N/A'}</td></tr>; })}</tbody></table></div>
        <div className="flex flex-wrap gap-3"><button onClick={() => saveResult('plausibility')} className="btn-primary"><Save className="mr-2 h-4" />Enregistrer</button><button onClick={downloadPlausibility} className="btn-secondary"><Download className="mr-2 h-4" />Exporter les résultats</button></div>
      </div>}
    </Card>}

    {rows.length > 0 && <Card title="Laboratoire statistique" text="Configurez une analyse comme dans une boîte de dialogue SPSS. Le résultat reste distinct des données sources et peut être enregistré dans le rapport.">
      <button onClick={() => setDialogOpen(true)} className="btn-primary"><Plus className="mr-2 h-4" />Nouvelle analyse</button>
      {result && <div className="mt-5 grid gap-4">
        <div className="border-l-4 border-emerald-600 bg-emerald-50 p-4"><h4 className="font-black">{analysisLabels[result.type as StatisticalAnalysisType]}</h4><p className="mt-2 leading-7">{interpretation}</p>{(result.warning || result.assumptionWarning) && <p className="mt-2 font-bold text-amber-800">{result.warning || result.assumptionWarning}</p>}</div>
        <button onClick={generateAiInterpretation} disabled={aiBusy} className="btn-primary w-fit">{aiBusy ? 'Interprétation en cours...' : 'Commenter avec l’IA'}</button>
        {aiInterpretation && <div className="grid gap-3 border bg-slate-50 p-4"><p className="leading-7">{aiInterpretation.summary}</p>{(['findings', 'limitations', 'recommendations'] as const).map(section => <div key={section}><h5 className="font-black capitalize">{section}</h5><ul className="list-disc pl-5 text-sm">{(aiInterpretation[section] || []).map((item: string) => <li key={item}>{item}</li>)}</ul></div>)}</div>}
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
    {mappingOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h3 className="text-xl font-black">Correspondance des variables</h3><p className="text-sm text-slate-500">Chaque champ attendu du module doit être associé sans ambiguïté à une colonne du fichier.</p></div><button onClick={() => setMappingOpen(false)}><X /></button></div>
        <div className="mt-5 flex gap-3"><select value={mappingModule} onChange={event => { const module = event.target.value as keyof typeof moduleSchemas; setMappingModule(module); suggestMapping(module); }} className="admin-input">{Object.entries(moduleSchemas).map(([value, schema]) => <option key={value} value={value}>{schema.label}</option>)}</select><button onClick={() => suggestMapping(mappingModule)} className="btn-secondary">Détection automatique</button></div>
        <div className="mt-5 overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Champ du module</th><th>Obligation</th><th>Colonne de la base</th><th>État</th></tr></thead><tbody>{moduleSchemas[mappingModule].fields.map(([target, label, required]) => { const source = moduleMappings[mappingModule]?.[target] || ''; return <tr key={target} className="border-t"><td className="p-3"><b>{label}</b><p className="font-mono text-xs text-slate-500">{target}</p></td><td>{required ? 'Requis' : 'Optionnel'}</td><td><select value={source} onChange={event => setModuleMappings(current => ({ ...current, [mappingModule]: { ...(current[mappingModule] || {}), [target]: event.target.value } }))} className="admin-input min-w-64"><option value="">Non associé</option>{columns.map(column => <option key={column}>{column}</option>)}</select></td><td className={source ? 'font-bold text-emerald-700' : required ? 'font-bold text-red-700' : 'text-slate-500'}>{source ? 'Associé' : required ? 'Manquant' : 'N/A'}</td></tr>; })}</tbody></table></div>
        <div className="mt-5 flex justify-end gap-3"><button onClick={() => setMappingOpen(false)} className="btn-secondary">Annuler</button><button onClick={applyModuleMapping} className="btn-primary">Valider la correspondance</button></div>
      </div>
    </div>}
  </div>;
}
