"use client";

import { LocalRoleGuard } from "@/components/auth/LocalRoleGuard";
import { InstructorLearnerOverview } from "@/components/instructor/InstructorLearnerOverview";
import { useLanguage } from "@/hooks/use-language";

export default function InstructorLearnersPage() {
  const { locale } = useLanguage();
  return <LocalRoleGuard allowedRoles={["instructor"]}>
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">Instructor Studio</p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">{locale === "fr" ? "Apprenants et progression" : "Learners and progress"}</h1>
      <p className="mt-3 text-slate-600">{locale === "fr" ? "Suivez les inscrits, leur avancement et les anciens diplomes pour vos formations." : "Track enrollment, progress and graduates across your assigned courses."}</p>
      <div className="mt-8"><InstructorLearnerOverview /></div>
    </div>
  </LocalRoleGuard>;
}
