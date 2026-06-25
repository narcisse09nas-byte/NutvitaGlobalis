// This data is derived from the WHO Child Growth Standards for Weight-for-length/height.
// URL: https://www.who.int/tools/child-growth-standards/standards/weight-for-length-height

// LMS parameters are used for the calculation of z-scores:
// Z = (((value / M)**L) - 1) / (L * S)

const wflGirls: Record<string, { l: number; m: number; s: number }> = {
    '45.0': { l: -0.3833, m: 2.4607, s: 0.09029 },
    '45.5': { l: -0.3833, m: 2.5457, s: 0.09033 },
    '46.0': { l: -0.3833, m: 2.6306, s: 0.09037 },
    '46.5': { l: -0.3833, m: 2.7155, s: 0.09040 },
    '47.0': { l: -0.3833, m: 2.8007, s: 0.09044 },
    '47.5': { l: -0.3833, m: 2.8867, s: 0.09048 },
    '48.0': { l: -0.3833, m: 2.9741, s: 0.09052 },
    '48.5': { l: -0.3833, m: 3.0636, s: 0.09056 },
    '49.0': { l: -0.3833, m: 3.1560, s: 0.09060 },
    '49.5': { l: -0.3833, m: 3.2520, s: 0.09064 },
    '50.0': { l: -0.3833, m: 3.3518, s: 0.09068 },
    '50.5': { l: -0.3833, m: 3.4557, s: 0.09072 },
    '51.0': { l: -0.3833, m: 3.5636, s: 0.09076 },
    '51.5': { l: -0.3833, m: 3.6754, s: 0.09080 },
    '52.0': { l: -0.3833, m: 3.7911, s: 0.09085 },
    '52.5': { l: -0.3833, m: 3.9105, s: 0.09089 },
    '53.0': { l: -0.3833, m: 4.0332, s: 0.09093 },
    '53.5': { l: -0.3833, m: 4.1591, s: 0.09098 },
    '54.0': { l: -0.3833, m: 4.2875, s: 0.09102 },
    '54.5': { l: -0.3833, m: 4.4179, s: 0.09106 },
    '55.0': { l: -0.3833, m: 4.5498, s: 0.09110 },
    '55.5': { l: -0.3833, m: 4.6827, s: 0.09114 },
    '56.0': { l: -0.3833, m: 4.8162, s: 0.09118 },
    '56.5': { l: -0.3833, m: 4.9500, s: 0.09121 },
    '57.0': { l: -0.3833, m: 5.0838, s: 0.09125 },
    '57.5': { l: -0.3833, m: 5.2173, s: 0.09128 },
    '58.0': { l: -0.3833, m: 5.3505, s: 0.09131 },
    '58.5': { l: -0.3833, m: 5.4831, s: 0.09134 },
    '59.0': { l: -0.3833, m: 5.6151, s: 0.09137 },
    '59.5': { l: -0.3833, m: 5.7466, s: 0.09140 },
    '60.0': { l: -0.3833, m: 5.8773, s: 0.09143 },
    '60.5': { l: -0.3833, m: 6.0075, s: 0.09146 },
    '61.0': { l: -0.3833, m: 6.1369, s: 0.09150 },
    '61.5': { l: -0.3833, m: 6.2657, s: 0.09153 },
    '62.0': { l: -0.3833, m: 6.3938, s: 0.09157 },
    '62.5': { l: -0.3833, m: 6.5213, s: 0.09161 },
    '63.0': { l: -0.3833, m: 6.6481, s: 0.09165 },
    '63.5': { l: -0.3833, m: 6.7744, s: 0.09169 },
    '64.0': { l: -0.3833, m: 6.9000, s: 0.09173 },
    '64.5': { l: -0.3833, m: 7.0250, s: 0.09178 },
    '65.0': { l: -0.3833, m: 7.1495, s: 0.09184 },
};

const wflBoys: Record<string, { l: number; m: number; s: number }> = {
    '45.0': { l: -0.3155, m: 2.4045, s: 0.08985 },
    '45.5': { l: -0.3155, m: 2.4842, s: 0.08989 },
    '46.0': { l: -0.3155, m: 2.5640, s: 0.08994 },
    '46.5': { l: -0.3155, m: 2.6439, s: 0.08998 },
    '47.0': { l: -0.3155, m: 2.7243, s: 0.09002 },
    '47.5': { l: -0.3155, m: 2.8055, s: 0.09007 },
    '48.0': { l: -0.3155, m: 2.8880, s: 0.09011 },
    '48.5': { l: -0.3155, m: 2.9721, s: 0.09016 },
    '49.0': { l: -0.3155, m: 3.0583, s: 0.09021 },
    '49.5': { l: -0.3155, m: 3.1471, s: 0.09026 },
    '50.0': { l: -0.3155, m: 3.2389, s: 0.09031 },
    '50.5': { l: -0.3155, m: 3.3342, s: 0.09036 },
    '51.0': { l: -0.3155, m: 3.4332, s: 0.09042 },
    '51.5': { l: -0.3155, m: 3.5361, s: 0.09048 },
    '52.0': { l: -0.3155, m: 3.6429, s: 0.09054 },
    '52.5': { l: -0.3155, m: 3.7533, s: 0.09060 },
    '53.0': { l: -0.3155, m: 3.8672, s: 0.09066 },
    '53.5': { l: -0.3155, m: 3.9841, s: 0.09072 },
    '54.0': { l: -0.3155, m: 4.1037, s: 0.09078 },
    '54.5': { l: -0.3155, m: 4.2255, s: 0.09084 },
    '55.0': { l: -0.3155, m: 4.3490, s: 0.09090 },
    '55.5': { l: -0.3155, m: 4.4740, s: 0.09097 },
    '56.0': { l: -0.3155, m: 4.6000, s: 0.09103 },
    '56.5': { l: -0.3155, m: 4.7266, s: 0.09109 },
    '57.0': { l: -0.3155, m: 4.8536, s: 0.09115 },
    '57.5': { l: -0.3155, m: 4.9807, s: 0.09121 },
    '58.0': { l: -0.3155, m: 5.1077, s: 0.09127 },
    '58.5': { l: -0.3155, m: 5.2346, s: 0.09133 },
    '59.0': { l: -0.3155, m: 5.3611, s: 0.09139 },
    '59.5': { l: -0.3155, m: 5.4872, s: 0.09145 },
    '60.0': { l: -0.3155, m: 5.6128, s: 0.09151 },
    '60.5': { l: -0.3155, m: 5.7378, s: 0.09158 },
    '61.0': { l: -0.3155, m: 5.8622, s: 0.09165 },
    '61.5': { l: -0.3155, m: 5.9860, s: 0.09171 },
    '62.0': { l: -0.3155, m: 6.1092, s: 0.09178 },
    '62.5': { l: -0.3155, m: 6.2318, s: 0.09185 },
    '63.0': { l: -0.3155, m: 6.3538, s: 0.09192 },
    '63.5': { l: -0.3155, m: 6.4752, s: 0.09199 },
    '64.0': { l: -0.3155, m: 6.5961, s: 0.09206 },
    '64.5': { l: -0.3155, m: 6.7165, s: 0.09213 },
    '65.0': { l: -0.3155, m: 6.8362, s: 0.09220 },
};

// Length-for-age Girls, 0-24 months. Data is by completed month.
const lfaGirlsMonths: Record<string, { l: number; m: number; s: number }> = {
    '0': { l: 1, m: 49.1, s: 0.0379 }, '1': { l: 1, m: 53.7, s: 0.0369 },
    '2': { l: 1, m: 57.1, s: 0.036 }, '3': { l: 1, m: 59.8, s: 0.0353 },
    '4': { l: 1, m: 62.1, s: 0.0347 }, '5': { l: 1, m: 64.0, s: 0.0342 },
    '6': { l: 1, m: 65.7, s: 0.0338 }, '7': { l: 1, m: 67.3, s: 0.0334 },
    '8': { l: 1, m: 68.7, s: 0.0331 }, '9': { l: 1, m: 70.1, s: 0.0328 },
    '10': { l: 1, m: 71.5, s: 0.0325 }, '11': { l: 1, m: 72.8, s: 0.0322 },
    '12': { l: 1, m: 74.0, s: 0.032 }, '13': { l: 1, m: 75.2, s: 0.0318 },
    '14': { l: 1, m: 76.4, s: 0.0316 }, '15': { l: 1, m: 77.5, s: 0.0314 },
    '16': { l: 1, m: 78.6, s: 0.0312 }, '17': { l: 1, m: 79.7, s: 0.0311 },
    '18': { l: 1, m: 80.7, s: 0.0309 }, '19': { l: 1, m: 81.7, s: 0.0308 },
    '20': { l: 1, m: 82.7, s: 0.0307 }, '21': { l: 1, m: 83.7, s: 0.0306 },
    '22': { l: 1, m: 84.6, s: 0.0305 }, '23': { l: 1, m: 85.5, s: 0.0304 },
    '24': { l: 1, m: 86.4, s: 0.0303 },
};

// Length-for-age Boys, 0-24 months. Data is by completed month.
const lfaBoysMonths: Record<string, { l: number; m: number; s: number }> = {
    '0': { l: 1, m: 49.9, s: 0.0378 }, '1': { l: 1, m: 54.7, s: 0.0368 },
    '2': { l: 1, m: 58.4, s: 0.0359 }, '3': { l: 1, m: 61.4, s: 0.0351 },
    '4': { l: 1, m: 63.9, s: 0.0345 }, '5': { l: 1, m: 65.9, s: 0.0339 },
    '6': { l: 1, m: 67.6, s: 0.0334 }, '7': { l: 1, m: 69.2, s: 0.033 },
    '8': { l: 1, m: 70.6, s: 0.0326 }, '9': { l: 1, m: 72.0, s: 0.0322 },
    '10': { l: 1, m: 73.3, s: 0.0319 }, '11': { l: 1, m: 74.5, s: 0.0316 },
    '12': { l: 1, m: 75.7, s: 0.0313 }, '13': { l: 1, m: 76.9, s: 0.0311 },
    '14': { l: 1, m: 78.0, s: 0.0308 }, '15': { l: 1, m: 79.1, s: 0.0306 },
    '16': { l: 1, m: 80.2, s: 0.0304 }, '17': { l: 1, m: 81.2, s: 0.0302 },
    '18': { l: 1, m: 82.3, s: 0.03 }, '19': { l: 1, m: 83.2, s: 0.0298 },
    '20': { l: 1, m: 84.2, s: 0.0297 }, '21': { l: 1, m: 85.1, s: 0.0295 },
    '22': { l: 1, m: 86.0, s: 0.0294 }, '23': { l: 1, m: 86.9, s: 0.0292 },
    '24': { l: 1, m: 87.8, s: 0.0291 },
};

// Weight-for-age Girls, 0-60 months by completed month
const wfaGirlsMonths: Record<string, { l: number; m: number; s: number }> = {
    '0': { l: -0.3809, m: 3.2322, s: 0.14171 }, '1': { l: -0.2227, m: 4.1942, s: 0.1332 },
    '2': { l: -0.1197, m: 5.1002, s: 0.1264 }, '3': { l: -0.0528, m: 5.8115, s: 0.12176 },
    '4': { l: -0.0075, m: 6.4022, s: 0.11846 }, '5': { l: 0.0242, m: 6.9116, s: 0.11604 },
    '6': { l: 0.0475, m: 7.362, s: 0.11425 }, '7': { l: 0.0653, m: 7.7659, s: 0.11289 },
    '8': { l: 0.0792, m: 8.1319, s: 0.11186 }, '9': { l: 0.0903, m: 8.4659, s: 0.11107 },
    '10': { l: 0.1, m: 8.7729, s: 0.11045 }, '11': { l: 0.1082, m: 9.0565, s: 0.10996 },
    '12': { l: 0.1152, m: 9.32, s: 0.10956 }, '24': { l: 0.0945, m: 12.2136, s: 0.11146 },
    '36': { l: 0.0526, m: 14.3323, s: 0.11663 }, '48': { l: 0.0135, m: 16.1492, s: 0.12204 },
    '60': { l: -0.0159, m: 17.7495, s: 0.12702 }
};

// Weight-for-age Boys, 0-60 months by completed month
const wfaBoysMonths: Record<string, { l: number; m: number; s: number }> = {
    '0': { l: -0.3155, m: 3.3283, s: 0.14582 }, '1': { l: -0.1706, m: 4.4101, s: 0.13437 },
    '2': { l: -0.0768, m: 5.4608, s: 0.1264 }, '3': { l: -0.02, m: 6.2941, s: 0.12064 },
    '4': { l: 0.021, m: 6.9657, s: 0.11661 }, '5': { l: 0.0519, m: 7.525, s: 0.11379 },
    '6': { l: 0.0759, m: 8.0016, s: 0.11181 }, '7': { l: 0.0949, m: 8.416, s: 0.11041 },
    '8': { l: 0.11, m: 8.783, s: 0.10942 }, '9': { l: 0.122, m: 9.112, s: 0.10873 },
    '10': { l: 0.1317, m: 9.4092, s: 0.10825 }, '11': { l: 0.1396, m: 9.68, s: 0.10792 },
    '12': { l: 0.1461, m: 9.9281, s: 0.10771 }, '24': { l: 0.1274, m: 12.5937, s: 0.11059 },
    '36': { l: 0.0899, m: 14.6806, s: 0.11624 }, '48': { l: 0.0505, m: 16.4952, s: 0.12169 },
    '60': { l: 0.0163, m: 18.1189, s: 0.12642 }
};


function getLmsValues(height: number, sex: 'male' | 'female'): { l: number; m: number; s: number } | null {
    const table = sex === 'male' ? wflBoys : wflGirls;
    const heightCm = height;

    const exactMatch = table[heightCm.toFixed(1)];
    if (exactMatch) {
        return exactMatch;
    }

    const lowerHeight = Math.floor(heightCm * 2) / 2;
    const upperHeight = lowerHeight + 0.5;

    const lower = table[lowerHeight.toFixed(1)];
    const upper = table[upperHeight.toFixed(1)];

    if (!lower || !upper) {
        return null; // Height is out of the table's range
    }

    // Linear interpolation
    const ratio = (heightCm - lowerHeight) / (upperHeight - lowerHeight);
    
    const l = lower.l + (upper.l - lower.l) * ratio;
    const m = lower.m + (upper.m - lower.m) * ratio;
    const s = lower.s + (upper.s - lower.s) * ratio;

    return { l, m, s };
}

export function calculateWFLzScore(height: number, weight: number, sexValue: any): number | null {
  const sex = String(sexValue).toLowerCase();
  const normalizedSex = ['1', 'm', 'male'].includes(sex) ? 'male' : ['2', 'f', 'female'].includes(sex) ? 'female' : null;

  if (!normalizedSex || !isFinite(height) || !isFinite(weight) || height <= 0 || weight <= 0) {
    return null;
  }

  const lms = getLmsValues(height, normalizedSex);
  if (!lms) {
    return null;
  }
  
  const { l, m, s } = lms;

  if (l !== 0) {
    const z = (Math.pow(weight / m, l) - 1) / (l * s);
    return z;
  } else {
    // When L is 0, the formula simplifies to avoid division by zero
    const z = Math.log(weight / m) / s;
    return z;
  }
}

export function classifyWFLzScore(zScore: number | null): string {
    if (zScore === null) return 'N/A';
    if (zScore < -3) return 'Sévère (MAS)';
    if (zScore >= -3 && zScore < -2) return 'Modérée (MAM)';
    if (zScore >= -2 && zScore < -1.5) return 'À Risque';
    if (zScore > 3) return 'Obésité';
    if (zScore > 2) return 'Surpoids';
    return 'Normal';
}

export function calculateLFAzScore(ageInMonths: number, length: number, sexValue: any): number | null {
  const sex = String(sexValue).toLowerCase();
  const normalizedSex = ['1', 'm', 'male'].includes(sex) ? 'male' : ['2', 'f', 'female'].includes(sex) ? 'female' : null;

  if (!normalizedSex || !isFinite(ageInMonths) || !isFinite(length) || ageInMonths < 0 || length <= 0) {
    return null;
  }
  
  const roundedMonths = Math.floor(ageInMonths);

  if (roundedMonths < 0 || roundedMonths > 24) {
      return null; // Data is only available for 0-24 months
  }

  const table = normalizedSex === 'male' ? lfaBoysMonths : lfaGirlsMonths;
  const lms = table[roundedMonths.toString()];

  if (!lms) {
    return null; // Should not happen if range is checked, but as a safeguard.
  }
  
  const { l, m, s } = lms;

  if (l !== 0) {
    const z = (Math.pow(length / m, l) - 1) / (l * s);
    return z;
  } else {
    // When L is 0, the formula simplifies
    const z = Math.log(length / m) / s;
    return z;
  }
}

export function classifyLFAzScore(zScore: number | null): string {
    if (zScore === null) return 'N/A';
    if (zScore < -3) return 'Retard de croissance sévère';
    if (zScore < -2) return 'Retard de croissance';
    return 'Normal';
}

export function calculateWFAzScore(ageInMonths: number, weight: number, sexValue: any): number | null {
    const sex = String(sexValue).toLowerCase();
    const normalizedSex = ['1', 'm', 'male'].includes(sex) ? 'male' : ['2', 'f', 'female'].includes(sex) ? 'female' : null;
  
    if (!normalizedSex || !isFinite(ageInMonths) || !isFinite(weight) || ageInMonths < 0 || weight <= 0) {
      return null;
    }
    
    const roundedMonths = Math.floor(ageInMonths);
  
    if (roundedMonths < 0 || roundedMonths > 60) {
        return null;
    }
  
    const table = normalizedSex === 'male' ? wfaBoysMonths : wfaGirlsMonths;
    const lms = table[roundedMonths.toString()];
  
    if (!lms) {
      // Could add interpolation here for more accuracy between months if needed
      return null;
    }
    
    const { l, m, s } = lms;
  
    if (l !== 0) {
      const z = (Math.pow(weight / m, l) - 1) / (l * s);
      return z;
    } else {
      const z = Math.log(weight / m) / s;
      return z;
    }
  }
  
  export function classifyWFAzScore(zScore: number | null): string {
      if (zScore === null) return 'N/A';
      if (zScore < -3) return 'Insuffisance pondérale sévère';
      if (zScore < -2) return 'Insuffisance pondérale';
      return 'Normal';
  }
  
  
  
