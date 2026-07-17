"use client";

import { CourseStudioList } from "@/components/instructor/CourseStudioList";
import { useLanguage } from "@/hooks/use-language";

export default function InstructorCoursesPage() {
  const { locale } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
        Instructor Studio
      </p>

      <h1 className="mt-3 text-4xl font-extrabold text-[#063D2E]">
        {locale === "fr" ? "Gestion des formations" : "Course management"}
      </h1>

      <div className="mt-8">
        <CourseStudioList />
      </div>
    </div>
  );
}
