"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bot,
  LoaderCircle,
  Send,
  Trash2,
  UserCircle,
} from "lucide-react";

import { useAiInstructor } from "@/hooks/use-ai-instructor";
import { useLanguage } from "@/hooks/use-language";

import type {
  AiInstructorContext,
} from "@/types/ai-instructor";

import { AiQuickPrompts } from "@/components/ai/AiQuickPrompts";

export function AiInstructorChat({
  context = {
    courseSlug: "camms",
    courseTitle:
      "Certified Acute Malnutrition Management Specialist",
  },
}: {
  context?: AiInstructorContext;
}) {
  const { text } = useLanguage();
  const {
    conversation,
    isLoading,
    isResponding,
    sendMessage,
    clearConversation,
  } = useAiInstructor();

  const [
    message,
    setMessage,
  ] = useState("");

  const bottomRef =
    useRef<HTMLDivElement>(
      null
    );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    conversation?.messages,
  ]);

  function submit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    sendMessage(
      message,
      context
    );

    setMessage("");
  }

  function selectPrompt(
    prompt: string
  ) {
    sendMessage(
      prompt,
      context
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <LoaderCircle
          size={36}
          className="animate-spin text-[#0B5D3B]"
        />
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-green-100 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-green-100 bg-[#063D2E] p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <Bot size={27} />
          </div>

          <div>
            <h2 className="font-extrabold">
              NutVita AI Instructor
            </h2>

            <p className="text-xs text-green-100">
              {text("Assistant pédagogique local", "Local learning assistant")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={
            clearConversation
          }
          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold"
        >
          <Trash2 size={17} />
          {text("Effacer", "Clear")}
        </button>
      </header>

      <div className="border-b border-slate-100 p-5">
        <AiQuickPrompts
          onSelect={
            selectPrompt
          }
        />
      </div>

      <div className="h-[520px] space-y-5 overflow-y-auto bg-[#F8FAFC] p-5">
        {conversation?.messages.map(
          (item) => (
            <article
              key={item.id}
              className={`flex gap-3 ${
                item.role ===
                "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {item.role ===
                "assistant" && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DDF5E8] text-[#0B5D3B]">
                  <Bot size={19} />
                </div>
              )}

              <div
                className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-5 py-4 text-sm leading-7 ${
                  item.role ===
                  "user"
                    ? "bg-[#F58220] text-white"
                    : "border border-green-100 bg-white text-slate-700"
                }`}
              >
                {item.content}
              </div>

              {item.role ===
                "user" && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                  <UserCircle
                    size={20}
                  />
                </div>
              )}
            </article>
          )
        )}

        {isResponding && (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            {text("L’instructeur prépare sa réponse...", "The instructor is preparing a response...")}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={submit}
        className="flex gap-3 border-t border-green-100 p-5"
      >
        <textarea
          value={message}
          onChange={(event) =>
            setMessage(
              event.target.value
            )
          }
          rows={2}
          placeholder={text("Posez votre question...", "Ask your question...")}
          className="min-h-14 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-[#0B5D3B] focus:ring-4 focus:ring-[#DDF5E8]"
        />

        <button
          type="submit"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F58220] text-white"
          aria-label={text("Envoyer", "Send")}
        >
          <Send size={21} />
        </button>
      </form>
    </section>
  );
}
