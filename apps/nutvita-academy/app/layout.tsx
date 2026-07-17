import type { Metadata } from "next";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "NutVitaGlobalis Academy",
  description:
    "Certifications professionnelles en nutrition, santé publique et sécurité alimentaire / Professional certifications in nutrition, public health and food security.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
