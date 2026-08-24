"use client";
// Bilingual retrofit: locale is read once server-side (getCurrentLocale(), same cookie the rest
// of the app already uses) and provided here so any of the ~80 client components under
// components/op-management/ can read it without threading a locale prop through every
// intermediate layer (ProjectShell, EvmWorkspace, etc.) that doesn't otherwise need one.
import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

type PpmLocaleValue = { locale: Locale; en: boolean; t: (fr: string, en: string) => string };

const PpmLocaleContext = createContext<PpmLocaleValue>({ locale: "fr", en: false, t: (fr) => fr });

export function PpmLocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const en = locale === "en";
  const value: PpmLocaleValue = { locale, en, t: (fr, en_) => (en ? en_ : fr) };
  return <PpmLocaleContext.Provider value={value}>{children}</PpmLocaleContext.Provider>;
}

export function usePpmLocale() {
  return useContext(PpmLocaleContext);
}
