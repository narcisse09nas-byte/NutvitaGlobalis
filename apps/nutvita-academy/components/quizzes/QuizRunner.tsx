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

import type {
  QuizAnswers,
  QuizCorrectionItem,
  QuizDefinition,
  QuizResult,
} from "@/types/quiz";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useProgress } from "@/hooks/use-progress";
import { useQuiz } from "@/hooks/use-quiz";
import { useLanguage } from "@/hooks/use-language";

import { createAttemptId } from "@/lib/quiz-storage";

import { QuizResults } from "@/components/quizzes/QuizResults";

type QuizRunnerProps = {
  quiz: QuizDefinition;
};

function arraysMatch(first: string[], second: string[]): boolean {
  const normalizedFirst = [...first].sort();

  const normalizedSecond = [...second].sort();

  return (
    normalizedFirst.length === normalizedSecond.length &&
    normalizedFirst.every((value, index) => value === normalizedSecond[index])
  );
}

export function QuizRunner({ quiz }: QuizRunnerProps) {
  const { text } = useLanguage();
  const { user } = useLocalAuth();

  const { recordAttempt, getQuizAttempts } = useQuiz();

  const { completeLesson } = useProgress();

  const initialSeconds = quiz.durationMinutes * 60;

  const startedAtRef = useRef(new Date().toISOString());

  const submittingRef = useRef(false);

  const [answers, setAnswers] = useState<QuizAnswers>({});

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);

  const [result, setResult] = useState<QuizResult | null>(null);

  const attempts = getQuizAttempts(quiz.slug);

  const attemptsRemaining = Math.max(0, quiz.maxAttempts - attempts.length);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  const answeredQuestions = useMemo(
    () =>
      quiz.questions.filter(
        (question) => (answers[question.id] ?? []).length > 0,
      ).length,
    [answers, quiz.questions],
  );

  const submitQuiz = useCallback(() => {
    if (!user || submittingRef.current || result) {
      return;
    }

    submittingRef.current = true;

    const corrections: QuizCorrectionItem[] = quiz.questions.map((question) => {
      const selectedOptionIds = answers[question.id] ?? [];

      return {
        question,
        selectedOptionIds,
        isCorrect: arraysMatch(selectedOptionIds, question.correctOptionIds),
      };
    });

    const correctAnswers = corrections.filter((item) => item.isCorrect).length;

    const totalPoints = quiz.questions.reduce(
      (total, question) => total + question.points,
      0,
    );

    const earnedPoints = corrections.reduce(
      (total, item) => total + (item.isCorrect ? item.question.points : 0),
      0,
    );

    const scorePercent =
      totalPoints === 0 ? 0 : Math.round((earnedPoints / totalPoints) * 100);

    const passed = scorePercent >= quiz.passingScore;

    const attempt = {
      id: createAttemptId(),
      userId: user.id,
      quizSlug: quiz.slug,
      answers,
      scorePercent,
      correctAnswers,
      totalQuestions: quiz.questions.length,
      passed,
      startedAt: startedAtRef.current,
      submittedAt: new Date().toISOString(),
      durationSeconds: initialSeconds - remainingSeconds,
    };

    recordAttempt(attempt);

    if (passed) {
      completeLesson({
        lessonId: quiz.lessonId,
        courseSlug: quiz.courseSlug,
        moduleSlug: quiz.moduleSlug,
        lessonSlug: quiz.lessonSlug,
      });
    }

    setResult({
      attempt,
      corrections,
    });

    submittingRef.current = false;
  }, [
    answers,
    completeLesson,
    initialSeconds,
    quiz,
    recordAttempt,
    remainingSeconds,
    result,
    user,
  ]);

  useEffect(() => {
    if (result) {
      return;
    }

    if (remainingSeconds <= 0) {
      submitQuiz();
      return;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds, result, submitQuiz]);

  function handleOptionChange(
    questionId: string,
    optionId: string,
    questionType: "single" | "multiple",
  ) {
    setAnswers((current) => {
      if (questionType === "single") {
        return {
          ...current,
          [questionId]: [optionId],
        };
      }

      const existing = current[questionId] ?? [];

      const selected = existing.includes(optionId);

      return {
        ...current,
        [questionId]: selected
          ? existing.filter((id) => id !== optionId)
          : [...existing, optionId],
      };
    });
  }

  function restartQuiz() {
    startedAtRef.current = new Date().toISOString();

    submittingRef.current = false;

    setAnswers({});
    setCurrentQuestionIndex(0);
    setRemainingSeconds(initialSeconds);
    setResult(null);
  }

  if (!user) {
    return null;
  }

  if (attemptsRemaining === 0 && !result) {
    return (
      <div className="rounded-[28px] border border-orange-200 bg-orange-50 p-10 text-center">
        <AlertTriangle size={44} className="mx-auto text-orange-600" />

        <h2 className="mt-5 text-3xl font-extrabold text-[#063D2E]">
          {text(
            "Nombre maximal de tentatives atteint",
            "Maximum number of attempts reached",
          )}
        </h2>

        <p className="mt-3 text-slate-600">
          {text(
            `Vous avez utilisé les ${quiz.maxAttempts} tentatives autorisées pour ce quiz.`,
            `You have used all ${quiz.maxAttempts} attempts allowed for this quiz.`,
          )}
        </p>
      </div>
    );
  }

  if (result) {
    return (
      <QuizResults
        quiz={quiz}
        result={result}
        canRetry={attemptsRemaining > 0 && !result.attempt.passed}
        onRetry={restartQuiz}
      />
    );
  }

  const minutes = Math.floor(remainingSeconds / 60);

  const seconds = remainingSeconds % 60;

  const timerCritical = remainingSeconds <= 60;

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-green-100 bg-white p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#F58220]">
              {text("Question", "Question")} {currentQuestionIndex + 1}{" "}
              {text("sur", "of")} {quiz.questions.length}
            </p>

            <h1 className="mt-2 text-2xl font-extrabold text-[#063D2E]">
              {quiz.title}
            </h1>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-full px-5 py-3 font-extrabold ${
              timerCritical
                ? "bg-red-100 text-red-700"
                : "bg-[#DDF5E8] text-[#0B5D3B]"
            }`}
          >
            <Clock3 size={20} />
            {minutes.toString().padStart(2, "0")}:
            {seconds.toString().padStart(2, "0")}
          </div>
        </div>

        <div className="mt-6 h-2 overflow-hidden rounded-full bg-green-100">
          <div
            className="h-full rounded-full bg-[#0B5D3B] transition-all"
            style={{
              width: `${
                ((currentQuestionIndex + 1) / quiz.questions.length) * 100
              }%`,
            }}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-green-100 bg-white p-6 md:p-8">
        <h2 className="text-xl font-extrabold leading-8 text-[#063D2E] md:text-2xl">
          {currentQuestion.prompt}
        </h2>

        <p className="mt-3 text-sm text-slate-500">
          {currentQuestion.type === "multiple"
            ? text(
                "Plusieurs réponses peuvent être correctes.",
                "Several answers may be correct.",
              )
            : text("Sélectionnez une seule réponse.", "Select one answer.")}
        </p>

        <div className="mt-7 space-y-3">
          {currentQuestion.options.map((option) => {
            const selected = (answers[currentQuestion.id] ?? []).includes(
              option.id,
            );

            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                  selected
                    ? "border-[#0B5D3B] bg-[#DDF5E8]"
                    : "border-slate-200 bg-white hover:bg-green-50"
                }`}
              >
                <input
                  type={
                    currentQuestion.type === "single" ? "radio" : "checkbox"
                  }
                  name={currentQuestion.id}
                  checked={selected}
                  onChange={() =>
                    handleOptionChange(
                      currentQuestion.id,
                      option.id,
                      currentQuestion.type,
                    )
                  }
                  className="mt-1 h-4 w-4 accent-[#0B5D3B]"
                />

                <span className="text-sm leading-6 text-slate-700">
                  {option.text}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            disabled={currentQuestionIndex === 0}
            onClick={() =>
              setCurrentQuestionIndex((current) => Math.max(0, current - 1))
            }
            className="inline-flex items-center gap-2 rounded-full border border-[#0B5D3B] px-5 py-3 text-sm font-bold text-[#0B5D3B] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} />
            {text("Précédente", "Previous")}
          </button>

          {currentQuestionIndex < quiz.questions.length - 1 ? (
            <button
              type="button"
              onClick={() =>
                setCurrentQuestionIndex((current) =>
                  Math.min(quiz.questions.length - 1, current + 1),
                )
              }
              className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-3 text-sm font-bold text-white"
            >
              {text("Suivante", "Next")}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submitQuiz}
              className="inline-flex items-center gap-2 rounded-full bg-[#F58220] px-6 py-3 text-sm font-bold text-white"
            >
              <Send size={18} />
              {text("Soumettre le quiz", "Submit quiz")}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-green-100 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-bold text-[#063D2E]">
            {answeredQuestions}/{quiz.questions.length}{" "}
            {text("questions répondues", "questions answered")}
          </p>

          <div className="flex flex-wrap gap-2">
            {quiz.questions.map((question, index) => {
              const answered = (answers[question.id] ?? []).length > 0;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    index === currentQuestionIndex
                      ? "bg-[#0B5D3B] text-white"
                      : answered
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {answered ? <CheckCircle2 size={17} /> : index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
