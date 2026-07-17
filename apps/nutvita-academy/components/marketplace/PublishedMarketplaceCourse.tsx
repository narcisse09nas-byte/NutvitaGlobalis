"use client";

import { useMarketplace } from "@/hooks/use-marketplace";
import { MarketplaceCourseDetail } from "@/components/marketplace/MarketplaceCourseDetail";
import { useLanguage } from "@/hooks/use-language";

export function PublishedMarketplaceCourse({
  courseSlug,
}: {
  courseSlug: string;
}) {
  const { text } = useLanguage();
  const { courses } = useMarketplace();
  const course = courses.find((item) => item.slug === courseSlug);
  if (!course)
    return (
      <div className="rounded-[24px] bg-white p-8 text-center">
        {text("Formation introuvable ou non publiée.", "Course not found or not published.")}
      </div>
    );
  return <MarketplaceCourseDetail course={course} />;
}
