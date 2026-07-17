import type { AcademyCourse } from "@/types/course";

export const localCourses: AcademyCourse[] = [
  {
    id: "course-camms",
    slug: "camms",
    code: "CAMMS",
    title:
      "Certified Acute Malnutrition Management Specialist",
    titleFr:
      "Spécialiste certifié en prise en charge communautaire de la malnutrition aiguë",
    description:
      "Certification professionnelle consacrée au dépistage, à la classification, à la référence, à la prise en charge et au suivi de la malnutrition aiguë.",
    category: "Nutrition d’urgence",
    level: "Avancé",
    language: "Français et anglais",
    priceUsd: 100,
    durationHours: 60,
    progress: 12,
    enrolled: true,
    featured: true,

    modules: [
      {
        id: "camms-module-1",
        slug: "module-1",
        number: 1,
        title:
          "Qu’est-ce que la malnutrition aiguë ?",
        titleEn:
          "What is acute malnutrition?",
        description:
          "Concepts fondamentaux, formes cliniques, critères d’identification et importance en santé publique.",
        estimatedMinutes: 55,

        lessons: [
          {
            id: "camms-m1-l1",
            slug: "introduction",
            title: "Introduction au module",
            titleEn: "Module introduction",
            description:
              "Présentation du module et de ses objectifs pédagogiques.",
            type: "video",
            durationMinutes: 8,
            status: "available",
          },
          {
            id: "camms-m1-l2",
            slug: "definition",
            title:
              "Définition de la malnutrition aiguë",
            titleEn:
              "Definition of acute malnutrition",
            description:
              "Comprendre les concepts de wasting, MAM, MAS et œdèmes nutritionnels.",
            type: "video",
            durationMinutes: 18,
            status: "available",
          },
          {
            id: "camms-m1-l3",
            slug: "resume",
            title: "Résumé et points clés",
            titleEn:
              "Summary and key messages",
            description:
              "Synthèse des principaux éléments du module.",
            type: "reading",
            durationMinutes: 10,
            status: "available",
          },
          {
            id: "camms-m1-l4",
            slug: "quiz",
            title: "Quiz du Module 1",
            titleEn: "Module 1 quiz",
            description:
              "Évaluation rapide des connaissances acquises.",
            type: "quiz",
            durationMinutes: 15,
            status: "available",
          },
        ],
      },

      {
        id: "camms-module-2",
        slug: "module-2",
        number: 2,
        title:
          "Causes et conséquences de la malnutrition aiguë",
        titleEn:
          "Causes and consequences of acute malnutrition",
        description:
          "Causes immédiates, sous-jacentes et fondamentales ainsi que les conséquences sanitaires.",
        estimatedMinutes: 65,

        lessons: [
          {
            id: "camms-m2-l1",
            slug: "causes-immediates",
            title: "Causes immédiates",
            titleEn: "Immediate causes",
            description:
              "Apports alimentaires insuffisants et maladies.",
            type: "video",
            durationMinutes: 20,
            status: "available",
          },
          {
            id: "camms-m2-l2",
            slug: "causes-sous-jacentes",
            title: "Causes sous-jacentes",
            titleEn: "Underlying causes",
            description:
              "Insécurité alimentaire, soins inadéquats et environnement sanitaire.",
            type: "reading",
            durationMinutes: 15,
            status: "available",
          },
          {
            id: "camms-m2-l3",
            slug: "cas-pratique",
            title: "Étude de cas",
            titleEn: "Case study",
            description:
              "Analyse d’un cas communautaire de malnutrition aiguë.",
            type: "case-study",
            durationMinutes: 20,
            status: "available",
          },
          {
            id: "camms-m2-l4",
            slug: "quiz",
            title: "Quiz du Module 2",
            titleEn: "Module 2 quiz",
            description:
              "Évaluation des connaissances du Module 2.",
            type: "quiz",
            durationMinutes: 10,
            status: "locked",
          },
        ],
      },

      {
        id: "camms-module-3",
        slug: "module-3",
        number: 3,
        title: "Dépistage communautaire",
        titleEn: "Community screening",
        description:
          "Organisation du dépistage, mesure du PB/MUAC et recherche des œdèmes bilatéraux.",
        estimatedMinutes: 70,

        lessons: [
          {
            id: "camms-m3-l1",
            slug: "organisation-depistage",
            title:
              "Organisation du dépistage communautaire",
            titleEn:
              "Community screening organization",
            description:
              "Planification, mobilisation communautaire et orientation.",
            type: "video",
            durationMinutes: 25,
            status: "locked",
          },
          {
            id: "camms-m3-l2",
            slug: "mesure-muac",
            title: "Mesure du PB/MUAC",
            titleEn: "MUAC measurement",
            description:
              "Technique correcte de mesure et interprétation.",
            type: "video",
            durationMinutes: 25,
            status: "locked",
          },
          {
            id: "camms-m3-l3",
            slug: "oedemes",
            title:
              "Recherche des œdèmes nutritionnels",
            titleEn:
              "Assessment of nutritional oedema",
            description:
              "Technique de recherche et classification.",
            type: "video",
            durationMinutes: 20,
            status: "locked",
          },
        ],
      },

      {
        id: "camms-module-4",
        slug: "module-4",
        number: 4,
        title:
          "Anthropométrie et classification nutritionnelle",
        titleEn:
          "Anthropometry and nutritional classification",
        description:
          "Poids, taille, indice poids-taille, PB/MUAC et classification MAM/MAS.",
        estimatedMinutes: 80,
        lessons: [],
      },
    ],
  },

  {
    id: "course-smart",
    slug: "smart-survey",
    code: "CSSS",
    title:
      "Certified SMART Survey Specialist",
    titleFr:
      "Spécialiste certifié des enquêtes nutritionnelles SMART",
    description:
      "Formation professionnelle sur la conception, la mise en œuvre, l’analyse et le rapportage des enquêtes SMART.",
    category: "Enquêtes et données",
    level: "Avancé",
    language: "Français et anglais",
    priceUsd: 100,
    durationHours: 50,
    progress: 0,
    enrolled: false,
    featured: true,
    modules: [],
  },

  {
    id: "course-clinical",
    slug: "clinical-nutrition",
    code: "CCNS",
    title:
      "Certified Clinical Nutrition Specialist",
    titleFr:
      "Spécialiste certifié en nutrition clinique",
    description:
      "Nutrition clinique, évaluation nutritionnelle, maladies chroniques et prise en charge personnalisée.",
    category: "Nutrition clinique",
    level: "Professionnel",
    language: "Français et anglais",
    priceUsd: 100,
    durationHours: 45,
    progress: 0,
    enrolled: false,
    featured: true,
    modules: [],
  },
];
