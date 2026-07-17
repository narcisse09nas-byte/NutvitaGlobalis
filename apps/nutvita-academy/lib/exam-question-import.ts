import type {
  ExamDifficulty,
  ExamDomain,
  ExamQuestion,
  ExamQuestionSection,
  ExamQuestionType,
} from "@/types/exam";

const domains = new Set<ExamDomain>([
  "fundamentals",
  "anthropometry",
  "screening",
  "clinical",
  "cmam",
  "monitoring",
]);
const difficulties = new Set<ExamDifficulty>([
  "easy",
  "medium",
  "hard",
  "expert",
]);

function id(prefix: string, index: number) {
  return `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function splitCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function csvRecords(source: string): Record<string, unknown>[] {
  const [headers = [], ...rows] = splitCsv(source);
  return rows.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), row[index] ?? ""])),
  );
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim());
  return String(value ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeType(value: unknown): ExamQuestionType {
  const type = String(value ?? "single").toLowerCase();
  if (["qcm", "multiple", "multiple_choice"].includes(type)) return "multiple";
  if (["case", "case_study", "case_single"].includes(type)) return "case_single";
  if (["numeric", "number", "open_numeric"].includes(type)) return "numeric";
  if (["true_false", "boolean"].includes(type)) return "true_false";
  return "single";
}

function normalizeSection(
  value: unknown,
  type: ExamQuestionType,
): ExamQuestionSection {
  const section = String(value ?? "").toLowerCase();
  if (["qcm", "multiple"].includes(section)) return "qcm";
  if (["case", "case_study", "practical"].includes(section)) return "case_study";
  if (["qcu", "single"].includes(section)) return "qcu";
  if (type === "multiple") return "qcm";
  if (type === "case_single" || type === "numeric") return "case_study";
  return "qcu";
}

function normalizeRecord(
  record: Record<string, unknown>,
  index: number,
): ExamQuestion {
  const type = normalizeType(record.type);
  const rawOptions = Array.isArray(record.options) ? record.options : null;
  const optionTexts = rawOptions
    ? rawOptions.map((option) =>
        typeof option === "object" && option
          ? String((option as Record<string, unknown>).text ?? "").trim()
          : String(option).trim(),
      )
    : list(record.options ?? record.optionsFr);
  const optionTextsEn = rawOptions
    ? rawOptions.map((option) =>
        typeof option === "object" && option
          ? String((option as Record<string, unknown>).textEn ?? "").trim()
          : "",
      )
    : list(record.optionsEn);
  const optionIds = optionTexts.map((_, optionIndex) => {
    const rawOption = rawOptions?.[optionIndex];
    if (typeof rawOption === "object" && rawOption) {
      const rawId = (rawOption as Record<string, unknown>).id;
      if (rawId) return String(rawId);
    }
    return `${String(record.id || id("import-question", index))}-option-${optionIndex + 1}`;
  });
  const correctValues = list(
    record.correctOptionIds ?? record.correct ?? record.correctAnswers,
  );
  const correctOptionIds = correctValues.flatMap((value) => {
    const numeric = Number(value);
    if (Number.isInteger(numeric)) {
      const zeroBased = numeric >= 1 ? numeric - 1 : numeric;
      return optionIds[zeroBased] ? [optionIds[zeroBased]] : [];
    }
    const directIndex = optionIds.indexOf(value);
    if (directIndex >= 0) return [optionIds[directIndex]];
    const textIndex = optionTexts.indexOf(value);
    return textIndex >= 0 ? [optionIds[textIndex]] : [];
  });
  const domainValue = String(record.domain ?? "fundamentals") as ExamDomain;
  const difficultyValue = String(record.difficulty ?? "medium") as ExamDifficulty;
  const numericAnswer = Number(
    record.correctNumericAnswer ?? record.numericAnswer ?? record.correct,
  );
  return {
    id: String(record.id || id("import-question", index)),
    domain: domains.has(domainValue) ? domainValue : "fundamentals",
    difficulty: difficulties.has(difficultyValue) ? difficultyValue : "medium",
    type,
    section: normalizeSection(record.section, type),
    prompt: String(record.prompt ?? record.question ?? "").trim(),
    promptEn: String(record.promptEn ?? record.questionEn ?? "").trim(),
    caseText: String(record.caseText ?? record.scenario ?? "").trim() || undefined,
    caseTextEn: String(record.caseTextEn ?? record.scenarioEn ?? "").trim() || undefined,
    options:
      type === "numeric"
        ? undefined
        : optionTexts.map((text, optionIndex) => ({
            id: optionIds[optionIndex],
            text,
            textEn: optionTextsEn[optionIndex] ?? "",
          })),
    correctOptionIds: type === "numeric" ? undefined : correctOptionIds,
    correctNumericAnswer:
      type === "numeric" && Number.isFinite(numericAnswer)
        ? numericAnswer
        : undefined,
    numericTolerance:
      type === "numeric" && Number.isFinite(Number(record.numericTolerance))
        ? Number(record.numericTolerance)
        : 0,
    numericUnit: String(record.numericUnit ?? "").trim() || undefined,
    explanation: String(record.explanation ?? "").trim(),
    explanationEn: String(record.explanationEn ?? "").trim(),
    points: Math.max(1, Number(record.points) || 1),
  };
}

export async function importExamQuestions(file: File): Promise<{
  questions: ExamQuestion[];
  errors: string[];
}> {
  const source = await file.text();
  let records: Record<string, unknown>[];
  try {
    if (file.name.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(source) as
        | Record<string, unknown>[]
        | { questions?: Record<string, unknown>[] };
      records = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
    } else records = csvRecords(source);
  } catch {
    return { questions: [], errors: ["INVALID_FILE"] };
  }
  const questions = records.map(normalizeRecord);
  const errors: string[] = [];
  const ids = new Set<string>();
  questions.forEach((question, index) => {
    if (!question.prompt && !question.promptEn) errors.push(`ROW_${index + 1}_PROMPT`);
    if (ids.has(question.id)) errors.push(`ROW_${index + 1}_DUPLICATE_ID`);
    ids.add(question.id);
    if (question.type === "numeric" && question.correctNumericAnswer === undefined)
      errors.push(`ROW_${index + 1}_NUMERIC_ANSWER`);
    if (
      question.type !== "numeric" &&
      (!question.options || question.options.length < 2 || !question.correctOptionIds?.length)
    )
      errors.push(`ROW_${index + 1}_OPTIONS`);
  });
  return { questions: errors.length ? [] : questions, errors };
}
