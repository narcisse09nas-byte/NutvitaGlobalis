// Operations Management: "montant en lettres" requirement on distribution activity reports and
// invoices. Scoped to whole-number amounts only (XOF/XAF-style currencies never carry decimals in
// practice here) — a currency needing centimes/cents would need a decimal branch added later.

const UNITS = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
const TEENS = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function twoDigitsFr(n: number): string {
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  if (ten === 7 || ten === 9) {
    // soixante-dix..soixante-dix-neuf, quatre-vingt-dix..quatre-vingt-dix-neuf
    const base = TENS[ten];
    const remainder = 10 + unit;
    return unit === 0 ? `${base}-${TEENS[0]}` : `${base}-${remainder < 20 ? TEENS[remainder - 10] : ""}`;
  }
  if (unit === 0) return ten === 8 ? `${TENS[ten]}s` : TENS[ten];
  if (unit === 1 && ten !== 8) return `${TENS[ten]}-et-un`;
  return `${TENS[ten]}-${UNITS[unit]}`;
}

function threeDigitsFr(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let result = "";
  if (hundred > 0) result += hundred === 1 ? "cent" : `${UNITS[hundred]} cent`;
  if (hundred > 0 && rest === 0 && hundred > 1) result += "s";
  if (rest > 0) result += (result ? " " : "") + twoDigitsFr(rest);
  return result || "zero";
}

/** French whole-number-to-words, e.g. 125000 -> "cent vingt-cinq mille". */
export function numberToWordsFr(value: number): string {
  const n = Math.round(Math.abs(value));
  if (n === 0) return "zero";
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const units = n % 1_000;
  const parts: string[] = [];
  if (billions > 0) parts.push(`${threeDigitsFr(billions)} milliard${billions > 1 ? "s" : ""}`);
  if (millions > 0) parts.push(`${threeDigitsFr(millions)} million${millions > 1 ? "s" : ""}`);
  if (thousands > 0) parts.push(thousands === 1 ? "mille" : `${threeDigitsFr(thousands)} mille`);
  if (units > 0) parts.push(threeDigitsFr(units));
  return parts.join(" ");
}

/** e.g. amountInWordsFr(125000, "XOF") -> "cent vingt-cinq mille francs CFA (XOF)". */
export function amountInWordsFr(value: number, currency: string): string {
  const currencyLabel = currency === "XOF" || currency === "XAF" ? `francs CFA (${currency})` : currency;
  return `${numberToWordsFr(value)} ${currencyLabel}`;
}

const UNITS_EN = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEENS_EN = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS_EN = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function twoDigitsEn(n: number): string {
  if (n < 10) return UNITS_EN[n];
  if (n < 20) return TEENS_EN[n - 10];
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  return unit === 0 ? TENS_EN[ten] : `${TENS_EN[ten]}-${UNITS_EN[unit]}`;
}

function threeDigitsEn(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  let result = "";
  if (hundred > 0) result += `${UNITS_EN[hundred]} hundred`;
  if (rest > 0) result += (result ? " " : "") + twoDigitsEn(rest);
  return result || "zero";
}

/** English whole-number-to-words, mirroring numberToWordsFr. */
export function numberToWordsEn(value: number): string {
  const n = Math.round(Math.abs(value));
  if (n === 0) return "zero";
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const units = n % 1_000;
  const parts: string[] = [];
  if (billions > 0) parts.push(`${threeDigitsEn(billions)} billion`);
  if (millions > 0) parts.push(`${threeDigitsEn(millions)} million`);
  if (thousands > 0) parts.push(`${threeDigitsEn(thousands)} thousand`);
  if (units > 0) parts.push(threeDigitsEn(units));
  return parts.join(" ");
}

export function amountInWords(value: number, currency: string, locale: "fr" | "en"): string {
  if (locale === "en") {
    const currencyLabel = currency === "XOF" || currency === "XAF" ? `CFA francs (${currency})` : currency;
    return `${numberToWordsEn(value)} ${currencyLabel}`;
  }
  return amountInWordsFr(value, currency);
}
