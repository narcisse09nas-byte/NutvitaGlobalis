export type ColumnAnalysis = {
  name: string;
  missing: number;
  complete: number;
  unique: number;
  numeric: boolean;
  mean?: number;
  median?: number;
  standardDeviation?: number;
  min?: number;
  max?: number;
};

function numberValue(value: unknown) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function analyzeDataset(rows: Record<string, unknown>[]) {
  const columns = Object.keys(rows[0] || {});
  const analyses: ColumnAnalysis[] = columns.map(name => {
    const values = rows.map(row => row[name]);
    const completeValues = values.filter(value => value !== '' && value !== null && value !== undefined);
    const numbers = completeValues.map(numberValue).filter((value): value is number => value !== null);
    const numeric = completeValues.length > 0 && numbers.length / completeValues.length >= 0.8;
    if (!numeric) return {
      name,
      missing: rows.length - completeValues.length,
      complete: completeValues.length,
      unique: new Set(completeValues.map(String)).size,
      numeric: false,
    };
    const sorted = [...numbers].sort((a, b) => a - b);
    const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    const median = sorted.length % 2 ? sorted[Math.floor(sorted.length / 2)] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    const standardDeviation = Math.sqrt(numbers.reduce((sum, value) => sum + (value - mean) ** 2, 0) / numbers.length);
    return {
      name,
      missing: rows.length - completeValues.length,
      complete: completeValues.length,
      unique: new Set(numbers).size,
      numeric: true,
      mean,
      median,
      standardDeviation,
      min: sorted[0],
      max: sorted[sorted.length - 1],
    };
  });
  const missingCells = analyses.reduce((sum, column) => sum + column.missing, 0);
  const totalCells = Math.max(1, rows.length * columns.length);
  return {
    rowCount: rows.length,
    columnCount: columns.length,
    completeness: Number(((1 - missingCells / totalCells) * 100).toFixed(2)),
    duplicateRows: rows.length - new Set(rows.map(row => JSON.stringify(row))).size,
    columns: analyses,
  };
}

export function crossTab(rows: Record<string, unknown>[], first: string, second: string) {
  const result: Record<string, Record<string, number>> = {};
  rows.forEach(row => {
    const a = String(row[first] ?? 'Non renseigne');
    const b = String(row[second] ?? 'Non renseigne');
    result[a] ||= {};
    result[a][b] = (result[a][b] || 0) + 1;
  });
  return result;
}
