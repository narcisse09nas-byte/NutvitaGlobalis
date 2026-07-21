"use client";

import { FormEvent, useState } from "react";
import { FileUp, Plus, Trash2 } from "lucide-react";
import { createStudioId, createStudioSlug } from "@/lib/instructor-storage";
import type { StudioCourse } from "@/types/instructor-studio";
import type { QuizDefinition, QuizQuestionType } from "@/types/quiz";
import { importQuizQuestionDocument, QUESTION_IMPORT_FORMATS } from "@/lib/question-document-import";

type Props = {
  course: StudioCourse;
  onChange: (patch: Partial<StudioCourse>) => void;
};

function QuestionComposer({
  onAdd,
}: {
  onAdd: (question: QuizDefinition["questions"][number]) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [promptEn, setPromptEn] = useState("");
  const [type, setType] = useState<QuizQuestionType>("single");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [optionsEn, setOptionsEn] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState<string[]>(["0"]);
  const [explanation, setExplanation] = useState("");
  const [explanationEn, setExplanationEn] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const validIndices = options
      .map((text, index) => ({ text: text.trim(), index }))
      .filter((item) => item.text || optionsEn[item.index].trim());
    if (
      (!prompt.trim() && !promptEn.trim()) ||
      validIndices.length < 2 ||
      validIndices.every((item) => !correct.includes(`${item.index}`))
    )
      return;
    const ids = validIndices.map(() => createStudioId("option"));
    onAdd({
      id: createStudioId("quiz-question"),
      prompt: prompt.trim(),
      promptEn: promptEn.trim(),
      type,
      options: validIndices.map((item, index) => ({
        id: ids[index],
        text: item.text,
        textEn: optionsEn[item.index].trim(),
      })),
      correctOptionIds: validIndices.flatMap((item, index) =>
        correct.includes(`${item.index}`) ? [ids[index]] : [],
      ),
      explanation: explanation.trim(),
      explanationEn: explanationEn.trim(),
      points: 1,
    });
    setPrompt("");
    setPromptEn("");
    setOptions(["", "", "", ""]);
    setOptionsEn(["", "", "", ""]);
    setCorrect(["0"]);
    setExplanation("");
    setExplanationEn("");
  }

  function toggle(index: number) {
    const value = `${index}`;
    if (type === "single") setCorrect([value]);
    else
      setCorrect((current) =>
        current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      );
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl bg-[#F8FAFC] p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="rounded-xl border border-blue-200 p-4">
          <legend className="px-2 font-bold text-blue-800">🇫🇷 Question</legend>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Énoncé français / French prompt"
            className="h-11 w-full rounded-xl border px-3"
          />
          <div className="mt-3 space-y-2">
            {options.map((option, index) => (
              <label key={index} className="flex items-center gap-2">
                <input
                  type={type === "single" ? "radio" : "checkbox"}
                  name={type === "single" ? "quiz-correct-fr" : undefined}
                  checked={correct.includes(`${index}`)}
                  onChange={() => toggle(index)}
                  className="accent-[#0B5D3B]"
                />
                <input
                  value={option}
                  onChange={(event) =>
                    setOptions((current) =>
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
          </div>
          <input
            value={explanation}
            onChange={(event) => setExplanation(event.target.value)}
            placeholder="Explication de la correction"
            className="mt-3 h-10 w-full rounded-xl border px-3"
          />
        </fieldset>
        <fieldset className="rounded-xl border border-amber-200 p-4">
          <legend className="px-2 font-bold text-amber-800">🇬🇧 Question</legend>
          <input
            value={promptEn}
            onChange={(event) => setPromptEn(event.target.value)}
            placeholder="Question prompt"
            className="h-11 w-full rounded-xl border px-3"
          />
          <div className="mt-3 space-y-2">
            {optionsEn.map((option, index) => (
              <div key={index} className="flex h-10 items-center gap-2">
                <span className="w-6 text-center text-xs font-bold text-slate-500">
                  {correct.includes(`${index}`) ? "âœ“" : ""}
                </span>
                <input
                  value={option}
                  onChange={(event) =>
                    setOptionsEn((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    )
                  }
                  placeholder={`Option ${index + 1}`}
                  className="h-10 flex-1 rounded-xl border px-3"
                />
              </div>
            ))}
          </div>
          <input
            value={explanationEn}
            onChange={(event) => setExplanationEn(event.target.value)}
            placeholder="Answer explanation"
            className="mt-3 h-10 w-full rounded-xl border px-3"
          />
        </fieldset>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={type}
          onChange={(event) => {
            setType(event.target.value as QuizQuestionType);
            setCorrect(["0"]);
          }}
          className="h-10 rounded-xl border bg-white px-3"
        >
          <option value="single">Réponse unique / Single answer</option>
          <option value="multiple">
            Réponses multiples / Multiple answers
          </option>
        </select>
        <button className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-bold text-white">
          <Plus size={15} /> Ajouter / Add question
        </button>
      </div>
    </form>
  );
}

export function StudioQuizBuilder({ course, onChange }: Props) {
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [moduleId, setModuleId] = useState(course.modules[0]?.id ?? "");
  const [passingScore, setPassingScore] = useState(70);
  const [importingQuizId, setImportingQuizId] = useState<string | null>(null);

  function addQuiz(event: FormEvent) {
    event.preventDefault();
    const courseModule = course.modules.find((item) => item.id === moduleId);
    if ((!title.trim() && !titleEn.trim()) || !courseModule) return;
    const titleSource = title || titleEn;
    const slug = `${course.slug}-${createStudioSlug(courseModule.title || courseModule.titleEn)}-${createStudioSlug(titleSource)}`;
    const lessonId = createStudioId("quiz-lesson");
    const quiz: QuizDefinition = {
      id: createStudioId("quiz"),
      slug,
      code: `${course.code}-Q${course.quizzes.length + 1}`,
      title: title.trim(),
      titleEn: titleEn.trim(),
      description: `Évaluation du module ${courseModule.title}`,
      descriptionEn: `Assessment for module ${courseModule.titleEn}`,
      courseSlug: course.slug,
      courseTitle: course.title,
      moduleSlug: courseModule.slug,
      moduleTitle: courseModule.title,
      lessonId,
      lessonSlug: `quiz-${course.quizzes.length + 1}`,
      durationMinutes: 10,
      passingScore,
      maxAttempts: 3,
      allowProgressWithoutPassing: true,
      questions: [],
    };
    onChange({
      quizzes: [...course.quizzes, quiz],
      modules: course.modules.map((item) =>
        item.id === courseModule.id
          ? {
              ...item,
              lessons: [
                ...item.lessons,
                {
                  id: lessonId,
                  title: title.trim(),
                  titleEn: titleEn.trim(),
                  slug: quiz.lessonSlug,
                  type: "quiz",
                  durationMinutes: 10,
                  content: quiz.description,
                  contentEn: quiz.descriptionEn ?? "",
                },
              ],
            }
          : item,
      ),
    });
    setTitle("");
    setTitleEn("");
  }

  function updateQuiz(quizId: string, patch: Partial<QuizDefinition>) {
    onChange({
      quizzes: course.quizzes.map((quiz) =>
        quiz.id === quizId ? { ...quiz, ...patch } : quiz,
      ),
    });
  }

  async function importQuestions(quiz: QuizDefinition, file: File) {
    setImportingQuizId(quiz.id);
    const result = await importQuizQuestionDocument(file);
    setImportingQuizId(null);
    if (result.errors.length) { window.alert(`Import refuse / Import rejected: ${result.errors.slice(0, 10).join(", ")}`); return; }
    const existing = new Set(quiz.questions.map((question) => question.id));
    const imported = result.questions.filter((question) => !existing.has(question.id));
    updateQuiz(quiz.id, { questions: [...quiz.questions, ...imported] });
    window.alert(`${imported.length} question(s) imported.`);
  }

  function removeQuiz(quiz: QuizDefinition) {
    if (!window.confirm("Supprimer ce quiz et ses questions ?")) return;
    onChange({
      quizzes: course.quizzes.filter((item) => item.id !== quiz.id),
      modules: course.modules.map((module) => ({
        ...module,
        lessons: module.lessons.filter((lesson) => lesson.id !== quiz.lessonId),
      })),
    });
  }

  return (
    <section className="rounded-[24px] border border-green-100 bg-white p-6">
      <h2 className="text-2xl font-extrabold text-[#063D2E]">
        Quiz bilingues / Bilingual quizzes
      </h2>
      <form
        onSubmit={addQuiz}
        className="mt-5 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(6rem,.55fr)_auto]"
      >
        <select
          required
          value={moduleId}
          onChange={(event) => setModuleId(event.target.value)}
          className="h-12 rounded-xl border bg-white px-3"
        >
          <option value="">Module</option>
          {course.modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.title || module.titleEn}
            </option>
          ))}
        </select>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="🇫🇷 Titre du quiz"
          className="h-12 min-w-0 rounded-xl border px-3"
        />
        <input
          value={titleEn}
          onChange={(event) => setTitleEn(event.target.value)}
          placeholder="🇬🇧 Quiz title"
          className="h-12 min-w-0 rounded-xl border px-3"
        />
        <input
          type="number"
          min={1}
          max={100}
          value={passingScore}
          onChange={(event) => setPassingScore(Number(event.target.value))}
          className="h-12 min-w-0 rounded-xl border px-3"
          title="Score requis / Passing score"
        />
        <button className="min-h-12 whitespace-nowrap rounded-full bg-[#F58220] px-5 py-2 font-bold text-white">
          Créer / Create
        </button>
      </form>
      <div className="mt-6 space-y-5">
        {course.quizzes.map((quiz) => (
          <article
            key={quiz.id}
            className="rounded-2xl border border-slate-200 p-5"
          >
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-[#063D2E]">
                  🇫🇷 {quiz.title || "—"}
                </h3>
                <p className="font-semibold text-slate-600">
                  🇬🇧 {quiz.titleEn || "Missing English title"}
                </p>
                <p className="text-sm text-slate-500">
                  {quiz.questions.length} question(s) · {quiz.passingScore}% ·{" "}
                  {quiz.maxAttempts <= 0 ? "Illimite / Unlimited" : `${quiz.maxAttempts} tentative(s) / attempt(s)`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeQuiz(quiz)}
                className="text-red-600"
                aria-label="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="text-xs font-bold text-slate-600">
                Durée / Duration (min)
                <input
                  type="number"
                  min={1}
                  value={quiz.durationMinutes}
                  onChange={(event) =>
                    updateQuiz(quiz.id, {
                      durationMinutes: Number(event.target.value),
                    })
                  }
                  className="mt-1 h-10 w-full rounded-xl border px-3"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Score requis / Passing score (%)
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quiz.passingScore}
                  onChange={(event) =>
                    updateQuiz(quiz.id, {
                      passingScore: Number(event.target.value),
                    })
                  }
                  className="mt-1 h-10 w-full rounded-xl border px-3"
                />
              </label>
              <label className="text-xs font-bold text-slate-600">
                Tentatives / Attempts
                <input
                  type="number"
                  min={0}
                  value={quiz.maxAttempts}
                  onChange={(event) =>
                    updateQuiz(quiz.id, {
                      maxAttempts: Number(event.target.value),
                    })
                  }
                  className="mt-1 h-10 w-full rounded-xl border px-3"
                />
                <span className="mt-1 block text-xs text-slate-500">0 = illimite / unlimited</span>
              </label>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-slate-700">
              <input type="checkbox" checked={quiz.allowProgressWithoutPassing !== false} onChange={(event) => updateQuiz(quiz.id, { allowProgressWithoutPassing: event.target.checked })} className="mt-1 accent-[#0B5D3B]" />
              <span><strong>Autoriser la poursuite / Allow progression</strong><br />L&apos;apprenant peut ouvrir la suite meme si le score seuil n&apos;est pas atteint. La note reste enregistree.</span>
            </label>
            {quiz.questions.length > 0 && (
              <ol className="mt-4 space-y-2">
                {quiz.questions.map((question, index) => (
                  <li
                    key={question.id}
                    className="flex justify-between rounded-xl bg-green-50 p-3 text-sm"
                  >
                    <span>
                      {index + 1}. 🇫🇷 {question.prompt || "—"}
                      <br />
                      🇬🇧 {question.promptEn || "Missing English question"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuiz(quiz.id, {
                          questions: quiz.questions.filter(
                            (item) => item.id !== question.id,
                          ),
                        })
                      }
                      className="text-red-600"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-[#063D2E]">Importer les questions HTML, Word, PDF, CSV ou JSON</p>
              <p className="mt-1 text-xs text-slate-600">Reponses reconnues : checked, data-correct, classe correct, ou ligne Reponse : A, C.</p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-bold text-white"><FileUp size={16} /> {importingQuizId === quiz.id ? "Importation..." : "Importer / Import"}<input type="file" accept={QUESTION_IMPORT_FORMATS} disabled={importingQuizId === quiz.id} className="sr-only" onChange={(event) => event.target.files?.[0] && void importQuestions(quiz, event.target.files[0])} /></label>
            </div>
            <QuestionComposer
              onAdd={(question) =>
                updateQuiz(quiz.id, {
                  questions: [...quiz.questions, question],
                })
              }
            />
          </article>
        ))}
      </div>
    </section>
  );
}