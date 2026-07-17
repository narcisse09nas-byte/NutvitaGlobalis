"use client";

import Link from "next/link";
import { Award, BookOpenCheck, Brain, Globe2, ShieldCheck } from "lucide-react";

import { LocalAuthProvider } from "@/components/auth/LocalAuthProvider";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/hooks/use-language";

type AuthLayoutProps = {
  children: React.ReactNode;
};

const benefits = [
  {
    icon: Award,
    title: {
      fr: "Certifications professionnelles",
      en: "Professional certifications",
    },
    description: {
      fr: "Développez des compétences pratiques en nutrition, santé publique et sécurité alimentaire.",
      en: "Build practical skills in nutrition, public health and food safety.",
    },
  },
  {
    icon: BookOpenCheck,
    title: { fr: "Apprentissage structuré", en: "Structured learning" },
    description: {
      fr: "Suivez des vidéos, ressources, quiz, études de cas et évaluations finales.",
      en: "Complete videos, resources, quizzes, case studies and final assessments.",
    },
  },
  {
    icon: Brain,
    title: { fr: "Assistant pédagogique IA", en: "AI learning assistant" },
    description: {
      fr: "Obtenez des explications adaptées au contenu de chaque module.",
      en: "Get explanations tailored to the content of each module.",
    },
  },
  {
    icon: Globe2,
    title: { fr: "Formation bilingue", en: "Bilingual learning" },
    description: {
      fr: "Accédez aux interfaces de formation en français et en anglais.",
      en: "Use the learning interfaces in French or English.",
    },
  },
];

function AuthLayoutContent({ children }: AuthLayoutProps) {
  const { locale } = useLanguage();
  const copy =
    locale === "fr"
      ? {
          eyebrow: "Apprendre • Pratiquer • Certifier",
          title: "Développez des compétences qui transforment votre pratique.",
          intro:
            "NutVitaGlobalis Academy propose des certifications professionnelles en nutrition, santé publique, sécurité alimentaire et action humanitaire.",
          security: "Environnement sécurisé et confidentiel",
          home: "Accueil",
          policy:
            "En continuant, vous acceptez les conditions d’utilisation et la politique de confidentialité de NutVitaGlobalis Academy.",
        }
      : {
          eyebrow: "Learn • Practice • Certify",
          title: "Build skills that transform your practice.",
          intro:
            "NutVitaGlobalis Academy offers professional certifications in nutrition, public health, food safety and humanitarian action.",
          security: "Secure and confidential environment",
          home: "Home",
          policy:
            "By continuing, you agree to the NutVitaGlobalis Academy terms of use and privacy policy.",
        };

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="fixed right-5 top-5 z-50">
        <LanguageSwitcher />
      </div>
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-[#063D2E] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/5"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-40 -right-24 h-[500px] w-[500px] rounded-full bg-[#F58220]/10"
          />

          <div className="relative z-10">
            <Link href="/" className="inline-block">
              <p className="text-3xl font-extrabold">
                NutVita<span className="text-[#F58220]">Globalis</span>
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.38em] text-green-100">
                Academy
              </p>
            </Link>

            <div className="mt-16 max-w-2xl">
              <p className="font-bold uppercase tracking-[0.18em] text-[#F58220]">
                {copy.eyebrow}
              </p>
              <h1 className="mt-5 text-5xl font-extrabold leading-tight xl:text-6xl">
                {copy.title}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-green-50">
                {copy.intro}
              </p>
            </div>

            <div className="mt-12 grid gap-4 xl:grid-cols-2">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={benefit.title.fr}
                    className="rounded-[24px] border border-white/10 bg-white/10 p-5 backdrop-blur-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#F58220]">
                      <Icon size={23} />
                    </div>
                    <h2 className="mt-4 font-extrabold">
                      {benefit.title[locale]}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-green-50/80">
                      {benefit.description[locale]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-10 flex items-center justify-between border-t border-white/10 pt-6 text-sm text-green-100">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} />
              <span>{copy.security}</span>
            </div>
            <span>© {new Date().getFullYear()} NutVitaGlobalis</span>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-xl">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/">
                <p className="text-2xl font-extrabold text-[#063D2E]">
                  NutVita<span className="text-[#F58220]">Globalis</span>
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-[#0B5D3B]">
                  Academy
                </p>
              </Link>
              <Link
                href="/"
                className="text-sm font-bold text-[#0B5D3B] hover:underline"
              >
                {copy.home}
              </Link>
            </div>

            {children}

            <p className="mt-8 text-center text-xs leading-5 text-slate-500">
              {copy.policy}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <LocalAuthProvider>
      <AuthLayoutContent>{children}</AuthLayoutContent>
    </LocalAuthProvider>
  );
}
