"use client";

import { CalendarDays, Sparkles } from "lucide-react";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useLanguage } from "@/hooks/use-language";

export function DashboardWelcome() {
  const { locale, text } = useLanguage();
  const { user } = useLocalAuth();

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? text("Bonjour", "Good morning")
      : hour < 18
        ? text("Bon après-midi", "Good afternoon")
        : text("Bonsoir", "Good evening");

  const dateLabel = new Intl.DateTimeFormat(
    locale === "fr" ? "fr-FR" : "en-US",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  ).format(new Date());

  return (
    <section className="relative overflow-hidden rounded-[30px] bg-[#063D2E] p-7 text-white md:p-9">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F58220]/15"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-white/5"
      />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-green-50">
          <CalendarDays size={17} />

          {dateLabel}
        </div>

        <h1 className="mt-6 text-3xl font-extrabold leading-tight md:text-5xl">
          {greeting},{" "}
          {user?.fullName?.split(" ")[0] ?? text("Apprenant", "Learner")}
        </h1>

        <p className="mt-4 max-w-2xl text-green-50/85 md:text-lg">
          {text(
            "Poursuivez votre parcours professionnel et transformez chaque leçon en compétence pratique.",
            "Continue your professional journey and turn every lesson into a practical skill.",
          )}
        </p>

        <p className="mt-6 inline-flex items-center gap-2 font-bold text-[#F58220]">
          <Sparkles size={19} />
          Learn • Practice • Certify
        </p>
      </div>
    </section>
  );
}
