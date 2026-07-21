import type { ExamQuestion } from "@/types/exam";
import type { QuizQuestion } from "@/types/quiz";
import { importExamQuestions } from "@/lib/exam-question-import";
export const QUESTION_IMPORT_FORMATS = ".html,.htm,.docx,.pdf,.csv,.json";
type Raw = {
  prompt: string;
  options: string[];
  answers: string[];
  multiple: boolean;
  explanation: string;
};
type Result<T> = { questions: T[]; errors: string[] };
const clean = (v: string) =>
  v
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const option = (v: string) =>
  clean(
    v
      .replace(/^\s*(?:[A-Z]|\d+)[).:\-]\s*/i, "")
      .replace(/\s*[âœ“âœ”]\s*$/, ""),
  );
const tokens = (v: string) =>
  v
    .replace(/^[^:]*:/, "")
    .split(/[|,;\/]/)
    .map(clean)
    .filter(Boolean);
type ScriptQuestion = {
  type?: unknown;
  q?: unknown;
  prompt?: unknown;
  options?: unknown;
  correct?: unknown;
  answer?: unknown;
  explain?: unknown;
  explanation?: unknown;
};
function extractArrayLiteral(source: string, marker: RegExp) {
  const match = marker.exec(source);
  if (!match) return null;
  const start = source.indexOf("[", match.index + match[0].length);
  if (start < 0) return null;
  let depth = 0,
    quote = "",
    escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "[") depth += 1;
    if (character === "]" && --depth === 0)
      return source.slice(start, index + 1);
  }
  return null;
}
function scriptQuestionBank(source: string): Raw[] {
  const literal = extractArrayLiteral(
    source,
    /(?:const|let|var)\s+QUESTIONS\s*=|(?:window\.)?QUESTIONS\s*=/i,
  );
  if (!literal) return [];
  try {
    const json = literal
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      .replace(/,\s*([}\]])/g, "$1");
    const records = JSON.parse(json) as ScriptQuestion[];
    if (!Array.isArray(records)) return [];
    return records.map((record) => {
      const options = Array.isArray(record.options)
        ? record.options.map((value) => clean(String(value)))
        : [];
      const correct = record.correct ?? record.answer,
        indexes = Array.isArray(correct) ? correct : [correct];
      return {
        prompt: clean(String(record.q ?? record.prompt ?? "")),
        options,
        answers: indexes
          .filter((value): value is number => Number.isInteger(value))
          .map((value) => String(value + 1)),
        multiple:
          String(record.type ?? "").toUpperCase() === "QCM" ||
          indexes.length > 1,
        explanation: clean(String(record.explain ?? record.explanation ?? "")),
      };
    });
  } catch {
    throw new Error("HTML_QUESTIONS_FORMAT_INVALID");
  }
}
function html(source: string): Raw[] {
  const scripted = scriptQuestionBank(source);
  if (scripted.length) return scripted;
  const doc = new DOMParser().parseFromString(source, "text/html");
  let blocks = [
    ...doc.querySelectorAll<HTMLElement>(
      "[data-question],.quiz-question,.question,fieldset",
    ),
  ];
  if (!blocks.length)
    blocks = [...doc.querySelectorAll<HTMLElement>("article,section")].filter(
      (x) => x.querySelectorAll("input,[data-option],li").length >= 2,
    );
  return blocks.map((block) => {
    const prompt = clean(
      block.querySelector<HTMLElement>(
        "[data-prompt],.question-text,.prompt,legend,h1,h2,h3,h4",
      )?.textContent ?? "",
    );
    const inputs = [
      ...block.querySelectorAll<HTMLInputElement>(
        "input[type=radio],input[type=checkbox]",
      ),
    ];
    const els = inputs.length
      ? (inputs
          .map((x) => x.closest("label") ?? x.parentElement)
          .filter(Boolean) as HTMLElement[])
      : [...block.querySelectorAll<HTMLElement>("[data-option],.option,li")];
    const options = els.map((x) => option(x.textContent ?? "")).filter(Boolean),
      answers: string[] = [];
    els.forEach((el, i) => {
      const mark = `${el.getAttribute("data-correct") ?? ""} ${el.className}`;
      if (
        inputs[i]?.checked ||
        /\b(true|yes|correct|bonne?)\b/i.test(mark) ||
        /[âœ“âœ”]\s*$/.test(el.textContent ?? "")
      )
        answers.push(String(i + 1));
    });
    const explicit =
      block.querySelector<HTMLElement>(
        "[data-answer],.correct-answer,.answer,.reponse,.rÃ©ponse",
      )?.textContent ??
      [...block.querySelectorAll<HTMLElement>("p,div")]
        .map((x) => clean(x.textContent ?? ""))
        .find((x) =>
          /^(?:rÃ©ponse|rÃ©ponses|reponses|answer|correct)\s*:/i.test(x),
        ) ??
      "";
    if (!answers.length && explicit) answers.push(...tokens(explicit));
    return {
      prompt,
      options,
      answers,
      multiple:
        inputs.some((x) => x.type === "checkbox") ||
        answers.length > 1 ||
        /qcm|multiple|plusieurs/i.test(block.getAttribute("data-type") ?? ""),
      explanation: clean(
        block.querySelector<HTMLElement>(
          "[data-explanation],.explanation,.correction",
        )?.textContent ?? "",
      ),
    };
  });
}
function text(source: string): Raw[] {
  return source
    .replace(/\r/g, "\n")
    .split(/\n\s*(?=(?:question\s*)?\d+\s*[).:\-])/i)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map(clean).filter(Boolean),
        opts = lines.filter((x) => /^(?:[A-Z]|\d+)[).:\-]\s+/.test(x)),
        answer =
          lines.find((x) =>
            /^(?:rÃ©ponse|rÃ©ponses|reponses|answer|correct)\s*:/i.test(x),
          ) ?? "",
        answers = tokens(answer),
        prompt = clean(
          lines
            .filter(
              (x) =>
                !opts.includes(x) &&
                x !== answer &&
                !/^(?:explication|explanation|correction)\s*:/i.test(x),
            )
            .join(" ")
            .replace(/^\s*(?:question\s*)?\d+\s*[).:\-]\s*/i, ""),
        );
      return {
        prompt,
        options: opts.map(option),
        answers,
        multiple: answers.length > 1,
        explanation: "",
      };
    });
}
async function extract(file: File): Promise<Raw[]> {
  const name = file.name.toLowerCase();
  if (/\.html?$/.test(name)) return html(await file.text());
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return text(
      (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }))
        .value,
    );
  }
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
      }).promise,
      pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const content = await (await pdf.getPage(n)).getTextContent();
      pages.push(
        content.items.map((x) => ("str" in x ? x.str : "")).join("\n"),
      );
    }
    return text(pages.join("\n\n"));
  }
  throw new Error("UNSUPPORTED_DOCUMENT");
}
function convert(raw: Raw[]): Result<ExamQuestion> {
  const errors: string[] = [];
  const questions = raw.map((q, i) => {
    const id = `document-question-${Date.now()}-${i + 1}`,
      ids = q.options.map((_, j) => `${id}-option-${j + 1}`),
      correctOptionIds = [
        ...new Set(
          q.answers.flatMap((a) => {
            const letter = /^[A-Z]$/i.test(a)
                ? a.toUpperCase().charCodeAt(0) - 65
                : -1,
              n = Number(a),
              p =
                letter >= 0
                  ? letter
                  : Number.isInteger(n)
                    ? n >= 1
                      ? n - 1
                      : n
                    : q.options.findIndex(
                        (o) =>
                          clean(o).toLowerCase() === clean(a).toLowerCase(),
                      );
            return ids[p] ? [ids[p]] : [];
          }),
        ),
      ];
    if (!q.prompt) errors.push(`QUESTION_${i + 1}_PROMPT_NOT_DETECTED`);
    if (q.options.length < 2)
      errors.push(`QUESTION_${i + 1}_OPTIONS_NOT_DETECTED`);
    if (!correctOptionIds.length)
      errors.push(`QUESTION_${i + 1}_ANSWER_NOT_DETECTED`);
    return {
      id,
      domain: "fundamentals" as const,
      difficulty: "medium" as const,
      type: q.multiple ? ("multiple" as const) : ("single" as const),
      section: q.multiple ? ("qcm" as const) : ("qcu" as const),
      prompt: q.prompt,
      options: q.options.map((text, j) => ({ id: ids[j], text })),
      correctOptionIds,
      explanation: q.explanation,
      points: 1,
    };
  });
  return { questions: errors.length ? [] : questions, errors };
}
export async function importExamQuestionDocument(
  file: File,
): Promise<Result<ExamQuestion>> {
  if (/\.(csv|json)$/i.test(file.name)) return importExamQuestions(file);
  try {
    return convert(await extract(file));
  } catch (error) {
    return {
      questions: [],
      errors: [error instanceof Error ? error.message : "INVALID_DOCUMENT"],
    };
  }
}
export async function importQuizQuestionDocument(
  file: File,
): Promise<Result<QuizQuestion>> {
  const result = await importExamQuestionDocument(file);
  return {
    errors: result.errors,
    questions: result.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      promptEn: q.promptEn,
      type: q.type === "multiple" ? "multiple" : "single",
      options: q.options ?? [],
      correctOptionIds: q.correctOptionIds ?? [],
      explanation: q.explanation,
      explanationEn: q.explanationEn,
      points: q.points,
    })),
  };
}
