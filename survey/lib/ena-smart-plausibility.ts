import {
  calculateLFAzScore,
  calculateWFAzScore,
  calculateWFLzScore,
} from './who-growth-standards';

export type EnaSmartMapping = {
  age: string;
  birthDate?: string;
  surveyDate?: string;
  sex: string;
  weight: string;
  height: string;
  muac?: string;
  oedema?: string;
  cluster?: string;
  village?: string;
  enumerator?: string;
  order?: string;
  id?: string;
};

type NumericSummary = {
  count: number;
  mean: number | null;
  standardDeviation: number | null;
  skewness: number | null;
  kurtosis: number | null;
  normalityPValue: number | null;
};

function numeric(value: unknown) {
  const result = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(result) ? result : null;
}

function parsedDate(value: unknown) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value === 'number' && value > 1 && value < 100000) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value * 86400000));
    return Number.isFinite(date.getTime()) ? date : null;
  }
  const text = String(value ?? '').trim();
  if (!text) return null;
  const french = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const date = french
    ? new Date(Date.UTC(Number(french[3]), Number(french[2]) - 1, Number(french[1])))
    : new Date(text);
  return Number.isFinite(date.getTime()) ? date : null;
}

function completedMonths(birthValue: unknown, surveyValue: unknown) {
  const birthDate = parsedDate(birthValue);
  const surveyDate = parsedDate(surveyValue);
  if (!birthDate || !surveyDate || surveyDate < birthDate) return null;
  let months = (surveyDate.getUTCFullYear() - birthDate.getUTCFullYear()) * 12
    + surveyDate.getUTCMonth() - birthDate.getUTCMonth();
  if (surveyDate.getUTCDate() < birthDate.getUTCDate()) months -= 1;
  return months >= 0 ? months : null;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
}

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (value < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  let x = 0.9999999999998099;
  const z = value - 1;
  coefficients.forEach((coefficient, index) => { x += coefficient / (z + index + 1); });
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function regularizedGammaP(shape: number, value: number) {
  if (value <= 0) return 0;
  if (value < shape + 1) {
    let term = 1 / shape;
    let sum = term;
    for (let index = 1; index < 200; index += 1) {
      term *= value / (shape + index);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-value + shape * Math.log(value) - logGamma(shape));
  }
  let b = value + 1 - shape;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let index = 1; index < 200; index += 1) {
    const an = -index * (index - shape);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-value + shape * Math.log(value) - logGamma(shape)) * h;
}

function chiSquareP(statistic: number, degreesOfFreedom: number) {
  if (!Number.isFinite(statistic) || degreesOfFreedom < 1) return null;
  return Math.max(0, Math.min(1, 1 - regularizedGammaP(degreesOfFreedom / 2, statistic / 2)));
}

function chiSquareGoodness(observed: number[], expected?: number[]) {
  const total = observed.reduce((sum, value) => sum + value, 0);
  const target = expected || observed.map(() => total / observed.length);
  if (!total || target.some(value => value <= 0)) return { statistic: null, pValue: null };
  const statistic = observed.reduce((sum, value, index) => sum + (value - target[index]) ** 2 / target[index], 0);
  return { statistic, pValue: chiSquareP(statistic, observed.length - 1) };
}

function normalCdf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  return 0.5 * (1 + erf);
}

function summarize(values: Array<number | null>): NumericSummary {
  const clean = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!clean.length) return { count: 0, mean: null, standardDeviation: null, skewness: null, kurtosis: null, normalityPValue: null };
  const mean = clean.reduce((sum, value) => sum + value, 0) / clean.length;
  const variance = clean.reduce((sum, value) => sum + (value - mean) ** 2, 0) / clean.length;
  const standardDeviation = Math.sqrt(variance);
  if (!standardDeviation) return { count: clean.length, mean, standardDeviation, skewness: 0, kurtosis: 0, normalityPValue: null };
  const skewness = clean.reduce((sum, value) => sum + ((value - mean) / standardDeviation) ** 3, 0) / clean.length;
  const kurtosis = clean.reduce((sum, value) => sum + ((value - mean) / standardDeviation) ** 4, 0) / clean.length - 3;
  const jarqueBera = clean.length / 6 * (skewness ** 2 + kurtosis ** 2 / 4);
  return { count: clean.length, mean, standardDeviation, skewness, kurtosis, normalityPValue: chiSquareP(jarqueBera, 2) };
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
  const test = chiSquareGoodness(counts);
  return {
    total,
    counts,
    score: Number(score.toFixed(1)),
    classification: score <= 7 ? 'excellent' : score <= 12 ? 'bon' : score <= 20 ? 'acceptable' : 'problematique',
    chiSquare: test.statistic,
    pValue: test.pValue,
  };
}

function normalizedSex(value: unknown) {
  const sex = String(value ?? '').trim().toLowerCase();
  if (['1', 'm', 'male', 'masculin', 'garcon', 'garçon'].includes(sex)) return 'male';
  if (['2', 'f', 'female', 'feminin', 'féminin', 'fille'].includes(sex)) return 'female';
  return null;
}

function normalizedOedema(value: unknown) {
  const oedema = String(value ?? '').trim().toLowerCase();
  if (['1', 'yes', 'oui', 'true', 'present', 'présent', '++', '+++'].includes(oedema)) return true;
  if (['0', 'no', 'non', 'false', 'absent', '-', ''].includes(oedema)) return false;
  return null;
}

export function analyzeEnaSmartPlausibility(rows: Record<string, unknown>[], mapping: EnaSmartMapping) {
  const observations = rows.map((row, index) => {
    const reportedAge = mapping.age ? numeric(row[mapping.age]) : null;
    const calculatedAge = mapping.birthDate
      ? completedMonths(row[mapping.birthDate], mapping.surveyDate ? row[mapping.surveyDate] : row.submitted_at)
      : null;
    const age = reportedAge ?? calculatedAge;
    const ageSource = reportedAge !== null ? 'reported_months' : calculatedAge !== null ? 'birth_date' : null;
    const weight = numeric(row[mapping.weight]);
    const height = numeric(row[mapping.height]);
    const muac = mapping.muac ? numeric(row[mapping.muac]) : null;
    const oedema = mapping.oedema ? normalizedOedema(row[mapping.oedema]) : false;
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
      mapping.oedema && oedema === null ? 'OEDEME_INVALIDE' : null,
    ].filter((flag): flag is string => Boolean(flag));
    return {
      row: index + 1,
      id: mapping.id ? row[mapping.id] : null,
      cluster: mapping.cluster ? row[mapping.cluster] : null,
      village: mapping.village ? row[mapping.village] : null,
      enumerator: mapping.enumerator ? row[mapping.enumerator] : null,
      order: mapping.order ? numeric(row[mapping.order]) : null,
      age,
      ageSource,
      sex,
      weight,
      height,
      muac,
      oedema,
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
  const groupSummary = (field: 'cluster' | 'village' | 'enumerator') => {
    const levels = [...new Set(observations.map(item => String(item[field] ?? '')).filter(Boolean))];
    return levels.map(level => {
      const group = observations.filter(item => String(item[field] ?? '') === level);
      const groupFlags = group.filter(item => item.flags.length).length;
      return {
        value: level,
        n: group.length,
        flagged: groupFlags,
        flagPercentage: group.length ? Number((groupFlags * 100 / group.length).toFixed(1)) : 0,
        whzStandardDeviation: summarize(group.map(item => item.whz)).standardDeviation,
        ageRatio: (() => {
          const young = group.filter(item => item.age !== null && item.age >= 6 && item.age <= 29).length;
          const old = group.filter(item => item.age !== null && item.age >= 30 && item.age <= 59).length;
          return old ? Number((young / old).toFixed(2)) : null;
        })(),
        sexRatio: (() => {
          const groupBoys = group.filter(item => item.sex === 'male').length;
          const groupGirls = group.filter(item => item.sex === 'female').length;
          return groupGirls ? Number((groupBoys / groupGirls).toFixed(2)) : null;
        })(),
      };
    });
  };
  const clusterCases = [...new Set(observations.map(item => String(item.cluster ?? '')).filter(Boolean))].map(cluster => {
    const group = observations.filter(item => String(item.cluster ?? '') === cluster && item.flags.length === 0);
    return {
      cluster,
      wasting: group.filter(item => item.whz !== null && item.whz < -2).length,
      severeWasting: group.filter(item => item.whz !== null && item.whz < -3).length,
      stunting: group.filter(item => item.haz !== null && item.haz < -2).length,
      underweight: group.filter(item => item.waz !== null && item.waz < -2).length,
    };
  });
  const dispersion = (key: 'wasting' | 'severeWasting' | 'stunting' | 'underweight') => {
    const values = clusterCases.map(item => item[key]);
    const average = mean(values);
    const indexOfDispersion = average && values.length > 1 ? variance(values) / average : null;
    const statistic = indexOfDispersion === null ? null : indexOfDispersion * (values.length - 1);
    const pValue = statistic === null ? null : chiSquareP(statistic, values.length - 1);
    return {
      clusters: values.length,
      meanCases: average,
      indexOfDispersion,
      pValue,
      interpretation: !average || values.length < 2
        ? 'non_evaluable'
        : indexOfDispersion! > 1 && pValue !== null && pValue < .05 ? 'concentration_significative'
          : indexOfDispersion! < 1 && pValue !== null && pValue > .95 ? 'distribution_uniforme'
            : 'distribution_compatible_avec_aleatoire',
    };
  };
  const missing = {
    id: observations.filter(item => item.id == null || String(item.id).trim() === '').length,
    age: observations.filter(item => item.age === null).length,
    sex: observations.filter(item => !item.sex).length,
    weight: observations.filter(item => item.weight === null).length,
    height: observations.filter(item => item.height === null).length,
    muac: mapping.muac ? observations.filter(item => item.muac === null).length : null,
    cluster: mapping.cluster ? observations.filter(item => item.cluster == null || String(item.cluster).trim() === '').length : null,
  };
  const ageHistogram = Array.from({ length: 54 }, (_, index) => {
    const month = index + 6;
    return { month, count: observations.filter(item => item.age !== null && Math.round(item.age) === month).length };
  });
  const ageBands = [
    { label: '6-17', min: 6, max: 17 },
    { label: '18-29', min: 18, max: 29 },
    { label: '30-41', min: 30, max: 41 },
    { label: '42-53', min: 42, max: 53 },
    { label: '54-59', min: 54, max: 59 },
  ].map(band => ({
    ...band,
    boys: observations.filter(item => item.sex === 'male' && item.age !== null && item.age >= band.min && item.age <= band.max).length,
    girls: observations.filter(item => item.sex === 'female' && item.age !== null && item.age >= band.min && item.age <= band.max).length,
  }));
  const ageBandTotals = ageBands.map(item => item.boys + item.girls);
  const expectedAgeTotals = ageBands.map((_, index) => observations.filter(item => item.age !== null && item.age >= 6 && item.age <= 59).length * (index === 4 ? 6 : 12) / 54);
  const ageDistributionTest = chiSquareGoodness(ageBandTotals, expectedAgeTotals);
  const sexTest = chiSquareGoodness([boys, girls]);
  const indicatorDetails = (key: 'whz' | 'haz' | 'waz') => {
    const allValues = observations.map(item => item[key]);
    const whoValues = observations.filter(item => !item.flags.some(flag => flag === `${key.toUpperCase()}_OMS`)).map(item => item[key]);
    const whoSummary = summarize(whoValues);
    const smartValues = whoValues.filter(value => value !== null && whoSummary.mean !== null && Math.abs(value - whoSummary.mean) <= 3);
    const modes = {
      none: summarize(allValues),
      who: whoSummary,
      smart: summarize(smartValues),
    };
    const prevalence = Object.fromEntries(Object.entries(modes).map(([mode, summary]) => {
      const values = mode === 'none' ? allValues : mode === 'who' ? whoValues : smartValues;
      const clean = values.filter((value): value is number => value !== null);
      return [mode, {
        observed: clean.length ? clean.filter(value => value < -2).length * 100 / clean.length : null,
        fittedCurrentSd: summary.mean !== null && summary.standardDeviation ? normalCdf((-2 - summary.mean) / summary.standardDeviation) * 100 : null,
        fittedSdOne: summary.mean !== null ? normalCdf(-2 - summary.mean) * 100 : null,
      }];
    }));
    return { modes, prevalence };
  };
  const distributionsByExclusion = {
    whz: indicatorDetails('whz'),
    haz: indicatorDetails('haz'),
    waz: indicatorDetails('waz'),
  };
  const orderQuality = [...new Set(observations.map(item => item.order).filter((value): value is number => value !== null))]
    .sort((a, b) => a - b)
    .map(order => {
      const group = observations.filter(item => item.order === order);
      return {
        order,
        n: group.length,
        flags: group.filter(item => item.flags.length > 0).length,
        whzStandardDeviation: summarize(group.map(item => item.whz)).standardDeviation,
      };
    });
  const flagByIndicator = {
    whz: observations.filter(item => item.flags.includes('WHZ_OMS')).length,
    haz: observations.filter(item => item.flags.includes('HAZ_OMS')).length,
    waz: observations.filter(item => item.flags.includes('WAZ_OMS')).length,
  };
  const scoreFor = (value: number, thresholds: [number, number, number], points: [number, number, number, number]) =>
    value <= thresholds[0] ? points[0] : value <= thresholds[1] ? points[1] : value <= thresholds[2] ? points[2] : points[3];
  const whzSmart = distributionsByExclusion.whz.modes.smart;
  const qualityCriteria = [
    { criterion: 'Données hors normes', value: flagPercentage, score: scoreFor(flagPercentage, [2.5, 5, 7.5], [0, 5, 10, 20]) },
    { criterion: 'Sexe-ratio global', value: sexTest.pValue, score: sexTest.pValue === null ? 0 : sexTest.pValue > .1 ? 0 : sexTest.pValue > .05 ? 2 : sexTest.pValue > .001 ? 4 : 10 },
    { criterion: 'Distribution 6-29 / 30-59 mois', value: ageDistributionTest.pValue, score: ageDistributionTest.pValue === null ? 0 : ageDistributionTest.pValue > .1 ? 0 : ageDistributionTest.pValue > .05 ? 2 : ageDistributionTest.pValue > .001 ? 4 : 10 },
    ...(['weight', 'height', 'muac'] as const).map(key => {
      const value = digitPreference(observations.map(item => item[key])).score;
      return { criterion: `Préférence numérique ${key}`, value, score: value === null ? 0 : scoreFor(value, [7, 12, 20], [0, 2, 4, 10]) };
    }),
    { criterion: 'Écart-type PTZ', value: whzSmart.standardDeviation, score: whzSmart.standardDeviation === null ? 0 : whzSmart.standardDeviation >= .9 && whzSmart.standardDeviation <= 1.1 ? 0 : whzSmart.standardDeviation >= .85 && whzSmart.standardDeviation <= 1.15 ? 5 : whzSmart.standardDeviation >= .8 && whzSmart.standardDeviation <= 1.2 ? 10 : 20 },
    { criterion: 'Asymétrie PTZ', value: whzSmart.skewness, score: whzSmart.skewness === null ? 0 : scoreFor(Math.abs(whzSmart.skewness), [.2, .4, .6], [0, 1, 3, 5]) },
    { criterion: 'Aplatissement PTZ', value: whzSmart.kurtosis, score: whzSmart.kurtosis === null ? 0 : scoreFor(Math.abs(whzSmart.kurtosis), [.2, .4, .6], [0, 1, 3, 5]) },
  ];
  const qualityScore = qualityCriteria.reduce((sum, item) => sum + item.score, 0);
  return {
    engine: 'NutVitaGlobalis SMART plausibility engine v2',
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
      sexPValue: sexTest.pValue,
      ageDistributionPValue: ageDistributionTest.pValue,
    },
    missing,
    flagByIndicator,
    ageHistogram,
    ageBands,
    qualityCriteria,
    qualityScore,
    qualityClassification: qualityScore < 10 ? 'excellent' : qualityScore < 15 ? 'bon' : qualityScore < 25 ? 'acceptable' : 'problematique',
    distributionsByExclusion,
    orderQuality,
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
    groupQuality: {
      clusters: groupSummary('cluster'),
      villages: groupSummary('village'),
      enumerators: groupSummary('enumerator'),
    },
    dispersion: {
      wasting: dispersion('wasting'),
      severeWasting: dispersion('severeWasting'),
      stunting: dispersion('stunting'),
      underweight: dispersion('underweight'),
    },
    observations,
  };
}
