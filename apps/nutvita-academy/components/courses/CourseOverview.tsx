"use client";

import { BookOpen, Clock3, Globe2, Layers3 } from "lucide-react";

import type { AcademyCourse } from "@/types/course";

import { getCourseLessonCount } from "@/lib/course-catalog";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useLanguage } from "@/hooks/use-language";

export function CourseOverview({ course }: { course: AcademyCourse }) {
  const { text } = useLanguage();
  const lessonCount = getCourseLessonCount(course);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <Badge>{course.code}</Badge>

        <span className="rounded-full bg-[#DDF5E8] px-3 py-1 text-xs font-bold text-[#0B5D3B]">
          {course.category}
        </span>
      </div>

      <h1 className="mt-5 text-4xl font-extrabold text-[#063D2E]">
        {course.title}
      </h1>

      <p className="mt-3 text-lg font-semibold text-slate-600">
        {course.titleFr}
      </p>

      <p className="mt-5 max-w-4xl leading-7 text-slate-600">
        {course.description}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <Layers3 className="text-[#0B5D3B]" />

          <p className="mt-3 font-extrabold text-[#063D2E]">
            {course.modules.length} modules
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <BookOpen className="text-[#0B5D3B]" />

          <p className="mt-3 font-extrabold text-[#063D2E]">
            {lessonCount} {text("leçons", "lessons")}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <Clock3 className="text-[#0B5D3B]" />

          <p className="mt-3 font-extrabold text-[#063D2E]">
            {course.durationHours} {text("heures", "hours")}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F8FAFC] p-4">
          <Globe2 className="text-[#0B5D3B]" />

          <p className="mt-3 font-extrabold text-[#063D2E]">
            {course.language}
          </p>
        </div>
      </div>

      <ProgressBar
        value={course.progress}
        label={text(
          "Progression de la certification",
          "Certification progress",
        )}
        className="mt-8"
      />
    </Card>
  );
}
