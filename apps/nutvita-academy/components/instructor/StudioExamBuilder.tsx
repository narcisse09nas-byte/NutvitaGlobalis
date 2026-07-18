"use client";

import { FormEvent, useState } from "react";
import { FileUp, Plus, Trash2 } from "lucide-react";
import { createStudioId } from "@/lib/instructor-storage";
import type { ExamDifficulty, ExamDomain, ExamQuestion, ExamQuestionType } from "@/types/exam";
import { CERTIFICATION_EXAM_BLUEPRINT, CERTIFICATION_RETAKE_DELAYS, getQuestionPoolCapacity } from "@/lib/exam-engine";
import { importExamQuestionDocument, QUESTION_IMPORT_FORMATS } from "@/lib/question-document-import";
import { useLanguage } from "@/hooks/use-language";
import type { StudioCourse } from "@/types/instructor-studio";

type Props = {
  course: StudioCourse;
  onChange: (patch: Partial<StudioCourse>) => void;
};

const domains: { value: ExamDomain; fr: string; en: string }[] = [
  { value: "fundamentals", fr: "Fondamentaux", en: "Fundamentals" },
  { value: "anthropometry", fr: "AnthropomÃ©trie", en: "Anthropometry" },
  { value: "screening", fr: "DÃ©pistage", en: "Screening" },
  { value: "clinical", fr: "Clinique", en: "Clinical" },
  { value: "cmam", fr: "PCIMA/CMAM", en: "CMAM" },
  { value: "monitoring", fr: "Suivi", en: "Monitoring" },
];

export function StudioExamBuilder({ course, onChange }: Props) {
  const { text } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [promptEn, setPromptEn] = useState("");
  const [domain, setDomain] = useState<ExamDomain>("fundamentals");
  const [difficulty, setDifficulty] = useState<ExamDifficulty>("medium");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [optionsEn, setOptionsEn] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctIndexes, setCorrectIndexes] = useState<number[]>([0]);
  const [questionType, setQuestionType] = useState<ExamQuestionType>("single");
  const [caseText, setCaseText] = useState("");
  const [caseTextEn, setCaseTextEn] = useState("");
  const [numericAnswer, setNumericAnswer] = useState(0);
  const [numericTolerance, setNumericTolerance] = useState(0);
  const [importing, setImporting] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explanationEn, setExplanationEn] = useState("");

  function createExam() {
    onChange({
      finalExam: {
        definition: {
          id: createStudioId("exam"),
          slug: `${course.slug}-final`,
          code: `${course.code}-FINAL`,
          title: `Examen final â€” ${course.title}`,
          titleEn: `Final exam â€” ${course.titleEn}`,
          description: `Ã‰valuation finale certifiante de la formation ${course.title}.`,
          descriptionEn: `Final certification assessment for ${course.titleEn}.`,
          courseSlug: course.slug,
          courseTitle: course.title,
          durationMinutes: 180,
          passingScore: 70,
          maxAttempts: 3,
          blueprint: CERTIFICATION_EXAM_BLUEPRINT,
          retakeDelayDays: CERTIFICATION_RETAKE_DELAYS,
          domainRules: [],
          shuffleQuestions: true,
          shuffleOptions: true,
          maxFocusViolations: 5,
          autosaveIntervalSeconds: 10,
        },
        questions: [],
      },
    });
  }

  function updateDefinition(
    patch: Partial<NonNullable<StudioCourse["finalExam"]>["definition"]>,
  ) {
    if (!course.finalExam) return;
    onChange({
      finalExam: {
        ...course.finalExam,
        definition: { ...course.finalExam.definition, ...patch },
      },
    });
  }

  function setQuestions(questions: ExamQuestion[]) {
    if (!course.finalExam) return;
    const domainRules = domains
      .map(({ value }) => ({
        domain: value,
        numberOfQuestions: questions.filter(
          (question) => question.domain === value,
        ).length,
      }))
      .filter((rule) => rule.numberOfQuestions > 0);
    onChange({
      finalExam: {
        definition: { ...course.finalExam.definition, domainRules },
        questions,
      },
    });
  }

  function addQuestion(event: FormEvent) {
    event.preventDefault();
    if (!course.finalExam || (!prompt.trim() && !promptEn.trim())) return;
    const numeric = questionType === "numeric";
    const validIndices = numeric
      ? []
      : options
          .map((text, index) => ({ text: text.trim(), index }))
          .filter((item) => item.text || optionsEn[item.index].trim());
    const selectedIndexes = questionType === "multiple"
      ? correctIndexes
      : [correctIndex];
    if (
      (!numeric &&
        (validIndices.length < 2 ||
          !validIndices.some((item) => selectedIndexes.includes(item.index)))) ||
      ((questionType === "case_single" || numeric) &&
        !caseText.trim() &&
        !caseTextEn.trim())
    )
      return;
    const optionIds = validIndices.map(() => createStudioId("exam-option"));
    const question: ExamQuestion = {
      id: createStudioId("exam-question"),
      domain,
      difficulty,
      type: questionType,
      section:
        questionType === "multiple"
          ? "qcm"
          : questionType === "case_single" || numeric
            ? "case_study"
            : "qcu",
      prompt: prompt.trim(),
      promptEn: promptEn.trim(),
      caseText: caseText.trim() || undefined,
      caseTextEn: caseTextEn.trim() || undefined,
      options: numeric
        ? undefined
        : validIndices.map((item, index) => ({
            id: optionIds[index],
            text: item.text,
            textEn: optionsEn[item.index].trim(),
          })),
      correctOptionIds: numeric
        ? undefined
        : validIndices.flatMap((item, index) =>
            selectedIndexes.includes(item.index) ? [optionIds[index]] : [],
          ),
      correctNumericAnswer: numeric ? numericAnswer : undefined,
      numericTolerance: numeric ? numericTolerance : undefined,
      explanation: explanation.trim(),
      explanationEn: explanationEn.trim(),
      points: 1,
    };
    setQuestions([...course.finalExam.questions, question]);
    setPrompt("");
    setPromptEn("");
    setOptions(["", "", "", ""]);
    setOptionsEn(["", "", "", ""]);
    setCorrectIndex(0);
    setCorrectIndexes([0]);
    setCaseText("");
    setCaseTextEn("");
    setExplanation("");
    setExplanationEn("");
  }

  async function handleImport(file: File) {
    if (!course.finalExam) return;
    setImporting(true);
    const result = await importExamQuestionDocument(file);
    setImporting(false);
    if (result.errors.length) {
      window.alert(
        text(
          `Import refusÃ© : ${result.errors.slice(0, 10).join(", ")}`,
          `Import rejected: ${result.errors.slice(0, 10).join(", ")}`,
        ),
      );
      return;
    }
    const existingIds = new Set(course.finalExam.questions.map((item) => item.id));
    const imported = result.questions.filter((item) => !existingIds.has(item.id));
    setQuestions([...course.finalExam.questions, ...imported]);
    window.alert(
      text(
        `${imported.length} question(s) importÃ©e(s).`,
        `${imported.length} question(s) imported.`,
      ),
    );
  }

  if (!course.finalExam)
    return (
      <section className="rounded-[24px] border border-green-100 bg-white p-6">
        <h2 className="text-2xl font-extrabold text-[#063D2E]">
          Examen final / Final exam
        </h2>
        <p className="mt-2 text-slate-500">
          CrÃ©ez simultanÃ©ment les banques franÃ§aise et anglaise. / Build the French and English question banks together.
        </p>
        <button
          type="button"
          onClick={createExam}
          className="mt-5 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
        >
          CrÃ©er lâ€™examen final / Create final exam
        </button>
      </section>
    );

  const { definition, questions } = course.finalExam;
  const capacity = getQuestionPoolCapacity(questions);
  return (
    <section className="rounded-[24px] border border-green-100 bg-white p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-[#063D2E]">
            Examen final / Final exam
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {questions.length} question(s) dans la banque / in the bank
          </p>
          <p className="mt-2 text-xs font-bold text-slate-600">
            QCM/MCQ {capacity.qcm}/50 Â· QCU/SCQ {capacity.qcu}/35 Â· Cas/Case {capacity.case_study}/15
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            window.confirm("Supprimer lâ€™examen final ?") &&
            onChange({ finalExam: null })
          }
          className="text-red-600"
          aria-label="Supprimer"
        >
          <Trash2 size={19} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-[#0B5D3B] bg-green-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-extrabold text-[#063D2E]">Import HTML, Word, PDF, CSV ou JSON / HTML, Word, PDF, CSV or JSON import</p>
            <p className="mt-1 text-xs text-slate-600">{text("Le moteur dÃ©tecte QCU/QCM et les rÃ©ponses marquÃ©es dans les fichiers HTML, DOCX et PDF. Pour Ã©viter une mauvaise correction, toute question sans rÃ©ponse dÃ©tectable est refusÃ©e.", "The engine detects single/multiple-choice questions and marked answers in HTML, DOCX and PDF files. Questions without a detectable answer are rejected.")}</p>
            <a href="/templates/exam-question-bank-template.csv" download className="mt-2 inline-flex text-xs font-bold text-[#0B5D3B] underline">TÃ©lÃ©charger le modÃ¨le / Download template</a>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white">
            <FileUp size={17} /> {importing ? "Importation / Importingâ€¦" : "Importer la banque / Import bank"}
            <input
              type="file"
              accept={QUESTION_IMPORT_FORMATS}
              disabled={importing}
              className="sr-only"
              onChange={(event) => event.target.files?.[0] && void handleImport(event.target.files[0])}
            />
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <fieldset className="rounded-xl border border-blue-200 p-4">
          <legend className="px-2 font-bold text-blue-800">
            ðŸ‡«ðŸ‡· MÃ©tadonnÃ©es
          </legend>
          <input
            value={definition.title}
            onChange={(event) =>
              updateDefinition({ title: event.target.value })
            }
            placeholder="Titre de lâ€™examen"
            className="h-11 w-full rounded-xl border px-3"
          />
          <textarea
            value={definition.description}
            onChange={(event) =>
              updateDefinition({ description: event.target.value })
            }
            placeholder="Description"
            rows={2}
            className="mt-3 w-full rounded-xl border px-3 py-2"
          />
        </fieldset>
        <fieldset className="rounded-xl border border-amber-200 p-4">
          <legend className="px-2 font-bold text-amber-800">ðŸ‡¬ðŸ‡§ Metadata</legend>
          <input
            value={definition.titleEn ?? ""}
            onChange={(event) =>
              updateDefinition({ titleEn: event.target.value })
            }
            placeholder="Exam title"
            className="h-11 w-full rounded-xl border px-3"
          />
          <textarea
            value={definition.descriptionEn ?? ""}
            onChange={(event) =>
              updateDefinition({ descriptionEn: event.target.value })
            }
            placeholder="Description"
            rows={2}
            className="mt-3 w-full rounded-xl border px-3 py-2"
          />
        </fieldset>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="text-sm font-bold text-[#063D2E]">
          DurÃ©e / Duration (min)
          <input
            type="number"
            min={1}
            value={definition.durationMinutes}
            onChange={(event) =>
              updateDefinition({ durationMinutes: Number(event.target.value) })
            }
            className="mt-2 h-11 w-full rounded-xl border px-3"
          />
        </label>
        <label className="text-sm font-bold text-[#063D2E]">
          Score requis / Passing score (%)
          <input
            type="number"
            readOnly
            value={definition.passingScore}
            className="mt-2 h-11 w-full rounded-xl border bg-slate-100 px-3"
          />
        </label>
        <label className="text-sm font-bold text-[#063D2E]">
          Tentatives / Attempts
          <input
            type="number"
            value={definition.maxAttempts}
            min={0}
            onChange={(event) => updateDefinition({ maxAttempts: Math.max(0, Number(event.target.value)) })}
            className="mt-2 h-11 w-full rounded-xl border px-3"
          />
          <span className="mt-1 block text-xs text-slate-500">0 = illimite / unlimited</span>
        </label>
      </div>

      {questions.length > 0 && (
        <div className="mt-5 space-y-2">
          {questions.slice(0, 100).map((question, index) => (
            <div
              key={question.id}
              className="flex justify-between gap-3 rounded-xl bg-green-50 p-3 text-sm"
            >
              <span>
                {index + 1}. ðŸ‡«ðŸ‡· {question.prompt || "â€”"}
                <br />
                ðŸ‡¬ðŸ‡§ {question.promptEn || "Missing English question"}{" "}
                <span className="text-slate-400">
                  Â· {domains.find((item) => item.value === question.domain)?.fr}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuestions(
                    questions.filter((item) => item.id !== question.id),
                  )
                }
                className="text-red-600"
                aria-label="Supprimer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {questions.length > 100 && (
            <p className="rounded-xl bg-slate-50 p-3 text-center text-xs font-bold text-slate-600">
              {text(`100 affichÃ©es sur ${questions.length}`, `Showing 100 of ${questions.length}`)}
            </p>
          )}
        </div>
      )}

      <form
        onSubmit={addQuestion}
        className="mt-5 rounded-2xl bg-[#F8FAFC] p-5"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <ExamLanguageFields
            language="fr"
            prompt={prompt}
            setPrompt={setPrompt}
            options={options}
            setOptions={setOptions}
            explanation={explanation}
            setExplanation={setExplanation}
            correctIndex={correctIndex}
            setCorrectIndex={setCorrectIndex}
            correctIndexes={correctIndexes}
            setCorrectIndexes={setCorrectIndexes}
            questionType={questionType}
            caseText={caseText}
            setCaseText={setCaseText}
          />
          <ExamLanguageFields
            language="en"
            prompt={promptEn}
            setPrompt={setPromptEn}
            options={optionsEn}
            setOptions={setOptionsEn}
            explanation={explanationEn}
            setExplanation={setExplanationEn}
            correctIndex={correctIndex}
            setCorrectIndex={setCorrectIndex}
            correctIndexes={correctIndexes}
            setCorrectIndexes={setCorrectIndexes}
            questionType={questionType}
            caseText={caseTextEn}
            setCaseText={setCaseTextEn}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <select
            value={questionType}
            onChange={(event) => {
              const value = event.target.value as ExamQuestionType;
              setQuestionType(value);
              setCorrectIndex(0);
              setCorrectIndexes([0]);
            }}
            className="h-11 rounded-xl border bg-white px-3"
          >
            <option value="multiple">QCM / Multiple choice</option>
            <option value="single">QCU / Single choice</option>
            <option value="true_false">Vrai-Faux / True-False</option>
            <option value="case_single">Cas pratique / Case study</option>
            <option value="numeric">RÃ©ponse numÃ©rique / Numeric answer</option>
          </select>
          <select
            value={domain}
            onChange={(event) => setDomain(event.target.value as ExamDomain)}
            className="h-11 rounded-xl border bg-white px-3"
          >
            {domains.map((item) => (
              <option key={item.value} value={item.value}>
                {item.fr} / {item.en}
              </option>
            ))}
          </select>
          {questionType === "numeric" && (
            <>
              <label className="text-xs font-bold text-slate-600">
                RÃ©ponse / Answer
                <input type="number" value={numericAnswer} onChange={(event) => setNumericAnswer(Number(event.target.value))} className="block h-11 rounded-xl border px-3" />
              </label>
              <label className="text-xs font-bold text-slate-600">
                TolÃ©rance / Tolerance
                <input type="number" min={0} step="any" value={numericTolerance} onChange={(event) => setNumericTolerance(Number(event.target.value))} className="block h-11 rounded-xl border px-3" />
              </label>
            </>
          )}
          <select
            value={difficulty}
            onChange={(event) =>
              setDifficulty(event.target.value as ExamDifficulty)
            }
            className="h-11 rounded-xl border bg-white px-3"
          >
            <option value="easy">Facile / Easy</option>
            <option value="medium">Moyen / Medium</option>
            <option value="hard">Difficile / Hard</option>
            <option value="expert">Expert</option>
          </select>
          <button className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-bold text-white">
            <Plus size={15} /> Ajouter / Add question
          </button>
        </div>
      </form>
    </section>
  );
}

type ExamLanguageFieldsProps = {
  language: "fr" | "en";
  prompt: string;
  setPrompt: (value: string) => void;
  options: string[];
  setOptions: React.Dispatch<React.SetStateAction<string[]>>;
  explanation: string;
  setExplanation: (value: string) => void;
  correctIndex: number;
  setCorrectIndex: (value: number) => void;
  correctIndexes: number[];
  setCorrectIndexes: React.Dispatch<React.SetStateAction<number[]>>;
  questionType: ExamQuestionType;
  caseText: string;
  setCaseText: (value: string) => void;
};

function ExamLanguageFields(props: ExamLanguageFieldsProps) {
  const isFrench = props.language === "fr";
  return (
    <fieldset
      className={`rounded-xl border p-4 ${isFrench ? "border-blue-200" : "border-amber-200"}`}
    >
      <legend
        className={`px-2 font-bold ${isFrench ? "text-blue-800" : "text-amber-800"}`}
      >
        {isFrench ? "ðŸ‡«ðŸ‡· Question" : "ðŸ‡¬ðŸ‡§ Question"}
      </legend>
      <input
        value={props.prompt}
        onChange={(event) => props.setPrompt(event.target.value)}
        placeholder={isFrench ? "Ã‰noncÃ© de la question" : "Question prompt"}
        className="h-11 w-full rounded-xl border px-3"
      />
      {(props.questionType === "case_single" || props.questionType === "numeric") && (
        <textarea
          value={props.caseText}
          onChange={(event) => props.setCaseText(event.target.value)}
          placeholder={isFrench ? "ScÃ©nario du cas pratique" : "Case study scenario"}
          rows={3}
          className="mt-3 w-full rounded-xl border px-3 py-2"
        />
      )}
      {props.questionType !== "numeric" && <div className="mt-3 space-y-2">
        {props.options.map((option, index) => (
          <label key={index} className="flex items-center gap-2">
            {isFrench ? (
              <input
                type={props.questionType === "multiple" ? "checkbox" : "radio"}
                name="exam-correct"
                checked={
                  props.questionType === "multiple"
                    ? props.correctIndexes.includes(index)
                    : props.correctIndex === index
                }
                onChange={() =>
                  props.questionType === "multiple"
                    ? props.setCorrectIndexes((current) =>
                        current.includes(index)
                          ? current.filter((item) => item !== index)
                          : [...current, index],
                      )
                    : props.setCorrectIndex(index)
                }
                className="accent-[#0B5D3B]"
              />
            ) : (
              <span className="w-4 text-xs font-bold">
                {(props.questionType === "multiple"
                  ? props.correctIndexes.includes(index)
                  : props.correctIndex === index) ? "âœ“" : ""}
              </span>
            )}
            <input
              value={option}
              onChange={(event) =>
                props.setOptions((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? event.target.value : item,
                  ),
                )
              }
              placeholder={`Option ${index + 1}`}
              className="h-10 flex-1 rounded-xl border px-3"
            />
          </label>
        ))}
      </div>}
      <input
        value={props.explanation}
        onChange={(event) => props.setExplanation(event.target.value)}
        placeholder={
          isFrench ? "Explication de la correction" : "Answer explanation"
        }
        className="mt-3 h-10 w-full rounded-xl border px-3"
      />
    </fieldset>
  );
}