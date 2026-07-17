import { examQuestionBank } from "@/data/exam-question-bank";

import type {
  ExamAnswerValue,
  ExamAttempt,
  ExamBlueprint,
  ExamDefinition,
  ExamDomainResult,
  ExamQuestion,
  ExamQuestionCorrection,
  ExamPaper,
  ExamQuestionSection,
  ExamSession,
} from "@/types/exam";

export const CERTIFICATION_EXAM_BLUEPRINT: ExamBlueprint = {
  qcmCount: 50,
  qcuCount: 35,
  caseStudyCount: 15,
};

export const CERTIFICATION_RETAKE_DELAYS: [number, number] = [7, 21];

function createId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    crypto.randomUUID
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export function shuffleArray<T>(
  values: T[]
): T[] {
  const result = [...values];

  for (
    let index = result.length - 1;
    index > 0;
    index -= 1
  ) {
    const randomIndex =
      Math.floor(
        Math.random() * (index + 1)
      );

    [
      result[index],
      result[randomIndex],
    ] = [
      result[randomIndex],
      result[index],
    ];
  }

  return result;
}

function seededRandom(seed: string) {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(values: T[], seed: string): T[] {
  const result = [...values];
  const random = seededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function randomSeed(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return [...crypto.getRandomValues(new Uint32Array(4))]
      .map((value) => value.toString(36))
      .join("-");
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getQuestionSection(question: ExamQuestion): ExamQuestionSection {
  if (question.section) return question.section;
  if (question.type === "multiple") return "qcm";
  if (question.type === "case_single" || question.type === "numeric")
    return "case_study";
  return "qcu";
}

export function getQuestionPoolCapacity(questionPool: ExamQuestion[]) {
  return questionPool.reduce(
    (capacity, question) => {
      const section = getQuestionSection(question);
      return { ...capacity, [section]: capacity[section] + 1 };
    },
    { qcm: 0, qcu: 0, case_study: 0 },
  );
}

function fingerprintQuestionIds(questionIds: string[]): string {
  let hash = 2166136261;
  for (const character of questionIds.join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `paper-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function selectBlueprintQuestions(
  blueprint: ExamBlueprint,
  questionPool: ExamQuestion[],
  seed: string,
): ExamQuestion[] {
  const requirements: Array<[ExamQuestionSection, number]> = [
    ["qcm", blueprint.qcmCount],
    ["qcu", blueprint.qcuCount],
    ["case_study", blueprint.caseStudyCount],
  ];
  return requirements.flatMap(([section, count]) => {
    const available = questionPool.filter(
      (question) => getQuestionSection(question) === section,
    );
    if (available.length < count)
      throw new Error(
        `QUESTION_POOL_INSUFFICIENT:${section}:${available.length}:${count}`,
      );
    return seededShuffle(available, `${seed}:${section}`).slice(0, count);
  });
}

export function createExamPaper(input: {
  userId: string;
  definition: ExamDefinition;
  questionPool: ExamQuestion[];
  attemptNumber: number;
  excludedFingerprints?: string[];
}): ExamPaper {
  const blueprint = input.definition.blueprint ?? CERTIFICATION_EXAM_BLUEPRINT;
  const excluded = new Set(input.excludedFingerprints ?? []);
  let seed = "";
  let selected: ExamQuestion[] = [];
  let fingerprint = "";
  for (let iteration = 0; iteration < 8; iteration += 1) {
    seed = `${randomSeed()}:${input.userId}:${input.attemptNumber}:${iteration}`;
    selected = selectBlueprintQuestions(blueprint, input.questionPool, seed);
    fingerprint = fingerprintQuestionIds(selected.map((question) => question.id));
    if (!excluded.has(fingerprint)) break;
  }
  if (excluded.has(fingerprint)) throw new Error("EXAM_PAPER_DUPLICATE");
  const questions = seededShuffle(selected, `${seed}:paper`).map((question) => ({
    ...question,
    options: question.options
      ? seededShuffle(question.options, `${seed}:${question.id}:options`)
      : undefined,
  }));
  return {
    id: createId("exam-paper"),
    examSlug: input.definition.slug,
    userId: input.userId,
    attemptNumber: input.attemptNumber,
    seed,
    fingerprint,
    blueprint,
    questions,
    generatedAt: new Date().toISOString(),
  };
}

export function buildExamQuestions(
  definition: ExamDefinition,
  questionPool: ExamQuestion[] = examQuestionBank
): ExamQuestion[] {
  if (definition.blueprint) {
    const seed = randomSeed();
    const selected = selectBlueprintQuestions(
      definition.blueprint,
      questionPool,
      seed,
    );
    return seededShuffle(selected, `${seed}:questions`).map((question) => ({
      ...question,
      options:
        question.options && definition.shuffleOptions
          ? seededShuffle(question.options, `${seed}:${question.id}:options`)
          : question.options,
    }));
  }
  const selectedQuestions =
    definition.domainRules.flatMap(
      (rule) => {
        const available =
          questionPool.filter(
            (question) =>
              question.domain ===
              rule.domain
          );

        return shuffleArray(
          available
        ).slice(
          0,
          rule.numberOfQuestions
        );
      }
    );

  const questions =
    definition.shuffleQuestions
      ? shuffleArray(
          selectedQuestions
        )
      : selectedQuestions;

  return questions.map((question) => ({
    ...question,

    options:
      question.options &&
      definition.shuffleOptions
        ? shuffleArray(
            question.options
          )
        : question.options,
  }));
}

export function createExamSession(
  userId: string,
  definition: ExamDefinition,
  questions: ExamQuestion[],
  context?: { bookingId?: string; paperId?: string; attemptNumber?: number },
): ExamSession {
  const now =
    new Date().toISOString();

  return {
    id: createId("exam-session"),
    userId,
    examSlug: definition.slug,
    ...context,

    questionIds:
      questions.map(
        (question) => question.id
      ),

    answers: {},

    currentQuestionIndex: 0,

    remainingSeconds:
      definition.durationMinutes *
      60,

    focusViolations: 0,
    status: "in_progress",

    startedAt: now,
    updatedAt: now,
  };
}

function normalizedIds(
  ids: string[]
): string[] {
  return [...ids].sort();
}

function stringArraysEqual(
  first: string[],
  second: string[]
): boolean {
  const firstSorted =
    normalizedIds(first);

  const secondSorted =
    normalizedIds(second);

  return (
    firstSorted.length ===
      secondSorted.length &&
    firstSorted.every(
      (value, index) =>
        value ===
        secondSorted[index]
    )
  );
}

function correctQuestion(
  question: ExamQuestion,
  answer: ExamAnswerValue
): ExamQuestionCorrection {
  if (
    question.type === "numeric"
  ) {
    const numericAnswer =
      typeof answer === "number"
        ? answer
        : Number.NaN;

    const target =
      question.correctNumericAnswer ??
      Number.NaN;

    const tolerance =
      question.numericTolerance ?? 0;

    const isCorrect =
      Number.isFinite(
        numericAnswer
      ) &&
      Number.isFinite(target) &&
      Math.abs(
        numericAnswer - target
      ) <= tolerance;

    return {
      question,
      answer,
      earnedPoints: isCorrect
        ? question.points
        : 0,
      maximumPoints:
        question.points,
      isCorrect,
    };
  }

  const selectedIds =
    Array.isArray(answer)
      ? answer
      : [];

  const correctIds =
    question.correctOptionIds ??
    [];

  const isCorrect =
    stringArraysEqual(
      selectedIds,
      correctIds
    );

  let earnedPoints = 0;

  if (isCorrect) {
    earnedPoints =
      question.points;
  } else if (
    question.negativePoints &&
    selectedIds.length > 0
  ) {
    earnedPoints =
      -question.negativePoints;
  }

  return {
    question,
    answer,
    earnedPoints,
    maximumPoints:
      question.points,
    isCorrect,
  };
}

function buildDomainResults(
  corrections: ExamQuestionCorrection[]
): ExamDomainResult[] {
  const domainMap = new Map<
    string,
    {
      earnedPoints: number;
      maximumPoints: number;
    }
  >();

  corrections.forEach(
    (correction) => {
      const domain =
        correction.question.domain;

      const current =
        domainMap.get(domain) ?? {
          earnedPoints: 0,
          maximumPoints: 0,
        };

      domainMap.set(domain, {
        earnedPoints:
          current.earnedPoints +
          correction.earnedPoints,

        maximumPoints:
          current.maximumPoints +
          correction.maximumPoints,
      });
    }
  );

  return Array.from(
    domainMap.entries()
  ).map(
    ([
      domain,
      domainScore,
    ]) => ({
      domain:
        domain as ExamDomainResult["domain"],

      earnedPoints:
        Math.max(
          0,
          domainScore.earnedPoints
        ),

      maximumPoints:
        domainScore.maximumPoints,

      scorePercent:
        domainScore.maximumPoints ===
        0
          ? 0
          : Math.round(
              (Math.max(
                0,
                domainScore.earnedPoints
              ) /
                domainScore.maximumPoints) *
                100
            ),
    })
  );
}

export function gradeExam(input: {
  userId: string;
  definition: ExamDefinition;
  session: ExamSession;
  questions: ExamQuestion[];
}): ExamAttempt {
  const {
    userId,
    definition,
    session,
    questions,
  } = input;

  const corrections =
    questions.map(
      (question) =>
        correctQuestion(
          question,
          session.answers[
            question.id
          ] ?? null
        )
    );

  const rawEarnedPoints =
    corrections.reduce(
      (total, correction) =>
        total +
        correction.earnedPoints,
      0
    );

  const maximumPoints =
    corrections.reduce(
      (total, correction) =>
        total +
        correction.maximumPoints,
      0
    );

  const earnedPoints =
    Math.max(
      0,
      rawEarnedPoints
    );

  const scorePercent =
    maximumPoints === 0
      ? 0
      : Math.round(
          (earnedPoints /
            maximumPoints) *
            100
        );

  const submittedAt =
    new Date().toISOString();

  const totalSeconds =
    definition.durationMinutes *
    60;

  return {
    id: createId("exam-attempt"),

    userId,
    examSlug:
      definition.slug,
    bookingId: session.bookingId,
    paperId: session.paperId,
    attemptNumber: session.attemptNumber,

    questionIds:
      session.questionIds,

    answers:
      session.answers,

    scorePercent,
    earnedPoints,
    maximumPoints,

    passed:
      scorePercent >=
      definition.passingScore,

    focusViolations:
      session.focusViolations,

    domainResults:
      buildDomainResults(
        corrections
      ),

    corrections,

    startedAt:
      session.startedAt,

    submittedAt,

    durationSeconds:
      Math.max(
        0,
        totalSeconds -
          session.remainingSeconds
      ),
  };
}
