"use client";

import { LocalRoleGuard } from "@/components/auth/LocalRoleGuard";
import { CourseStudioList } from "@/components/instructor/CourseStudioList";
import { useLanguage } from "@/hooks/use-language";

export default function AdminCoursesPage() {
  const { text } = useLanguage();
  return <LocalRoleGuard allowedRoles={["admin", "super_admin"]}>
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">Administration</p>
      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">{text("Gestion des formations", "Course management")}</h1>
      <p className="mt-3 text-slate-600">{text("Validez, publiez et attribuez chaque formation a un formateur.", "Approve, publish and assign each course to an instructor.")}</p>
      <div className="mt-8"><CourseStudioList /></div>
    </div>
  </LocalRoleGuard>;
}
