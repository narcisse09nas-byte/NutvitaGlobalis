import type {
  AiKnowledgeItem,
} from "@/types/ai-instructor";

export const aiKnowledgeBase: AiKnowledgeItem[] = [
  {
    id: "acute-malnutrition-definition",

    keywords: [
      "malnutrition aiguë",
      "definition",
      "définition",
      "wasting",
      "émaciation",
    ],

    title:
      "Définition de la malnutrition aiguë",

    answer:
      "La malnutrition aiguë correspond à une perte de poids récente ou à un poids insuffisant par rapport à la taille. Elle peut être modérée ou sévère et peut aussi être diagnostiquée par la présence d’œdèmes nutritionnels bilatéraux.",

    recommendation:
      "Révisez le Module 1, particulièrement la leçon sur la définition de la malnutrition aiguë.",
  },

  {
    id: "muac",

    keywords: [
      "muac",
      "pb",
      "périmètre brachial",
      "115",
      "125",
    ],

    title:
      "Interprétation du PB/MUAC",

    answer:
      "Chez les enfants de 6 à 59 mois, un PB inférieur à 115 mm indique généralement une malnutrition aiguë sévère. Un PB compris entre 115 mm et moins de 125 mm indique une malnutrition aiguë modérée.",

    recommendation:
      "Revoyez la démonstration pratique de mesure du PB avant de poursuivre.",
  },

  {
    id: "oedema",

    keywords: [
      "œdème",
      "oedeme",
      "oedema",
      "bilatéral",
      "pieds",
    ],

    title:
      "Œdèmes nutritionnels",

    answer:
      "Les œdèmes nutritionnels sont recherchés en exerçant une pression sur le dessus des deux pieds pendant quelques secondes. Une dépression persistante et bilatérale indique un œdème nutritionnel et constitue un critère de malnutrition aiguë sévère.",

    recommendation:
      "Consultez la leçon consacrée à la recherche des œdèmes bilatéraux.",
  },

  {
    id: "mam-sam",

    keywords: [
      "mam",
      "mas",
      "sam",
      "différence",
      "modérée",
      "sévère",
    ],

    title:
      "Différence entre MAM et MAS",

    answer:
      "La MAM est la malnutrition aiguë modérée. La MAS est la malnutrition aiguë sévère. La MAS présente un risque plus élevé de complications et de décès et nécessite une prise en charge rapide et adaptée.",

    recommendation:
      "Comparez les critères anthropométriques et cliniques des deux catégories.",
  },

  {
    id: "cmam",

    keywords: [
      "cmam",
      "pcma",
      "prise en charge communautaire",
      "ambulatoire",
      "stabilisation",
    ],

    title:
      "Prise en charge communautaire",

    answer:
      "L’approche communautaire associe mobilisation et dépistage communautaires, prise en charge ambulatoire des cas sans complications, prise en charge hospitalière des cas compliqués et suivi régulier des bénéficiaires.",

    recommendation:
      "Revoyez le parcours de référence entre communauté, ambulatoire et stabilisation.",
  },

  {
    id: "quiz-failure",

    keywords: [
      "échec",
      "échoué",
      "quiz",
      "mauvais score",
      "réviser",
    ],

    title:
      "Plan de révision après un échec",

    answer:
      "Commencez par identifier les domaines ayant les scores les plus faibles. Revoyez ensuite les vidéos correspondantes, consultez les fiches techniques et refaites les exercices avant une nouvelle tentative.",

    recommendation:
      "Utilisez vos résultats par domaine pour construire un plan de révision ciblé.",
  },
];