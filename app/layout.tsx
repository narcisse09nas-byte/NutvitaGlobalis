import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr"><body className="font-sans"><SiteChrome>{children}</SiteChrome></body></html>;
}
