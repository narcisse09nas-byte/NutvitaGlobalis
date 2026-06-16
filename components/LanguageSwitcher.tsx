"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { localizedPath, normalizeLocale, stripLocale, type Locale } from "@/lib/i18n";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const detected = normalizeLocale(stripLocale(pathname).locale);
  const [locale, setLocale] = useState<Locale>(detected);

  useEffect(() => {
    const stored = localStorage.getItem("nutvita_locale");
    if (stored === "fr" || stored === "en") setLocale(stored);
  }, []);

  async function choose(next: Locale) {
    setLocale(next);
    localStorage.setItem("nutvita_locale", next);
    document.cookie = `nutvita_locale=${next}; path=/; max-age=31536000; SameSite=Lax`;
    fetch("/api/preferences/language", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: next }) }).catch(() => null);
    const canonical = stripLocale(pathname).pathname;
    router.push(localizedPath(next, canonical));
    router.refresh();
  }

  return <div className={`inline-flex items-center rounded-full border border-forest/15 bg-white/90 p-1 text-xs font-black ${compact ? "" : "shadow-sm"}`} aria-label="Language selector">
    {(["fr", "en"] as Locale[]).map(item => <button key={item} type="button" onClick={() => choose(item)} className={`rounded-full px-3 py-1.5 ${locale === item ? "bg-forest text-white" : "text-forest hover:bg-mint"}`}>{item.toUpperCase()}</button>)}
  </div>;
}

export function LanguageLink({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const pathname = usePathname();
  return <Link href={localizedPath(locale, stripLocale(pathname).pathname)}>{children}</Link>;
}
