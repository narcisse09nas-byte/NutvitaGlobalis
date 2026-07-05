export type StatisticalAnalysisType =
  | 'frequencies'
  | 'descriptives'
  | 'crosstab'
  | 'correlation'
  | 'independent_t'
  | 'anova'
  | 'linear_regression'
  | 'binary_logistic'
  | 'kaplan_meier'
  | 'cox_regression'
  | 'mann_whitney'
  | 'kruskal_wallis';

export type StatisticalAnalysisRequest = {
  type: StatisticalAnalysisType;
  outcome?: string;
  group?: string;
  predictors?: string[];
  variables?: string[];
  confidenceLevel?: number;
  time?: string;
  event?: string;
  eventValue?: string;
  strata?: string;
};

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function variance(values: number[], sample = true) {
  if (values.length < (sample ? 2 : 1)) return 0;
  const average = mean(values);
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - (sample ? 1 : 0));
}

function normalCdf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const erf = sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
  return (1 + erf) / 2;
}

function logGamma(value: number) {
  const coefficients = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.000005395239384953];
  let x = value;
  let y = value;
  let temporary = x + 5.5;
  temporary -= (x + 0.5) * Math.log(temporary);
  let series = 1.000000000190015;
  coefficients.forEach(coefficient => {
    y += 1;
    series += coefficient / y;
  });
  return -temporary + Math.log(2.5066282746310005 * series / x);
}

function regularizedGammaQ(shape: number, value: number) {
  if (value < 0 || shape <= 0) return NaN;
  if (value === 0) return 1;
  if (value < shape + 1) {
    let term = 1 / shape;
    let sum = term;
    let current = shape;
    for (let index = 1; index <= 100; index += 1) {
      current += 1;
      term *= value / current;
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-12) break;
    }
    return 1 - sum * Math.exp(-value + shape * Math.log(value) - logGamma(shape));
  }
  let b = value + 1 - shape;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  for (let index = 1; index <= 100; index += 1) {
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
  return Math.exp(-value + shape * Math.log(value) - logGamma(shape)) * h;
}

function chiSquareP(statistic: number, degreesOfFreedom: number) {
  return regularizedGammaQ(degreesOfFreedom / 2, statistic / 2);
}

function betaContinuedFraction(a: number, b: number, x: number) {
  const maxIterations = 200;
  const epsilon = 3e-12;
  const minimum = 1e-30;
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < minimum) d = minimum;
  d = 1 / d;
  let h = d;
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const twice = 2 * iteration;
    let coefficient = iteration * (b - iteration) * x / ((qam + twice) * (a + twice));
    d = 1 + coefficient * d;
    if (Math.abs(d) < minimum) d = minimum;
    c = 1 + coefficient / c;
    if (Math.abs(c) < minimum) c = minimum;
    d = 1 / d;
    h *= d * c;
    coefficient = -(a + iteration) * (qab + iteration) * x / ((a + twice) * (qap + twice));
    d = 1 + coefficient * d;
    if (Math.abs(d) < minimum) d = minimum;
    c = 1 + coefficient / c;
    if (Math.abs(c) < minimum) c = minimum;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return h;
}

function regularizedBeta(x: number, a: number, b: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? factor * betaContinuedFraction(a, b, x) / a
    : 1 - factor * betaContinuedFraction(b, a, 1 - x) / b;
}

function studentTP(statistic: number, degreesOfFreedom: number) {
  const x = degreesOfFreedom / (degreesOfFreedom + statistic ** 2);
  return regularizedBeta(x, degreesOfFreedom / 2, .5);
}

function fDistributionP(statistic: number, degreesNumerator: number, degreesDenominator: number) {
  const x = degreesNumerator * statistic / (degreesNumerator * statistic + degreesDenominator);
  return 1 - regularizedBeta(x, degreesNumerator / 2, degreesDenominator / 2);
}

function rank(values: number[]) {
  const sorted = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = Array(values.length).fill(0);
  for (let start = 0; start < sorted.length;) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1].value === sorted[start].value) end += 1;
    const averageRank = (start + end + 2) / 2;
    for (let index = start; index <= end; index += 1) result[sorted[index].index] = averageRank;
    start = end + 1;
  }
  return result;
}

function pearson(first: number[], second: number[]) {
  const firstMean = mean(first);
  const secondMean = mean(second);
  const numerator = first.reduce((sum, value, index) => sum + (value - firstMean) * (second[index] - secondMean), 0);
  const denominator = Math.sqrt(
    first.reduce((sum, value) => sum + (value - firstMean) ** 2, 0)
    * second.reduce((sum, value) => sum + (value - secondMean) ** 2, 0),
  );
  return denominator ? numerator / denominator : 0;
}

function invert(matrix: number[][]) {
  const size = matrix.length;
  const augmented = matrix.map((row, index) => [...row, ...Array.from({ length: size }, (_, column) => Number(index === column))]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-12) throw new Error('Matrice singulière : certains prédicteurs sont redondants.');
    augmented[column] = augmented[column].map(value => value / divisor);
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      augmented[row] = augmented[row].map((value, index) => value - factor * augmented[column][index]);
    }
  }
  return augmented.map(row => row.slice(size));
}

function multiply(first: number[][], second: number[][]) {
  return first.map(row => second[0].map((_, column) => row.reduce((sum, value, index) => sum + value * second[index][column], 0)));
}

function logistic(value: number) {
  if (value > 35) return 1;
  if (value < -35) return 0;
  return 1 / (1 + Math.exp(-value));
}

function binaryValue(value: unknown, eventValue?: string) {
  if (eventValue !== undefined && eventValue !== '') return String(value) === eventValue ? 1 : 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['1', 'yes', 'oui', 'true', 'event', 'événement', 'deces', 'décès'].includes(normalized)) return 1;
  if (['0', 'no', 'non', 'false', 'censored', 'censure', 'censuré', 'vivant'].includes(normalized)) return 0;
  return null;
}

function fitBinaryLogistic(rows: Record<string, unknown>[], request: StatisticalAnalysisRequest) {
  const predictors = request.predictors || [];
  if (!request.outcome || !predictors.length) throw new Error('Une issue binaire et au moins un prédicteur sont requis.');
  const complete = rows.map(row => {
    const outcome = binaryValue(row[request.outcome!], request.eventValue);
    const values = predictors.map(predictor => numberValue(row[predictor]));
    return outcome === null || values.some(value => value === null) ? null : { outcome, x: [1, ...(values as number[])] };
  }).filter((item): item is { outcome: number; x: number[] } => item !== null);
  if (complete.length <= predictors.length + 1) throw new Error('Nombre d’observations complètes insuffisant pour ce modèle.');
  if (!complete.some(item => item.outcome === 0) || !complete.some(item => item.outcome === 1)) throw new Error('La variable dépendante doit contenir les deux modalités binaires.');
  predictors.forEach((predictor, index) => {
    if (new Set(complete.map(item => item.x[index + 1])).size < 2) throw new Error(`Le prédicteur « ${predictor} » est constant ou ne contient pas assez de valeurs numériques distinctes.`);
  });
  let coefficients = Array(predictors.length + 1).fill(0);
  let converged = false;
  let covariance: number[][] = [];
  let iteration = 0;
  for (; iteration < 50; iteration += 1) {
    const information = Array.from({ length: coefficients.length }, () => Array(coefficients.length).fill(0));
    const gradient = Array(coefficients.length).fill(0);
    complete.forEach(item => {
      const probability = logistic(item.x.reduce((sum, value, index) => sum + value * coefficients[index], 0));
      const weight = Math.max(1e-8, probability * (1 - probability));
      item.x.forEach((first, row) => {
        gradient[row] += first * (item.outcome - probability);
        item.x.forEach((second, column) => { information[row][column] += first * second * weight; });
      });
    });
    covariance = invert(information);
    const step = multiply(covariance, gradient.map(value => [value])).map(row => row[0]);
    coefficients = coefficients.map((value, index) => value + step[index]);
    if (Math.max(...step.map(Math.abs)) < 1e-7) {
      converged = true;
      break;
    }
  }
  const predicted = complete.map(item => logistic(item.x.reduce((sum, value, index) => sum + value * coefficients[index], 0)));
  const logLikelihood = complete.reduce((sum, item, index) => sum + item.outcome * Math.log(Math.max(predicted[index], 1e-12)) + (1 - item.outcome) * Math.log(Math.max(1 - predicted[index], 1e-12)), 0);
  const nullRate = mean(complete.map(item => item.outcome));
  const nullLogLikelihood = complete.reduce((sum, item) => sum + item.outcome * Math.log(nullRate) + (1 - item.outcome) * Math.log(1 - nullRate), 0);
  const parameters = ['Constante', ...predictors].map((variable, index) => {
    const standardError = Math.sqrt(Math.max(0, covariance[index]?.[index] || 0));
    const z = standardError ? coefficients[index] / standardError : 0;
    return {
      variable,
      coefficient: coefficients[index],
      standardError,
      z,
      pValue: 2 * (1 - normalCdf(Math.abs(z))),
      oddsRatio: Math.exp(coefficients[index]),
      confidenceInterval95: [Math.exp(coefficients[index] - 1.96 * standardError), Math.exp(coefficients[index] + 1.96 * standardError)],
    };
  });
  const classified = predicted.map(value => Number(value >= .5));
  const correct = classified.filter((value, index) => value === complete[index].outcome).length;
  return {
    type: 'binary_logistic',
    n: complete.length,
    events: complete.filter(item => item.outcome === 1).length,
    outcome: request.outcome,
    predictors,
    eventValue: request.eventValue || '1/oui',
    converged,
    iterations: iteration + 1,
    logLikelihood,
    likelihoodRatio: 2 * (logLikelihood - nullLogLikelihood),
    degreesOfFreedom: predictors.length,
    modelPValue: chiSquareP(2 * (logLikelihood - nullLogLikelihood), predictors.length),
    nagelkerkeApproximation: 1 - Math.exp((2 / complete.length) * (nullLogLikelihood - logLikelihood)),
    classificationAccuracy: correct / complete.length,
    parameters,
    warning: 'Modèle non pondéré sur échantillon simple. Vérifier séparation, colinéarité, valeurs influentes, linéarité du logit et plan de sondage.',
  };
}

function kaplanMeier(rows: Record<string, unknown>[], request: StatisticalAnalysisRequest) {
  if (!request.time || !request.event) throw new Error('Les variables temps et événement sont requises.');
  const groups = new Map<string, Array<{ time: number; event: number }>>();
  rows.forEach(row => {
    const time = numberValue(row[request.time!]);
    const event = binaryValue(row[request.event!], request.eventValue);
    if (time === null || time < 0 || event === null) return;
    const group = request.strata ? String(row[request.strata] ?? 'Manquant') : 'Ensemble';
    groups.set(group, [...(groups.get(group) || []), { time, event }]);
  });
  if (![...groups.values()].flat().length) throw new Error('Aucune observation complète avec une durée positive et un statut d’événement valide.');
  if (![...groups.values()].flat().some(item => item.event === 1)) throw new Error('Aucun événement observé : Kaplan-Meier ne peut pas estimer la fonction de survie.');
  const curves = [...groups.entries()].map(([group, observations]) => {
    const eventTimes = [...new Set(observations.filter(item => item.event === 1).map(item => item.time))].sort((a, b) => a - b);
    let survival = 1;
    const points = [{ time: 0, survival: 1, atRisk: observations.length, events: 0, censored: 0 }];
    eventTimes.forEach(time => {
      const atRisk = observations.filter(item => item.time >= time).length;
      const events = observations.filter(item => item.time === time && item.event === 1).length;
      const censored = observations.filter(item => item.time === time && item.event === 0).length;
      survival *= atRisk ? 1 - events / atRisk : 1;
      points.push({ time, survival, atRisk, events, censored });
    });
    const medianPoint = points.find(point => point.survival <= .5);
    return { group, n: observations.length, events: observations.filter(item => item.event === 1).length, censored: observations.filter(item => item.event === 0).length, medianSurvival: medianPoint?.time ?? null, points };
  });
  return {
    type: 'kaplan_meier',
    time: request.time,
    event: request.event,
    eventValue: request.eventValue || '1/oui',
    strata: request.strata || null,
    curves,
    warning: 'Estimateur Kaplan-Meier. Comparaison formelle entre courbes par log-rank à ajouter lorsque plusieurs strates sont présentes.',
  };
}

function fitCox(rows: Record<string, unknown>[], request: StatisticalAnalysisRequest) {
  const predictors = request.predictors || [];
  if (!request.time || !request.event || !predictors.length) throw new Error('Temps, événement et au moins un prédicteur sont requis.');
  const complete = rows.map(row => {
    const time = numberValue(row[request.time!]);
    const event = binaryValue(row[request.event!], request.eventValue);
    const values = predictors.map(predictor => numberValue(row[predictor]));
    return time === null || time < 0 || event === null || values.some(value => value === null) ? null : { time, event, x: values as number[] };
  }).filter((item): item is { time: number; event: number; x: number[] } => item !== null);
  if (complete.filter(item => item.event === 1).length <= predictors.length) throw new Error('Nombre d’événements insuffisant pour le nombre de prédicteurs.');
  predictors.forEach((predictor, index) => {
    if (new Set(complete.map(item => item.x[index])).size < 2) throw new Error(`Le prédicteur « ${predictor} » est constant ou non exploitable.`);
  });
  let coefficients = Array(predictors.length).fill(0);
  let hessian = Array.from({ length: predictors.length }, () => Array(predictors.length).fill(0));
  let converged = false;
  let iteration = 0;
  for (; iteration < 40; iteration += 1) {
    const gradient = Array(predictors.length).fill(0);
    hessian = Array.from({ length: predictors.length }, () => Array(predictors.length).fill(0));
    complete.filter(item => item.event === 1).forEach(eventCase => {
      const riskSet = complete.filter(item => item.time >= eventCase.time);
      const weights = riskSet.map(item => Math.exp(Math.min(30, item.x.reduce((sum, value, index) => sum + value * coefficients[index], 0))));
      const denominator = weights.reduce((sum, value) => sum + value, 0);
      const weightedMeans = predictors.map((_, predictor) => riskSet.reduce((sum, item, index) => sum + weights[index] * item.x[predictor], 0) / denominator);
      predictors.forEach((_, first) => {
        gradient[first] += eventCase.x[first] - weightedMeans[first];
        predictors.forEach((__, second) => {
          const secondMoment = riskSet.reduce((sum, item, index) => sum + weights[index] * item.x[first] * item.x[second], 0) / denominator;
          hessian[first][second] -= secondMoment - weightedMeans[first] * weightedMeans[second];
        });
      });
    });
    const inverseNegativeHessian = invert(hessian.map(row => row.map(value => -value)));
    const step = multiply(inverseNegativeHessian, gradient.map(value => [value])).map(row => row[0]);
    coefficients = coefficients.map((value, index) => value + step[index]);
    if (Math.max(...step.map(Math.abs)) < 1e-7) {
      converged = true;
      break;
    }
  }
  const covariance = invert(hessian.map(row => row.map(value => -value)));
  return {
    type: 'cox_regression',
    n: complete.length,
    events: complete.filter(item => item.event === 1).length,
    time: request.time,
    event: request.event,
    predictors,
    converged,
    iterations: iteration + 1,
    parameters: predictors.map((variable, index) => {
      const standardError = Math.sqrt(Math.max(0, covariance[index]?.[index] || 0));
      const z = standardError ? coefficients[index] / standardError : 0;
      return {
        variable,
        coefficient: coefficients[index],
        standardError,
        z,
        pValue: 2 * (1 - normalCdf(Math.abs(z))),
        hazardRatio: Math.exp(coefficients[index]),
        confidenceInterval95: [Math.exp(coefficients[index] - 1.96 * standardError), Math.exp(coefficients[index] + 1.96 * standardError)],
      };
    }),
    warning: 'Modèle de Cox avec approximation de Breslow des ex aequo. Vérifier risques proportionnels, forme fonctionnelle, observations influentes et plan de sondage.',
  };
}

export function runStatisticalAnalysis(rows: Record<string, unknown>[], request: StatisticalAnalysisRequest) {
  const confidenceLevel = request.confidenceLevel || 95;
  if (request.type === 'binary_logistic') return { ...fitBinaryLogistic(rows, request), confidenceLevel };
  if (request.type === 'kaplan_meier') return { ...kaplanMeier(rows, request), confidenceLevel };
  if (request.type === 'cox_regression') return { ...fitCox(rows, request), confidenceLevel };
  if (request.type === 'frequencies') {
    const variables = request.variables || [];
    if (!variables.length) throw new Error('Sélectionnez au moins une variable pour calculer les fréquences.');
    return {
      type: request.type,
      confidenceLevel,
      tables: variables.map(variable => {
        const counts = new Map<string, number>();
        rows.forEach(row => {
          const value = String(row[variable] ?? '').trim() || 'Manquant';
          counts.set(value, (counts.get(value) || 0) + 1);
        });
        return {
          variable,
          total: rows.length,
          categories: [...counts.entries()].map(([value, count]) => ({ value, count, percentage: rows.length ? count * 100 / rows.length : 0 })),
        };
      }),
    };
  }
  if (request.type === 'descriptives') {
    if (!(request.variables || []).length) throw new Error('Sélectionnez au moins une variable quantitative.');
    return {
      type: request.type,
      confidenceLevel,
      variables: (request.variables || []).map(variable => {
        const values = rows.map(row => numberValue(row[variable])).filter((value): value is number => value !== null);
        const sorted = [...values].sort((a, b) => a - b);
        return {
          variable,
          n: values.length,
          missing: rows.length - values.length,
          mean: mean(values),
          standardDeviation: Math.sqrt(variance(values)),
          minimum: sorted[0] ?? null,
          maximum: sorted.at(-1) ?? null,
          median: sorted.length ? sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : null,
        };
      }),
    };
  }
  if (request.type === 'crosstab') {
    if (!request.outcome || !request.group) throw new Error('Deux variables catégorielles sont requises.');
    const rowLevels = [...new Set(rows.map(row => String(row[request.outcome!] ?? 'Manquant')))];
    const columnLevels = [...new Set(rows.map(row => String(row[request.group!] ?? 'Manquant')))];
    if (rowLevels.length < 2 || columnLevels.length < 2) throw new Error('Chaque variable du tableau croisé doit contenir au moins deux modalités.');
    const observed = rowLevels.map(rowLevel => columnLevels.map(columnLevel => rows.filter(row => String(row[request.outcome!] ?? 'Manquant') === rowLevel && String(row[request.group!] ?? 'Manquant') === columnLevel).length));
    const rowTotals = observed.map(row => row.reduce((sum, value) => sum + value, 0));
    const columnTotals = columnLevels.map((_, column) => observed.reduce((sum, row) => sum + row[column], 0));
    const total = rowTotals.reduce((sum, value) => sum + value, 0);
    let statistic = 0;
    let lowExpectedCells = 0;
    const expected = observed.map((row, rowIndex) => row.map((_, columnIndex) => {
      const value = rowTotals[rowIndex] * columnTotals[columnIndex] / total;
      if (value < 5) lowExpectedCells += 1;
      if (value) statistic += (observed[rowIndex][columnIndex] - value) ** 2 / value;
      return value;
    }));
    const degreesOfFreedom = (rowLevels.length - 1) * (columnLevels.length - 1);
    return {
      type: request.type,
      confidenceLevel,
      rowVariable: request.outcome,
      columnVariable: request.group,
      rowLevels,
      columnLevels,
      observed,
      expected,
      statistic,
      degreesOfFreedom,
      pValue: chiSquareP(statistic, degreesOfFreedom),
      cramersV: total && Math.min(rowLevels.length - 1, columnLevels.length - 1) ? Math.sqrt(statistic / (total * Math.min(rowLevels.length - 1, columnLevels.length - 1))) : null,
      assumptionWarning: lowExpectedCells / Math.max(1, rowLevels.length * columnLevels.length) > 0.2 ? 'Plus de 20 % des effectifs théoriques sont inférieurs à 5; regrouper des modalités ou utiliser un test exact.' : null,
    };
  }
  if (request.type === 'correlation') {
    const variables = request.variables || [];
    if (variables.length < 2) throw new Error('Sélectionnez au moins deux variables pour calculer une corrélation.');
    const complete = rows.map(row => variables.map(variable => numberValue(row[variable]))).filter(values => values.every(value => value !== null)) as number[][];
    if (complete.length < 3) throw new Error('Au moins trois observations complètes sont requises pour calculer les corrélations.');
    const columns = variables.map((_, index) => complete.map(row => row[index]));
    return {
      type: request.type,
      confidenceLevel,
      n: complete.length,
      variables,
      pearson: variables.map((_, first) => variables.map((__, second) => pearson(columns[first], columns[second]))),
      spearman: variables.map((_, first) => variables.map((__, second) => pearson(rank(columns[first]), rank(columns[second])))),
    };
  }
  if (request.type === 'independent_t' || request.type === 'anova') {
    if (!request.outcome || !request.group) throw new Error('Une variable quantitative et une variable de groupe sont requises.');
    const grouped = new Map<string, number[]>();
    rows.forEach(row => {
      const value = numberValue(row[request.outcome!]);
      if (value === null) return;
      const group = String(row[request.group!] ?? 'Manquant');
      grouped.set(group, [...(grouped.get(group) || []), value]);
    });
    const groups = [...grouped.entries()].map(([name, values]) => ({ name, values, n: values.length, mean: mean(values), standardDeviation: Math.sqrt(variance(values)) }));
    if (groups.length < 2) throw new Error('Au moins deux groupes contenant des valeurs numériques sont requis.');
    if (groups.some(group => group.n < 2)) throw new Error('Chaque groupe doit contenir au moins deux observations numériques.');
    if (request.type === 'independent_t') {
      if (groups.length !== 2) throw new Error('Le test t indépendant exige exactement deux groupes.');
      const standardError = Math.sqrt(variance(groups[0].values) / groups[0].n + variance(groups[1].values) / groups[1].n);
      const statistic = standardError ? (groups[0].mean - groups[1].mean) / standardError : 0;
      const firstTerm = variance(groups[0].values) / groups[0].n;
      const secondTerm = variance(groups[1].values) / groups[1].n;
      const degreesOfFreedom = (firstTerm + secondTerm) ** 2 / (firstTerm ** 2 / (groups[0].n - 1) + secondTerm ** 2 / (groups[1].n - 1));
      return { type: request.type, confidenceLevel, outcome: request.outcome, group: request.group, groups: groups.map(({ values: _, ...item }) => item), statistic, degreesOfFreedom, pValue: studentTP(statistic, degreesOfFreedom), method: 'Test t de Welch bilatéral' };
    }
    const allValues = groups.flatMap(item => item.values);
    const globalMean = mean(allValues);
    const between = groups.reduce((sum, item) => sum + item.n * (item.mean - globalMean) ** 2, 0);
    const within = groups.reduce((sum, item) => sum + item.values.reduce((groupSum, value) => groupSum + (value - item.mean) ** 2, 0), 0);
    const degreesBetween = groups.length - 1;
    const degreesWithin = allValues.length - groups.length;
    const statistic = (between / degreesBetween) / (within / degreesWithin);
    return { type: request.type, confidenceLevel, outcome: request.outcome, group: request.group, groups: groups.map(({ values: _, ...item }) => item), statistic, degreesBetween, degreesWithin, pValue: fDistributionP(statistic, degreesBetween, degreesWithin), warning: 'ANOVA classique : vérifier indépendance, normalité des résidus et homogénéité des variances.' };
  }
  if (request.type === 'mann_whitney' || request.type === 'kruskal_wallis') {
    if (!request.outcome || !request.group) throw new Error('Une variable quantitative/ordinale et une variable de groupe sont requises.');
    const observations = rows.map(row => ({ value: numberValue(row[request.outcome!]), group: String(row[request.group!] ?? '') })).filter(item => item.value !== null && item.group) as Array<{ value: number; group: string }>;
    const groups = [...new Set(observations.map(item => item.group))];
    if (request.type === 'mann_whitney' && groups.length !== 2) throw new Error('Mann-Whitney exige exactement deux groupes.');
    if (groups.length < 2) throw new Error('Au moins deux groupes sont requis.');
    const ranks = rank(observations.map(item => item.value));
    const summaries = groups.map(group => {
      const indexes = observations.map((item, index) => item.group === group ? index : -1).filter(index => index >= 0);
      return { group, n: indexes.length, rankSum: indexes.reduce((sum, index) => sum + ranks[index], 0), meanRank: indexes.reduce((sum, index) => sum + ranks[index], 0) / indexes.length };
    });
    if (request.type === 'mann_whitney') {
      const first = summaries[0];
      const second = summaries[1];
      const uFirst = first.rankSum - first.n * (first.n + 1) / 2;
      const uSecond = second.rankSum - second.n * (second.n + 1) / 2;
      const u = Math.min(uFirst, uSecond);
      const expected = first.n * second.n / 2;
      const standardDeviation = Math.sqrt(first.n * second.n * (first.n + second.n + 1) / 12);
      const z = standardDeviation ? (u - expected + .5) / standardDeviation : 0;
      return { type: request.type, confidenceLevel, outcome: request.outcome, group: request.group, groups: summaries, statistic: u, z, pValueApproximation: 2 * (1 - normalCdf(Math.abs(z))), warning: 'Approximation normale avec correction de continuité; interpréter comme comparaison de distributions/rangs.' };
    }
    const total = observations.length;
    const statistic = 12 / (total * (total + 1)) * summaries.reduce((sum, item) => sum + item.rankSum ** 2 / item.n, 0) - 3 * (total + 1);
    return { type: request.type, confidenceLevel, outcome: request.outcome, group: request.group, groups: summaries, statistic, degreesOfFreedom: groups.length - 1, pValue: chiSquareP(statistic, groups.length - 1), warning: 'Kruskal-Wallis teste une différence globale de distributions; prévoir des comparaisons post-hoc corrigées si le résultat est significatif.' };
  }
  if (request.type === 'linear_regression') {
    if (!request.outcome || !(request.predictors || []).length) throw new Error('Une variable dépendante et au moins un prédicteur sont requis.');
    const variables = [request.outcome, ...(request.predictors || [])];
    const complete = rows.map(row => variables.map(variable => numberValue(row[variable]))).filter(values => values.every(value => value !== null)) as number[][];
    if (complete.length <= variables.length) throw new Error(`Nombre de cas complets insuffisant : ${complete.length} disponible(s), plus de ${variables.length} requis.`);
    (request.predictors || []).forEach((predictor, index) => {
      if (new Set(complete.map(row => row[index + 1])).size < 2) throw new Error(`Le prédicteur « ${predictor} » est constant.`);
    });
    const x = complete.map(row => [1, ...row.slice(1)]);
    const y = complete.map(row => [row[0]]);
    const transpose = x[0].map((_, column) => x.map(row => row[column]));
    const coefficients = multiply(multiply(invert(multiply(transpose, x)), transpose), y).map(row => row[0]);
    const predictions = x.map(row => row.reduce((sum, value, index) => sum + value * coefficients[index], 0));
    const outcomeValues = complete.map(row => row[0]);
    const totalSumSquares = outcomeValues.reduce((sum, value) => sum + (value - mean(outcomeValues)) ** 2, 0);
    const residualSumSquares = outcomeValues.reduce((sum, value, index) => sum + (value - predictions[index]) ** 2, 0);
    return {
      type: request.type,
      confidenceLevel,
      n: complete.length,
      outcome: request.outcome,
      coefficients: ['Constante', ...(request.predictors || [])].map((variable, index) => ({ variable, coefficient: coefficients[index] })),
      rSquared: totalSumSquares ? 1 - residualSumSquares / totalSumSquares : null,
      adjustedRSquared: totalSumSquares && complete.length > coefficients.length ? 1 - (1 - (1 - residualSumSquares / totalSumSquares)) * (complete.length - 1) / (complete.length - coefficients.length) : null,
      warning: 'Régression linéaire : examiner linéarité, indépendance, homoscédasticité, normalité des résidus et colinéarité.',
    };
  }
  throw new Error('Analyse non prise en charge.');
}

export function interpretStatisticalResult(result: Record<string, any>) {
  if (result.type === 'crosstab') {
    const significant = result.pValue < 0.05;
    return `Le test du khi-deux ${significant ? 'met en évidence' : 'ne met pas en évidence'} une association statistiquement significative (χ²=${result.statistic.toFixed(2)}, ddl=${result.degreesOfFreedom}, p=${result.pValue.toFixed(4)}). ${result.cramersV != null ? `Le V de Cramér est de ${result.cramersV.toFixed(3)}.` : ''}`;
  }
  if (result.type === 'independent_t') return `La différence entre les deux moyennes est ${result.pValue < 0.05 ? 'statistiquement significative' : 'non statistiquement significative'} selon le test de Welch (t=${result.statistic.toFixed(2)}, ddl=${result.degreesOfFreedom.toFixed(1)}, p=${result.pValue.toFixed(4)}).`;
  if (result.type === 'anova') return `L’ANOVA ${result.pValue < 0.05 ? 'indique' : 'n’indique pas'} une différence globale entre les moyennes (F=${result.statistic.toFixed(2)}, p=${result.pValue.toFixed(4)}).`;
  if (result.type === 'linear_regression') return `Le modèle explique ${result.rSquared == null ? 'une part non estimable' : `${(result.rSquared * 100).toFixed(1)} %`} de la variabilité de la variable dépendante. Les coefficients doivent être interprétés avec leurs hypothèses et le plan d’échantillonnage.`;
  if (result.type === 'binary_logistic') return `La régression logistique binaire a été estimée sur ${result.n} observations et ${result.events} événements. Le test global donne p=${result.modelPValue.toFixed(4)}; les rapports de cotes doivent être interprétés avec leurs IC et les diagnostics de séparation/colinéarité.`;
  if (result.type === 'kaplan_meier') return `Les courbes de Kaplan-Meier décrivent la probabilité de survie sans événement dans le temps pour ${result.curves.length} groupe(s), en tenant compte des observations censurées.`;
  if (result.type === 'cox_regression') return `Le modèle de Cox a été estimé sur ${result.n} observations et ${result.events} événements. Les hazard ratios supposent la proportionnalité des risques, qui doit être vérifiée avant interprétation substantielle.`;
  if (result.type === 'mann_whitney') return `Le test de Mann-Whitney compare les rangs de deux groupes (U=${result.statistic.toFixed(2)}, p≈${result.pValueApproximation.toFixed(4)}).`;
  if (result.type === 'kruskal_wallis') return `Le test de Kruskal-Wallis compare globalement les rangs de ${result.groups.length} groupes (H=${result.statistic.toFixed(2)}, ddl=${result.degreesOfFreedom}, p=${result.pValue.toFixed(4)}).`;
  if (result.type === 'correlation') return 'Les matrices de Pearson et de Spearman décrivent respectivement les associations linéaires et monotones. Une corrélation ne démontre pas une relation causale.';
  if (result.type === 'frequencies') return 'Les fréquences décrivent la distribution des modalités et les données manquantes. Les pourcentages pondérés seront nécessaires si les probabilités de sélection diffèrent.';
  return 'Les statistiques descriptives résument la tendance centrale, la dispersion et l’étendue. Leur interprétation doit tenir compte des valeurs aberrantes et des données manquantes.';
}
