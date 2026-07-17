import type {
  ExamDefinition,
} from "@/types/exam";
import { CERTIFICATION_EXAM_BLUEPRINT, CERTIFICATION_RETAKE_DELAYS } from "@/lib/exam-engine";

export const examDefinitions: ExamDefinition[] = [
  {
    id: "exam-camms-final",
    slug: "camms-final",
    code: "CAMMS-FINAL",

    title:
      "Examen final certifiant CAMMS",

    description:
      "Évaluation finale des compétences en malnutrition aiguë, anthropométrie, dépistage, prise en charge clinique, CMAM et suivi des programmes.",

    courseSlug: "camms",

    courseTitle:
      "Certified Acute Malnutrition Management Specialist",

    durationMinutes: 180,
    passingScore: 70,
    maxAttempts: 3,
    blueprint: CERTIFICATION_EXAM_BLUEPRINT,
    retakeDelayDays: CERTIFICATION_RETAKE_DELAYS,

    domainRules: [
      {
        domain: "fundamentals",
        numberOfQuestions: 2,
      },
      {
        domain: "anthropometry",
        numberOfQuestions: 3,
      },
      {
        domain: "screening",
        numberOfQuestions: 2,
      },
      {
        domain: "clinical",
        numberOfQuestions: 2,
      },
      {
        domain: "cmam",
        numberOfQuestions: 3,
      },
      {
        domain: "monitoring",
        numberOfQuestions: 2,
      },
    ],

    shuffleQuestions: true,
    shuffleOptions: true,

    maxFocusViolations: 5,
    autosaveIntervalSeconds: 10,
  },
];

export function getExamDefinitionBySlug(
  examSlug: string
): ExamDefinition | null {
  return (
    examDefinitions.find(
      (exam) =>
        exam.slug === examSlug
    ) ?? null
  );
}
