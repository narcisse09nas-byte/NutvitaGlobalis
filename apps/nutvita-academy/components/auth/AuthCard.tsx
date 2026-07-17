"use client";

import { useLanguage } from "@/hooks/use-language";

export function AuthCard({
  title,
  subtitle,
  titleEn,
  subtitleEn,
  children,
}: {
  title: string;
  subtitle: string;
  titleEn?: string;
  subtitleEn?: string;
  children: React.ReactNode;
}) {
  const { locale } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-xl rounded-[32px] border border-green-100 bg-white p-8 shadow-sm">
      <p className="font-bold text-[#F58220]">NutVitaGlobalis Academy</p>

      <h1 className="mt-4 text-4xl font-extrabold text-[#063D2E]">
        {locale === "en" ? (titleEn ?? title) : title}
      </h1>

      <p className="mt-3 text-slate-600">
        {locale === "en" ? (subtitleEn ?? subtitle) : subtitle}
      </p>

      <div className="mt-8">{children}</div>
    </div>
  );
}
