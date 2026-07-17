"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLanguage();
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#063D2E]">
      <Languages size={16} />
      <span className={compact ? "sr-only" : ""}>{t("language")}</span>
      <select
        aria-label={t("language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as "fr" | "en")}
        className="bg-transparent outline-none"
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </label>
  );
}
