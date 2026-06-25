
import type { Sex } from "@/nutritrack/types";
import { whoWeightForHeightUnisex, whoLengthForAgeGirls, whoLengthForAgeBoys, whoWeightForAgeBoys, whoWeightForAgeGirls } from "./who-growth-standards";

/**
 * Calculates the Weight-for-Height Z-score (WHZ) based on the provided WHO 2006 unisex table.
 * This function now performs a direct interpolation from the reference table.
 * @param weight Child's weight in kg.
 * @param height Child's height in cm.
 * @param sex Child's sex ('M' or 'F') - currently unused as the table is unisex.
 * @returns The calculated WHZ score.
 */
export function calculateWHZ(weight: number, height: number, sex: Sex): number {
  const table = whoWeightForHeightUnisex;

  const getZScoreForExactHeight = (entry: { sd3_neg: number; sd2_neg: number; median: number; }, weight: number): number => {
      const { sd3_neg, sd2_neg, median } = entry;
      
      const sd1_neg = sd2_neg + (median - sd2_neg) / 2; // Approximate -1 SD
      
      if (weight < sd3_neg) return -3.0 - ((sd3_neg - weight) / (sd2_neg - sd3_neg)); // Corrected logic to go below -3
      if (weight <= sd2_neg) return -3.0 + ((weight - sd3_neg) / (sd2_neg - sd3_neg));
      if (weight <= sd1_neg) return -2.0 + ((weight - sd2_neg) / (sd1_neg - sd2_neg));
      if (weight < median) return -1.0 + ((weight - sd1_neg) / (median - sd1_neg));

      if (weight === median) return 0.0;
      
      const sd1_pos = median + (median - sd1_neg);
      const sd2_pos = median + (median - sd2_neg);
      const sd3_pos = median + (median - sd3_neg);

      if (weight <= sd1_pos) return (weight - median) / (sd1_pos - median);
      if (weight <= sd2_pos) return 1.0 + ((weight - sd1_pos) / (sd2_pos - sd1_pos));
      if (weight <= sd3_pos) return 2.0 + ((weight - sd2_pos) / (sd3_pos - sd2_pos));
      
      return 3.0;
  };

  // Find the closest height entries in the table
  const lowerBound = table.filter(entry => entry.height <= height).pop();
  const upperBound = table.find(entry => entry.height > height);

  // If height is outside the table range, clamp to the nearest boundary
  if (!lowerBound) return getZScoreForExactHeight(table[0], weight);
  if (!upperBound) return getZScoreForExactHeight(table[table.length - 1], weight);
  
  // If height is exactly in the table, calculate directly
  if (lowerBound.height === height) {
      return getZScoreForExactHeight(lowerBound, weight);
  }

  // Interpolate the standard deviation weight values for the exact height
  const heightFraction = (height - lowerBound.height) / (upperBound.height - lowerBound.height);
  
  const interpolatedSD3neg = lowerBound.sd3_neg + heightFraction * (upperBound.sd3_neg - lowerBound.sd3_neg);
  const interpolatedSD2neg = lowerBound.sd2_neg + heightFraction * (upperBound.sd2_neg - lowerBound.sd2_neg);
  const interpolatedMedian = lowerBound.median + heightFraction * (upperBound.median - lowerBound.median);

  const interpolatedEntry = {
      height: height,
      sd3_neg: interpolatedSD3neg,
      sd2_neg: interpolatedSD2neg,
      median: interpolatedMedian,
  };

  return getZScoreForExactHeight(interpolatedEntry, weight);
}

/**
 * Calculates the Weight-for-Age Z-score (WAZ) based on WHO 2006 standards.
 * @param weight Child's weight in kg.
 * @param ageInMonths Child's age in completed months.
 * @param sex Child's sex ('M' or 'F').
 * @returns The calculated WAZ score.
 */
export function calculateWAZ(weight: number, ageInMonths: number, sex: Sex): number {
    const table = sex === 'M' ? whoWeightForAgeBoys : whoWeightForAgeGirls;
    const getZScoreForExactAge = (age: number, w: number): number => {
        const entry = table.find(e => e.month === age);
        if (!entry) return 0;
        const { sd3_neg, sd2_neg, sd1_neg, median, sd1_pos, sd2_pos, sd3_pos } = entry;
        if (w <= sd3_neg) return -3.0;
        if (w <= sd2_neg) return -3.0 + (w - sd3_neg) / (sd2_neg - sd3_neg);
        if (w <= sd1_neg) return -2.0 + (w - sd2_neg) / (sd1_neg - sd2_neg);
        if (w < median) return -1.0 + (w - sd1_neg) / (median - sd1_neg);
        if (w === median) return 0.0;
        if (w <= sd1_pos) return (w - median) / (sd1_pos - median);
        if (w <= sd2_pos) return 1.0 + (w - sd1_pos) / (sd2_pos - sd1_pos);
        if (w <= sd3_pos) return 2.0 + (w - sd2_pos) / (sd3_pos - sd2_pos);
        return 3.0;
    };
    const exactMatch = table.find(e => e.month === ageInMonths);
    if (exactMatch) {
        return getZScoreForExactAge(ageInMonths, weight);
    }
    const lowerBound = table.filter(entry => entry.month < ageInMonths).pop();
    const upperBound = table.find(entry => entry.month > ageInMonths);
    if (!lowerBound || !upperBound) {
        const boundaryEntry = lowerBound || upperBound || table[0];
        return getZScoreForExactAge(boundaryEntry.month, weight);
    }
    const zScoreLower = getZScoreForExactAge(lowerBound.month, weight);
    const zScoreUpper = getZScoreForExactAge(upperBound.month, weight);
    const ageFraction = (ageInMonths - lowerBound.month) / (upperBound.month - lowerBound.month);
    return zScoreLower + ageFraction * (zScoreUpper - zScoreLower);
}

/**
 * Calculates the Height-for-Age Z-score (HAZ) based on WHO 2006 standards.
 * @param height Child's height in cm.
 * @param ageInMonths Child's age in completed months.
 * @param sex Child's sex ('M' or 'F').
 * @returns The calculated HAZ score.
 */
export function calculateHAZ(height: number, ageInMonths: number, sex: Sex): number {
  const table = sex === 'M' ? whoLengthForAgeBoys : whoLengthForAgeGirls;
  
  const getZScoreForExactAge = (age: number, h: number): number => {
    const entry = table.find(e => e.month === age);
    if (!entry) return 0;

    const { sd3_neg, sd2_neg, sd1_neg, median, sd1_pos, sd2_pos, sd3_pos } = entry;
    
    if (h <= sd3_neg) return -3.0;
    if (h <= sd2_neg) return -3.0 + (h - sd3_neg) / (sd2_neg - sd3_neg);
    if (h <= sd1_neg) return -2.0 + (h - sd2_neg) / (sd1_neg - sd2_neg);
    if (h < median) return -1.0 + (h - sd1_neg) / (median - sd1_neg);
    if (h === median) return 0.0;
    if (h <= sd1_pos) return (h - median) / (sd1_pos - median);
    if (h <= sd2_pos) return 1.0 + (h - sd1_pos) / (sd2_pos - sd1_pos);
    if (h <= sd3_pos) return 2.0 + (h - sd2_pos) / (sd3_pos - sd2_pos);

    return 3.0;
  };
  
  const exactMatch = table.find(e => e.month === ageInMonths);
  if (exactMatch) {
    return getZScoreForExactAge(ageInMonths, height);
  }

  const lowerBound = table.filter(entry => entry.month < ageInMonths).pop();
  const upperBound = table.find(entry => entry.month > ageInMonths);

  if (!lowerBound || !upperBound) {
    const boundaryEntry = lowerBound || upperBound || table[0];
    return getZScoreForExactAge(boundaryEntry.month, height);
  }
  
  const zScoreLower = getZScoreForExactAge(lowerBound.month, height);
  const zScoreUpper = getZScoreForExactAge(upperBound.month, height);
  
  const ageFraction = (ageInMonths - lowerBound.month) / (upperBound.month - lowerBound.month);

  return zScoreLower + ageFraction * (zScoreUpper - zScoreLower);
}


export interface DiagnosisResult {
  status: 'SAM' | 'MAM' | 'Not Malnourished';
  reason: string;
}

export function diagnoseMalnutrition(muac: number | null, whz: number | null, oedema: 'yes' | 'no'): DiagnosisResult {
  const samReasons: string[] = [];
  const mamReasons: string[] = [];

  // Check for SAM criteria
  if (oedema === 'yes') {
    samReasons.push('Oedema');
  }
  if (whz !== null && whz < -3) {
    samReasons.push('W/H Z-score');
  }
  if (muac !== null && muac < 115) {
    samReasons.push('MUAC');
  }

  if (samReasons.length > 0) {
    return { status: 'SAM', reason: samReasons.join(' & ') };
  }

  // If not SAM, check for MAM criteria
  if (whz !== null && whz >= -3 && whz < -2) {
    mamReasons.push('W/H Z-score');
  }
   if (muac !== null && muac >= 115 && muac < 125) {
    mamReasons.push('MUAC');
  }

  if (mamReasons.length > 0) {
    return { status: 'MAM', reason: mamReasons.join(' & ') };
  }
  
  // If no SAM or MAM, then not malnourished
  return { status: 'Not Malnourished', reason: 'Normal' };
}

    

