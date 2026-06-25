
/**
 * WHO Child Growth Standards 2006 Data Tables.
 * These tables contain z-score data for weight-for-age, length/height-for-age,
 * and weight-for-length/height for boys and girls from birth to 5 years.
 * Transcribed from the WHO 2006 standard tables and the unisex W/H table provided.
 */

// #region Interfaces
export interface AgeStandardData {
  month: number;
  median: number;
  sd1_neg: number;
  sd2_neg: number;
  sd3_neg: number;
  sd1_pos: number;
  sd2_pos: number;
  sd3_pos: number;
}

export interface WeightForHeightStandardData {
    height: number;
    sd3_neg: number;
    sd2_neg: number;
    sd1_5_neg: number;
    median: number;
}
// #endregion Interfaces


// #region Weight-for-Age Data
// Placeholder data - full tables are large
export const whoWeightForAgeGirls: AgeStandardData[] = [
    { month: 0, median: 3.2, sd1_neg: 2.8, sd2_neg: 2.4, sd3_neg: 2.1, sd1_pos: 3.7, sd2_pos: 4.2, sd3_pos: 4.8 },
    { month: 12, median: 8.9, sd1_neg: 7.9, sd2_neg: 7.1, sd3_neg: 6.5, sd1_pos: 10.1, sd2_pos: 11.5, sd3_pos: 13.1 },
    { month: 24, median: 11.5, sd1_neg: 10.2, sd2_neg: 9.2, sd3_neg: 8.4, sd1_pos: 12.7, sd2_pos: 14.6, sd3_pos: 16.8 },
    { month: 60, median: 18.2, sd1_neg: 16.1, sd2_neg: 14.4, sd3_neg: 12.9, sd1_pos: 20.6, sd2_pos: 23.4, sd3_pos: 26.6 },
];

export const whoWeightForAgeBoys: AgeStandardData[] = [
    { month: 0, median: 3.3, sd1_neg: 2.9, sd2_neg: 2.5, sd3_neg: 2.2, sd1_pos: 3.8, sd2_pos: 4.4, sd3_pos: 5.0 },
    { month: 12, median: 9.6, sd1_neg: 8.6, sd2_neg: 7.8, sd3_neg: 7.1, sd1_pos: 10.8, sd2_pos: 12.0, sd3_pos: 13.5 },
    { month: 24, median: 12.2, sd1_neg: 10.8, sd2_neg: 9.9, sd3_neg: 9.0, sd1_pos: 13.4, sd2_pos: 15.1, sd3_pos: 17.2 },
    { month: 60, median: 18.7, sd1_neg: 16.4, sd2_neg: 14.7, sd3_neg: 13.3, sd1_pos: 21.2, sd2_pos: 24.2, sd3_pos: 27.5 },
];
// #endregion Weight-for-Age Data


// #region Length-for-Age Data
export const whoLengthForAgeGirls: AgeStandardData[] = [
    { month: 0, median: 49.1, sd1_neg: 47.3, sd2_neg: 45.4, sd3_neg: 43.6, sd1_pos: 51.0, sd2_pos: 52.9, sd3_pos: 54.7 },
    { month: 1, median: 53.7, sd1_neg: 51.8, sd2_neg: 49.8, sd3_neg: 47.9, sd1_pos: 55.6, sd2_pos: 57.6, sd3_pos: 59.5 },
    { month: 2, median: 57.1, sd1_neg: 55.0, sd2_neg: 53.0, sd3_neg: 51.0, sd1_pos: 59.1, sd2_pos: 61.1, sd3_pos: 63.2 },
    { month: 3, median: 59.8, sd1_neg: 57.7, sd2_neg: 55.6, sd3_neg: 53.5, sd1_pos: 61.9, sd2_pos: 64.0, sd3_pos: 66.1 },
    { month: 4, median: 62.1, sd1_neg: 59.9, sd2_neg: 57.8, sd3_neg: 55.6, sd1_pos: 64.3, sd2_pos: 66.4, sd3_pos: 68.6 },
    { month: 5, median: 64.0, sd1_neg: 61.8, sd2_neg: 59.6, sd3_neg: 57.4, sd1_pos: 66.2, sd2_pos: 68.5, sd3_pos: 70.7 },
    { month: 6, median: 65.7, sd1_neg: 63.5, sd2_neg: 61.2, sd3_neg: 58.9, sd1_pos: 68.0, sd2_pos: 70.3, sd3_pos: 72.5 },
    { month: 7, median: 67.3, sd1_neg: 65.0, sd2_neg: 62.7, sd3_neg: 60.4, sd1_pos: 69.6, sd2_pos: 71.9, sd3_pos: 74.2 },
    { month: 8, median: 68.7, sd1_neg: 66.4, sd2_neg: 64.0, sd3_neg: 61.7, sd1_pos: 71.1, sd2_pos: 73.5, sd3_pos: 75.8 },
    { month: 9, median: 70.1, sd1_neg: 67.7, sd2_neg: 65.3, sd3_neg: 62.9, sd1_pos: 72.6, sd2_pos: 75.0, sd3_pos: 77.4 },
    { month: 10, median: 71.5, sd1_neg: 69.0, sd2_neg: 66.5, sd3_neg: 64.1, sd1_pos: 73.9, sd2_pos: 76.4, sd3_pos: 78.9 },
    { month: 11, median: 72.8, sd1_neg: 70.3, sd2_neg: 67.7, sd3_neg: 65.2, sd1_pos: 75.3, sd2_pos: 77.8, sd3_pos: 80.3 },
    { month: 12, median: 74.0, sd1_neg: 71.4, sd2_neg: 68.9, sd3_neg: 66.4, sd1_pos: 76.6, sd2_pos: 79.2, sd3_pos: 81.7 },
    { month: 13, median: 75.2, sd1_neg: 72.6, sd2_neg: 70.0, sd3_neg: 67.5, sd1_pos: 77.8, sd2_pos: 80.5, sd3_pos: 83.0 },
    { month: 14, median: 76.4, sd1_neg: 73.8, sd2_neg: 71.1, sd3_neg: 68.6, sd1_pos: 79.1, sd2_pos: 81.7, sd3_pos: 84.3 },
    { month: 15, median: 77.5, sd1_neg: 74.8, sd2_neg: 72.2, sd3_neg: 69.6, sd1_pos: 80.3, sd2_pos: 82.9, sd3_pos: 85.5 },
    { month: 16, median: 78.6, sd1_neg: 75.9, sd2_neg: 73.2, sd3_neg: 70.6, sd1_pos: 81.4, sd2_pos: 84.1, sd3_pos: 86.7 },
    { month: 17, median: 79.7, sd1_neg: 77.0, sd2_neg: 74.2, sd3_neg: 71.6, sd1_pos: 82.5, sd2_pos: 85.2, sd3_pos: 87.9 },
    { month: 18, median: 80.7, sd1_neg: 78.0, sd2_neg: 75.2, sd3_neg: 72.5, sd1_pos: 83.5, sd2_pos: 86.3, sd3_pos: 89.0 },
    { month: 19, median: 81.7, sd1_neg: 78.9, sd2_neg: 76.1, sd3_neg: 73.4, sd1_pos: 84.5, sd2_pos: 87.4, sd3_pos: 90.2 },
    { month: 20, median: 82.7, sd1_neg: 79.9, sd2_neg: 77.1, sd3_neg: 74.3, sd1_pos: 85.5, sd2_pos: 88.4, sd3_pos: 91.2 },
    { month: 21, median: 83.7, sd1_neg: 80.8, sd2_neg: 78.0, sd3_neg: 75.1, sd1_pos: 86.5, sd2_pos: 89.4, sd3_pos: 92.3 },
    { month: 22, median: 84.6, sd1_neg: 81.7, sd2_neg: 78.8, sd3_neg: 75.9, sd1_pos: 87.5, sd2_pos: 90.5, sd3_pos: 93.4 },
    { month: 23, median: 85.5, sd1_neg: 82.5, sd2_neg: 79.6, sd3_neg: 76.7, sd1_pos: 88.5, sd2_pos: 91.5, sd3_pos: 94.5 },
    { month: 24, median: 86.4, sd1_neg: 83.2, sd2_neg: 80.3, sd3_neg: 77.2, sd1_pos: 89.6, sd2_pos: 92.4, sd3_pos: 95.3 },
    { month: 60, median: 109.4, sd1_neg: 104.7, sd2_neg: 100.1, sd3_neg: 95.4, sd1_pos: 114.1, sd2_pos: 118.7, sd3_pos: 123.3 },
];

export const whoLengthForAgeBoys: AgeStandardData[] = [
    { month: 0, median: 49.9, sd1_neg: 48.0, sd2_neg: 46.1, sd3_neg: 44.2, sd1_pos: 51.8, sd2_pos: 53.7, sd3_pos: 55.6 },
    { month: 1, median: 54.7, sd1_neg: 52.8, sd2_neg: 50.8, sd3_neg: 48.9, sd1_pos: 56.7, sd2_pos: 58.6, sd3_pos: 60.6 },
    { month: 2, median: 58.4, sd1_neg: 56.4, sd2_neg: 54.4, sd3_neg: 52.4, sd1_pos: 60.4, sd2_pos: 62.4, sd3_pos: 64.4 },
    { month: 3, median: 61.4, sd1_neg: 59.4, sd2_neg: 57.3, sd3_neg: 55.3, sd1_pos: 63.5, sd2_pos: 65.5, sd3_pos: 67.6 },
    { month: 4, median: 63.9, sd1_neg: 61.8, sd2_neg: 59.7, sd3_neg: 57.6, sd1_pos: 66.0, sd2_pos: 68.0, sd3_pos: 70.1 },
    { month: 5, median: 65.9, sd1_neg: 63.8, sd2_neg: 61.6, sd3_neg: 59.4, sd1_pos: 68.0, sd2_pos: 70.2, sd3_pos: 72.3 },
    { month: 6, median: 67.6, sd1_neg: 65.5, sd2_neg: 63.3, sd3_neg: 61.1, sd1_pos: 69.8, sd2_pos: 72.0, sd3_pos: 74.2 },
    { month: 7, median: 69.2, sd1_neg: 67.0, sd2_neg: 64.8, sd3_neg: 62.5, sd1_pos: 71.4, sd2_pos: 73.6, sd3_pos: 75.9 },
    { month: 8, median: 70.6, sd1_neg: 68.4, sd2_neg: 66.2, sd3_neg: 63.8, sd1_pos: 72.8, sd2_pos: 75.1, sd3_pos: 77.4 },
    { month: 9, median: 72.0, sd1_neg: 69.7, sd2_neg: 67.5, sd3_neg: 65.1, sd1_pos: 74.2, sd2_pos: 76.5, sd3_pos: 78.9 },
    { month: 10, median: 73.3, sd1_neg: 71.0, sd2_neg: 68.7, sd3_neg: 66.2, sd1_pos: 75.6, sd2_pos: 77.9, sd3_pos: 80.3 },
    { month: 11, median: 74.5, sd1_neg: 72.2, sd2_neg: 69.9, sd3_neg: 67.4, sd1_pos: 76.9, sd2_pos: 79.2, sd3_pos: 81.6 },
    { month: 12, median: 75.7, sd1_neg: 73.4, sd2_neg: 71.0, sd3_neg: 68.6, sd1_pos: 78.1, sd2_pos: 80.5, sd3_pos: 82.9 },
    { month: 13, median: 76.9, sd1_neg: 74.5, sd2_neg: 72.1, sd3_neg: 69.7, sd1_pos: 79.3, sd2_pos: 81.7, sd3_pos: 84.2 },
    { month: 14, median: 78.0, sd1_neg: 75.6, sd2_neg: 73.2, sd3_neg: 70.7, sd1_pos: 80.5, sd2_pos: 82.9, sd3_pos: 85.4 },
    { month: 15, median: 79.1, sd1_neg: 76.7, sd2_neg: 74.2, sd3_neg: 71.7, sd1_pos: 81.6, sd2_pos: 84.1, sd3_pos: 86.6 },
    { month: 16, median: 80.2, sd1_neg: 77.7, sd2_neg: 75.2, sd3_neg: 72.7, sd1_pos: 82.7, sd2_pos: 85.2, sd3_pos: 87.7 },
    { month: 17, median: 81.2, sd1_neg: 78.7, sd2_neg: 76.2, sd3_neg: 73.6, sd1_pos: 83.8, sd2_pos: 86.3, sd3_pos: 88.9 },
    { month: 18, median: 82.3, sd1_neg: 79.7, sd2_neg: 77.2, sd3_neg: 74.6, sd1_pos: 84.9, sd2_pos: 87.4, sd3_pos: 90.0 },
    { month: 19, median: 83.2, sd1_neg: 80.7, sd2_neg: 78.1, sd3_neg: 75.5, sd1_pos: 85.8, sd2_pos: 88.4, sd3_pos: 91.0 },
    { month: 20, median: 84.2, sd1_neg: 81.6, sd2_neg: 79.0, sd3_neg: 76.4, sd1_pos: 86.8, sd2_pos: 89.4, sd3_pos: 92.0 },
    { month: 21, median: 85.1, sd1_neg: 82.5, sd2_neg: 79.9, sd3_neg: 77.2, sd1_pos: 87.8, sd2_pos: 90.4, sd3_pos: 93.0 },
    { month: 22, median: 86.0, sd1_neg: 83.4, sd2_neg: 80.7, sd3_neg: 78.0, sd1_pos: 88.7, sd2_pos: 91.4, sd3_pos: 94.1 },
    { month: 23, median: 86.9, sd1_neg: 84.2, sd2_neg: 81.5, sd3_neg: 78.8, sd1_pos: 89.6, sd2_pos: 92.3, sd3_pos: 95.0 },
    { month: 24, median: 87.8, sd1_neg: 85.1, sd2_neg: 82.3, sd3_neg: 79.6, sd1_pos: 90.4, sd2_pos: 93.2, sd3_pos: 95.9 },
    { month: 60, median: 110.0, sd1_neg: 105.3, sd2_neg: 100.7, sd3_neg: 96.1, sd1_pos: 114.6, sd2_pos: 119.2, sd3_pos: 123.9 },
];
// #endregion Length-for-Age Data


// #region Weight-for-Height Data (Unisex)
// This table is transcribed from the provided reference image.
export const whoWeightForHeightUnisex: WeightForHeightStandardData[] = [
    { height: 45, sd3_neg: 1.88, sd2_neg: 2.04, sd1_5_neg: 2.13, median: 2.44 },
    { height: 45.5, sd3_neg: 1.94, sd2_neg: 2.11, sd1_5_neg: 2.21, median: 2.52 },
    { height: 46, sd3_neg: 2.01, sd2_neg: 2.18, sd1_5_neg: 2.28, median: 2.61 },
    { height: 46.5, sd3_neg: 2.07, sd2_neg: 2.26, sd1_5_neg: 2.36, median: 2.69 },
    { height: 47, sd3_neg: 2.14, sd2_neg: 2.33, sd1_5_neg: 2.43, median: 2.78 },
    { height: 47.5, sd3_neg: 2.21, sd2_neg: 2.4, sd1_5_neg: 2.51, median: 2.86 },
    { height: 48, sd3_neg: 2.28, sd2_neg: 2.48, sd1_5_neg: 2.58, median: 2.95 },
    { height: 48.5, sd3_neg: 2.35, sd2_neg: 2.55, sd1_5_neg: 2.66, median: 3.04 },
    { height: 49, sd3_neg: 2.42, sd2_neg: 2.63, sd1_5_neg: 2.75, median: 3.13 },
    { height: 49.5, sd3_neg: 2.5, sd2_neg: 2.71, sd1_5_neg: 2.83, median: 3.23 },
    { height: 50, sd3_neg: 2.58, sd2_neg: 2.8, sd1_5_neg: 2.92, median: 3.33 },
    { height: 50.5, sd3_neg: 2.66, sd2_neg: 2.89, sd1_5_neg: 3.01, median: 3.43 },
    { height: 51, sd3_neg: 2.75, sd2_neg: 2.98, sd1_5_neg: 3.11, median: 3.54 },
    { height: 51.5, sd3_neg: 2.83, sd2_neg: 3.08, sd1_5_neg: 3.21, median: 3.65 },
    { height: 52, sd3_neg: 2.93, sd2_neg: 3.17, sd1_5_neg: 3.31, median: 3.76 },
    { height: 52.5, sd3_neg: 3.02, sd2_neg: 3.28, sd1_5_neg: 3.41, median: 3.88 },
    { height: 53, sd3_neg: 3.12, sd2_neg: 3.38, sd1_5_neg: 3.53, median: 4.01 },
    { height: 53.5, sd3_neg: 3.22, sd2_neg: 3.49, sd1_5_neg: 3.64, median: 4.14 },
    { height: 54, sd3_neg: 3.33, sd2_neg: 3.61, sd1_5_neg: 3.76, median: 4.27 },
    { height: 54.5, sd3_neg: 3.45, sd2_neg: 3.72, sd1_5_neg: 3.88, median: 4.41 },
    { height: 55, sd3_neg: 3.56, sd2_neg: 3.85, sd1_5_neg: 4.01, median: 4.55 },
    { height: 55.5, sd3_neg: 3.67, sd2_neg: 3.97, sd1_5_neg: 4.14, median: 4.69 },
    { height: 56, sd3_neg: 3.78, sd2_neg: 4.1, sd1_5_neg: 4.26, median: 4.83 },
    { height: 56.5, sd3_neg: 3.9, sd2_neg: 4.22, sd1_5_neg: 4.4, median: 4.98 },
    { height: 57, sd3_neg: 4.02, sd2_neg: 4.35, sd1_5_neg: 4.53, median: 5.13 },
    { height: 57.5, sd3_neg: 4.1, sd2_neg: 4.5, sd1_5_neg: 4.7, median: 5.3 },
    { height: 58, sd3_neg: 4.2, sd2_neg: 4.6, sd1_5_neg: 4.8, median: 5.4 },
    { height: 58.5, sd3_neg: 4.3, sd2_neg: 4.7, sd1_5_neg: 4.9, median: 5.6 },
    { height: 59, sd3_neg: 4.5, sd2_neg: 4.8, sd1_5_neg: 5, median: 5.7 },
    { height: 59.5, sd3_neg: 4.6, sd2_neg: 5, sd1_5_neg: 5.2, median: 5.9 },
    { height: 60, sd3_neg: 4.7, sd2_neg: 5.1, sd1_5_neg: 5.3, median: 6 },
    { height: 60.5, sd3_neg: 4.8, sd2_neg: 5.2, sd1_5_neg: 5.4, median: 6.1 },
    { height: 61, sd3_neg: 4.9, sd2_neg: 5.3, sd1_5_neg: 5.5, median: 6.3 },
    { height: 61.5, sd3_neg: 5, sd2_neg: 5.4, sd1_5_neg: 5.7, median: 6.4 },
    { height: 62, sd3_neg: 5.1, sd2_neg: 5.6, sd1_5_neg: 5.8, median: 6.5 },
    { height: 62.5, sd3_neg: 5.2, sd2_neg: 5.7, sd1_5_neg: 5.9, median: 6.7 },
    { height: 63, sd3_neg: 5.3, sd2_neg: 5.8, sd1_5_neg: 6, median: 6.8 },
    { height: 63.5, sd3_neg: 5.4, sd2_neg: 5.9, sd1_5_neg: 6.1, median: 6.9 },
    { height: 64, sd3_neg: 5.5, sd2_neg: 6, sd1_5_neg: 6.2, median: 7 },
    { height: 64.5, sd3_neg: 5.6, sd2_neg: 6.1, sd1_5_neg: 6.3, median: 7.1 },
    { height: 65, sd3_neg: 5.7, sd2_neg: 6.2, sd1_5_neg: 6.4, median: 7.3 },
    { height: 65.5, sd3_neg: 5.8, sd2_neg: 6.3, sd1_5_neg: 6.5, median: 7.4 },
    { height: 66, sd3_neg: 5.9, sd2_neg: 6.4, sd1_5_neg: 6.7, median: 7.5 },
    { height: 66.5, sd3_neg: 6, sd2_neg: 6.5, sd1_5_neg: 6.8, median: 7.6 },
    { height: 67, sd3_neg: 6.1, sd2_neg: 6.6, sd1_5_neg: 6.9, median: 7.7 },
    { height: 67.5, sd3_neg: 6.2, sd2_neg: 6.7, sd1_5_neg: 7, median: 7.9 },
    { height: 68, sd3_neg: 6.3, sd2_neg: 6.8, sd1_5_neg: 7.1, median: 8 },
    { height: 68.5, sd3_neg: 6.4, sd2_neg: 6.9, sd1_5_neg: 7.2, median: 8.1 },
    { height: 69, sd3_neg: 6.5, sd2_neg: 7, sd1_5_neg: 7.3, median: 8.2 },
    { height: 69.5, sd3_neg: 6.6, sd2_neg: 7.1, sd1_5_neg: 7.4, median: 8.3 },
    { height: 70, sd3_neg: 6.6, sd2_neg: 7.2, sd1_5_neg: 7.5, median: 8.4 },
    { height: 70.5, sd3_neg: 6.7, sd2_neg: 7.3, sd1_5_neg: 7.6, median: 8.5 },
    { height: 71, sd3_neg: 6.8, sd2_neg: 7.4, sd1_5_neg: 7.7, median: 8.6 },
    { height: 71.5, sd3_neg: 6.9, sd2_neg: 7.5, sd1_5_neg: 7.8, median: 8.8 },
    { height: 72, sd3_neg: 7, sd2_neg: 7.6, sd1_5_neg: 7.9, median: 8.9 },
    { height: 72.5, sd3_neg: 7.1, sd2_neg: 7.6, sd1_5_neg: 8, median: 9 },
    { height: 73, sd3_neg: 7.2, sd2_neg: 7.7, sd1_5_neg: 8.1, median: 9.1 },
    { height: 73.5, sd3_neg: 7.2, sd2_neg: 7.8, sd1_5_neg: 8.2, median: 9.2 },
    { height: 74, sd3_neg: 7.3, sd2_neg: 7.9, sd1_5_neg: 8.2, median: 9.3 },
    { height: 74.5, sd3_neg: 7.4, sd2_neg: 8, sd1_5_neg: 8.3, median: 9.4 },
    { height: 75, sd3_neg: 7.5, sd2_neg: 8.1, sd1_5_neg: 8.4, median: 9.5 },
    { height: 75.5, sd3_neg: 7.6, sd2_neg: 8.2, sd1_5_neg: 8.5, median: 9.6 },
    { height: 76, sd3_neg: 7.6, sd2_neg: 8.3, sd1_5_neg: 8.6, median: 9.7 },
    { height: 76.5, sd3_neg: 7.7, sd2_neg: 8.3, sd1_5_neg: 8.7, median: 9.8 },
    { height: 77, sd3_neg: 7.8, sd2_neg: 8.4, sd1_5_neg: 8.8, median: 9.9 },
    { height: 77.5, sd3_neg: 7.9, sd2_neg: 8.5, sd1_5_neg: 8.8, median: 10 },
    { height: 78, sd3_neg: 7.9, sd2_neg: 8.6, sd1_5_neg: 8.9, median: 10.1 },
    { height: 78.5, sd3_neg: 8, sd2_neg: 8.7, sd1_5_neg: 9, median: 10.2 },
    { height: 79, sd3_neg: 8.1, sd2_neg: 8.7, sd1_5_neg: 9.1, median: 10.3 },
    { height: 79.5, sd3_neg: 8.2, sd2_neg: 8.8, sd1_5_neg: 9.2, median: 10.4 },
    { height: 80, sd3_neg: 8.3, sd2_neg: 8.9, sd1_5_neg: 9.3, median: 10.5 },
    { height: 80.5, sd3_neg: 8.3, sd2_neg: 9, sd1_5_neg: 9.3, median: 10.5 },
    { height: 81, sd3_neg: 8.4, sd2_neg: 9.1, sd1_5_neg: 9.4, median: 10.6 },
    { height: 81.5, sd3_neg: 8.5, sd2_neg: 9.1, sd1_5_neg: 9.5, median: 10.7 },
    { height: 82, sd3_neg: 8.5, sd2_neg: 9.2, sd1_5_neg: 9.6, median: 10.8 },
    { height: 82.5, sd3_neg: 8.6, sd2_neg: 9.3, sd1_5_neg: 9.7, median: 10.9 },
    { height: 83, sd3_neg: 8.7, sd2_neg: 9.4, sd1_5_neg: 9.8, median: 11 },
    { height: 83.5, sd3_neg: 8.8, sd2_neg: 9.5, sd1_5_neg: 9.9, median: 11.2 },
    { height: 84, sd3_neg: 8.9, sd2_neg: 9.6, sd1_5_neg: 10, median: 11.3 },
    { height: 84.5, sd3_neg: 9, sd2_neg: 9.7, sd1_5_neg: 10.1, median: 11.4 },
    { height: 85, sd3_neg: 9.1, sd2_neg: 9.8, sd1_5_neg: 10.2, median: 11.5 },
    { height: 85.5, sd3_neg: 9.2, sd2_neg: 9.9, sd1_5_neg: 10.3, median: 11.6 },
    { height: 86, sd3_neg: 9.3, sd2_neg: 10, sd1_5_neg: 10.4, median: 11.7 },
    { height: 86.5, sd3_neg: 9.4, sd2_neg: 10.1, sd1_5_neg: 10.5, median: 11.9 },
    { height: 87, sd3_neg: 9.6, sd2_neg: 10.2, sd1_5_neg: 10.6, median: 12.0 },
    { height: 87.5, sd3_neg: 9.7, sd2_neg: 10.3, sd1_5_neg: 10.7, median: 12.1 },
    { height: 88, sd3_neg: 9.8, sd2_neg: 10.4, sd1_5_neg: 10.8, median: 12.2 },
    { height: 88.5, sd3_neg: 9.9, sd2_neg: 10.5, sd1_5_neg: 10.9, median: 12.3 },
    { height: 89, sd3_neg: 10, sd2_neg: 10.6, sd1_5_neg: 11.0, median: 12.5 },
    { height: 89.5, sd3_neg: 10.1, sd2_neg: 10.7, sd1_5_neg: 11.1, median: 12.6 },
    { height: 90, sd3_neg: 10.2, sd2_neg: 10.8, sd1_5_neg: 11.2, median: 12.7 },
    { height: 90.5, sd3_neg: 10.3, sd2_neg: 10.9, sd1_5_neg: 11.3, median: 12.8 },
    { height: 91, sd3_neg: 10.4, sd2_neg: 11, sd1_5_neg: 11.4, median: 13 },
    { height: 91.5, sd3_neg: 10.5, sd2_neg: 11.1, sd1_5_neg: 11.5, median: 13.1 },
    { height: 92, sd3_neg: 10.6, sd2_neg: 11.2, sd1_5_neg: 11.6, median: 13.2 },
    { height: 92.5, sd3_neg: 10.7, sd2_neg: 11.3, sd1_5_neg: 11.7, median: 13.3 },
    { height: 93, sd3_neg: 10.8, sd2_neg: 11.4, sd1_5_neg: 11.8, median: 13.4 },
    { height: 93.5, sd3_neg: 10.9, sd2_neg: 11.5, sd1_5_neg: 12.0, median: 13.5 },
    { height: 94, sd3_neg: 11, sd2_neg: 11.6, sd1_5_neg: 12.1, median: 13.7 },
    { height: 94.5, sd3_neg: 11.1, sd2_neg: 11.7, sd1_5_neg: 12.2, median: 13.8 },
    { height: 95, sd3_neg: 11.1, sd2_neg: 11.8, sd1_5_neg: 12.3, median: 13.9 },
    { height: 95.5, sd3_neg: 11.2, sd2_neg: 11.9, sd1_5_neg: 12.4, median: 14.0 },
    { height: 96, sd3_neg: 11.3, sd2_neg: 12.0, sd1_5_neg: 12.5, median: 14.1 },
    { height: 96.5, sd3_neg: 11.4, sd2_neg: 12.1, sd1_5_neg: 12.6, median: 14.3 },
    { height: 97, sd3_neg: 11.5, sd2_neg: 12.2, sd1_5_neg: 12.7, median: 14.4 },
    { height: 97.5, sd3_neg: 11.6, sd2_neg: 12.3, sd1_5_neg: 12.8, median: 14.5 },
    { height: 98, sd3_neg: 11.7, sd2_neg: 12.4, sd1_5_neg: 12.9, median: 14.6 },
    { height: 98.5, sd3_neg: 11.8, sd2_neg: 12.5, sd1_5_neg: 13.0, median: 14.8 },
    { height: 99, sd3_neg: 11.9, sd2_neg: 12.6, sd1_5_neg: 13.1, median: 14.9 },
    { height: 99.5, sd3_neg: 12.0, sd2_neg: 12.7, sd1_5_neg: 13.2, median: 15.0 },
    { height: 100, sd3_neg: 12.1, sd2_neg: 12.8, sd1_5_neg: 13.3, median: 15.2 },
    { height: 100.5, sd3_neg: 12.2, sd2_neg: 12.9, sd1_5_neg: 13.4, median: 15.3 },
    { height: 101, sd3_neg: 12.3, sd2_neg: 13.0, sd1_5_neg: 13.5, median: 15.4 },
    { height: 101.5, sd3_neg: 12.4, sd2_neg: 13.1, sd1_5_neg: 13.7, median: 15.5 },
    { height: 102, sd3_neg: 12.5, sd2_neg: 13.2, sd1_5_neg: 13.8, median: 15.7 },
    { height: 102.5, sd3_neg: 12.6, sd2_neg: 13.3, sd1_5_neg: 13.9, median: 15.8 },
    { height: 103, sd3_neg: 12.8, sd2_neg: 13.5, sd1_5_neg: 14.0, median: 16.0 },
    { height: 103.5, sd3_neg: 12.9, sd2_neg: 13.6, sd1_5_neg: 14.1, median: 16.1 },
    { height: 104, sd3_neg: 13.0, sd2_neg: 13.7, sd1_5_neg: 14.2, median: 16.3 },
    { height: 104.5, sd3_neg: 13.1, sd2_neg: 13.8, sd1_5_neg: 14.4, median: 16.4 },
    { height: 105, sd3_neg: 13.2, sd2_neg: 13.9, sd1_5_neg: 14.5, median: 16.6 },
    { height: 105.5, sd3_neg: 13.3, sd2_neg: 14.0, sd1_5_neg: 14.6, median: 16.7 },
    { height: 106, sd3_neg: 13.4, sd2_neg: 14.2, sd1_5_neg: 14.8, median: 16.9 },
    { height: 106.5, sd3_neg: 13.5, sd2_neg: 14.3, sd1_5_neg: 14.9, median: 17.0 },
    { height: 107, sd3_neg: 13.7, sd2_neg: 14.4, sd1_5_neg: 15.0, median: 17.2 },
    { height: 107.5, sd3_neg: 13.8, sd2_neg: 14.5, sd1_5_neg: 15.2, median: 17.4 },
    { height: 108, sd3_neg: 13.9, sd2_neg: 14.7, sd1_5_neg: 15.3, median: 17.5 },
    { height: 108.5, sd3_neg: 14.0, sd2_neg: 14.8, sd1_5_neg: 15.5, median: 17.7 },
    { height: 109, sd3_neg: 14.1, sd2_neg: 14.9, sd1_5_neg: 15.6, median: 17.9 },
    { height: 109.5, sd3_neg: 14.3, sd2_neg: 15.1, sd1_5_neg: 15.8, median: 18.0 },
    { height: 110, sd3_neg: 14.4, sd2_neg: 15.2, sd1_5_neg: 15.9, median: 18.2 },
    { height: 110.5, sd3_neg: 14.5, sd2_neg: 15.3, sd1_5_neg: 16.1, median: 18.4 },
    { height: 111, sd3_neg: 14.6, sd2_neg: 15.5, sd1_5_neg: 16.2, median: 18.6 },
    { height: 111.5, sd3_neg: 14.8, sd2_neg: 15.6, sd1_5_neg: 16.4, median: 18.8 },
    { height: 112, sd3_neg: 14.9, sd2_neg: 15.8, sd1_5_neg: 16.5, median: 18.9 },
    { height: 112.5, sd3_neg: 15.0, sd2_neg: 15.9, sd1_5_neg: 16.7, median: 19.1 },
    { height: 113, sd3_neg: 15.2, sd2_neg: 16.1, sd1_5_neg: 16.8, median: 19.3 },
    { height: 113.5, sd3_neg: 15.3, sd2_neg: 16.2, sd1_5_neg: 17.0, median: 19.5 },
    { height: 114, sd3_neg: 15.4, sd2_neg: 16.3, sd1_5_neg: 17.1, median: 19.7 },
    { height: 114.5, sd3_neg: 15.6, sd2_neg: 16.5, sd1_5_neg: 17.3, median: 19.9 },
    { height: 115, sd3_neg: 15.7, sd2_neg: 16.6, sd1_5_neg: 17.4, median: 20.1 },
    { height: 115.5, sd3_neg: 15.8, sd2_neg: 16.8, sd1_5_neg: 17.6, median: 20.3 },
    { height: 116, sd3_neg: 16.0, sd2_neg: 16.9, sd1_5_neg: 17.8, median: 20.5 },
    { height: 116.5, sd3_neg: 16.1, sd2_neg: 17.1, sd1_5_neg: 17.9, median: 20.7 },
    { height: 117, sd3_neg: 16.2, sd2_neg: 17.2, sd1_5_neg: 18.1, median: 20.9 },
    { height: 117.5, sd3_neg: 16.4, sd2_neg: 17.4, sd1_5_neg: 18.3, median: 21.1 },
    { height: 118, sd3_neg: 16.5, sd2_neg: 17.5, sd1_5_neg: 18.4, median: 21.3 },
    { height: 118.5, sd3_neg: 16.7, sd2_neg: 17.7, sd1_5_neg: 18.6, median: 21.5 },
    { height: 119, sd3_neg: 16.8, sd2_neg: 17.8, sd1_5_neg: 18.8, median: 21.7 },
    { height: 119.5, sd3_neg: 16.9, sd2_neg: 18.0, sd1_5_neg: 18.9, median: 21.9 },
    { height: 120, sd3_neg: 17.1, sd2_neg: 18.1, sd1_5_neg: 19.1, median: 22.1 },
];
// #endregion Weight-for-Height Data



