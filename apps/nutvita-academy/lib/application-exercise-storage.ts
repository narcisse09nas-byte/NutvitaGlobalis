import type { ExerciseSubmission } from "@/types/application-exercise";
const KEY="nutvita-application-exercise-submissions";
export function loadExerciseSubmissions():ExerciseSubmission[]{if(typeof window==="undefined")return[];try{return JSON.parse(localStorage.getItem(KEY)??"[]") as ExerciseSubmission[]}catch{return[]}}
export function saveExerciseSubmissions(items:ExerciseSubmission[]){if(typeof window!=="undefined"){localStorage.setItem(KEY,JSON.stringify(items));window.dispatchEvent(new Event("nutvita-exercises-updated"));}}
