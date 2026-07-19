const replacements: Array<[string, string]> = [
  ["â€™", "’"], ["â€˜", "‘"], ["â€œ", "“"], ["â€", "”"],
  ["â€“", "–"], ["â€”", "—"], ["â€¦", "…"], ["â†’", "→"],
  ["Ã€", "À"], ["Ã‚", "Â"], ["Ã‡", "Ç"], ["Ã‰", "É"], ["Ãˆ", "È"], ["ÃŠ", "Ê"],
  ["Ã ", "à"], ["Ã¢", "â"], ["Ã¤", "ä"], ["Ã§", "ç"], ["Ã©", "é"],
  ["Ã¨", "è"], ["Ãª", "ê"], ["Ã«", "ë"], ["Ã®", "î"], ["Ã¯", "ï"],
  ["Ã´", "ô"], ["Ã¶", "ö"], ["Ã¹", "ù"], ["Ã»", "û"], ["Ã¼", "ü"],
  ["Å“", "œ"], ["Å’", "Œ"], ["Â·", "·"], ["Â ", " "], ["Â", ""],
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
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairContent(item)])) as T;
  }
  return value;
}
