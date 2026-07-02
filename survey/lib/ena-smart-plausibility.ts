import {
  calculateLFAzScore,
  calculateWFAzScore,
  calculateWFLzScore,
} from './who-growth-standards';

export type EnaSmartMapping = {
  age: string;
  sex: string;
  weight: string;
  height: string;
  muac?: string;
  cluster?: string;
  id?: string;
};

type NumericSummary = {
  count: number;
  mean: number | null;
  standardDeviation: number | null;
  skewness: number | null;
  kurtosis: number | null;
};

function numeric(value: unknown) {
  const result = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(result) ? result : null;
}

function summarize(values: Array<number | null>): NumericSummary {
  const clean = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!clean.length) return { count: 0, mean: null, standardDeviation: null, skewness: null, kurtosis: null };
  const mean = clean.reduce((sum, value) => sum + value, 0) / clean.length;
  const variance = clean.reduce((sum, value) => sum + (value - mean) ** 2, 0) / clean.length;
  const standardDeviation = Math.sqrt(variance);
  if (!standardDeviation) return { count: clean.length, mean, standardDeviation, skewness: 0, kurtosis: 0 };
  const skewness = clean.reduce((sum, value) => sum + ((value - mean) / standardDeviation) ** 3, 0) / clean.length;
  const kurtosis = clean.reduce((sum, value) => sum + ((value - mean) / standardDeviation) ** 4, 0) / clean.length - 3;
  return { count: clean.length, mean, standardDeviation, skewness, kurtosis };
}

function digitPreference(values: Array<number | null>) {
  const counts = Array.from({ length: 10 }, () => 0);
  values.forEach(value => {
    if (value === null) return;
    const digit = Math.abs(Math.round(value * 10)) % 10;
    counts[digit] += 1;
  });
  const total = counts.reduce((sum, value) => sum + value, 0);
  if (!total) return { total: 0, counts, score: null, classification: 'non_evaluable' };
  const expected = total / 10;
  const score = counts.reduce((sum, value) => sum + Math.abs(value - expected), 0) * 100 / (2 * total);
  return {
    total,
    counts,
    score: Number(score.toFixed(1)),
    classification: score <= 7 ? 'excellent' : score <= 12 ? 'bon' : score <= 20 ? 'acceptable' : 'problematique',
  };
}

function normalizedSex(value: unknown) {
  const sex = String(value ?? '').trim().toLowerCase();
  if (['1', 'm', 'male', 'masculin', 'garcon', 'garçon'].includes(sex)) return 'male';
  if (['2', 'f', 'female', 'feminin', 'féminin', 'fille'].includes(sex)) return 'female';
  return null;
}

export function analyzeEnaSmartPlausibility(rows: Record<string, unknown>[], mapping: EnaSmartMapping) {
  const observations = rows.map((row, index) => {
    const age = numeric(row[mapping.age]);
    const weight = numeric(row[mapping.weight]);
    const height = numeric(row[mapping.height]);
    const muac = mapping.muac ? numeric(row[mapping.muac]) : null;
    const sex = normalizedSex(row[mapping.sex]);
    const whz = sex && weight !== null && height !== null ? calculateWFLzScore(height, weight, sex) : null;
    const haz = sex && age !== null && height !== null ? calculateLFAzScore(age, height, sex) : null;
    const waz = sex && age !== null && weight !== null ? calculateWFAzScore(age, weight, sex) : null;
    const flags = [
      whz !== null && (whz < -5 || whz > 5) ? 'WHZ_OMS' : null,
      haz !== null && (haz < -6 || haz > 6) ? 'HAZ_OMS' : null,
      waz !== null && (waz < -6 || waz > 5) ? 'WAZ_OMS' : null,
      age !== null && (age < 6 || age > 59) ? 'AGE_HORS_6_59' : null,
      weight === null || weight <= 0 ? 'POIDS_MANQUANT' : null,
      height === null || height <= 0 ? 'TAILLE_MANQUANTE' : null,
      !sex ? 'SEXE_INVALIDE' : null,
    ].filter((flag): flag is string => Boolean(flag));
    return {
      row: index + 1,
      id: mapping.id ? row[mapping.id] : null,
      cluster: mapping.cluster ? row[mapping.cluster] : null,
      age,
      sex,
      weight,
      height,
      muac,
      whz,
      haz,
      waz,
      flags,
    };
  });

  const included = observations.filter(item => item.flags.length === 0);
  const younger = observations.filter(item => item.age !== null && item.age >= 6 && item.age <= 29).length;
  const older = observations.filter(item => item.age !== null && item.age >= 30 && item.age <= 59).length;
  const boys = observations.filter(item => item.sex === 'male').length;
  const girls = observations.filter(item => item.sex === 'female').length;
  const duplicateKeys = new Map<string, number[]>();
  observations.forEach(item => {
    const key = item.id == null ? '' : String(item.id).trim();
    if (key) duplicateKeys.set(key, [...(duplicateKeys.get(key) || []), item.row]);
  });

  const flagged = observations.filter(item => item.flags.length);
  const flagPercentage = observations.length ? flagged.length * 100 / observations.length : 0;
  return {
    engine: 'ENA-SMART-inspired plausibility v1',
    reference: 'WHO Child Growth Standards 2006',
    scope: 'Premier contrôle automatisé; ne remplace pas la validation dans ENA for SMART.',
    total: observations.length,
    included: included.length,
    excluded: flagged.length,
    flagPercentage: Number(flagPercentage.toFixed(1)),
    ratios: {
      boys,
      girls,
      sexRatio: girls ? Number((boys / girls).toFixed(2)) : null,
      age6To29: younger,
      age30To59: older,
      ageRatio: older ? Number((younger / older).toFixed(2)) : null,
    },
    distributions: {
      whz: summarize(included.map(item => item.whz)),
      haz: summarize(included.map(item => item.haz)),
      waz: summarize(included.map(item => item.waz)),
    },
    digitPreference: {
      weight: digitPreference(observations.map(item => item.weight)),
      height: digitPreference(observations.map(item => item.height)),
      muac: digitPreference(observations.map(item => item.muac)),
    },
    duplicateIds: [...duplicateKeys.entries()]
      .filter(([, lines]) => lines.length > 1)
      .map(([id, lines]) => ({ id, lines })),
    flags: flagged.map(item => ({ row: item.row, id: item.id, cluster: item.cluster, reasons: item.flags })),
  };
}
