"use client";

import Link from "next/link";
import { BookOpen, GraduationCap } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export default function InstructorPage() {
  const { locale } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Instructor Studio
      </p>

      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        {locale === "fr" ? "Espace formateur" : "Instructor workspace"}
      </h1>

      <p className="mt-3 max-w-3xl text-slate-600">
        {locale === "fr"
          ? "Créez, organisez et publiez vos formations."
          : "Create, organize and publish your courses."}
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Link
          href="/dashboard/instructor/courses"
          className="rounded-[24px] border border-green-100 bg-white p-6"
        >
          <BookOpen className="text-[#0B5D3B]" />
          <h2 className="mt-4 text-xl font-extrabold text-[#063D2E]">
            {locale === "fr" ? "Mes formations" : "My courses"}
          </h2>
        </Link>

        <Link
          href="/dashboard/ai-pro"
          className="rounded-[24px] border border-green-100 bg-white p-6"
        >
          <GraduationCap className="text-[#F58220]" />
          <h2 className="mt-4 text-xl font-extrabold text-[#063D2E]">
            {locale === "fr"
              ? "Assistant de conception IA"
              : "AI course design assistant"}
          </h2>
        </Link>
      </div>
    </div>
  );
}
