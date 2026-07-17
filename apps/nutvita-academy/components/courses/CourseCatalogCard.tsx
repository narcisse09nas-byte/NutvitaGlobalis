"use client";

import { BookOpen, Clock3, GraduationCap } from "lucide-react";

import type { AcademyCourse } from "@/types/course";

import { getCourseLessonCount } from "@/lib/course-catalog";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useLanguage } from "@/hooks/use-language";

type CourseCatalogCardProps = {
  course: AcademyCourse;
};

export function CourseCatalogCard({ course }: CourseCatalogCardProps) {
  const { text } = useLanguage();
  const lessonCount = getCourseLessonCount(course);

  return (
    <Card className="flex h-full flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge>{course.code}</Badge>

          <span className="text-sm font-extrabold text-[#F58220]">
            {course.priceUsd} USD
          </span>
        </div>

        <h2 className="mt-5 text-2xl font-extrabold text-[#063D2E]">
          {course.title}
        </h2>

        <p className="mt-3 font-semibold text-slate-600">{course.titleFr}</p>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          {course.description}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[#F8FAFC] p-3 text-center">
            <BookOpen size={20} className="mx-auto text-[#0B5D3B]" />

            <p className="mt-2 text-sm font-bold text-[#063D2E]">
              {course.modules.length}
            </p>

            <p className="text-xs text-slate-500">
              {text("Modules", "Modules")}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] p-3 text-center">
            <GraduationCap size={20} className="mx-auto text-[#0B5D3B]" />

            <p className="mt-2 text-sm font-bold text-[#063D2E]">
              {lessonCount}
            </p>

            <p className="text-xs text-slate-500">
              {text("Leçons", "Lessons")}
            </p>
          </div>

          <div className="rounded-2xl bg-[#F8FAFC] p-3 text-center">
            <Clock3 size={20} className="mx-auto text-[#0B5D3B]" />

            <p className="mt-2 text-sm font-bold text-[#063D2E]">
              {course.durationHours}h
            </p>

            <p className="text-xs text-slate-500">
              {text("Durée", "Duration")}
            </p>
          </div>
        </div>

        {course.enrolled && (
          <ProgressBar
            value={course.progress}
            label={text("Votre progression", "Your progress")}
            className="mt-6"
          />
        )}
      </div>

      <Button
        href={
          course.enrolled
            ? `/dashboard/courses/${course.slug}`
            : `/courses/${course.slug}`
        }
        variant={course.enrolled ? "secondary" : "outline"}
        className="mt-7 w-full"
      >
        {course.enrolled
          ? text("Continuer la formation", "Continue course")
          : text("Voir la formation", "View course")}
      </Button>
    </Card>
  );
}
