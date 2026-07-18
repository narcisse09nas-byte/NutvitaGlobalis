"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Send,
} from "lucide-react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useExam } from "@/hooks/use-exam";
import { useProctoring } from "@/hooks/use-proctoring";

import {
  buildExamQuestions,
  createExamSession,
  gradeExam,
} from "@/lib/exam-engine";

import {
  loadExamSession,
  removeExamSession,
  saveExamSession,
} from "@/lib/exam-storage";

import { getExamQuestionsByIds } from "@/data/exam-question-bank";

import type {
  ExamAnswerValue,
  ExamDefinition,
  ExamQuestion,
  ExamSession,
} from "@/types/exam";

import { ExamInstructions } from "@/components/exams/ExamInstructions";
import { ExamResults } from "@/components/exams/ExamResults";
import { useLanguage } from "@/hooks/use-language";

export function ExamRunner({
  exam,
  questionPool,
  bookingId,
  paperId,
  attemptNumber,
}: {
  exam: ExamDefinition;
  questionPool?: ExamQuestion[];
  bookingId?: string;
  paperId?: string;
  attemptNumber?: number;
}) {
  const { text } = useLanguage();
  const { user } = useLocalAuth();

  const { recordAttempt, getAttemptsByExam } = useExam();
  const { recordAttemptResult } = useProctoring();

  const [session, setSession] = useState<ExamSession | null>(null);

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  const [completedAttempt, setCompletedAttempt] = useState<ReturnType<
    typeof gradeExam
  > | null>(null);

  const [savedSessionAvailable, setSavedSessionAvailable] = useState(false);

  const submittingRef = useRef(false);

  const attempts = getAttemptsByExam(exam.slug);

  const attemptsRemaining = exam.maxAttempts <= 0 ? Number.POSITIVE_INFINITY : Math.max(0, exam.maxAttempts - attempts.length);

  useEffect(() => {
    if (!user) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const saved = loadExamSession(user.id, exam.slug);

      setSavedSessionAvailable(
        Boolean(saved && saved.status === "in_progress"),
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [exam.slug, user]);

  const updateSession = useCallback(
    (updater: (current: ExamSession) => ExamSession) => {
      setSession((current) => {
        if (!current) {
          return current;
        }

        const updated = {
          ...updater(current),
          updatedAt: new Date().toISOString(),
        };

        saveExamSession(updated);

        return updated;
      });
    },
    [],
  );

  function startNewExam() {
    if (!user || attemptsRemaining <= 0) {
      return;
    }

    const selectedQuestions = paperId && questionPool
      ? questionPool
      : buildExamQuestions(exam, questionPool);

    const newSession = createExamSession(user.id, exam, selectedQuestions, {
      bookingId,
      paperId,
      attemptNumber,
    });

    saveExamSession(newSession);

    setQuestions(selectedQuestions);

    setSession(newSession);

    setCompletedAttempt(null);

    setSavedSessionAvailable(true);
  }

  function resumeExam() {
    if (!user) {
      return;
    }

    const saved = loadExamSession(user.id, exam.slug);

    if (!saved) {
      return;
    }

    const restoredQuestions = questionPool
      ? saved.questionIds.flatMap(
          (id) => questionPool.find((question) => question.id === id) ?? [],
        )
      : getExamQuestionsByIds(saved.questionIds);

    setQuestions(restoredQuestions);

    setSession(saved);

    setCompletedAttempt(null);
  }

  const submitExam = useCallback(() => {
    if (!user || !session || submittingRef.current) {
      return;
    }

    submittingRef.current = true;

    const finalAttempt = gradeExam({
      userId: user.id,
      definition: exam,
      session,
      questions,
    });

    finalAttempt.resultVisibility = bookingId ? "pending_review" : "published";
    recordAttempt(finalAttempt);
    if (bookingId) recordAttemptResult(bookingId, finalAttempt);

    removeExamSession(user.id, exam.slug);

    setCompletedAttempt(finalAttempt);

    setSession(null);

    setSavedSessionAvailable(false);

    submittingRef.current = false;
  }, [bookingId, exam, questions, recordAttempt, recordAttemptResult, session, user]);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (session.remainingSeconds <= 0) {
      submitExam();
      return;
    }

    const timer = window.setInterval(() => {
      updateSession((current) => ({
        ...current,

        remainingSeconds: Math.max(0, current.remainingSeconds - 1),
      }));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [session, submitExam, updateSession]);

  useEffect(() => {
    if (!session) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        updateSession((current) => ({
          ...current,

          focusViolations: current.focusViolations + 1,
        }));
      }
    }

    function handleWindowBlur() {
      updateSession((current) => ({
        ...current,

        focusViolations: current.focusViolations + 1,
      }));
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [session, updateSession]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const autosave = window.setInterval(() => {
      saveExamSession(session);
    }, exam.autosaveIntervalSeconds * 1000);

    return () => window.clearInterval(autosave);
  }, [exam, session]);

  const answeredCount = useMemo(() => {
    if (!session) {
      return 0;
    }

    return questions.filter((question) => {
      const answer = session.answers[question.id];

      if (Array.isArray(answer)) {
        return answer.length > 0;
      }

      return answer !== null && answer !== undefined;
    }).length;
  }, [questions, session]);

  function setAnswer(questionId: string, answer: ExamAnswerValue) {
    updateSession((current) => ({
      ...current,

      answers: {
        ...current.answers,
        [questionId]: answer,
      },
    }));
  }

  if (!user) {
    return null;
  }

  if (completedAttempt) {
    if (bookingId) return <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-10 text-center"><CheckCircle2 size={44} className="mx-auto text-amber-700" /><h2 className="mt-5 text-3xl font-extrabold text-[#063D2E]">{text("Copie soumise", "Exam submitted")}</h2><p className="mt-3 text-slate-700">{text("La correction automatique est terminee. Votre resultat reste confidentiel jusqu'a la validation du deroulement par le formateur ou le surveillant.", "Automatic grading is complete. Your result remains confidential until the instructor or proctor validates the conduct of the exam.")}</p></div>;
    return <ExamResults exam={exam} attempt={completedAttempt} />;
  }

  if (!session) {
    return (
      <ExamInstructions
        exam={exam}
        onStart={startNewExam}
        onResume={resumeExam}
        hasSavedSession={savedSessionAvailable}
        disabled={attemptsRemaining <= 0}
      />
    );
  }

  const currentQuestion = questions[session.currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="rounded-[24px] bg-red-50 p-8 text-red-700">
        Impossible de charger les questions de l’examen.
      </div>
    );
  }

  const currentAnswer = session.answers[currentQuestion.id] ?? null;

  const minutes = Math.floor(session.remainingSeconds / 60);

  const seconds = session.remainingSeconds % 60;

  function toggleOption(optionId: string) {
    if (
      currentQuestion.type === "single" ||
      currentQuestion.type === "true_false" ||
      currentQuestion.type === "case_single"
    ) {
      setAnswer(currentQuestion.id, [optionId]);

      return;
    }

    const currentIds = Array.isArray(currentAnswer) ? currentAnswer : [];

    const nextIds = currentIds.includes(optionId)
      ? currentIds.filter((id) => id !== optionId)
      : [...currentIds, optionId];

    setAnswer(currentQuestion.id, nextIds);
  }

  return (
    <div className="space-y-6">
      <section className="sticky top-[76px] z-20 rounded-[24px] border border-green-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#F58220]">
              {text("Question", "Question")} {session.currentQuestionIndex + 1} {text("sur", "of")} {questions.length}
            </p>

            <p className="mt-1 font-extrabold text-[#063D2E]">
              {answeredCount}/{questions.length} {text("réponses enregistrées", "answers saved")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {session.focusViolations > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
                <AlertTriangle size={17} />
                {session.focusViolations} {text("sortie(s)", "exit(s)")}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 font-extrabold ${
                session.remainingSeconds <= 120
                  ? "bg-red-100 text-red-700"
                  : "bg-[#DDF5E8] text-[#0B5D3B]"
              }`}
            >
              <Clock3 size={20} />
              {minutes.toString().padStart(2, "0")}:
              {seconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-green-100 bg-white p-6 md:p-8">
        {currentQuestion.caseText && (
          <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-700">
              {text("Étude de cas", "Case study")}
            </p>

            <p className="mt-3 leading-7 text-orange-950">
              {currentQuestion.caseText}
            </p>
          </div>
        )}

        {currentQuestion.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- Exam content may use data URLs or external sources.
          <img
            src={currentQuestion.imageUrl}
            alt=""
            className="mb-6 max-h-80 w-full rounded-2xl object-contain"
          />
        )}

        <h2 className="text-xl font-extrabold leading-8 text-[#063D2E] md:text-2xl">
          {currentQuestion.prompt}
        </h2>

        {currentQuestion.type === "numeric" ? (
          <div className="mt-7">
            <label className="block max-w-sm">
              <span className="mb-2 block text-sm font-bold text-[#063D2E]">
                {text("Votre réponse", "Your answer")}
              </span>

              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="any"
                  value={typeof currentAnswer === "number" ? currentAnswer : ""}
                  onChange={(event) =>
                    setAnswer(
                      currentQuestion.id,
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#DDF5E8]"
                />

                {currentQuestion.numericUnit && (
                  <span className="font-bold text-slate-600">
                    {currentQuestion.numericUnit}
                  </span>
                )}
              </div>
            </label>
          </div>
        ) : (
          <div className="mt-7 space-y-3">
            {currentQuestion.options?.map((option) => {
              const selected =
                Array.isArray(currentAnswer) &&
                currentAnswer.includes(option.id);

              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                    selected
                      ? "border-[#0B5D3B] bg-[#DDF5E8]"
                      : "border-slate-200 hover:bg-green-50"
                  }`}
                >
                  <input
                    type={
                      currentQuestion.type === "multiple" ? "checkbox" : "radio"
                    }
                    checked={selected}
                    onChange={() => toggleOption(option.id)}
                    className="mt-1 h-4 w-4 accent-[#0B5D3B]"
                  />

                  <span className="text-sm leading-6 text-slate-700">
                    {option.text}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            disabled={session.currentQuestionIndex === 0}
            onClick={() =>
              updateSession((current) => ({
                ...current,

                currentQuestionIndex: Math.max(
                  0,
                  current.currentQuestionIndex - 1,
                ),
              }))
            }
            className="inline-flex items-center gap-2 rounded-full border border-[#0B5D3B] px-5 py-3 text-sm font-bold text-[#0B5D3B] disabled:opacity-40"
          >
            <ChevronLeft size={18} />
            {text("Précédente", "Previous")}
          </button>

          {session.currentQuestionIndex < questions.length - 1 ? (
            <button
              type="button"
              onClick={() =>
                updateSession((current) => ({
                  ...current,

                  currentQuestionIndex: Math.min(
                    questions.length - 1,
                    current.currentQuestionIndex + 1,
                  ),
                }))
              }
              className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-3 text-sm font-bold text-white"
            >
              {text("Suivante", "Next")}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const confirmed = window.confirm(
                  text(
                    `Vous avez répondu à ${answeredCount} question(s) sur ${questions.length}. Voulez-vous soumettre définitivement l’examen ?`,
                    `You answered ${answeredCount} of ${questions.length} question(s). Do you want to submit the exam now?`,
                  ),
                );

                if (confirmed) {
                  submitExam();
                }
              }}
              className="inline-flex items-center gap-2 rounded-full bg-[#F58220] px-6 py-3 text-sm font-bold text-white"
            >
              <Send size={18} />
              {text("Soumettre l’examen", "Submit exam")}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-green-100 bg-white p-6">
        <p className="font-bold text-[#063D2E]">Navigation rapide</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {questions.map((question, index) => {
            const answer = session.answers[question.id];

            const answered = Array.isArray(answer)
              ? answer.length > 0
              : answer !== null && answer !== undefined;

            return (
              <button
                key={question.id}
                type="button"
                onClick={() =>
                  updateSession((current) => ({
                    ...current,

                    currentQuestionIndex: index,
                  }))
                }
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  index === session.currentQuestionIndex
                    ? "bg-[#0B5D3B] text-white"
                    : answered
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {answered ? <CheckCircle2 size={18} /> : index + 1}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
