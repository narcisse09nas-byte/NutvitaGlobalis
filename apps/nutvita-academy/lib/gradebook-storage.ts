import type { ManualGrade } from "@/types/gradebook";
const KEY = "nutvita-manual-grades";
export function loadManualGrades(): ManualGrade[] { if (typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as ManualGrade[]; } catch { return []; } }
export function saveManualGrades(grades: ManualGrade[]) { if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(grades)); }
