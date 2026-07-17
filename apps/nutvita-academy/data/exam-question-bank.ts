import type { ExamQuestion } from "@/types/exam";

export const examQuestionBank: ExamQuestion[] = [
  {
    id: "camms-final-q001",
    domain: "fundamentals",
    difficulty: "easy",
    type: "single",
    prompt:
      "Quelle proposition définit le mieux la malnutrition aiguë ?",
    options: [
      {
        id: "a",
        text:
          "Une perte de poids récente ou un faible poids par rapport à la taille.",
      },
      {
        id: "b",
        text:
          "Une taille insuffisante par rapport à l’âge uniquement.",
      },
      {
        id: "c",
        text:
          "Une carence isolée en micronutriments.",
      },
      {
        id: "d",
        text:
          "Une maladie infectieuse sans déficit nutritionnel.",
      },
    ],
    correctOptionIds: ["a"],
    explanation:
      "La malnutrition aiguë est associée à une perte de poids récente ou à un déficit pondéral par rapport à la taille.",
    points: 1,
  },

  {
    id: "camms-final-q002",
    domain: "fundamentals",
    difficulty: "easy",
    type: "true_false",
    prompt:
      "La malnutrition aiguë sévère peut être diagnostiquée en présence d’œdèmes nutritionnels bilatéraux.",
    options: [
      {
        id: "true",
        text: "Vrai",
      },
      {
        id: "false",
        text: "Faux",
      },
    ],
    correctOptionIds: ["true"],
    explanation:
      "Les œdèmes nutritionnels bilatéraux constituent un critère de malnutrition aiguë sévère.",
    points: 1,
  },

  {
    id: "camms-final-q003",
    domain: "fundamentals",
    difficulty: "medium",
    type: "multiple",
    prompt:
      "Quels facteurs peuvent contribuer à la malnutrition aiguë ?",
    options: [
      {
        id: "a",
        text: "Apports alimentaires insuffisants.",
      },
      {
        id: "b",
        text: "Maladies infectieuses.",
      },
      {
        id: "c",
        text: "Pratiques de soins inadéquates.",
      },
      {
        id: "d",
        text:
          "Une bonne couverture des services de santé.",
      },
    ],
    correctOptionIds: ["a", "b", "c"],
    explanation:
      "La malnutrition aiguë résulte souvent de l’interaction entre apports insuffisants, maladies et facteurs de soins ou d’environnement.",
    points: 2,
    negativePoints: 0.25,
  },

  {
    id: "camms-final-q004",
    domain: "anthropometry",
    difficulty: "easy",
    type: "single",
    prompt:
      "Quel instrument est utilisé pour mesurer le périmètre brachial ?",
    options: [
      {
        id: "a",
        text: "Une balance électronique.",
      },
      {
        id: "b",
        text: "Une bande MUAC/PB.",
      },
      {
        id: "c",
        text: "Une toise verticale.",
      },
      {
        id: "d",
        text: "Un thermomètre.",
      },
    ],
    correctOptionIds: ["b"],
    explanation:
      "Le périmètre brachial est mesuré à l’aide d’une bande MUAC ou bande de PB.",
    points: 1,
  },

  {
    id: "camms-final-q005",
    domain: "anthropometry",
    difficulty: "medium",
    type: "numeric",
    prompt:
      "Un enfant présente un PB/MUAC de 112 mm. Entrez la valeur en millimètres.",
    correctNumericAnswer: 112,
    numericTolerance: 0,
    numericUnit: "mm",
    explanation:
      "La valeur à reporter est 112 mm.",
    points: 1,
  },

  {
    id: "camms-final-q006",
    domain: "anthropometry",
    difficulty: "hard",
    type: "case_single",
    caseText:
      "Un enfant âgé de 22 mois présente un PB de 113 mm, sans œdème bilatéral et avec un bon appétit.",
    prompt:
      "Quelle classification nutritionnelle est la plus appropriée selon le PB ?",
    options: [
      {
        id: "a",
        text: "État nutritionnel normal.",
      },
      {
        id: "b",
        text: "Malnutrition aiguë modérée.",
      },
      {
        id: "c",
        text: "Malnutrition aiguë sévère.",
      },
      {
        id: "d",
        text: "Retard de croissance.",
      },
    ],
    correctOptionIds: ["c"],
    explanation:
      "Un PB inférieur à 115 mm correspond à une malnutrition aiguë sévère.",
    points: 2,
  },

  {
    id: "camms-final-q007",
    domain: "screening",
    difficulty: "easy",
    type: "multiple",
    prompt:
      "Quels éléments doivent être vérifiés pendant un dépistage communautaire ?",
    options: [
      {
        id: "a",
        text: "Le PB/MUAC.",
      },
      {
        id: "b",
        text: "Les œdèmes bilatéraux.",
      },
      {
        id: "c",
        text: "L’âge ou le groupe cible.",
      },
      {
        id: "d",
        text: "Le groupe sanguin systématiquement.",
      },
    ],
    correctOptionIds: ["a", "b", "c"],
    explanation:
      "Le dépistage communautaire repose notamment sur le PB, les œdèmes et la vérification de l’éligibilité au groupe cible.",
    points: 2,
  },

  {
    id: "camms-final-q008",
    domain: "screening",
    difficulty: "medium",
    type: "single",
    prompt:
      "Comment recherche-t-on correctement un œdème nutritionnel bilatéral des pieds ?",
    options: [
      {
        id: "a",
        text:
          "En appuyant brièvement sur un seul pied.",
      },
      {
        id: "b",
        text:
          "En exerçant une pression sur le dessus des deux pieds pendant quelques secondes.",
      },
      {
        id: "c",
        text:
          "En mesurant uniquement la température des pieds.",
      },
      {
        id: "d",
        text:
          "En observant uniquement la couleur des ongles.",
      },
    ],
    correctOptionIds: ["b"],
    explanation:
      "La pression doit être appliquée sur les deux pieds afin d’identifier une dépression persistante et bilatérale.",
    points: 1,
  },

  {
    id: "camms-final-q009",
    domain: "clinical",
    difficulty: "medium",
    type: "case_single",
    caseText:
      "Un enfant présentant une MAS arrive avec léthargie, vomissements répétés et incapacité à boire.",
    prompt:
      "Quelle orientation est la plus appropriée ?",
    options: [
      {
        id: "a",
        text:
          "Retour immédiat à domicile sans traitement.",
      },
      {
        id: "b",
        text:
          "Prise en charge ambulatoire standard uniquement.",
      },
      {
        id: "c",
        text:
          "Référence urgente vers une prise en charge hospitalière ou stabilisation.",
      },
      {
        id: "d",
        text:
          "Attendre une semaine avant de réévaluer.",
      },
    ],
    correctOptionIds: ["c"],
    explanation:
      "La présence de complications médicales impose une référence vers une prise en charge hospitalière ou une unité de stabilisation.",
    points: 2,
  },

  {
    id: "camms-final-q010",
    domain: "clinical",
    difficulty: "hard",
    type: "multiple",
    prompt:
      "Quels signes peuvent être considérés comme des complications nécessitant une évaluation médicale urgente ?",
    options: [
      {
        id: "a",
        text: "Léthargie ou altération de la conscience.",
      },
      {
        id: "b",
        text: "Vomissements persistants.",
      },
      {
        id: "c",
        text: "Convulsions.",
      },
      {
        id: "d",
        text: "Bon appétit et enfant alerte.",
      },
    ],
    correctOptionIds: ["a", "b", "c"],
    explanation:
      "Les troubles de conscience, vomissements persistants et convulsions sont des signes de danger.",
    points: 2,
    negativePoints: 0.25,
  },

  {
    id: "camms-final-q011",
    domain: "cmam",
    difficulty: "easy",
    type: "single",
    prompt:
      "Quel est l’objectif principal de la prise en charge communautaire de la malnutrition aiguë ?",
    options: [
      {
        id: "a",
        text:
          "Identifier et traiter rapidement les cas tout en rapprochant les services des communautés.",
      },
      {
        id: "b",
        text:
          "Limiter tous les soins aux hôpitaux centraux.",
      },
      {
        id: "c",
        text:
          "Supprimer le suivi communautaire.",
      },
      {
        id: "d",
        text:
          "Remplacer définitivement l’alimentation familiale.",
      },
    ],
    correctOptionIds: ["a"],
    explanation:
      "L’approche communautaire vise une couverture élevée, un dépistage précoce et une prise en charge adaptée.",
    points: 1,
  },

  {
    id: "camms-final-q012",
    domain: "cmam",
    difficulty: "medium",
    type: "single",
    prompt:
      "Un enfant avec MAS, sans complication et avec un test d’appétit réussi peut généralement être orienté vers :",
    options: [
      {
        id: "a",
        text: "Une prise en charge ambulatoire.",
      },
      {
        id: "b",
        text:
          "Une chirurgie nutritionnelle.",
      },
      {
        id: "c",
        text:
          "Aucun suivi.",
      },
      {
        id: "d",
        text:
          "Une hospitalisation systématique de plusieurs mois.",
      },
    ],
    correctOptionIds: ["a"],
    explanation:
      "Une MAS sans complication avec appétit conservé est généralement éligible à la prise en charge ambulatoire.",
    points: 1,
  },

  {
    id: "camms-final-q013",
    domain: "cmam",
    difficulty: "hard",
    type: "case_single",
    caseText:
      "Un enfant suivi en ambulatoire ne prend pas de poids lors de plusieurs visites successives.",
    prompt:
      "Quelle action est prioritaire ?",
    options: [
      {
        id: "a",
        text:
          "Le déclarer guéri immédiatement.",
      },
      {
        id: "b",
        text:
          "Effectuer une investigation approfondie des causes de non-réponse.",
      },
      {
        id: "c",
        text:
          "Suspendre toute consultation.",
      },
      {
        id: "d",
        text:
          "Ignorer l’évolution pondérale.",
      },
    ],
    correctOptionIds: ["b"],
    explanation:
      "Une absence de réponse nécessite une investigation : observance, ration, maladie, pratiques de soins, partage du produit et autres causes.",
    points: 2,
  },

  {
    id: "camms-final-q014",
    domain: "monitoring",
    difficulty: "easy",
    type: "single",
    prompt:
      "Quel indicateur mesure la proportion de bénéficiaires guéris parmi les sorties du programme ?",
    options: [
      {
        id: "a",
        text: "Le taux de guérison.",
      },
      {
        id: "b",
        text: "Le taux de couverture vaccinale.",
      },
      {
        id: "c",
        text: "Le taux de natalité.",
      },
      {
        id: "d",
        text: "La prévalence du paludisme.",
      },
    ],
    correctOptionIds: ["a"],
    explanation:
      "Le taux de guérison est calculé à partir du nombre de guéris rapporté aux sorties pertinentes du programme.",
    points: 1,
  },

  {
    id: "camms-final-q015",
    domain: "monitoring",
    difficulty: "medium",
    type: "multiple",
    prompt:
      "Quels éléments contribuent à la qualité d’un programme de nutrition ?",
    options: [
      {
        id: "a",
        text:
          "La supervision régulière.",
      },
      {
        id: "b",
        text:
          "La qualité et la complétude des données.",
      },
      {
        id: "c",
        text:
          "L’analyse des abandons et des non-réponses.",
      },
      {
        id: "d",
        text:
          "La suppression des registres.",
      },
    ],
    correctOptionIds: ["a", "b", "c"],
    explanation:
      "Supervision, données fiables et analyse des performances permettent d’améliorer la qualité.",
    points: 2,
  },

  {
    id: "camms-final-q016",
    domain: "monitoring",
    difficulty: "hard",
    type: "numeric",
    prompt:
      "Un programme compte 80 sorties, dont 64 guérisons. Quel est le taux de guérison en pourcentage ?",
    correctNumericAnswer: 80,
    numericTolerance: 0.1,
    numericUnit: "%",
    explanation:
      "64 ÷ 80 × 100 = 80 %.",
    points: 2,
  },

  {
    id: "camms-final-q017",
    domain: "anthropometry",
    difficulty: "expert",
    type: "case_single",
    caseText:
      "Lors d’une mesure du poids, l’enfant porte des vêtements lourds et la balance n’a pas été remise à zéro.",
    prompt:
      "Quelle est la principale conséquence méthodologique ?",
    options: [
      {
        id: "a",
        text:
          "Une surestimation possible du poids et une classification erronée.",
      },
      {
        id: "b",
        text:
          "Une mesure automatiquement plus précise.",
      },
      {
        id: "c",
        text:
          "Aucune conséquence sur les résultats.",
      },
      {
        id: "d",
        text:
          "Une sous-estimation certaine de la taille.",
      },
    ],
    correctOptionIds: ["a"],
    explanation:
      "Les vêtements lourds et une balance mal tarée peuvent surestimer le poids.",
    points: 3,
  },

  {
    id: "camms-final-q018",
    domain: "screening",
    difficulty: "hard",
    type: "case_single",
    caseText:
      "Une mère mesure le PB de son enfant à domicile et obtient une valeur rouge sur une bande communautaire.",
    prompt:
      "Quelle recommandation doit être donnée ?",
    options: [
      {
        id: "a",
        text:
          "Attendre plusieurs mois.",
      },
      {
        id: "b",
        text:
          "Orienter rapidement l’enfant vers un site ou service de prise en charge pour confirmation et évaluation.",
      },
      {
        id: "c",
        text:
          "Couper la bande MUAC.",
      },
      {
        id: "d",
        text:
          "Ne rien faire en l’absence de fièvre.",
      },
    ],
    correctOptionIds: ["b"],
    explanation:
      "Une mesure dans la zone rouge nécessite une orientation rapide pour confirmation et prise en charge.",
    points: 2,
  },
];

export function getExamQuestionsByIds(
  questionIds: string[]
): ExamQuestion[] {
  const questionMap = new Map(
    examQuestionBank.map((question) => [
      question.id,
      question,
    ])
  );

  return questionIds
    .map((questionId) =>
      questionMap.get(questionId)
    )
    .filter(
      (
        question
      ): question is ExamQuestion =>
        Boolean(question)
    );
}