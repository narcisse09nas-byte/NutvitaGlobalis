import type {
  AcademyResource,
} from "@/types/resource";

export const resourceCatalog: AcademyResource[] = [
  {
    id: "camms-m1-summary",

    title:
      "Résumé du Module 1 — Malnutrition aiguë",

    description:
      "Synthèse des définitions, critères diagnostiques et principales formes de malnutrition aiguë.",

    type: "pdf",
    language: "fr",

    courseSlug: "camms",

    courseTitle:
      "Certified Acute Malnutrition Management Specialist",

    moduleSlug: "module-1",

    moduleTitle:
      "Qu’est-ce que la malnutrition aiguë ?",

    href:
      "/documents/camms/module-1-resume.pdf",

    fileSize: "1,2 MB",

    tags: [
      "malnutrition aiguë",
      "MAM",
      "MAS",
      "œdèmes",
    ],

    featured: true,

    publishedAt:
      "2026-01-10T00:00:00.000Z",
  },

  {
    id: "camms-muac-guide",

    title:
      "Guide pratique de mesure du PB/MUAC",

    description:
      "Procédure illustrée pour identifier le point médian du bras, positionner la bande et interpréter la mesure.",

    type: "guide",
    language: "bilingual",

    courseSlug: "camms",

    courseTitle:
      "Certified Acute Malnutrition Management Specialist",

    moduleSlug: "module-3",

    moduleTitle:
      "Dépistage communautaire",

    href:
      "/documents/camms/guide-muac.pdf",

    fileSize: "2,4 MB",

    tags: [
      "MUAC",
      "PB",
      "dépistage",
      "anthropométrie",
    ],

    featured: true,

    publishedAt:
      "2026-01-12T00:00:00.000Z",
  },

  {
    id: "camms-oedema-checklist",

    title:
      "Checklist — Recherche des œdèmes bilatéraux",

    description:
      "Liste de contrôle rapide pour standardiser la recherche et la classification des œdèmes nutritionnels.",

    type: "checklist",
    language: "fr",

    courseSlug: "camms",

    courseTitle:
      "Certified Acute Malnutrition Management Specialist",

    moduleSlug: "module-3",

    moduleTitle:
      "Dépistage communautaire",

    href:
      "/documents/camms/checklist-oedemes.pdf",

    fileSize: "520 KB",

    tags: [
      "œdèmes",
      "MAS",
      "dépistage",
    ],

    featured: false,

    publishedAt:
      "2026-01-15T00:00:00.000Z",
  },

  {
    id: "camms-classification-slides",

    title:
      "Présentation — Classification nutritionnelle",

    description:
      "Diaporama pédagogique sur le PB, le poids-pour-taille, les œdèmes et la classification MAM/MAS.",

    type: "presentation",
    language: "bilingual",

    courseSlug: "camms",

    courseTitle:
      "Certified Acute Malnutrition Management Specialist",

    moduleSlug: "module-4",

    moduleTitle:
      "Anthropométrie et classification nutritionnelle",

    href:
      "/documents/camms/classification-nutritionnelle.pdf",

    fileSize: "4,8 MB",

    tags: [
      "classification",
      "anthropométrie",
      "poids-taille",
    ],

    featured: true,

    publishedAt:
      "2026-01-20T00:00:00.000Z",
  },

  {
    id: "camms-protocol-reference",

    title:
      "Protocole de prise en charge de la malnutrition aiguë",

    description:
      "Document de référence pour l’admission, la prise en charge, le suivi et la sortie des bénéficiaires.",

    type: "protocol",
    language: "fr",

    courseSlug: "camms",

    courseTitle:
      "Certified Acute Malnutrition Management Specialist",

    href:
      "/documents/camms/protocole-prise-en-charge.pdf",

    fileSize: "6,3 MB",

    tags: [
      "CMAM",
      "PCMA",
      "ambulatoire",
      "stabilisation",
    ],

    featured: true,

    publishedAt:
      "2026-01-25T00:00:00.000Z",
  },

  {
    id: "camms-screening-video",

    title:
      "Vidéo pratique — Dépistage communautaire",

    description:
      "Démonstration de l’organisation d’une séance de dépistage au niveau communautaire.",

    type: "video",
    language: "fr",

    courseSlug: "camms",

    courseTitle:
      "Certified Acute Malnutrition Management Specialist",

    moduleSlug: "module-3",

    moduleTitle:
      "Dépistage communautaire",

    href:
      "/videos/camms/community-screening.mp4",

    durationMinutes: 18,

    tags: [
      "communauté",
      "dépistage",
      "référence",
    ],

    featured: false,

    publishedAt:
      "2026-02-01T00:00:00.000Z",
  },

  {
    id: "smart-survey-introduction",

    title:
      "Introduction aux enquêtes SMART",

    description:
      "Présentation des principes méthodologiques, du plan d’échantillonnage et des principaux indicateurs SMART.",

    type: "guide",
    language: "bilingual",

    courseSlug: "smart-survey",

    courseTitle:
      "Certified SMART Survey Specialist",

    href:
      "/documents/smart/introduction-smart.pdf",

    fileSize: "3,1 MB",

    tags: [
      "SMART",
      "enquête",
      "échantillonnage",
    ],

    featured: true,

    publishedAt:
      "2026-02-10T00:00:00.000Z",
  },

  {
    id: "clinical-assessment-sheet",

    title:
      "Fiche d’évaluation nutritionnelle clinique",

    description:
      "Modèle de collecte des paramètres anthropométriques, cliniques, alimentaires et biologiques.",

    type: "checklist",
    language: "fr",

    courseSlug: "clinical-nutrition",

    courseTitle:
      "Certified Clinical Nutrition Specialist",

    href:
      "/documents/clinical/fiche-evaluation.pdf",

    fileSize: "860 KB",

    tags: [
      "nutrition clinique",
      "évaluation",
      "consultation",
    ],

    featured: false,

    publishedAt:
      "2026-02-15T00:00:00.000Z",
  },
];

export function getResourceById(
  resourceId: string
): AcademyResource | null {
  return (
    resourceCatalog.find(
      (resource) =>
        resource.id === resourceId
    ) ?? null
  );
}