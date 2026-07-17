import { PublishedModuleResolver } from "@/components/courses/PublishedModuleResolver";

export default async function ModuleDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string; moduleSlug: string }>;
  searchParams: Promise<{ lesson?: string }>;
}) {
  const { courseSlug, moduleSlug } = await params;
  const { lesson } = await searchParams;
  return (
    <PublishedModuleResolver
      courseSlug={courseSlug}
      moduleSlug={moduleSlug}
      selectedLessonSlug={lesson}
    />
  );
}
