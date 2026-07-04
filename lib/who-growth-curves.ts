export type WhoGrowthReference = {
  indicator: "weight_for_age" | "height_for_age" | "weight_for_height";
  sex: "female" | "male";
  age_months: number | null;
  length_height_cm: number | null;
  measurement_method?: "not_applicable" | "recumbent_length" | "standing_height";
  l: number;
  m: number;
  s: number;
};

export type WhoGrowthCurvePoint = {
  x: number;
  sd3neg: number;
  sd2neg: number;
  sd1neg: number;
  median: number;
  sd1: number;
  sd2: number;
  sd3: number;
};

export const whoCurveDefinitions = {
  weightAge: {
    indicator: "weight_for_age",
    label: "Poids-pour-age",
    xKey: "age_months",
    yKey: "weight_kg",
    xLabel: "Age (mois)",
    yLabel: "Poids (kg)",
  },
  heightAge: {
    indicator: "height_for_age",
    label: "Taille-pour-age",
    xKey: "age_months",
    yKey: "height_cm",
    xLabel: "Age (mois)",
    yLabel: "Taille / longueur (cm)",
  },
  weightHeight: {
    indicator: "weight_for_height",
    label: "Poids-pour-taille",
    xKey: "height_cm",
    yKey: "weight_kg",
    xLabel: "Taille / longueur (cm)",
    yLabel: "Poids (kg)",
  },
} as const;

export type WhoCurveKey = keyof typeof whoCurveDefinitions;

function valueAtZ(reference: WhoGrowthReference, z: number) {
  const { l, m, s } = reference;
  const base = 1 + l * s * z;
  const value = l === 0 ? m * Math.exp(s * z) : base > 0 ? m * base ** (1 / l) : null;
  return value !== null && Number.isFinite(value) ? Number(value.toFixed(3)) : null;
}

export function buildWhoGrowthCurve(
  references: WhoGrowthReference[],
  key: WhoCurveKey,
  sex: string,
  measurementMethod?: string,
) {
  const definition = whoCurveDefinitions[key];
  return references
    .filter(reference =>
      reference.indicator === definition.indicator
      && reference.sex === sex
      && (definition.indicator !== "weight_for_height"
        || !measurementMethod
        || reference.measurement_method === measurementMethod),
    )
    .map(reference => {
      const x = definition.indicator === "weight_for_height" ? reference.length_height_cm : reference.age_months;
      if (x === null || x === undefined) return null;
      const values = [-3, -2, -1, 0, 1, 2, 3].map(z => valueAtZ(reference, z));
      if (values.some(value => value === null)) return null;
      return {
        x: Number(x),
        sd3neg: values[0]!,
        sd2neg: values[1]!,
        sd1neg: values[2]!,
        median: values[3]!,
        sd1: values[4]!,
        sd2: values[5]!,
        sd3: values[6]!,
      } satisfies WhoGrowthCurvePoint;
    })
    .filter((point): point is WhoGrowthCurvePoint => point !== null)
    .sort((a, b) => a.x - b.x);
}
