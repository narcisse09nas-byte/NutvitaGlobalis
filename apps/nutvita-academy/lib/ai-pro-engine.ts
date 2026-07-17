import type {
  AiProRequest,
  AiProResponse,
} from "@/types/ai-pro";

function contextLine(request: AiProRequest) {
  const parts: string[] = [];

  if (request.context.courseTitle) {
    parts.push(`Formation : ${request.context.courseTitle}`);
  }

  if (request.context.moduleTitle) {
    parts.push(`Module : ${request.context.moduleTitle}`);
  }

  if (request.context.lessonTitle) {
    parts.push(`Leçon : ${request.context.lessonTitle}`);
  }

  if (request.context.progressPercent !== undefined) {
    parts.push(`Progression : ${request.context.progressPercent} %`);
  }

  return parts.join(" · ");
}

export function generateAiProResponse(
  request: AiProRequest
): AiProResponse {
  if (request.locale === "en") return generateEnglishResponse(request);
  const context = contextLine(request);

  if (request.mode === "summarize") {
    return {
      title: "Résumé pédagogique",
      content: `${context}\n\nRésumé demandé : ${request.prompt}\n\n1. Identifiez les concepts essentiels.\n2. Retenez les critères opérationnels.\n3. Reliez chaque concept à une décision pratique.\n4. Vérifiez votre compréhension avec un exemple.`,
      suggestions: [
        "Créer une fiche de révision",
        "Générer cinq questions",
        "Demander un cas pratique",
      ],
    };
  }

  if (request.mode === "quiz") {
    return {
      title: "Mini-quiz généré",
      content: `${context}\n\n1. Donnez la définition du concept principal.\n2. Citez deux critères d’identification.\n3. Expliquez une erreur fréquente.\n4. Décrivez la conduite à tenir dans un cas pratique.\n5. Formulez un message clé destiné à la communauté.`,
      suggestions: [
        "Afficher les réponses",
        "Augmenter la difficulté",
        "Créer un quiz à choix multiples",
      ],
    };
  }

  if (request.mode === "case-study") {
    return {
      title: "Cas pratique",
      content: `${context}\n\nScénario : un bénéficiaire présente des signes compatibles avec le thème étudié. Décrivez successivement : l’évaluation initiale, la classification, l’orientation, la prise en charge et le suivi.\n\nVotre demande : ${request.prompt}`,
      suggestions: [
        "Ajouter des données anthropométriques",
        "Ajouter une complication",
        "Créer la correction détaillée",
      ],
    };
  }

  if (request.mode === "study-plan") {
    const weak =
      request.context.weakDomains?.length
        ? request.context.weakDomains.join(", ")
        : "les domaines les moins maîtrisés";

    return {
      title: "Plan d’étude personnalisé",
      content: `${context}\n\nPriorité : ${weak}.\n\nJour 1 : revoir la leçon principale.\nJour 2 : étudier les ressources techniques.\nJour 3 : réaliser un quiz ciblé.\nJour 4 : corriger les erreurs.\nJour 5 : faire un cas pratique.\nJour 6 : révision active.\nJour 7 : nouvelle évaluation.`,
      suggestions: [
        "Créer un planning de 14 jours",
        "Réduire à 30 minutes par jour",
        "Ajouter des objectifs mesurables",
      ],
    };
  }

  if (request.mode === "performance") {
    return {
      title: "Analyse de performance",
      content: `${context}\n\nScore du dernier quiz : ${request.context.lastQuizScore ?? "non disponible"}.\nScore du dernier examen : ${request.context.lastExamScore ?? "non disponible"}.\n\nTravaillez d’abord les erreurs récurrentes, puis vérifiez la maîtrise avec des questions d’application plutôt que de simples questions de mémorisation.`,
      suggestions: [
        "Identifier mes points faibles",
        "Créer un plan de rattrapage",
        "Générer un test diagnostique",
      ],
    };
  }

  if (request.mode === "revision") {
    return {
      title: "Fiche de révision",
      content: `${context}\n\nSujet : ${request.prompt}\n\nDéfinition\n• Résumez le concept en une phrase.\n\nCritères clés\n• Listez les seuils et signes importants.\n\nConduite à tenir\n• Décrivez les étapes dans l’ordre.\n\nErreurs à éviter\n• Confusion de critères.\n• Mauvaise technique.\n• Retard de référence.`,
      suggestions: [
        "Transformer en flashcards",
        "Créer un tableau comparatif",
        "Ajouter un moyen mnémotechnique",
      ],
    };
  }

  return {
    title: "Explication pédagogique",
    content: `${context}\n\n${request.prompt}\n\nPour comprendre ce sujet, commencez par la définition, identifiez ensuite les critères ou étapes, puis appliquez-les à une situation pratique. Distinguez toujours le dépistage, la classification, l’orientation et le suivi.`,
    suggestions: [
      "Donner un exemple pratique",
      "Simplifier davantage",
      "Créer un tableau récapitulatif",
    ],
  };
}

function generateEnglishResponse(request: AiProRequest): AiProResponse {
  const context = [
    request.context.courseTitle && `Course: ${request.context.courseTitle}`,
    request.context.moduleTitle && `Module: ${request.context.moduleTitle}`,
    request.context.lessonTitle && `Lesson: ${request.context.lessonTitle}`,
    request.context.progressPercent !== undefined &&
      `Progress: ${request.context.progressPercent}%`,
  ]
    .filter(Boolean)
    .join(" · ");
  if (request.mode === "summarize")
    return { title: "Learning summary", content: `${context}\n\nRequested summary: ${request.prompt}\n\n1. Identify the essential concepts.\n2. Retain the operational criteria.\n3. Link each concept to a practical decision.\n4. Check your understanding with an example.`, suggestions: ["Create a revision sheet", "Generate five questions", "Request a case study"] };
  if (request.mode === "quiz")
    return { title: "Generated mini-quiz", content: `${context}\n\n1. Define the main concept.\n2. List two identification criteria.\n3. Explain a common error.\n4. Describe what to do in a practical case.\n5. Formulate a key message for the community.`, suggestions: ["Show answers", "Increase difficulty", "Create a multiple-choice quiz"] };
  if (request.mode === "case-study")
    return { title: "Case study", content: `${context}\n\nScenario: a beneficiary presents signs consistent with the topic studied. Describe the initial assessment, classification, referral, management and follow-up.\n\nYour request: ${request.prompt}`, suggestions: ["Add anthropometric data", "Add a complication", "Create the detailed correction"] };
  if (request.mode === "study-plan") {
    const weak = request.context.weakDomains?.length
      ? request.context.weakDomains.join(", ")
      : "the least-mastered topics";
    return { title: "Personalized study plan", content: `${context}\n\nPriority: ${weak}.\n\nDay 1: review the main lesson.\nDay 2: study technical resources.\nDay 3: complete a targeted quiz.\nDay 4: correct errors.\nDay 5: complete a case study.\nDay 6: active revision.\nDay 7: new assessment.`, suggestions: ["Create a 14-day plan", "Reduce to 30 minutes per day", "Add measurable objectives"] };
  }
  if (request.mode === "performance")
    return { title: "Performance analysis", content: `${context}\n\nLast quiz score: ${request.context.lastQuizScore ?? "not available"}.\nLast exam score: ${request.context.lastExamScore ?? "not available"}.\n\nWork on recurring errors first, then verify mastery with application questions rather than recall questions.`, suggestions: ["Identify my weak points", "Create a catch-up plan", "Generate a diagnostic test"] };
  if (request.mode === "revision")
    return { title: "Revision sheet", content: `${context}\n\nTopic: ${request.prompt}\n\nDefinition\n• Summarize the concept in one sentence.\n\nKey criteria\n• List important thresholds and signs.\n\nWhat to do\n• Describe the steps in order.\n\nErrors to avoid\n• Confusing criteria.\n• Incorrect technique.\n• Delayed referral.`, suggestions: ["Turn into flashcards", "Create a comparison table", "Add a mnemonic"] };
  return { title: "Learning explanation", content: `${context}\n\n${request.prompt}\n\nStart with the definition, then identify the criteria or steps and apply them to a practical situation. Always distinguish screening, classification, referral and follow-up.`, suggestions: ["Give a practical example", "Simplify further", "Create a summary table"] };
}
