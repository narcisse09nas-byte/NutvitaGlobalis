import type { LessonMedia } from "@/types/video";

export const lessonMediaCatalog: LessonMedia[] = [
  {
    courseSlug: "camms",
    moduleSlug: "module-1",
    lessonSlug: "introduction",
    title: "Introduction au module",

    /*
      Placez votre vidéo ici :

      public/videos/camms/module-1-introduction.mp4

      Puis le chemin ci-dessous fonctionnera automatiquement.
    */
    videoUrl:
      "/videos/camms/module-1-introduction.mp4",

    posterUrl:
      "/images/courses/camms-module-1-poster.jpg",

    transcript: [
      {
        id: "intro-1",
        startSeconds: 0,
        endSeconds: 35,
        text:
          "Bienvenue dans ce premier module consacré à la malnutrition aiguë.",
      },
      {
        id: "intro-2",
        startSeconds: 35,
        endSeconds: 95,
        text:
          "Nous commencerons par définir la malnutrition aiguë et ses principales formes.",
      },
      {
        id: "intro-3",
        startSeconds: 95,
        endSeconds: 180,
        text:
          "Nous aborderons ensuite la malnutrition aiguë modérée, la malnutrition aiguë sévère et les œdèmes nutritionnels.",
      },
      {
        id: "intro-4",
        startSeconds: 180,
        endSeconds: 300,
        text:
          "À la fin du module, vous serez capable d’expliquer les principaux critères d’identification.",
      },
    ],

    resources: [
      {
        id: "resource-1",
        title: "Résumé du Module 1",
        description:
          "Document de synthèse sur la malnutrition aiguë.",
        href: "/documents/camms/module-1-resume.pdf",
        type: "pdf",
      },
      {
        id: "resource-2",
        title: "Références essentielles",
        description:
          "Liste des directives et documents de référence.",
        href: "/documents/camms/module-1-references.pdf",
        type: "document",
      },
    ],
  },

  {
    courseSlug: "camms",
    moduleSlug: "module-1",
    lessonSlug: "definition",
    title: "Définition de la malnutrition aiguë",

    videoUrl:
      "/videos/camms/module-1-definition.mp4",

    posterUrl:
      "/images/courses/camms-definition-poster.jpg",

    transcript: [
      {
        id: "definition-1",
        startSeconds: 0,
        endSeconds: 60,
        text:
          "La malnutrition aiguë est caractérisée par une perte de poids récente ou un déficit du poids par rapport à la taille.",
      },
      {
        id: "definition-2",
        startSeconds: 60,
        endSeconds: 150,
        text:
          "Elle peut être identifiée au moyen du rapport poids-taille, du périmètre brachial ou de la présence d’œdèmes nutritionnels.",
      },
      {
        id: "definition-3",
        startSeconds: 150,
        endSeconds: 260,
        text:
          "La malnutrition aiguë peut être modérée ou sévère selon les critères anthropométriques et cliniques.",
      },
    ],

    resources: [
      {
        id: "definition-resource-1",
        title: "Fiche technique MAM et MAS",
        href: "/documents/camms/fiche-mam-mas.pdf",
        type: "pdf",
      },
    ],
  },
];

export function getLessonMedia(
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string
): LessonMedia | null {
  return (
    lessonMediaCatalog.find(
      (media) =>
        media.courseSlug === courseSlug &&
        media.moduleSlug === moduleSlug &&
        media.lessonSlug === lessonSlug
    ) ?? null
  );
}