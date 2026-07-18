import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { getCurrentLocale } from "@/lib/i18n-server";
import { getHomepage } from "@/lib/public-content";

export const metadata: Metadata = {
  title: { default: "NutVitaGlobalis | Nutrition, sante et bien-etre", template: "%s | NutVitaGlobalis" },
  description: "Formations certifiantes, teleconseils nutritionnels et ressources sante.",
  alternates: {
    canonical: "/fr",
    languages: {
      fr: "/fr",
      en: "/en",
      "x-default": "/fr",
    },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, homepage] = await Promise.all([getCurrentLocale(), getHomepage()]);
  return <html lang={locale}><body className="font-sans"><SiteChrome footerSettings={homepage}>{children}</SiteChrome></body></html>;
}
