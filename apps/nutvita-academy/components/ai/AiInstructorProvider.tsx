"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useLanguage } from "@/hooks/use-language";

import { generateLocalAiAnswer } from "@/lib/ai-instructor-engine";

import {
  loadAiConversation,
  removeAiConversation,
  saveAiConversation,
} from "@/lib/ai-instructor-storage";

import type {
  AiInstructorContext,
  AiInstructorConversation,
  AiInstructorMessage,
} from "@/types/ai-instructor";

type AiInstructorContextValue = {
  conversation: AiInstructorConversation | null;

  isLoading: boolean;
  isResponding: boolean;

  sendMessage: (content: string, context?: AiInstructorContext) => void;

  clearConversation: () => void;
};

export const AiInstructorContextStore =
  createContext<AiInstructorContextValue | null>(null);

function createMessage(
  role: "user" | "assistant",
  content: string,
): AiInstructorMessage {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${role}-${Date.now()}`,

    role,
    content,

    createdAt: new Date().toISOString(),
  };
}

export function AiInstructorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useLocalAuth();
  const { locale, text } = useLanguage();

  const [conversation, setConversation] =
    useState<AiInstructorConversation | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    if (!user) {
      setConversation(null);
      setIsLoading(false);
      return;
    }

    const stored = loadAiConversation(user.id);

    if (stored) {
      setConversation(stored);
    } else {
      const initialConversation: AiInstructorConversation = {
        id: `ai-${user.id}`,
        userId: user.id,

        context: {},

        messages: [
          createMessage(
            "assistant",
            text(
              `Bonjour ${user.fullName}. Je suis votre instructeur pédagogique NutVita AI. Posez-moi une question sur votre formation.`,
              `Hello ${user.fullName}. I am your NutVita AI learning instructor. Ask me a question about your course.`,
            ),
          ),
        ],

        updatedAt: new Date().toISOString(),
      };

      setConversation(initialConversation);

      saveAiConversation(initialConversation);
    }

    setIsLoading(false);
  }, [text, user]);

  const sendMessage = useCallback(
    (content: string, context: AiInstructorContext = {}) => {
      if (!user || !content.trim()) return;
      const userMessage = createMessage("user", content.trim());
      setIsResponding(true);
      setConversation((current) => {
        const base = current ?? {
          id: `ai-${user.id}`,
          userId: user.id,
          context: {},
          messages: [],
          updatedAt: new Date().toISOString(),
        };
        const updated = {
          ...base,
          context,
          messages: [...base.messages, userMessage],
          updatedAt: new Date().toISOString(),
        };
        saveAiConversation(updated);
        return updated;
      });
      void fetch("/api/ai/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content.trim(), context, locale }),
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error ?? "AI_UNAVAILABLE");
          return String(payload.content);
        })
        .catch(() => generateLocalAiAnswer(content, context))
        .then((answer) =>
          setConversation((current) => {
            if (!current) return current;
            const updated = {
              ...current,
              messages: [
                ...current.messages,
                createMessage("assistant", answer),
              ],
              updatedAt: new Date().toISOString(),
            };
            saveAiConversation(updated);
            return updated;
          }),
        )
        .finally(() => setIsResponding(false));
    },
    [locale, user],
  );
  const clearConversation = useCallback(() => {
    if (!user) {
      return;
    }

    removeAiConversation(user.id);

    const emptyConversation: AiInstructorConversation = {
      id: `ai-${user.id}`,
      userId: user.id,

      context: {},

      messages: [
        createMessage(
          "assistant",
          text(
            "La conversation a été réinitialisée. Comment puis-je vous aider ?",
            "The conversation has been reset. How can I help you?",
          ),
        ),
      ],

      updatedAt: new Date().toISOString(),
    };

    saveAiConversation(emptyConversation);

    setConversation(emptyConversation);
  }, [text, user]);

  const value = useMemo(
    () => ({
      conversation,
      isLoading,
      isResponding,
      sendMessage,
      clearConversation,
    }),
    [conversation, isLoading, isResponding, sendMessage, clearConversation],
  );

  return (
    <AiInstructorContextStore.Provider value={value}>
      {children}
    </AiInstructorContextStore.Provider>
  );
}
