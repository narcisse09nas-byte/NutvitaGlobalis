"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  Brain,
  Send,
  Sparkles,
} from "lucide-react";

import { generateAiProResponse } from "@/lib/ai-pro-engine";
import type {
  AiProMode,
  AiProResponse,
} from "@/types/ai-pro";
import { useLanguage } from "@/hooks/use-language";

const modes: Array<{
  id: AiProMode;
  label: { fr: string; en: string };
}> = [
  { id: "explain", label: { fr: "Expliquer", en: "Explain" } },
  { id: "summarize", label: { fr: "Résumer", en: "Summarize" } },
  { id: "revision", label: { fr: "Fiche de révision", en: "Revision sheet" } },
  { id: "quiz", label: { fr: "Générer un quiz", en: "Generate a quiz" } },
  { id: "case-study", label: { fr: "Cas pratique", en: "Case study" } },
  { id: "study-plan", label: { fr: "Plan d’étude", en: "Study plan" } },
  { id: "performance", label: { fr: "Analyser la performance", en: "Analyze performance" } },
];

export function AiProWorkspace() {
  const { locale, text } = useLanguage();
  const [mode, setMode] =
    useState<AiProMode>(
      "explain"
    );

  const [prompt, setPrompt] =
    useState("");

  const [response, setResponse] =
    useState<AiProResponse | null>(
      null
    );

  function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!prompt.trim()) {
      return;
    }

    setResponse(
      generateAiProResponse({
        mode,
        locale,
        prompt: prompt.trim(),
        context: {
          courseTitle:
            "Certified Acute Malnutrition Management Specialist",
          progressPercent: 35,
          lastQuizScore: 70,
          lastExamScore: null,
          weakDomains: [
            text("Anthropométrie", "Anthropometry"),
            text("Œdèmes nutritionnels", "Nutritional oedema"),
          ],
        },
      })
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="rounded-[28px] border border-green-100 bg-white p-6">
        <Brain className="text-[#0B5D3B]" />

        <h2 className="mt-4 text-xl font-extrabold text-[#063D2E]">
          Modes IA
        </h2>

        <div className="mt-5 space-y-2">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                setMode(item.id)
              }
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-bold ${
                mode === item.id
                  ? "bg-[#0B5D3B] text-white"
                  : "bg-[#F8FAFC] text-slate-600"
              }`}
            >
              {item.label[locale]}
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-6">
        <form
          onSubmit={submit}
          className="rounded-[28px] border border-green-100 bg-white p-6"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="text-[#F58220]" />
            <h2 className="text-xl font-extrabold text-[#063D2E]">
              {text("Votre demande", "Your request")}
            </h2>
          </div>

          <textarea
            value={prompt}
            onChange={(event) =>
              setPrompt(event.target.value)
            }
            rows={5}
            placeholder={text(
              "Exemple : explique-moi la différence entre MAM et MAS avec un cas pratique.",
              "Example: explain the difference between MAM and SAM using a case study.",
            )}
            className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0B5D3B]"
          />

          <button
            type="submit"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#F58220] px-6 py-3 font-bold text-white"
          >
            <Send size={18} />
            {text("Générer", "Generate")}
          </button>
        </form>

        {response && (
          <article className="rounded-[28px] border border-green-100 bg-white p-7">
            <h2 className="text-2xl font-extrabold text-[#063D2E]">
              {response.title}
            </h2>

            <p className="mt-5 whitespace-pre-wrap leading-7 text-slate-700">
              {response.content}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {response.suggestions.map(
                (suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      setPrompt(suggestion)
                    }
                    className="rounded-full bg-[#DDF5E8] px-4 py-2 text-sm font-bold text-[#0B5D3B]"
                  >
                    {suggestion}
                  </button>
                )
              )}
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
