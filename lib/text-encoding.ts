const replacements: Array<[string, string]> = [
  ["\u00e2\u20ac\u2122", "\u2019"], ["\u00e2\u20ac\u02dc", "\u2018"],
  ["\u00e2\u20ac\u0153", "\u201c"], ["\u00e2\u20ac\u009d", "\u201d"],
  ["\u00e2\u20ac\u201c", "\u2013"], ["\u00e2\u20ac\u201d", "\u2014"],
  ["\u00e2\u20ac\u00a6", "\u2026"], ["\u00e2\u2020\u2019", "\u2192"],
  ["\u00c3\u20ac", "\u00c0"], ["\u00c3\u201a", "\u00c2"], ["\u00c3\u2021", "\u00c7"],
  ["\u00c3\u2030", "\u00c9"], ["\u00c3\u02c6", "\u00c8"], ["\u00c3\u0160", "\u00ca"],
  ["\u00c3\u00a0", "\u00e0"], ["\u00c3\u00a2", "\u00e2"], ["\u00c3\u00a4", "\u00e4"],
  ["\u00c3\u00a7", "\u00e7"], ["\u00c3\u00a9", "\u00e9"], ["\u00c3\u00a8", "\u00e8"],
  ["\u00c3\u00aa", "\u00ea"], ["\u00c3\u00ab", "\u00eb"], ["\u00c3\u00ae", "\u00ee"],
  ["\u00c3\u00af", "\u00ef"], ["\u00c3\u00b4", "\u00f4"], ["\u00c3\u00b6", "\u00f6"],
  ["\u00c3\u00b9", "\u00f9"], ["\u00c3\u00bb", "\u00fb"], ["\u00c3\u00bc", "\u00fc"],
  ["\u00c5\u201c", "\u0153"], ["\u00c5\u2019", "\u0152"], ["\u00c2\u00b7", "\u00b7"],
  ["\u00c2\u00a0", " "], ["\u00c2", ""],
];

export function repairMojibake(value: string) {
  let result = value;
  for (let pass = 0; pass < 3; pass += 1) {
    const previous = result;
    for (const [broken, repaired] of replacements) result = result.split(broken).join(repaired);
    if (result === previous) break;
  }
  return result;
}

export function repairContent<T>(value: T): T {
  if (typeof value === "string") return repairMojibake(value) as T;
  if (Array.isArray(value)) return value.map(repairContent) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairContent(item)])) as T;
  return value;
}
