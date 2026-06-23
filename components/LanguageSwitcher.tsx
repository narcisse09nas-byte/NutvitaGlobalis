"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canonicalPath, localizedPath, normalizeLocale, stripLocale, type Locale } from "@/lib/i18n";

const publicCanonicalRoutes = new Set([
  "/",
  "/formations",
  "/teleconseils",
  "/ressources",
  "/suivi-sante",
  "/recrutement-dieteticiens",
  "/a-propos",
  "/contact",
  "/acces",
  "/confidentialite",
  "/cgu",
  "/cgv",
  "/remboursement",
]);

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const detected = normalizeLocale(stripLocale(pathname).locale);
  const [locale, setLocale] = useState<Locale>(detected);

  useEffect(() => {
    const stored = localStorage.getItem("nutvita_locale");
    if (stored === "fr" || stored === "en") setLocale(stored);
  }, []);

  async function choose(next: Locale) {
    const stripped = stripLocale(pathname);
    const currentLocale = normalizeLocale(stripped.locale || locale);
    const currentCanonical = canonicalPath(currentLocale, stripped.pathname);
    const target = publicCanonicalRoutes.has(currentCanonical) ? localizedPath(next, currentCanonical) : currentCanonical;

    setLocale(next);
    localStorage.setItem("nutvita_locale", next);
    document.cookie = `nutvita_locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
    fetch("/api/preferences/language", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: next }), keepalive: true }).catch(() => null);
    window.location.assign(target);
  }

  return <div className={`inline-flex items-center rounded-full border border-forest/15 bg-white/90 p-1 text-xs font-black ${compact ? "" : "shadow-sm"}`} aria-label="Language selector">
    {(["fr", "en"] as Locale[]).map(item => <button key={item} type="button" onClick={() => choose(item)} className={`rounded-full px-3 py-1.5 ${locale === item ? "bg-forest text-white" : "text-forest hover:bg-mint"}`}>{item.toUpperCase()}</button>)}
  </div>;
}

export function LanguageLink({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const pathname = usePathname();
  const stripped = stripLocale(pathname);
  const canonical = canonicalPath(normalizeLocale(stripped.locale), stripped.pathname);
  return <Link href={localizedPath(locale, canonical)}>{children}</Link>;
}
