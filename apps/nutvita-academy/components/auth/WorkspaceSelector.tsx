"use client";

import { BookOpen, GraduationCap, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocalAuth } from "@/hooks/use-local-auth";
import type { WorkspaceMode } from "@/types/local-auth";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useLanguage } from "@/hooks/use-language";

const options: Array<{
  mode: WorkspaceMode;
  title: { fr: string; en: string };
  description: { fr: string; en: string };
  href: string;
  icon: typeof ShieldCheck;
}> = [
  {
    mode: "super_admin",
    title: { fr: "Super administration", en: "Super administration" },
    description: {
      fr: "Configuration, utilisateurs, publications, paiements et contrôle global.",
      en: "Configuration, users, publishing, payments and global oversight.",
    },
    href: "/dashboard/admin",
    icon: ShieldCheck,
  },
  {
    mode: "instructor",
    title: { fr: "Espace formateur", en: "Instructor workspace" },
    description: {
      fr: "Studio, cours, classes, évaluations, notes et surveillance des examens.",
      en: "Studio, courses, classes, assessments, grades and exam proctoring.",
    },
    href: "/dashboard/instructor",
    icon: GraduationCap,
  },
  {
    mode: "student",
    title: { fr: "Espace apprenant", en: "Learner workspace" },
    description: {
      fr: "Suivre les formations, participer aux classes et composer les évaluations.",
      en: "Take courses, attend classes and complete assessments.",
    },
    href: "/dashboard",
    icon: BookOpen,
  },
];

export function WorkspaceSelector() {
  const router = useRouter();
  const { accountRole, selectWorkspace } = useLocalAuth();
  const { locale, t, text } = useLanguage();
  useEffect(() => {
    if (accountRole && accountRole !== "super_admin")
      router.replace("/dashboard");
  }, [accountRole, router]);

  function choose(mode: WorkspaceMode, href: string) {
    selectWorkspace(mode);
    router.replace(href);
    router.refresh();
  }

  if (accountRole !== "super_admin") {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-5 py-12">
      <section className="w-full max-w-5xl rounded-[32px] border border-green-100 bg-white p-7 shadow-xl md:p-10">
        <div className="flex justify-end">
          <LanguageSwitcher />
        </div>
        <p className="font-bold uppercase tracking-[0.18em] text-[#F58220]">
          {text("Compte à accès multiple", "Multi-access account")}
        </p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#063D2E] md:text-4xl">
          {t("chooseSpace")}
        </h1>
        <p className="mt-3 text-slate-600">
          {locale === "fr"
            ? "Ce choix limite l’interface pour cette connexion. Vous pourrez changer d’espace depuis la barre supérieure."
            : "This choice limits the interface for the current session. You can switch workspace from the top bar."}
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.mode}
                onClick={() => choose(option.mode, option.href)}
                className="group rounded-[26px] border border-slate-200 p-6 text-left transition hover:-translate-y-1 hover:border-[#F58220] hover:shadow-lg"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DDF5E8] text-[#0B5D3B]">
                  <Icon />
                </span>
                <span className="mt-5 block text-xl font-extrabold text-[#063D2E]">
                  {option.title[locale]}
                </span>
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  {option.description[locale]}
                </span>
                <span className="mt-5 block text-sm font-bold text-[#F58220]">
                  {locale === "fr"
                    ? "Ouvrir cet espace →"
                    : "Open this workspace →"}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
