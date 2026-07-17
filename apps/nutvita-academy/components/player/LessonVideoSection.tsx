"use client";

import { useCallback } from "react";

import type {
  AcademyCourse,
  CourseLesson,
  CourseModule,
} from "@/types/course";

import { useLocalAuth } from "@/hooks/use-local-auth";
import { useProgress } from "@/hooks/use-progress";

import { getLessonMedia } from "@/data/lesson-media";

import { ProfessionalVideoPlayer } from "@/components/player/ProfessionalVideoPlayer";

type LessonVideoSectionProps = {
  course: AcademyCourse;
  module: CourseModule;
  lesson: CourseLesson;
};

export function LessonVideoSection({
  course,
  module,
  lesson,
}: LessonVideoSectionProps) {
  const { user } = useLocalAuth();

  const {
    updateLessonProgress,
    completeLesson,
  } = useProgress();

  const media = getLessonMedia(
    course.slug,
    module.slug,
    lesson.slug
  );

  const handleProgress = useCallback(
    (
      progressPercent: number,
      currentTimeSeconds: number,
      additionalTimeSeconds: number
    ) => {
      updateLessonProgress({
        lessonId: lesson.id,
        courseSlug: course.slug,
        moduleSlug: module.slug,
        lessonSlug: lesson.slug,
        progressPercent,
        lastPositionSeconds:
          currentTimeSeconds,
        additionalTimeSeconds,
      });
    },
    [
      course.slug,
      lesson.id,
      lesson.slug,
      module.slug,
      updateLessonProgress,
    ]
  );

  const handleComplete =
    useCallback(() => {
      completeLesson({
        lessonId: lesson.id,
        courseSlug: course.slug,
        moduleSlug: module.slug,
        lessonSlug: lesson.slug,
      });
    }, [
      completeLesson,
      course.slug,
      lesson.id,
      lesson.slug,
      module.slug,
    ]);

  if (!user) {
    return null;
  }

  return (
    <ProfessionalVideoPlayer
      userId={user.id}
      videoKey={`${course.slug}:${module.slug}:${lesson.slug}`}
      title={lesson.title}
      src={
        media?.videoUrl ??
        lesson.videoUrl
      }
      poster={media?.posterUrl}
      transcript={
        media?.transcript ?? []
      }
      resources={
        media?.resources ?? []
      }
      onProgress={handleProgress}
      onComplete={handleComplete}
    />
  );
}