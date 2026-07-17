import type {
  QuizDefinition,
} from "@/types/quiz";

export const quizBank: QuizDefinition[] = [
  {
    id: "quiz-camms-module-1",
    slug: "camms-module-1",

    code: "CAMMS-M1",

    title:
      "Quiz — Introduction à la malnutrition aiguë",

    description:
      "Évaluez votre compréhension des concepts fondamentaux de la malnutrition aiguë, de la MAM, de la MAS et des œdèmes nutritionnels.",

    courseSlug: "camms",

    courseTitle:
      "Certified Acute Malnutrition Management Specialist",

    moduleSlug: "module-1",

    moduleTitle:
      "Qu’est-ce que la malnutrition aiguë ?",

    lessonId: "camms-m1-l4",

    lessonSlug: "quiz",

    durationMinutes: 10,

    passingScore: 70,

    maxAttempts: 3,

    questions: [
      {
        id: "camms-m1-q1",

        prompt:
          "Quelle affirmation définit le mieux la malnutrition aiguë ?",

        type: "single",

        options: [
          {
            id: "a",
            text:
              "Une perte de poids récente ou un faible poids par rapport à la taille.",
          },
          {
            id: "b",
            text:
              "Une taille insuffisante uniquement liée à l’âge.",
          },
          {
            id: "c",
            text:
              "Une maladie infectieuse sans déficit nutritionnel.",
          },
          {
            id: "d",
            text:
              "Une carence isolée en vitamine A.",
          },
        ],

        correctOptionIds: ["a"],

        explanation:
          "La malnutrition aiguë est principalement caractérisée par une perte de poids récente ou un faible poids par rapport à la taille.",

        points: 1,
      },

      {
        id: "camms-m1-q2",

        prompt:
          "Quels outils ou critères peuvent contribuer à identifier la malnutrition aiguë chez l’enfant ?",

        type: "multiple",

        options: [
          {
            id: "a",
            text: "Le périmètre brachial (PB/MUAC).",
          },
          {
            id: "b",
            text:
              "L’indice poids-pour-taille.",
          },
          {
            id: "c",
            text:
              "La recherche des œdèmes bilatéraux.",
          },
          {
            id: "d",
            text:
              "La couleur des cheveux uniquement.",
          },
        ],

        correctOptionIds: [
          "a",
          "b",
          "c",
        ],

        explanation:
          "Le PB/MUAC, l’indice poids-pour-taille et les œdèmes bilatéraux sont des critères importants d’évaluation de la malnutrition aiguë.",

        points: 1,
      },

      {
        id: "camms-m1-q3",

        prompt:
          "Que signifie l’abréviation MAS ?",

        type: "single",

        options: [
          {
            id: "a",
            text:
              "Malnutrition alimentaire simple.",
          },
          {
            id: "b",
            text:
              "Malnutrition aiguë sévère.",
          },
          {
            id: "c",
            text:
              "Mesure anthropométrique standard.",
          },
          {
            id: "d",
            text:
              "Maladie aiguë systémique.",
          },
        ],

        correctOptionIds: ["b"],

        explanation:
          "MAS signifie Malnutrition Aiguë Sévère.",

        points: 1,
      },

      {
        id: "camms-m1-q4",

        prompt:
          "La présence d’œdèmes bilatéraux des pieds peut indiquer :",

        type: "single",

        options: [
          {
            id: "a",
            text:
              "Une malnutrition aiguë sévère.",
          },
          {
            id: "b",
            text:
              "Une bonne hydratation.",
          },
          {
            id: "c",
            text:
              "Une croissance normale.",
          },
          {
            id: "d",
            text:
              "Une absence de risque nutritionnel.",
          },
        ],

        correctOptionIds: ["a"],

        explanation:
          "Les œdèmes nutritionnels bilatéraux constituent un signe de malnutrition aiguë sévère.",

        points: 1,
      },

      {
        id: "camms-m1-q5",

        prompt:
          "Quelle différence existe entre la MAM et la MAS ?",

        type: "single",

        options: [
          {
            id: "a",
            text:
              "La MAS correspond à une forme plus sévère que la MAM.",
          },
          {
            id: "b",
            text:
              "La MAM est toujours plus grave que la MAS.",
          },
          {
            id: "c",
            text:
              "Elles sont strictement identiques.",
          },
          {
            id: "d",
            text:
              "La MAS ne concerne jamais les enfants.",
          },
        ],

        correctOptionIds: ["a"],

        explanation:
          "La MAM correspond à la malnutrition aiguë modérée, tandis que la MAS est la forme sévère.",

        points: 1,
      },

      {
        id: "camms-m1-q6",

        prompt:
          "Pourquoi le dépistage précoce de la malnutrition aiguë est-il important ?",

        type: "multiple",

        options: [
          {
            id: "a",
            text:
              "Il facilite une prise en charge rapide.",
          },
          {
            id: "b",
            text:
              "Il réduit le risque de complications.",
          },
          {
            id: "c",
            text:
              "Il peut contribuer à réduire la mortalité.",
          },
          {
            id: "d",
            text:
              "Il remplace systématiquement tous les examens cliniques.",
          },
        ],

        correctOptionIds: [
          "a",
          "b",
          "c",
        ],

        explanation:
          "Le dépistage précoce améliore la rapidité de la prise en charge et réduit les risques de complications et de décès.",

        points: 1,
      },

      {
        id: "camms-m1-q7",

        prompt:
          "Le périmètre brachial est également appelé :",

        type: "single",

        options: [
          {
            id: "a",
            text: "MUAC.",
          },
          {
            id: "b",
            text: "IMC.",
          },
          {
            id: "c",
            text: "SMART.",
          },
          {
            id: "d",
            text: "OTP.",
          },
        ],

        correctOptionIds: ["a"],

        explanation:
          "MUAC signifie Mid-Upper Arm Circumference, correspondant au périmètre brachial.",

        points: 1,
      },

      {
        id: "camms-m1-q8",

        prompt:
          "La malnutrition aiguë peut affecter :",

        type: "single",

        options: [
          {
            id: "a",
            text:
              "Uniquement les nourrissons.",
          },
          {
            id: "b",
            text:
              "Uniquement les personnes âgées.",
          },
          {
            id: "c",
            text:
              "Les enfants et d’autres groupes vulnérables.",
          },
          {
            id: "d",
            text:
              "Uniquement les personnes hospitalisées.",
          },
        ],

        correctOptionIds: ["c"],

        explanation:
          "La malnutrition aiguë affecte particulièrement les jeunes enfants, mais peut aussi concerner d’autres groupes vulnérables.",

        points: 1,
      },

      {
        id: "camms-m1-q9",

        prompt:
          "La prise en charge de la malnutrition aiguë dépend notamment :",

        type: "multiple",

        options: [
          {
            id: "a",
            text:
              "De la sévérité de la malnutrition.",
          },
          {
            id: "b",
            text:
              "De la présence de complications.",
          },
          {
            id: "c",
            text:
              "De l’appétit de l’enfant.",
          },
          {
            id: "d",
            text:
              "Uniquement du lieu de résidence.",
          },
        ],

        correctOptionIds: [
          "a",
          "b",
          "c",
        ],

        explanation:
          "La sévérité, les complications médicales et le test de l’appétit orientent la prise en charge.",

        points: 1,
      },

      {
        id: "camms-m1-q10",

        prompt:
          "Quel est l’objectif principal d’un programme de prise en charge de la malnutrition aiguë ?",

        type: "single",

        options: [
          {
            id: "a",
            text:
              "Prévenir et traiter les complications afin de favoriser la récupération nutritionnelle.",
          },
          {
            id: "b",
            text:
              "Remplacer l’alimentation familiale de manière permanente.",
          },
          {
            id: "c",
            text:
              "Éviter toute participation communautaire.",
          },
          {
            id: "d",
            text:
              "Limiter le dépistage aux structures hospitalières.",
          },
        ],

        correctOptionIds: ["a"],

        explanation:
          "La prise en charge vise la récupération nutritionnelle, la prévention des complications et la réduction de la mortalité.",

        points: 1,
      },
    ],
  },
];

export function getQuizBySlug(
  quizSlug: string
): QuizDefinition | null {
  return (
    quizBank.find(
      (quiz) =>
        quiz.slug === quizSlug
    ) ?? null
  );
}