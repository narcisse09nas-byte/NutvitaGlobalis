"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import { Send } from "lucide-react";

import { useLiveSessions } from "@/hooks/use-live-sessions";
import { useLanguage } from "@/hooks/use-language";

export function LiveChat({
  sessionId,
}: {
  sessionId: string;
}) {
  const { text } = useLanguage();
  const {
    data,
    sendMessage,
  } = useLiveSessions();

  const [message, setMessage] =
    useState("");

  const messages = useMemo(
    () =>
      data.messages.filter(
        (item) =>
          item.sessionId ===
          sessionId
      ),
    [
      data.messages,
      sessionId,
    ]
  );

  function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    sendMessage(
      sessionId,
      message
    );

    setMessage("");
  }

  return (
    <section className="rounded-[24px] border border-green-100 bg-white">
      <header className="border-b border-green-100 p-5">
        <h2 className="font-extrabold text-[#063D2E]">
          {text("Chat de la session", "Session chat")}
        </h2>
      </header>

      <div className="h-80 space-y-3 overflow-y-auto p-5">
        {messages.map(
          (item) => (
            <article
              key={item.id}
              className="rounded-2xl bg-[#F8FAFC] p-4"
            >
              <p className="text-sm font-extrabold text-[#063D2E]">
                {item.authorName}
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {item.content}
              </p>
            </article>
          )
        )}

        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-500">
            {text("Aucun message.", "No messages.")}
          </p>
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex gap-3 border-t border-green-100 p-4"
      >
        <input
          value={message}
          onChange={(event) =>
            setMessage(
              event.target.value
            )
          }
          placeholder={text("Écrire un message...", "Write a message...")}
          aria-label={text("Message de la session", "Session message")}
          className="h-11 flex-1 rounded-full border border-slate-200 px-4"
        />

        <button
          type="submit"
          aria-label={text("Envoyer", "Send")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F58220] text-white"
        >
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}
