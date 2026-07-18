import type { QuizAttempt } from "@/types/quiz";
import type { ExamAttempt } from "@/types/exam";
import type { ExerciseSubmission } from "@/types/application-exercise";
export type FinalGrade={quizScore:number;exerciseScore:number|null;examScore:number;quizWeight:number;exerciseWeight:number;examWeight:number;finalScore:number;passed:boolean};
export function calculateFinalGrade(input:{courseSlug:string;quizSlugs:string[];quizAttempts:QuizAttempt[];examSlug:string;examAttempts:ExamAttempt[];exercisesCount:number;submissions:ExerciseSubmission[]}):FinalGrade{
 const quizScores=input.quizSlugs.map(slug=>input.quizAttempts.filter(a=>a.quizSlug===slug).reduce((best,a)=>Math.max(best,a.scorePercent),0));
 const quizScore=quizScores.length?quizScores.reduce((a,b)=>a+b,0)/quizScores.length:0;
 const graded=input.submissions.filter(s=>s.courseSlug===input.courseSlug&&s.scorePercent!==undefined);
 const exerciseScore=graded.length?graded.reduce((sum,s)=>sum+(s.scorePercent??0),0)/graded.length:null;
 const examScore=input.examAttempts.filter(a=>a.examSlug===input.examSlug&&a.resultVisibility!=="pending_review").reduce((best,a)=>Math.max(best,a.scorePercent),0);
 const hasExercise=input.exercisesCount>0,quizWeight=hasExercise?25:40,exerciseWeight=hasExercise?15:0,examWeight=60;
 const finalScore=Math.round((quizScore*quizWeight+(exerciseScore??0)*exerciseWeight+examScore*examWeight)/100);
 return{quizScore:Math.round(quizScore),exerciseScore:exerciseScore===null?null:Math.round(exerciseScore),examScore,quizWeight,exerciseWeight,examWeight,finalScore,passed:finalScore>=70};
}
