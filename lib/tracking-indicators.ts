export type CustomIndicatorValue = {
  value: number;
  unit?: string;
  normal_min?: number | null;
  normal_max?: number | null;
};

export type CustomIndicatorTrend = {
  name: string;
  unit: string;
  current: number;
  previous: number | null;
  delta: number | null;
  normalMin: number | null;
  normalMax: number | null;
  relation: "below" | "within" | "above" | "unknown";
  trend: "up" | "down" | "stable" | "first";
};

function numeric(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

export function customIndicatorTemplates(rows: Array<Record<string, any>>) {
  const templates = new Map<string, Omit<CustomIndicatorValue, "value">>();
  for (const row of rows) {
    for (const [name, raw] of Object.entries(row.custom_values || {})) {
      const item: Record<string, unknown> = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : { value: raw };
      templates.set(name, {
        unit: String(item.unit || ""),
        normal_min: numeric(item.normal_min),
        normal_max: numeric(item.normal_max),
      });
    }
  }
  return [...templates.entries()].map(([name, item]) => ({ name, ...item }));
}

export function analyzeCustomIndicators(rows: Array<Record<string, any>>, dateKey: string): CustomIndicatorTrend[] {
  const chronological = [...rows].filter(row => row[dateKey]).sort((a, b) => +new Date(a[dateKey]) - +new Date(b[dateKey]));
  const names = new Set<string>();
  chronological.forEach(row => Object.keys(row.custom_values || {}).forEach(name => names.add(name)));

  return [...names].flatMap(name => {
    const entries = chronological.flatMap(row => {
      const raw = row.custom_values?.[name];
      if (raw === undefined) return [];
      const item: Record<string, unknown> = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : { value: raw };
      const value = numeric(item.value);
      return value === null ? [] : [{ value, item }];
    });
    if (!entries.length) return [];
    const latest = entries.at(-1)!;
    const previous = entries.at(-2)?.value ?? null;
    const normalMin = numeric(latest.item.normal_min);
    const normalMax = numeric(latest.item.normal_max);
    const delta = previous === null ? null : Number((latest.value - previous).toFixed(2));
    const relation = normalMin !== null && latest.value < normalMin
      ? "below"
      : normalMax !== null && latest.value > normalMax
        ? "above"
        : normalMin !== null || normalMax !== null
          ? "within"
          : "unknown";
    const tolerance = Math.max(Math.abs(latest.value) * .005, .01);
    const trend = delta === null ? "first" : Math.abs(delta) <= tolerance ? "stable" : delta > 0 ? "up" : "down";
    return [{
      name,
      unit: String(latest.item.unit || ""),
      current: latest.value,
      previous,
      delta,
      normalMin,
      normalMax,
      relation,
      trend,
    } satisfies CustomIndicatorTrend];
  });
}
