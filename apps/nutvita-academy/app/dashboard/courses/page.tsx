"use client";

import { getAllLocalCourses } from "@/lib/course-catalog";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import {
  getPublishedStudioCourses,
  studioCourseToAcademyCourse,
} from "@/lib/studio-course-runtime";
import { CourseCatalogCard } from "@/components/courses/CourseCatalogCard";
import { useMarketplace } from "@/hooks/use-marketplace";
import { useLanguage } from "@/hooks/use-language";

export default function DashboardCoursesPage() {
  const { data } = useInstructorStudio();
  const { locale, text } = useLanguage();
  const { isEnrolled, usesServerCatalog } = useMarketplace();
  const staticCourses = getAllLocalCourses();
  const studioCourses = getPublishedStudioCourses(data).map((course) =>
    studioCourseToAcademyCourse(course, locale),
  );
  const courses = [
    ...staticCourses,
    ...studioCourses.filter(
      (course) => !staticCourses.some((item) => item.slug === course.slug),
    ),
  ].filter((course) =>
    usesServerCatalog
      ? isEnrolled(course.slug)
      : course.enrolled || isEnrolled(course.slug),
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="min-w-0">
        <p className="font-bold uppercase tracking-[0.16em] text-[#F58220]">
          {text("Apprentissage", "Learning")}
        </p>

        <h1 className="mt-3 text-3xl font-extrabold text-[#063D2E] sm:text-4xl">
          {text("Mes formations", "My courses")}
        </h1>

        <p className="mt-3 max-w-3xl text-slate-600">
          {text(
            "Consultez vos certifications actives et découvrez les prochaines formations NutVitaGlobalis Academy.",
            "Review your active certifications and discover upcoming NutVitaGlobalis Academy courses.",
          )}
        </p>
      </header>

      {courses.length > 0 ? (
        <section className="mt-8 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {courses.map((course) => (
            <div key={course.id} className="min-w-0">
              <CourseCatalogCard course={course} />
            </div>
          ))}
        </section>
      ) : (
        <section className="mt-10 rounded-[24px] border border-dashed border-green-200 bg-white px-6 py-12 text-center">
          <h2 className="text-2xl font-extrabold text-[#063D2E]">
            {text("Aucune formation disponible", "No course available")}
          </h2>

          <p className="mt-3 text-slate-600">
            {text(
              "Les formations apparaîtront ici dès qu’elles seront disponibles.",
              "Courses will appear here as soon as they are available.",
            )}
          </p>
        </section>
      )}
    </div>
  );
}
