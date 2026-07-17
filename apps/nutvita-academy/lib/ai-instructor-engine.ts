import {
  aiKnowledgeBase,
} from "@/data/ai-knowledge-base";

import type {
  AiInstructorContext,
} from "@/types/ai-instructor";

function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

function buildContextIntroduction(
  context: AiInstructorContext
): string {
  const parts: string[] = [];

  if (context.courseTitle) {
    parts.push(
      `Vous travaillez actuellement sur la formation « ${context.courseTitle} ».`
    );
  }

  if (context.moduleTitle) {
    parts.push(
      `Le module actuel est « ${context.moduleTitle} ».`
    );
  }

  if (context.lessonTitle) {
    parts.push(
      `La leçon ouverte est « ${context.lessonTitle} ».`
    );
  }

  if (
    context.progressPercent !==
    undefined
  ) {
    parts.push(
      `Votre progression est de ${context.progressPercent} %.`
    );
  }

  return parts.join(" ");
}

export function generateLocalAiAnswer(
  question: string,
  context: AiInstructorContext
): string {
  const normalizedQuestion =
    normalizeText(question);

  const matchingItem =
    aiKnowledgeBase
      .map((item) => {
        const score =
          item.keywords.reduce(
            (
              total,
              keyword
            ) =>
              normalizedQuestion.includes(
                normalizeText(
                  keyword
                )
              )
                ? total + 1
                : total,
            0
          );

        return {
          item,
          score,
        };
      })
      .sort(
        (first, second) =>
          second.score -
          first.score
      )[0];

  const contextIntroduction =
    buildContextIntroduction(
      context
    );

  if (
    matchingItem &&
    matchingItem.score > 0
  ) {
    const recommendation =
      matchingItem.item
        .recommendation
        ? `\n\nConseil pédagogique : ${matchingItem.item.recommendation}`
        : "";

    return `${contextIntroduction}\n\n${matchingItem.item.answer}${recommendation}`.trim();
  }

  return `${contextIntroduction}

Je n’ai pas encore trouvé une réponse suffisamment précise dans la base pédagogique locale.

Reformulez votre question en précisant le thème, par exemple :
- définition de la malnutrition aiguë ;
- interprétation du PB/MUAC ;
- œdèmes bilatéraux ;
- différence entre MAM et MAS ;
- prise en charge ambulatoire ou hospitalière.`.trim();
}