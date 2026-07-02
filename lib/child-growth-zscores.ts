import { calculateHAZ, calculateWAZ, calculateWHZ } from "@/nutritrack/lib/health-utils";

type ChildSex = "female" | "male" | string;

const rounded = (value: number | null) =>
  value !== null && Number.isFinite(value) ? Number(value.toFixed(3)) : null;

export function completedAgeMonths(birthDate: string, measuredAt: string) {
  const birth = new Date(`${birthDate.slice(0, 10)}T12:00:00`);
  const measured = new Date(`${measuredAt.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(+birth) || Number.isNaN(+measured) || measured < birth) return null;
  let months = (measured.getFullYear() - birth.getFullYear()) * 12 + measured.getMonth() - birth.getMonth();
  if (measured.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function calculateNutriTrackZScores(input: {
  birthDate: string;
  measuredAt: string;
  sex: ChildSex;
  weightKg: number;
  heightCm: number;
}) {
  const ageMonths = completedAgeMonths(input.birthDate, input.measuredAt);
  const sex = input.sex === "male" ? "M" : input.sex === "female" ? "F" : null;
  if (ageMonths === null || !sex || ageMonths > 60 || input.weightKg <= 0 || input.heightCm <= 0) {
    return { ageMonths, weightForAgeZ: null, heightForAgeZ: null, weightForHeightZ: null };
  }

  // NutriTrack's WHO 2006 weight-for-height table covers 45-120 cm.
  const weightForHeightZ = input.heightCm >= 45 && input.heightCm <= 120
    ? calculateWHZ(input.weightKg, input.heightCm, sex)
    : null;

  return {
    ageMonths,
    weightForAgeZ: rounded(calculateWAZ(input.weightKg, ageMonths, sex)),
    heightForAgeZ: rounded(calculateHAZ(input.heightCm, ageMonths, sex)),
    weightForHeightZ: rounded(weightForHeightZ),
  };
}
